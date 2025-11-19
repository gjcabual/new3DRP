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
    console.log('Loading items and prices from Supabase...');
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
      const modelKey = price.items?.model_key;
      if (!modelKey) return;

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

    console.log('Items and prices loaded:', PRICE_LIST);
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

  if (!width || !length) {
    alert("No room dimensions found. Redirecting to setup...");
    window.location.href = "index.html";
    return;
  }

  console.log(
    "Initializing room with dimensions:",
    width + "M x " + length + "M"
  );

  // Convert m to A-Frame units (1:1 ratio)
  const aframeWidth = parseFloat(width);
  const aframeLength = parseFloat(length);

  // Update floor size
  const floor = document.getElementById("floor");
  floor.setAttribute("width", aframeWidth);
  floor.setAttribute("height", aframeLength);

  // Create room walls
  createRoomWalls(aframeWidth, aframeLength);

  // Update room info
  document.getElementById(
    "room-info"
  ).innerHTML = `<strong>Room:</strong> ${width}M × ${length}M`;

  // Position camera appropriately
  const cameraRig = document.getElementById("cameraRig");
  const cameraDistance = Math.max(aframeWidth, aframeLength) * 0.8;
  cameraRig.setAttribute("position", `0 1.6 ${cameraDistance}`);

  // Wait for scene to be ready, then initialize drag and drop
  const scene = document.querySelector("a-scene");
  if (scene.hasLoaded) {
    initializeDragAndDrop();
  } else {
    scene.addEventListener("loaded", initializeDragAndDrop);
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
      console.log(
        "Drop indicator shown - click it to open furniture library"
      );
    }
  }, 500);

  // Test movement system
  setTimeout(() => {
    console.log(
      "Movement system should be ready. Try WASD keys and Q/E for up/down."
    );
    console.log(
      "If movement doesn't work, check the browser console for error messages."
    );
  }, 1000);
}

function createRoomWalls(width, length) {
  const wallsContainer = document.getElementById("room-walls");
  const wallHeight = 3;
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

  // Add a grid helper for better spatial awareness
  createGridHelper(width, length);
}

function togglePanel() {
  panelOpen = !panelOpen;
  const panel = document.getElementById("side-panel");
  const toggle = document.getElementById("panel-toggle");
  const backButton = document.getElementById("back-button");

  if (panelOpen) {
    panel.classList.add("open");
    toggle.innerHTML = "✕";
    toggle.style.left = "310px";
    // Move back button to the right when panel is open
    if (backButton) {
      backButton.style.left = "310px";
    }
  } else {
    panel.classList.remove("open");
    toggle.innerHTML = "📦";
    toggle.style.left = "20px";
    // Move back button back to original position when panel is closed
    if (backButton) {
      backButton.style.left = "20px";
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

  console.log("Drop indicator clicked, opening panel");

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

function goBack() {
  window.location.href = "index.html";
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
      console.log(`Model loaded for ${furnitureEl.id}, placeholder removed`);
    }
  });

  // Update cost estimator
  const itemName = getItemName(draggedItem.model);
  addItemToCost(draggedItem.model, itemName);

  // Clean up
  document.querySelectorAll(".model-item.dragging").forEach((item) => {
    item.classList.remove("dragging");
  });

  // Remove the drop indicator permanently after first furniture placement
  const dropIndicator = document.getElementById("drop-indicator");
  if (dropIndicator) {
    dropIndicator.style.display = "none";
  }

  console.log(
    `Added ${draggedItem.name} to room at position ${dropX}, ${dropZ}`
  );
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

function buildSourcesMarkup(modelKey) {
  const sources = ITEM_PRICE_SOURCES[modelKey] || [];
  if (!sources.length) {
    return `
      <div class="cost-source-list" data-model="${modelKey}">
        <div class="cost-source-empty">No sources available</div>
      </div>
    `;
  }
  const items = sources
    .map(
      (src) => `
        <div class="cost-source-item">
          <span>${src.store}</span>
          <span>${peso(src.price)}</span>
        </div>
      `
    )
    .join("");
  return `
    <div class="cost-source-list" data-model="${modelKey}">
      ${items}
    </div>
  `;
}

function renderCost() {
  // Update HTML panel if present (old cost panel)
  const itemsContainer = document.getElementById("cost-items");
  if (itemsContainer) {
    itemsContainer.innerHTML = "";
  }
  
  // Update new toggleable cost panel
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
    
    // HTML list (if exists - old panel)
    const sourcesMarkup = buildSourcesMarkup(key);
    const content = `
      <div class="cost-item-details">
        <div>
          <div class="cost-item-name">${item.name}</div>
          <div class="cost-item-meta">${item.qty} × ${peso(unitCost)} (unit cost)</div>
        </div>
        <div class="cost-source-controls">
          <button class="cost-source-toggle" data-model="${key}">Sources</button>
          ${sourcesMarkup}
        </div>
      </div>
      <div class="cost-item-total">${peso(lineTotal)}</div>
    `;

    if (itemsContainer) {
      const row = document.createElement("div");
      row.className = "cost-item";
      row.innerHTML = content;
      itemsContainer.appendChild(row);
    }
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
  
  console.log(`Total Project Cost: ${peso(total)}`);
}

// Create a subtle grid helper for better spatial awareness
function createGridHelper(roomWidth, roomLength) {
  const gridContainer = document.getElementById("grid-helper");
  gridContainer.innerHTML = "";

  const gridSize = 0.5; // 50cm grid squares
  const gridColor = "#e0e0e0";
  const gridOpacity = 0.3;

  // Create grid lines along width
  for (let x = -roomWidth / 2; x <= roomWidth / 2; x += gridSize) {
    const line = document.createElement("a-box");
    line.setAttribute("position", `${x} 0.001 0`);
    line.setAttribute("width", "0.02");
    line.setAttribute("height", "0.001");
    line.setAttribute("depth", roomLength);
    line.setAttribute("color", gridColor);
    line.setAttribute("opacity", gridOpacity);
    gridContainer.appendChild(line);
  }

  // Create grid lines along length
  for (let z = -roomLength / 2; z <= roomLength / 2; z += gridSize) {
    const line = document.createElement("a-box");
    line.setAttribute("position", `0 0.001 ${z}`);
    line.setAttribute("width", roomWidth);
    line.setAttribute("height", "0.001");
    line.setAttribute("depth", "0.02");
    line.setAttribute("color", gridColor);
    line.setAttribute("opacity", gridOpacity);
    gridContainer.appendChild(line);
  }
}

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();
    togglePanel();
  }
  if (e.key === "Escape") {
    goBack();
  }
  if (e.key === "g" || e.key === "G") {
    // Toggle grid visibility
    const grid = document.getElementById("grid-helper");
    const isVisible = grid.getAttribute("visible") !== "false";
    grid.setAttribute("visible", !isVisible);
    console.log("Grid", isVisible ? "hidden" : "shown");
  }
});

document.addEventListener("click", function (e) {
  const toggle = e.target.closest(".cost-source-toggle");
  if (!toggle) return;
  const modelKey = toggle.getAttribute("data-model");
  const list = toggle.parentElement?.querySelector(
    `.cost-source-list[data-model="${modelKey}"]`
  );
  if (!list) return;
  list.classList.toggle("open");
});

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
      <button onclick="goBackToMainPanel()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-bottom: 10px;">← Back</button>
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
      <button onclick="goBackToMainPanel()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-bottom: 10px;">← Back</button>
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
  if (sidePanel.dataset.originalContent) {
    sidePanel.innerHTML = sidePanel.dataset.originalContent;
    // Re-initialize drag and drop
    initializeDragAndDrop();
    updateSubcategoryUI();
  }
}

// Control panel functions
function showControlPanel(furnitureId) {
  console.log("showControlPanel called with:", furnitureId);
  selectedFurniture = furnitureId;
  console.log("selectedFurniture set to:", selectedFurniture);
  const panel = document.getElementById("furniture-control-panel");
  const title = document.getElementById("control-panel-title");
  title.textContent = `Controls for ${furnitureId}`;
  panel.style.display = "block";
  console.log("Control panel should be visible now");
}

function closeControlPanel() {
  console.log("closeControlPanel called, clearing selectedFurniture");
  const panel = document.getElementById("furniture-control-panel");
  panel.style.display = "none";
  selectedFurniture = null;
  console.log("selectedFurniture cleared");
}

function rotateFurnitureLeft() {
  console.log(
    "rotateFurnitureLeft called, selectedFurniture:",
    selectedFurniture
  );
  if (selectedFurniture) {
    const furniture = document.getElementById(selectedFurniture);
    console.log("Found furniture for rotation:", furniture);
    if (furniture) {
      const currentRotation = furniture.getAttribute("rotation");
      const newRotation = (parseFloat(currentRotation.y) - 90) % 360;
      furniture.setAttribute(
        "rotation",
        `${currentRotation.x} ${newRotation} ${currentRotation.z}`
      );
      console.log(
        `Rotated ${selectedFurniture} left to ${newRotation} degrees`
      );
    }
  } else {
    console.log("No furniture selected for rotation");
  }
}

function rotateFurnitureRight() {
  console.log(
    "rotateFurnitureRight called, selectedFurniture:",
    selectedFurniture
  );
  if (selectedFurniture) {
    const furniture = document.getElementById(selectedFurniture);
    console.log("Found furniture for rotation:", furniture);
    if (furniture) {
      const currentRotation = furniture.getAttribute("rotation");
      const newRotation = (parseFloat(currentRotation.y) + 90) % 360;
      furniture.setAttribute(
        "rotation",
        `${currentRotation.x} ${newRotation} ${currentRotation.z}`
      );
      console.log(
        `Rotated ${selectedFurniture} right to ${newRotation} degrees`
      );
    }
  } else {
    console.log("No furniture selected for rotation");
  }
}

function deleteFurniture() {
  console.log(
    "Delete button clicked, selectedFurniture:",
    selectedFurniture
  );
  if (selectedFurniture) {
    const furniture = document.getElementById(selectedFurniture);
    console.log("Found furniture element:", furniture);
    if (furniture) {
      // Extract model key - first try data attribute, then fallback to parsing obj-model
      let modelKey = null;
      try {
        // First, try to get from data attribute (most reliable)
        modelKey = furniture.getAttribute("data-model-key");

        // If not found, try to extract from obj-model attribute
        if (!modelKey) {
          const objModelAttr = furniture.getAttribute("obj-model");
          console.log("obj-model attribute value:", objModelAttr);

          // Handle both string and object formats
          let objModelString = "";
          if (typeof objModelAttr === "string") {
            objModelString = objModelAttr;
          } else if (objModelAttr && typeof objModelAttr === "object") {
            // A-Frame might store it as an object with 'obj' property
            objModelString = objModelAttr.obj || objModelAttr.src || "";
          }

          // Extract model name using regex
          const match = objModelString.match(/models\/(\w+)\.obj/);
          if (match && match[1]) {
            modelKey = match[1];
          }
        }

        console.log("Model key for deletion:", modelKey);

        // Remove from cost estimator if we found the model key
        if (modelKey && costState.items[modelKey]) {
          costState.items[modelKey].qty -= 1;
          if (costState.items[modelKey].qty <= 0) {
            delete costState.items[modelKey];
          }
          renderCost();
        } else if (modelKey) {
          console.warn(
            "Model key found but not in cost state:",
            modelKey
          );
        }
      } catch (error) {
        console.error("Error extracting model key:", error);
        // Continue with deletion even if cost update fails
      }

      // Remove from scene
      furniture.remove();
      console.log(`Deleted ${selectedFurniture}`);
      closeControlPanel();
    } else {
      console.error("Furniture element not found:", selectedFurniture);
    }
  } else {
    console.error("No furniture selected for deletion");
  }
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
    console.log("Drop indicator click listener attached");
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
  } else {
    scene.addEventListener("loaded", function () {
      console.log("A-Frame scene loaded, initializing room...");
      initializeRoom();
    });
  }

  // Ensure cost panel renders at least once on load
  renderCost();
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


