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
  const costTotal = costState?.total || 0;
  
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

async function capturePlannerScreenshot() {
  if (window.html2canvas) {
    const canvas = await window.html2canvas(document.body, {
      backgroundColor: '#000000',
      useCORS: true,
      logging: false,
      scale: 1
    });
    return canvas.toDataURL('image/png');
  }
  
  const sceneCanvas = document.querySelector('canvas.a-canvas');
  if (sceneCanvas) {
    return sceneCanvas.toDataURL('image/png');
  }
  
  throw new Error('Unable to locate scene canvas for screenshot.');
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
    const nameInput = prompt('Enter a name for this snapshot:', '');
    const snapshotName = (nameInput && nameInput.trim()) || `Room Plan ${new Date().toLocaleString()}`;
    
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
    alert('Snapshot downloaded and saved to your plans!');
  } catch (error) {
    console.error('Error capturing snapshot:', error);
    alert('Unable to save snapshot. Please try again.');
  }
}

// Expose helpers globally for other modules (profile page, etc.)
window.getLocalRoomPlans = getLocalRoomPlans;
window.deleteLocalRoomPlan = deleteLocalRoomPlan;

