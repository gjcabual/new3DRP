let draggedItem = null;
let furnitureCounter = 0;
let panelOpen = false;
let selectedFurniture = null; // Track currently selected furniture

// Items and prices loaded from Supabase
let ITEMS_DATA = {}; // model_key -> {id, name, category, model_file_path}
let PRICE_LIST = {}; // model_key -> estimated_price
let ITEM_METADATA = {}; // model_key -> {name, model_file_path}
let ITEM_PRICE_SOURCES = {}; // model_key -> [{store, price}]

const STORAGE_MODEL_FILES = {
  table1: 'table1.obj',
  center_table1: 'center_table1.obj',
  center_table2: 'center_table2.obj',
  wardrobe1: 'wardrobe_modern.obj',
  wardrobe2: 'wardrobe_traditional.obj',
  wardrobe3: 'wardrobe_openframe.obj'
};

const STORAGE_BUCKET_FILES = new Set([
  'wardrobe_modern.obj',
  'wardrobe_traditional.obj',
  'wardrobe_openframe.obj',
  'center_table1.obj',
  'center_table2.obj'
]);

const FALLBACK_ITEM_NAMES = {
  center_table1: 'Center Table 1',
  center_table2: 'Center Table 2',
  wardrobe1: 'Wardrobe Modern',
  wardrobe2: 'Wardrobe Traditional',
  wardrobe3: 'Wardrobe Open Frame',
  table1: 'Center Table'
};

const FALLBACK_ITEM_METADATA = {
  center_table1: { name: 'Center Table 1', model_file_path: 'center_table1.obj' },
  center_table2: { name: 'Center Table 2', model_file_path: 'center_table2.obj' }
};

/**
 * Calculate estimated price from prices array using arithmetic mean
 * @param {Array<number>} prices - Array of prices
 * @returns {number} - Estimated price
 */
function calculateEstimatedPrice(prices) {
  if (!prices || prices.length === 0) return 0;
  const sum = prices.reduce((acc, price) => acc + price, 0);
  return Math.round((sum / prices.length) * 100) / 100;
}

/**
 * Load items and prices from Supabase
 */
async function loadItemsAndPrices() {
  try {
    ITEMS_DATA = {};
    PRICE_LIST = {};
    ITEM_METADATA = {};
    ITEM_PRICE_SOURCES = {};

    // Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*');

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return;
    }

    // Store items by model_key
    items.forEach(item => {
      ITEMS_DATA[item.model_key] = item;
      ITEM_METADATA[item.model_key] = {
        name: item.name,
        model_file_path: item.model_file_path || STORAGE_MODEL_FILES[item.model_key] || null
      };
    });

    // Apply fallback metadata for known models
    Object.keys(STORAGE_MODEL_FILES).forEach(key => {
      if (!ITEM_METADATA[key]) {
        ITEM_METADATA[key] = {
          name: FALLBACK_ITEM_NAMES[key] || key,
          model_file_path: STORAGE_MODEL_FILES[key] || null
        };
      }
    });
    Object.keys(FALLBACK_ITEM_METADATA).forEach(key => {
      if (!ITEM_METADATA[key]) {
        ITEM_METADATA[key] = { ...FALLBACK_ITEM_METADATA[key] };
      }
    });

    // Fetch all prices
    const { data: prices, error: pricesError } = await supabase
      .from('item_prices')
      .select('*, items(model_key)');

    if (pricesError) {
      console.error('Error fetching prices:', pricesError);
      return;
    }

    // Organize prices by model_key and calculate estimated prices
    const pricesByModel = {};
    prices.forEach(price => {
      const modelKey = price.items?.model_key || 
                      (Array.isArray(price.items) && price.items[0]?.model_key) ||
                      null;
      
      if (!modelKey) {
        console.warn('Price record missing model_key:', price);
        return;
      }

      if (!pricesByModel[modelKey]) {
        pricesByModel[modelKey] = [];
      }
      pricesByModel[modelKey].push(price.price);

      if (!ITEM_PRICE_SOURCES[modelKey]) {
        ITEM_PRICE_SOURCES[modelKey] = [];
      }
      ITEM_PRICE_SOURCES[modelKey].push({
        store: price.store_name,
        price: price.price
      });
    });

    // Calculate estimated prices
    Object.keys(pricesByModel).forEach(modelKey => {
      PRICE_LIST[modelKey] = calculateEstimatedPrice(pricesByModel[modelKey]);
    });

    // Ensure every known item has an entry (default to 0)
    Object.keys(ITEM_METADATA).forEach(key => {
      if (typeof PRICE_LIST[key] === "undefined") {
        PRICE_LIST[key] = 0;
      }
      if (!ITEM_PRICE_SOURCES[key]) {
        ITEM_PRICE_SOURCES[key] = [];
      }
    });
  } catch (error) {
    console.error('Error loading items and prices:', error);
  }
}

/**
 * Get model file URL from Supabase Storage or local path
 * @param {string} modelKey - Model key (e.g., 'wardrobe1', 'table1')
 * @returns {string} - Model file URL
 */
function getModelUrl(modelKey) {
  const metadata = ITEM_METADATA[modelKey];
  const fallbackFile = STORAGE_MODEL_FILES[modelKey];
  const filePath = metadata?.model_file_path || fallbackFile;
  
  if (!filePath) {
    return `models/${modelKey}.obj`;
  }

  // Check if file is stored in Supabase bucket
  if (STORAGE_BUCKET_FILES.has(filePath)) {
    // Get public URL from Supabase Storage
    const { data } = supabase.storage.from('wardrobe-models').getPublicUrl(filePath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Fallback to local path for table1 or if storage URL fails
  return `models/${filePath}`;
}

/**
 * Get item name from metadata
 * @param {string} modelKey - Model key
 * @returns {string} - Item display name
 */
function getItemName(modelKey) {
  return ITEM_METADATA[modelKey]?.name || FALLBACK_ITEM_NAMES[modelKey] || modelKey;
}

const costState = {
  items: {}, // key -> {name, price, qty, unitCost}
  total: 0,
};

// Initialize the room with dimensions from localStorage
function initializeRoom() {
  const width = localStorage.getItem("roomWidth");
  const length = localStorage.getItem("roomLength");
  const height = localStorage.getItem("roomHeight");

  if (!width || !length) {
    // Don't redirect, just show dialog
    showDialog("No room dimensions found. Please set room dimensions using the Resize Dimension button.", "Setup Required");
    return;
  }

  // Convert m to A-Frame units (1:1 ratio)
  const aframeWidth = parseFloat(width);
  const aframeLength = parseFloat(length);
  const wallHeight = height ? parseFloat(height) : 3; // Default to 3m if not set

  // Update floor size
  const floor = document.getElementById("floor");
  if (floor) {
    floor.setAttribute("width", aframeWidth);
    floor.setAttribute("height", aframeLength);
  }

  // Create room walls with height
  createRoomWalls(aframeWidth, aframeLength, wallHeight);

  // Update room info
  const roomInfo = document.getElementById("room-info");
  if (roomInfo) {
    const heightText = height ? ` × ${height}M` : "";
    roomInfo.innerHTML = `<strong>Room:</strong> ${width}M × ${length}M${heightText}`;
  }

  // Position camera appropriately
  const cameraRig = document.getElementById("cameraRig");
  if (cameraRig) {
    const cameraDistance = Math.max(aframeWidth, aframeLength) * 0.8;
    cameraRig.setAttribute("position", `0 1.6 ${cameraDistance}`);
  }

  // Wait for scene to be ready, then initialize drag and drop
  const scene = document.querySelector("a-scene");
  if (scene) {
    if (scene.hasLoaded) {
      initializeDragAndDrop();
    } else {
      scene.addEventListener("loaded", initializeDragAndDrop);
    }
  }

  // Show drop indicator initially (only if no furniture has been placed yet)
  setTimeout(() => {
    const furnitureContainer = document.getElementById(
      "furniture-container"
    );
    const hasFurniture =
      furnitureContainer && furnitureContainer.children.length > 0;
    const dropIndicator = document.getElementById("drop-indicator");
    if (!hasFurniture && dropIndicator) {
      dropIndicator.classList.add("show");
    }
  }, 500);
}

function createRoomWalls(width, length, wallHeight = 3) {
  const wallsContainer = document.getElementById("room-walls");
  if (!wallsContainer) return;
  
  const wallThickness = 0.1;
  wallsContainer.innerHTML = "";

  // Create walls with better materials
  const walls = [
    {
      pos: `0 ${wallHeight / 2} ${-length / 2}`,
      size: `${width} ${wallHeight} ${wallThickness}`,
    },
    {
      pos: `0 ${wallHeight / 2} ${length / 2}`,
      size: `${width} ${wallHeight} ${wallThickness}`,
    },
    {
      pos: `${-width / 2} ${wallHeight / 2} 0`,
      size: `${wallThickness} ${wallHeight} ${length}`,
    },
    {
      pos: `${width / 2} ${wallHeight / 2} 0`,
      size: `${wallThickness} ${wallHeight} ${length}`,
    },
  ];

  walls.forEach((wall, i) => {
    const wallEl = document.createElement("a-box");
    wallEl.setAttribute("position", wall.pos);
    const [w, h, d] = wall.size.split(" ");
    wallEl.setAttribute("width", w);
    wallEl.setAttribute("height", h);
    wallEl.setAttribute("depth", d);
    wallEl.setAttribute("color", "#f8f8f8");
    wallEl.setAttribute("material", "roughness: 0.7; metalness: 0.1");
    wallEl.setAttribute("shadow", "cast: true; receive: true");
    wallsContainer.appendChild(wallEl);
  });

  // Grid helper removed
}

function togglePanel() {
  panelOpen = !panelOpen;
  const panel = document.getElementById("side-panel");
  const toggle = document.getElementById("panel-toggle");
  const resizePanel = document.getElementById("resize-dimension-panel");

  if (panelOpen) {
    // Close resize panel if open
    if (resizePanel) {
      resizePanel.classList.remove("open");
    }
    // Show main panel
    if (panel) {
      panel.classList.add("open");
    }
    if (toggle) {
      toggle.innerHTML = "✕";
      toggle.style.left = "310px";
    }
  } else {
    if (panel) {
      panel.classList.remove("open");
    }
    if (toggle) {
      toggle.innerHTML = "📦";
      toggle.style.left = "20px";
    }
    // Hide resize panel if open
    if (resizePanel) {
      resizePanel.classList.remove("open");
    }
  }
}

function handleDropIndicatorClick(e) {
  // Prevent click during active drag operations
  if (draggedItem) {
    return;
  }

  // Prevent event propagation to avoid interfering with drag and drop
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }


  // Open the side panel when drop indicator is clicked
  if (!panelOpen) {
    togglePanel();
  }
  // Hide the drop indicator after clicking (user can see the panel now)
  const dropIndicator = document.getElementById("drop-indicator");
  if (dropIndicator) {
    dropIndicator.classList.remove("show");
  }
}

function showResizeDimensionPanel() {
  const sidePanel = document.getElementById("side-panel");
  const resizePanel = document.getElementById("resize-dimension-panel");
  
  if (!sidePanel || !resizePanel) return;
  
  // Store original content if not already stored
  if (!sidePanel.dataset.originalContent) {
    sidePanel.dataset.originalContent = sidePanel.innerHTML;
  }
  
  // Hide main side panel
  sidePanel.classList.remove("open");
  
  // Show resize dimension panel
  resizePanel.classList.add("open");
  
  // Load current dimensions if available
  const width = localStorage.getItem("roomWidth") || "";
  const length = localStorage.getItem("roomLength") || "";
  const height = localStorage.getItem("roomHeight") || "";
  
  const widthInput = document.getElementById("room-width-input");
  const lengthInput = document.getElementById("room-length-input");
  const heightInput = document.getElementById("room-height-input");
  
  if (widthInput) widthInput.value = width;
  if (lengthInput) lengthInput.value = length;
  if (heightInput) heightInput.value = height;
}

function saveRoomDimensions() {
  const widthInput = document.getElementById("room-width-input");
  const lengthInput = document.getElementById("room-length-input");
  const heightInput = document.getElementById("room-height-input");
  
  const width = parseFloat(widthInput?.value);
  const length = parseFloat(lengthInput?.value);
  const height = parseFloat(heightInput?.value);
  
  if (!width || !length || width <= 0 || length <= 0) {
    showDialog("Please enter valid width and length values (greater than 0).", "Invalid Dimensions");
    return;
  }
  
  // Save to localStorage
  localStorage.setItem("roomWidth", width.toString());
  localStorage.setItem("roomLength", length.toString());
  if (height && height > 0) {
    localStorage.setItem("roomHeight", height.toString());
  }
  
  // Update room
  initializeRoom();
  
  // Check all furniture items against new boundaries
  checkFurnitureBoundaries(width, length);
  
  // Close resize panel and show main panel
  const resizePanel = document.getElementById("resize-dimension-panel");
  const sidePanel = document.getElementById("side-panel");
  
  if (resizePanel) resizePanel.classList.remove("open");
  if (sidePanel) sidePanel.classList.add("open");
  
  showDialog("Room dimensions updated successfully!", "Success");
}

/**
 * Check all furniture items against room boundaries and mark as red if outside
 */
function checkFurnitureBoundaries(roomWidth, roomLength) {
  const furnitureContainer = document.getElementById('furniture-container');
  if (!furnitureContainer) return;
  
  const furnitureItems = furnitureContainer.querySelectorAll('[id^="furniture-"]');
  const wallThickness = 0.1;
  
  furnitureItems.forEach(furniture => {
    const draggableComponent = furniture.components['draggable-furniture'];
    if (!draggableComponent) return;
    
    // Update draggable component with new dimensions
    furniture.setAttribute('draggable-furniture', {
      roomWidth: roomWidth,
      roomLength: roomLength,
      objectWidth: draggableComponent.data.objectWidth || 1.5,
      objectLength: draggableComponent.data.objectLength || 1.5,
      wallThickness: wallThickness
    });
    
    // Get current position
    const position = furniture.object3D.position;
    
    // Check if outside boundaries
    const isOutside = isFurnitureOutsideBoundaries(position, roomWidth, roomLength, 
      draggableComponent.data.objectWidth || 1.5, 
      draggableComponent.data.objectLength || 1.5, 
      wallThickness);
    
    // Update color based on boundary status
    if (isOutside) {
      furniture.setAttribute('material', 'color', '#FF6B6B');
      furniture.setAttribute('material', 'emissive', '#8B0000');
      furniture.setAttribute('material', 'emissiveIntensity', '0.25');
    } else {
      // Check if near walls (using existing collision logic)
      if (draggableComponent.isColliding && draggableComponent.isColliding(position)) {
        furniture.setAttribute('material', 'color', '#FF6B6B');
        furniture.setAttribute('material', 'emissive', '#8B0000');
        furniture.setAttribute('material', 'emissiveIntensity', '0.25');
      } else {
        // Restore original color
        const clickableComponent = furniture.components['clickable-furniture'];
        if (clickableComponent && clickableComponent.originalColor) {
          furniture.setAttribute('material', 'color', clickableComponent.originalColor);
        } else {
          furniture.setAttribute('material', 'color', '#FF8C00');
        }
        furniture.setAttribute('material', 'emissive', '#000000');
        furniture.setAttribute('material', 'emissiveIntensity', '0');
      }
    }
  });
}

/**
 * Check if furniture position is outside room boundaries
 */
function isFurnitureOutsideBoundaries(position, roomWidth, roomLength, objWidth, objLength, wallThickness) {
  const innerX = roomWidth / 2 - wallThickness / 2;
  const innerZ = roomLength / 2 - wallThickness / 2;
  const safeXMin = -innerX + objWidth / 2;
  const safeXMax = innerX - objWidth / 2;
  const safeZMin = -innerZ + objLength / 2;
  const safeZMax = innerZ - objLength / 2;
  
  return (position.x < safeXMin || position.x > safeXMax || 
          position.z < safeZMin || position.z > safeZMax);
}

function toggleCostPanel() {
  const costPanel = document.getElementById("cost-panel");
  if (!costPanel) return;
  
  costPanel.classList.toggle("collapsed");
}

function initializeDragAndDrop() {
  // Only enable drag for enabled items (table)
  const enabledItems = document.querySelectorAll(".model-item.enabled");
  const scene = document.getElementById("scene");
  const dropIndicator = document.getElementById("drop-indicator");

  enabledItems.forEach((item) => {
    item.addEventListener("dragstart", handleDragStart);
  });

  // Scene drop events
  scene.addEventListener("dragover", handleDragOver);
  scene.addEventListener("drop", handleDrop);
  scene.addEventListener("dragenter", handleDragEnter);
  scene.addEventListener("dragleave", handleDragLeave);
  
  // Drop indicator drop events (allow dropping on the indicator itself)
  if (dropIndicator) {
    dropIndicator.addEventListener("dragover", handleDragOver);
    dropIndicator.addEventListener("drop", handleDrop);
    dropIndicator.addEventListener("dragenter", function(e) {
      e.preventDefault();
      dropIndicator.classList.add("show");
    });
    dropIndicator.addEventListener("dragleave", function(e) {
      if (!dropIndicator.contains(e.relatedTarget)) {
        dropIndicator.classList.remove("show");
      }
    });
  }
}

function handleDragStart(e) {
  draggedItem = {
    model: e.target.dataset.model,
    scale: e.target.dataset.scale,
    name: e.target.querySelector(".model-name").textContent,
  };
  e.target.classList.add("dragging");

  // Hide the drop indicator when dragging starts
  const dropIndicator = document.getElementById("drop-indicator");
  dropIndicator.classList.remove("show");
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDragEnter(e) {
  e.preventDefault();
  document.getElementById("drop-indicator").classList.add("show");
}

function handleDragLeave(e) {
  if (
    !e.relatedTarget ||
    !document.getElementById("scene").contains(e.relatedTarget)
  ) {
    document.getElementById("drop-indicator").classList.remove("show");
  }
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById("drop-indicator").classList.remove("show");

  if (!draggedItem) return;

  // Calculate drop position (center of room with slight randomization)
  const dropX = (Math.random() - 0.5) * 2;
  const dropZ = (Math.random() - 0.5) * 2;

  // Get room dimensions for smart placement
  const roomWidth = parseFloat(localStorage.getItem("roomWidth")); // Already in meters
  const roomLength = parseFloat(localStorage.getItem("roomLength"));

  // Create furniture entity
  const furnitureEl = document.createElement("a-entity");
  furnitureEl.id = `furniture-${furnitureCounter++}`;
  furnitureEl.setAttribute("position", `${dropX} 0 ${dropZ}`);
  
  // Create placeholder box that shows immediately while model loads
  const placeholderEl = document.createElement("a-box");
  placeholderEl.setAttribute("width", "1.5");
  placeholderEl.setAttribute("height", "0.8");
  placeholderEl.setAttribute("depth", "1.5");
  placeholderEl.setAttribute("color", "#FF8C00");
  placeholderEl.setAttribute("opacity", "0.7");
  placeholderEl.id = `${furnitureEl.id}-placeholder`;
  furnitureEl.appendChild(placeholderEl);
  
  // Add to scene FIRST so A-Frame can initialize it immediately
  const furnitureContainer = document.getElementById("furniture-container");
  furnitureContainer.appendChild(furnitureEl);
  
  // Force A-Frame to flush the entity to DOM immediately
  if (furnitureEl.flushToDOM) {
    furnitureEl.flushToDOM();
  }
  
  // Now set remaining attributes after entity is in the scene
  // Get model URL from Supabase Storage or local path
  const modelUrl = getModelUrl(draggedItem.model);
  furnitureEl.setAttribute(
    "obj-model",
    `obj: url(${modelUrl})`
  );
  furnitureEl.setAttribute("scale", draggedItem.scale);
  furnitureEl.setAttribute(
    "draggable-furniture",
    `roomWidth: ${roomWidth}; roomLength: ${roomLength}; objectWidth: 1.5; objectLength: 1.5; wallThickness: 0.1`
  );
  furnitureEl.setAttribute("clickable-furniture", "");
  furnitureEl.setAttribute("material", "color: #FF8C00"); // Orange color for table
  // Store model key as data attribute for easy retrieval during deletion
  furnitureEl.setAttribute("data-model-key", draggedItem.model);
  
  // Listen for model-loaded event to hide placeholder
  furnitureEl.addEventListener("model-loaded", function() {
    const placeholder = furnitureEl.querySelector(`#${furnitureEl.id}-placeholder`);
    if (placeholder) {
      placeholder.remove();
    }
  });

  // Update cost estimator
  const itemName = getItemName(draggedItem.model);
  addItemToCost(draggedItem.model, itemName);
  
  // Expand cost panel when item is dropped
  const costPanel = document.getElementById("cost-panel");
  if (costPanel && costPanel.classList.contains("collapsed")) {
    costPanel.classList.remove("collapsed");
  }

  // Save workspace state
  saveWorkspaceState();

  // Clean up
  document.querySelectorAll(".model-item.dragging").forEach((item) => {
    item.classList.remove("dragging");
  });

  // Remove the drop indicator permanently after first furniture placement
  const dropIndicator = document.getElementById("drop-indicator");
  if (dropIndicator) {
    dropIndicator.style.display = "none";
  }

  draggedItem = null;
}

function addItemToCost(modelKey, displayName) {
  const price = PRICE_LIST[modelKey] || 0;
  
  if (!costState.items[modelKey]) {
    costState.items[modelKey] = {
      name: displayName,
      price: price, // Unit cost (estimated price)
      qty: 0,
      unitCost: price, // Store unit cost for display
    };
  }
  costState.items[modelKey].qty += 1;
  renderCost();
}

function peso(n) {
  return `₱${Number(n).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Some MSDF fonts in a-text may not include the peso glyph.
// Use a 3D-safe fallback for in-scene text.
function peso3D(n) {
  return `PHP ${Number(n).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// buildSourcesMarkup function removed - now using side panel

function renderCost() {
  // Update cost items list
  const costItemsList = document.getElementById("cost-items-list");
  if (costItemsList) {
    costItemsList.innerHTML = "";
  }
  
  let total = 0;
  Object.keys(costState.items).forEach((key) => {
    const item = costState.items[key];
    const unitCost = item.unitCost || item.price; // Unit cost (estimated price per unit)
    const lineTotal = unitCost * item.qty; // Total cost for this item (unit cost × quantity)
    total += lineTotal;
    
    const content = `
      <div class="cost-item-details">
        <div>
          <div class="cost-item-name">${item.name}</div>
          <div class="cost-item-meta">${item.qty} × ${peso(unitCost)} (unit cost)</div>
        </div>
        <div class="cost-source-controls">
          <button class="cost-source-toggle" data-model="${key}" data-item-name="${item.name}">Sources</button>
        </div>
      </div>
      <div class="cost-item-total">${peso(lineTotal)}</div>
    `;

    if (costItemsList) {
      const row = document.createElement("div");
      row.className = "cost-item";
      row.innerHTML = content;
      costItemsList.appendChild(row);
    }
  });
  costState.total = total; // Total project cost (sum of all line totals)
  const totalEl = document.getElementById("cost-total");
  if (totalEl) totalEl.textContent = peso(total);
  const totalDisplay = document.getElementById("cost-total-display");
  if (totalDisplay) totalDisplay.textContent = peso(total);
  
}

// Grid functions removed

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();
    togglePanel();
  }
  // Escape key handling removed (no back button)
  // Grid toggle removed
  
  // Save workspace state when furniture is moved (dragged)
  if (e.detail && e.detail.target && e.detail.target.id && e.detail.target.id.startsWith('furniture-')) {
    saveWorkspaceState();
  }
});

// Use event delegation for dynamically created source buttons
document.addEventListener("click", function (e) {
  // Check if clicked element is a source toggle button or inside one
  const toggle = e.target.closest(".cost-source-toggle");
  const sourcesPanel = document.getElementById("sources-panel");
  const clickedInsideSources = e.target.closest("#sources-panel");
  
  if (toggle) {
    e.preventDefault();
    e.stopPropagation();
    
    const modelKey = toggle.getAttribute("data-model");
    const itemName = toggle.getAttribute("data-item-name");
    
    if (!modelKey) return;
    
    // Show sources panel
    showSourcesPanel(modelKey, itemName);
  } else if (sourcesPanel && sourcesPanel.classList.contains("open") && !clickedInsideSources) {
    // Close sources panel if clicking outside
    closeSourcesPanel();
  }
});

/**
 * Show sources panel with item sources
 */
function showSourcesPanel(modelKey, itemName) {
  const sourcesPanel = document.getElementById("sources-panel");
  const sourcesTitle = document.getElementById("sources-panel-title");
  const sourcesContent = document.getElementById("sources-panel-content");
  
  if (!sourcesPanel || !sourcesTitle || !sourcesContent) return;
  
  // Update title
  sourcesTitle.textContent = itemName ? `${itemName} - Sources` : "Item Sources";
  
  // Get sources for this item
  const sources = ITEM_PRICE_SOURCES[modelKey] || [];
  
  if (sources.length === 0) {
    sourcesContent.innerHTML = `
      <div class="sources-empty">
        <p>No sources available for this item.</p>
      </div>
    `;
  } else {
    // Build sources list
    const sourcesHTML = sources.map(src => `
      <div class="source-item">
        <div class="source-store">${src.store}</div>
        <div class="source-price">${peso(src.price)}</div>
      </div>
    `).join("");
    
    sourcesContent.innerHTML = `
      <div class="sources-list">
        ${sourcesHTML}
      </div>
    `;
  }
  
  // Show panel
  sourcesPanel.classList.add("open");
}

/**
 * Close sources panel
 */
function closeSourcesPanel() {
  const sourcesPanel = document.getElementById("sources-panel");
  if (sourcesPanel) {
    sourcesPanel.classList.remove("open");
  }
}

// Sub-category functions
function showCenterTableSubcategory() {
  const sidePanel = document.getElementById("side-panel");
  if (!sidePanel) return;

  if (!sidePanel.dataset.originalContent) {
    sidePanel.dataset.originalContent = sidePanel.innerHTML;
  }

  const table1Name = getItemName('center_table1');
  const table2Name = getItemName('center_table2');

  const centerTableContent = `
    <div class="panel-header">
      <button onclick="goBackToMainPanel()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #f5f5f5; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-bottom: 10px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">← Back</button>
      <h3>🍽️ Center Table Options</h3>
      <small>Choose a center table style</small>
    </div>
    <div class="model-category">
      <div class="model-grid">
        <div
          class="model-item enabled"
          draggable="true"
          data-model="center_table1"
          data-scale="1 1 1"
        >
          <span class="model-icon">🍽️</span>
          <div class="model-name">${table1Name}</div>
        </div>
        <div
          class="model-item enabled"
          draggable="true"
          data-model="center_table2"
          data-scale="1 1 1"
        >
          <span class="model-icon">🍽️</span>
          <div class="model-name">${table2Name}</div>
        </div>
      </div>
    </div>
  `;

  sidePanel.innerHTML = centerTableContent;
  initializeDragAndDrop();
  updateSubcategoryUI();
}

function showWardrobeSubcategory() {
  const sidePanel = document.getElementById("side-panel");
  const mainContent = sidePanel.querySelector(".panel-header").nextElementSibling;
  
  // Store original content
  if (!sidePanel.dataset.originalContent) {
    sidePanel.dataset.originalContent = sidePanel.innerHTML;
  }
  
  // Get wardrobe names from metadata
  const wardrobe1Name = getItemName('wardrobe1');
  const wardrobe2Name = getItemName('wardrobe2');
  const wardrobe3Name = getItemName('wardrobe3');
  
  // Create wardrobe panel content
  const wardrobeContent = `
    <div class="panel-header">
      <button onclick="goBackToMainPanel()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #f5f5f5; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-bottom: 10px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">← Back</button>
      <h3>👔 Wardrobe Options</h3>
      <small>Choose a wardrobe style</small>
    </div>
    <div class="model-category">
      <div class="model-grid">
        <div
          class="model-item enabled"
          draggable="true"
          data-model="wardrobe1"
          data-scale="1 1 1"
        >
          <span class="model-icon">👔</span>
          <div class="model-name">${wardrobe1Name}</div>
        </div>
        <div
          class="model-item enabled"
          draggable="true"
          data-model="wardrobe2"
          data-scale="1 1 1"
        >
          <span class="model-icon">👔</span>
          <div class="model-name">${wardrobe2Name}</div>
        </div>
        <div
          class="model-item enabled"
          draggable="true"
          data-model="wardrobe3"
          data-scale="1 1 1"
        >
          <span class="model-icon">👔</span>
          <div class="model-name">${wardrobe3Name}</div>
        </div>
      </div>
    </div>
  `;
  
  // Replace panel content
  sidePanel.innerHTML = wardrobeContent;
  
  // Re-initialize drag and drop for new items
  initializeDragAndDrop();
  updateSubcategoryUI();
}

function goBackToMainPanel() {
  const sidePanel = document.getElementById("side-panel");
  const resizePanel = document.getElementById("resize-dimension-panel");
  
  // Hide resize panel
  if (resizePanel) {
    resizePanel.classList.remove("open");
  }
  
  // Show main side panel
  if (sidePanel) {
    sidePanel.classList.add("open");
    if (sidePanel.dataset.originalContent) {
      sidePanel.innerHTML = sidePanel.dataset.originalContent;
      // Re-initialize drag and drop
      initializeDragAndDrop();
      updateSubcategoryUI();
    }
  }
}

// Control panel functions
function showControlPanel(furnitureId) {
  selectedFurniture = furnitureId;
  const panel = document.getElementById("furniture-control-panel");
  const title = document.getElementById("control-panel-title");
  const furniture = document.getElementById(furnitureId);
  
  // Get item name from furniture element
  let itemName = furnitureId;
  if (furniture) {
    const modelKey = furniture.getAttribute("data-model-key");
    if (modelKey) {
      itemName = getItemName(modelKey);
    }
  }
  
  title.textContent = itemName;
  panel.style.display = "block";
}

function closeControlPanel() {
  const panel = document.getElementById("furniture-control-panel");
  panel.style.display = "none";
  selectedFurniture = null;
}

function rotateFurnitureLeft() {
  if (selectedFurniture) {
    const furniture = document.getElementById(selectedFurniture);
    if (furniture) {
      const currentRotation = furniture.getAttribute("rotation");
      const newRotation = (parseFloat(currentRotation.y) - 90) % 360;
      furniture.setAttribute(
        "rotation",
        `${currentRotation.x} ${newRotation} ${currentRotation.z}`
      );
      saveWorkspaceState();
    }
  }
}

function rotateFurnitureRight() {
  if (selectedFurniture) {
    const furniture = document.getElementById(selectedFurniture);
    if (furniture) {
      const currentRotation = furniture.getAttribute("rotation");
      const newRotation = (parseFloat(currentRotation.y) + 90) % 360;
      furniture.setAttribute(
        "rotation",
        `${currentRotation.x} ${newRotation} ${currentRotation.z}`
      );
      saveWorkspaceState();
    }
  }
}

function deleteFurniture() {
  if (!selectedFurniture) return;
  
  const furniture = document.getElementById(selectedFurniture);
  if (!furniture) return;

  // Extract model key
  let modelKey = null;
  try {
    modelKey = furniture.getAttribute("data-model-key");

    if (!modelKey) {
      const objModelAttr = furniture.getAttribute("obj-model");
      let objModelString = "";
      if (typeof objModelAttr === "string") {
        objModelString = objModelAttr;
      } else if (objModelAttr && typeof objModelAttr === "object") {
        objModelString = objModelAttr.obj || objModelAttr.src || "";
      }

      const match = objModelString.match(/models\/(\w+)\.obj/);
      if (match && match[1]) {
        modelKey = match[1];
      }
    }

    // Remove from cost estimator if we found the model key
    if (modelKey && costState.items[modelKey]) {
      costState.items[modelKey].qty -= 1;
      if (costState.items[modelKey].qty <= 0) {
        delete costState.items[modelKey];
      }
      renderCost();
    }
  } catch (error) {
    console.error("Error extracting model key:", error);
  }

  // Remove from scene
  furniture.remove();
  saveWorkspaceState();
  closeControlPanel();
}

/**
 * Save workspace state to localStorage
 * Expose globally so it can be called from other pages
 */
function saveWorkspaceState() {
  try {
    // Use collectRoomPlanData for consistent data format
    if (typeof collectRoomPlanData === 'function') {
      const roomPlanData = collectRoomPlanData();
      
      // Convert to format compatible with restoreRoom
      const state = {
        room_width: roomPlanData.room_width,
        room_length: roomPlanData.room_length,
        furniture_data: roomPlanData.furniture_data,
        cost_total: roomPlanData.cost_total,
        costState: costState, // Keep full cost state for compatibility
        furnitureCounter: furnitureCounter
      };
      
      // Save to currentRoomState for auto-restore
      localStorage.setItem('currentRoomState', JSON.stringify(state));
      
      // Also save to workspaceState for backward compatibility
      const furnitureData = roomPlanData.furniture_data.map(item => ({
        model_key: item.model_key,
        position: item.position,
        rotation: item.rotation,
        scale: item.scale
      }));
      
      const legacyState = {
        furniture: furnitureData,
        costState: costState,
        furnitureCounter: furnitureCounter
      };
      localStorage.setItem('workspaceState', JSON.stringify(legacyState));
      
      console.log(`Workspace state saved: ${furnitureData.length} furniture items`);
    } else {
      // Fallback to old method if collectRoomPlanData not available
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
      
      const state = {
        furniture: furnitureData,
        costState: costState,
        furnitureCounter: furnitureCounter
      };
      
      localStorage.setItem('workspaceState', JSON.stringify(state));
      console.log(`Workspace state saved: ${furnitureData.length} furniture items`);
    }
  } catch (error) {
    console.error('Error saving workspace state:', error);
  }
}

/**
 * Restore room from saved room plan data
 * @param {Object} roomData - Room plan data from collectRoomPlanData()
 */
function restoreRoom(roomData) {
  if (!roomData) {
    console.warn('No room data provided to restoreRoom');
    return;
  }
  
  try {
    // Restore room dimensions if provided
    if (roomData.room_width && roomData.room_length) {
      localStorage.setItem('roomWidth', roomData.room_width.toString());
      localStorage.setItem('roomLength', roomData.room_length.toString());
      // Reinitialize room with new dimensions
      initializeRoom();
    }
    
    // Restore furniture items
    const furnitureData = roomData.furniture_data || [];
    if (furnitureData.length === 0) {
      console.log('No furniture items to restore');
      return;
    }
    
    console.log(`Restoring ${furnitureData.length} furniture items from saved room state`);
    
    // Restore furniture counter
    if (roomData.furnitureCounter && typeof roomData.furnitureCounter === 'number') {
      furnitureCounter = Math.max(furnitureCounter, roomData.furnitureCounter);
    }
    
    // Restore furniture items
    const furnitureContainer = document.getElementById('furniture-container');
    if (!furnitureContainer) {
      console.warn('Furniture container not found');
      return;
    }
    
    const roomWidth = roomData.room_width || parseFloat(localStorage.getItem('roomWidth')) || 10;
    const roomLength = roomData.room_length || parseFloat(localStorage.getItem('roomLength')) || 10;
    
    // Clear existing furniture first to avoid duplicates
    const existingFurniture = furnitureContainer.querySelectorAll('[id^="furniture-"]');
    if (existingFurniture.length > 0) {
      console.log(`Clearing ${existingFurniture.length} existing furniture items before restore`);
      existingFurniture.forEach(item => item.remove());
    }
    
    for (const itemData of furnitureData) {
      // Validate item data
      if (!itemData.model_key || !itemData.position || 
          typeof itemData.position.x !== 'number' ||
          typeof itemData.position.y !== 'number' ||
          typeof itemData.position.z !== 'number') {
        console.warn('Invalid furniture item data:', itemData);
        continue;
      }
      
      const furnitureEl = document.createElement('a-entity');
      furnitureEl.id = `furniture-${furnitureCounter++}`;
      furnitureEl.setAttribute('position', `${itemData.position.x} ${itemData.position.y} ${itemData.position.z}`);
      
      // Handle rotation
      const rotation = itemData.rotation || { x: 0, y: 0, z: 0 };
      furnitureEl.setAttribute('rotation', `${rotation.x} ${rotation.y} ${rotation.z}`);
      
      // Handle scale
      const scale = itemData.scale || { x: 1, y: 1, z: 1 };
      furnitureEl.setAttribute('scale', `${scale.x} ${scale.y} ${scale.z}`);
      
      furnitureEl.setAttribute('data-model-key', itemData.model_key);
      
      // Create placeholder
      const placeholderEl = document.createElement('a-box');
      placeholderEl.setAttribute('width', '1.5');
      placeholderEl.setAttribute('height', '0.8');
      placeholderEl.setAttribute('depth', '1.5');
      placeholderEl.setAttribute('color', '#FF8C00');
      placeholderEl.setAttribute('opacity', '0.7');
      placeholderEl.id = `${furnitureEl.id}-placeholder`;
      furnitureEl.appendChild(placeholderEl);
      
      furnitureContainer.appendChild(furnitureEl);
      
      if (furnitureEl.flushToDOM) {
        furnitureEl.flushToDOM();
      }
      
      // Load model
      const modelUrl = getModelUrl(itemData.model_key);
      furnitureEl.setAttribute('obj-model', `obj: url(${modelUrl})`);
      furnitureEl.setAttribute(
        'draggable-furniture',
        `roomWidth: ${roomWidth}; roomLength: ${roomLength}; objectWidth: 1.5; objectLength: 1.5; wallThickness: 0.1`
      );
      furnitureEl.setAttribute('clickable-furniture', '');
      furnitureEl.setAttribute('material', 'color: #FF8C00');
      
      // Remove placeholder when model loads
      furnitureEl.addEventListener('model-loaded', function() {
        const placeholder = furnitureEl.querySelector(`#${furnitureEl.id}-placeholder`);
        if (placeholder) {
          placeholder.remove();
        }
      }, { once: true });
    }
    
    // Restore cost state
    if (roomData.costState && roomData.costState.items && typeof roomData.costState.items === 'object') {
      costState.items = roomData.costState.items;
      costState.total = typeof roomData.costState.total === 'number' ? roomData.costState.total : 0;
      renderCost();
      console.log('Cost state restored');
      
      // Expand cost panel if there are items
      const costPanel = document.getElementById("cost-panel");
      if (costPanel && Object.keys(costState.items).length > 0) {
        costPanel.classList.remove("collapsed");
      }
    } else if (roomData.cost_total) {
      // If only cost_total is provided, update it
      costState.total = roomData.cost_total;
      renderCost();
    }
    
    // Expand cost panel if furniture was restored
    if (furnitureData.length > 0) {
      const costPanel = document.getElementById("cost-panel");
      if (costPanel) {
        costPanel.classList.remove("collapsed");
      }
    }
    
    console.log('Room restored successfully');
    
  } catch (error) {
    console.error('Error restoring room:', error);
  }
}

/**
 * Restore workspace state from localStorage (legacy support)
 */
async function restoreWorkspaceState() {
  // First try to restore from currentRoomState (new format)
  try {
    const currentStateJson = localStorage.getItem('currentRoomState');
    if (currentStateJson) {
      const currentState = JSON.parse(currentStateJson);
      restoreRoom(currentState);
      return;
    }
  } catch (error) {
    console.warn('Error restoring from currentRoomState, trying legacy format:', error);
  }
  
  // Fallback to legacy workspaceState format
  try {
    const stateJson = localStorage.getItem('workspaceState');
    if (!stateJson) {
      console.log('No workspace state found in localStorage');
      return;
    }
    
    let state;
    try {
      state = JSON.parse(stateJson);
    } catch (parseError) {
      console.error('Error parsing workspace state from localStorage:', parseError);
      // Clear corrupted data
      localStorage.removeItem('workspaceState');
      return;
    }
    
    if (!state || !state.furniture || !Array.isArray(state.furniture)) {
      console.warn('Invalid workspace state structure');
      return;
    }
    
    if (state.furniture.length === 0) {
      console.log('Workspace state has no furniture items to restore');
      return;
    }
    
    console.log(`Restoring ${state.furniture.length} furniture items from legacy saved state`);
    
    // Convert legacy format to new format
    const roomData = {
      room_width: parseFloat(localStorage.getItem('roomWidth')) || 10,
      room_length: parseFloat(localStorage.getItem('roomLength')) || 10,
      furniture_data: state.furniture,
      costState: state.costState,
      furnitureCounter: state.furnitureCounter
    };
    
    restoreRoom(roomData);
    
  } catch (error) {
    console.error('Error restoring workspace state:', error);
    // Don't clear state on error - might be recoverable
  }
}

/**
 * Show welcome dialog with instructions (one-time only)
 */
function showWelcomeDialog() {
  // Check if welcome dialog has been shown before
  const welcomeShown = localStorage.getItem('welcomeDialogShown');
  if (welcomeShown === 'true') {
    return; // Don't show again
  }

  // Get room dimensions for display
  const width = localStorage.getItem("roomWidth") || "?";
  const length = localStorage.getItem("roomLength") || "?";
  const height = localStorage.getItem("roomHeight") || "?";

  const welcomeContent = `
    <div class="welcome-dialog-content">
      <h2 class="welcome-title">Welcome to 3D Room Planner! 🎉</h2>
      <p class="welcome-subtitle">Your room: ${width}M × ${length}M × ${height}M</p>
      
      <div class="welcome-section">
        <h3>🎮 Controls</h3>
        <ul>
          <li><strong>W/A/S/D</strong> → Move around</li>
          <li><strong>Q</strong> → Move Up | <strong>E</strong> → Move Down</li>
          <li><strong>Mouse</strong> → Look around</li>
        </ul>
      </div>

      <div class="welcome-section">
        <h3>🍽️ Furniture</h3>
        <ul>
          <li><strong>📦</strong> Click panel button to open library</li>
          <li><strong>🖱️</strong> Drag furniture into your room</li>
          <li><strong>🖱️</strong> Click an item to show more options</li>
        </ul>
      </div>

      <div class="welcome-section">
        <h3>📊 Cost Board</h3>
        <ul>
          <li><strong>💰</strong> View costs and total in the cost panel</li>
          <li><strong>👀</strong> Walk around to view from different angles</li>
        </ul>
      </div>

      <div class="welcome-tip">
        💡 <strong>Tip:</strong> Hover over the <strong>❔</strong> button anytime to see these instructions again!
      </div>
    </div>
  `;

  // Create custom welcome dialog
  const modal = document.getElementById('dialog-modal');
  const content = document.getElementById('dialog-content');
  const titleEl = document.getElementById('dialog-title');
  const messageEl = document.getElementById('dialog-message');
  const buttonsEl = document.getElementById('dialog-buttons');
  
  if (!modal || !content) {
    console.warn('Dialog modal not found');
    return;
  }
  
  // Hide default title and message, use custom content
  titleEl.style.display = 'none';
  messageEl.innerHTML = welcomeContent;
  messageEl.style.margin = '0';
  messageEl.style.padding = '0';
  
  // Add close button
  buttonsEl.innerHTML = '<button id="dialog-ok-btn" class="dialog-btn dialog-btn-primary">Got it!</button>';
  
  // Show modal
  modal.style.display = 'flex';
  content.classList.add('welcome-dialog');
  
  // Handle close button
  const okBtn = document.getElementById('dialog-ok-btn');
  const closeDialog = () => {
    modal.style.display = 'none';
    content.classList.remove('welcome-dialog');
    // Mark as shown
    localStorage.setItem('welcomeDialogShown', 'true');
  };
  
  okBtn.onclick = closeDialog;
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeDialog();
    }
  };
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Initialize room when page loads
window.addEventListener("load", async function () {
  // Load items and prices from Supabase first
  await loadItemsAndPrices();
  
  // Initialize auth UI
  if (typeof initAuthUI === 'function') {
    initAuthUI();
  }

  // Update subcategory names in UI
  updateSubcategoryUI();
  
  // Attach click event listener to drop indicator (attach once on load)
  const dropIndicator = document.getElementById("drop-indicator");
  if (dropIndicator) {
    dropIndicator.addEventListener("click", handleDropIndicatorClick);
  }
  
  // Store original side panel content for wardrobe navigation
  const sidePanel = document.getElementById("side-panel");
  if (sidePanel && !sidePanel.dataset.originalContent) {
    sidePanel.dataset.originalContent = sidePanel.innerHTML;
  }

  // Make sure A-Frame scene is ready
  const scene = document.querySelector("a-scene");
  if (scene.hasLoaded) {
    initializeRoom();
    // Auto-restore room state after room is initialized
    // Use longer timeout to ensure scene is fully ready
    setTimeout(() => {
      // Try to restore from currentRoomState first (auto-restore)
      const saved = localStorage.getItem('currentRoomState');
      if (saved) {
        try {
          const roomData = JSON.parse(saved);
          restoreRoom(roomData);
          console.log('Room state auto-restored from currentRoomState');
        } catch (error) {
          console.error('Error parsing currentRoomState, trying legacy restore:', error);
          restoreWorkspaceState();
        }
      } else {
        // Fallback to legacy restore
        restoreWorkspaceState();
      }
      
      // Show welcome dialog after room is initialized (one-time only)
      setTimeout(() => {
        showWelcomeDialog();
      }, 1000);
    }, 800);
  } else {
    scene.addEventListener("loaded", function () {
      initializeRoom();
      // Auto-restore room state after room is initialized
      // Use longer timeout to ensure scene is fully ready
      setTimeout(() => {
        // Try to restore from currentRoomState first (auto-restore)
        const saved = localStorage.getItem('currentRoomState');
        if (saved) {
          try {
            const roomData = JSON.parse(saved);
            restoreRoom(roomData);
            console.log('Room state auto-restored from currentRoomState');
          } catch (error) {
            console.error('Error parsing currentRoomState, trying legacy restore:', error);
            restoreWorkspaceState();
          }
        } else {
          // Fallback to legacy restore
          restoreWorkspaceState();
        }
        
        // Show welcome dialog after room is initialized (one-time only)
        setTimeout(() => {
          showWelcomeDialog();
        }, 1000);
      }, 800);
    });
  }

  // Ensure cost panel renders at least once on load
  renderCost();
  
  // Keep cost panel collapsed on startup if no items
  const costPanel = document.getElementById("cost-panel");
  if (costPanel && Object.keys(costState.items).length === 0) {
    costPanel.classList.add("collapsed");
  }
  
  // Save state before page unload using collectRoomPlanData
  window.addEventListener('beforeunload', () => {
    if (typeof collectRoomPlanData === 'function') {
      const roomPlanData = collectRoomPlanData();
      localStorage.setItem('currentRoomState', JSON.stringify({
        ...roomPlanData,
        costState: costState,
        furnitureCounter: furnitureCounter
      }));
      console.log('Room state auto-saved on page unload');
    } else {
      saveWorkspaceState();
    }
  });
  
  // Also save on visibility change (when tab becomes hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (typeof collectRoomPlanData === 'function') {
        const roomPlanData = collectRoomPlanData();
        localStorage.setItem('currentRoomState', JSON.stringify({
          ...roomPlanData,
          costState: costState,
          furnitureCounter: furnitureCounter
        }));
      } else {
        saveWorkspaceState();
      }
    }
  });
});

/**
 * Update subcategory UI with names from metadata
 */
function updateSubcategoryUI() {
  const selectors = ['[data-model^="wardrobe"]', '[data-model^="center_table"]'];
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(item => {
      const modelKey = item.getAttribute('data-model');
      const nameEl = item.querySelector('.model-name');
      if (nameEl && modelKey) {
        nameEl.textContent = getItemName(modelKey);
      }
    });
  });
}

/**
 * Handle save estimation button click
 */
async function handleSaveEstimation() {
  const isAuthenticated = await checkAuth();
  
  if (!isAuthenticated) {
    showAuthModal(async () => {
      await handleSaveEstimation();
    });
    return;
  }
  
  try {
    const nameInput = await showPrompt('Enter a name for this cost estimation:', '', 'Save Cost Estimation');
    const estimationName = (nameInput && nameInput.trim()) || `Cost Estimation ${new Date().toLocaleString()}`;
    
    if (typeof saveCostEstimation === 'function') {
      saveCostEstimation(estimationName);
      
      // Show notification
      const notification = document.getElementById('save-estimation-notification');
      if (notification) {
        notification.textContent = 'saved to profile';
        notification.classList.add('show');
        
        // Hide notification after 3 seconds
        setTimeout(() => {
          notification.classList.remove('show');
        }, 3000);
      }
    } else {
      await showDialog('Error: Save function not available', 'Error');
    }
  } catch (error) {
    console.error('Error saving cost estimation:', error);
    await showDialog('Unable to save cost estimation. Please try again.', 'Error');
  }
}

// Expose globally for onclick handler
window.handleSaveEstimation = handleSaveEstimation;
window.saveWorkspaceState = saveWorkspaceState;
window.restoreRoom = restoreRoom;


