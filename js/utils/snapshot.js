// snapshot.js (UPDATED)
// Snapshot utility for saving and loading room plans

const LOCAL_ROOM_PLANS_KEY = 'localRoomPlans';

/**
 * Collect current room plan data
 * @returns {Object} - Room plan data object
 */
function collectRoomPlanData() {
  const roomWidth = parseFloat(localStorage.getItem('roomWidth')) || 10;
  const roomLength = parseFloat(localStorage.getItem('roomLength')) || 10;
  
  // Collect all furniture items
  const furnitureContainer = document.getElementById('furniture-container');
  const furnitureData = [];
  
  if (furnitureContainer) {
    const furnitureItems = furnitureContainer.querySelectorAll('[id^="furniture-"]');
    furnitureItems.forEach(item => {
      const position = item.getAttribute('position');
      const rotation = item.getAttribute('rotation');
      const scale = item.getAttribute('scale');
      const modelKey = item.getAttribute('data-model-key');
      
      if (modelKey && position) {
        const [x, y, z] = position.split(' ').map(parseFloat);
        const [rx, ry, rz] = (rotation || '0 0 0').split(' ').map(parseFloat);
        const [sx, sy, sz] = (scale || '1 1 1').split(' ').map(parseFloat);
        
        furnitureData.push({
          model_key: modelKey,
          position: { x, y, z },
          rotation: { x: rx, y: ry, z: rz },
          scale: { x: sx, y: sy, z: sz }
        });
      }
    });
  }
  
  // Get current cost total
  const costTotal = (typeof costState !== 'undefined' && costState?.total) ? costState.total : 0;
  
  return {
    room_width: roomWidth,
    room_length: roomLength,
    furniture_data: furnitureData,
    cost_total: costTotal
  };
}

function getLocalRoomPlans() {
  try {
    const raw = localStorage.getItem(LOCAL_ROOM_PLANS_KEY);
    const plans = raw ? JSON.parse(raw) : [];
    return Array.isArray(plans) ? plans : [];
  } catch (error) {
    console.warn('Error parsing local room plans:', error);
    return [];
  }
}

function saveLocalRoomPlans(plans) {
  localStorage.setItem(LOCAL_ROOM_PLANS_KEY, JSON.stringify(plans));
}

function addLocalRoomPlan(plan) {
  const plans = getLocalRoomPlans();
  plans.unshift(plan);
  saveLocalRoomPlans(plans);
  return plans;
}

function deleteLocalRoomPlan(planId) {
  const plans = getLocalRoomPlans().filter(plan => plan.id !== planId);
  saveLocalRoomPlans(plans);
  return plans;
}

/**
 * Wait until A-Frame scene is loaded and the WebGL canvas is present.
 * Resolves with the canvas element when ready.
 */
function waitForAFrameCanvas(timeout = 3000) {
  return new Promise((resolve, reject) => {
    const scene = document.querySelector('a-scene');
    if (!scene) {
      reject(new Error('A-Frame scene not found.'));
      return;
    }

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error('Timed out waiting for A-Frame canvas to become ready.'));
    }, timeout);

    const tryGetCanvas = () => {
      // A-Frame uses canvas with class 'a-canvas'
      const canvas = document.querySelector('canvas.a-canvas');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        clearTimeout(timeoutId);
        resolve(canvas);
        return true;
      }
      return false;
    };

    // If scene already reports loaded, try immediately
    const isLoaded = scene.hasLoaded || scene.loaded || false;
    if (isLoaded && tryGetCanvas()) return;

    // Otherwise wait for the loaded event and try
    const onLoaded = () => {
      // slight delay to ensure final render
      setTimeout(() => {
        if (!timedOut && tryGetCanvas()) {
          // resolved inside tryGetCanvas
        } else if (!timedOut) {
          // Maybe canvas not yet ready; poll briefly
          const pollInterval = setInterval(() => {
            if (tryGetCanvas()) {
              clearInterval(pollInterval);
            }
          }, 100);
        }
      }, 150); // small extra wait
    };

    scene.addEventListener('loaded', onLoaded, { once: true });

    // also attempt immediate polling (in case loaded already)
    const initialPoll = setInterval(() => {
      if (tryGetCanvas()) {
        clearInterval(initialPoll);
      }
    }, 100);
  });
}

/**
 * Capture the A-Frame WebGL canvas and return a PNG data URL.
 * Throws an error with a helpful message if the canvas is tainted (CORS) or missing.
 */
async function capturePlannerScreenshot() {
  // wait for canvas
  const canvas = await waitForAFrameCanvas().catch(err => {
    throw new Error(`Unable to capture screenshot: ${err.message}`);
  });

  // Small extra wait to allow textures/materials to finish
  await new Promise(r => setTimeout(r, 150));

  try {
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } catch (err) {
    // Canvas.toDataURL throws a DOMException if canvas is tainted (cross-origin)
    console.error('Error converting canvas to data URL:', err);
    throw new Error('Screenshot failed: the WebGL canvas appears to be tainted by cross-origin resources. Ensure your 3D assets (models/textures) are served with proper CORS headers and loaded with crossorigin attributes.');
  }
}

function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function slugifyFileName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `room-plan-${Date.now()}`;
}

/**
 * Handle snapshot button click
 */
async function handleSnapshotClick() {
  const isAuthenticated = await checkAuth();
  
  if (!isAuthenticated) {
    showAuthModal(async () => {
      await handleSnapshotClick();
    });
    return;
  }
  
  try {
    const nameInput = await showPrompt('Enter a name for this snapshot:', '', 'Save Snapshot');
    const snapshotName = (nameInput && nameInput.trim()) || `Room Plan ${new Date().toLocaleString()}`;

    // Capture screenshot directly from WebGL canvas
    const screenshotDataUrl = await capturePlannerScreenshot();
    const safeFileName = `${slugifyFileName(snapshotName)}.png`;
    downloadDataUrl(screenshotDataUrl, safeFileName);
    
    const planData = collectRoomPlanData();
    const localPlan = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      name: snapshotName,
      createdAt: new Date().toISOString(),
      roomWidth: planData.room_width,
      roomLength: planData.room_length,
      costTotal: planData.cost_total,
      furnitureData: planData.furniture_data,
      snapshotFileName: safeFileName
    };
    
    addLocalRoomPlan(localPlan);
    await showDialog('Snapshot downloaded and saved to your plans!', 'Success');
  } catch (error) {
    console.error('Error capturing snapshot:', error);
    const message = error && error.message ? error.message : 'Unable to save snapshot. Please try again.';
    await showDialog(message, 'Error');
  }
}

// Expose helpers globally for other modules (profile page, etc.)
window.getLocalRoomPlans = getLocalRoomPlans;
window.deleteLocalRoomPlan = deleteLocalRoomPlan;
window.handleSnapshotClick = handleSnapshotClick;
window.capturePlannerScreenshot = capturePlannerScreenshot;
window.collectRoomPlanData = collectRoomPlanData;
