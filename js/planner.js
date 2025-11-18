let draggedItem = null;
let furnitureCounter = 0;
let panelOpen = false;
let selectedFurniture = null; // Track currently selected furniture

// Multi-source price data for wardrobes (prices from different stores in Butuan City)
const WARDROBE_PRICE_SOURCES = {
  wardrobe1: {
    name: "Wardrobe 1",
    stores: {
      "All-Home": 11500,      // Price from All-Home
      "Wilcon Depot": 12500,  // Price from Wilcon Depot
      "Gaisano": 12000,       // Price from Gaisano
      "Local suppliers": 11800 // Price from Local suppliers
    }
  },
  wardrobe2: {
    name: "Wardrobe 2",
    stores: {
      "All-Home": 14500,      // Price from All-Home
      "Wilcon Depot": 15500,  // Price from Wilcon Depot
      "Gaisano": 15000,       // Price from Gaisano
      "Local suppliers": 14800 // Price from Local suppliers
    }
  },
  wardrobe3: {
    name: "Wardrobe 3",
    stores: {
      "All-Home": 17500,      // Price from All-Home
      "Wilcon Depot": 18500,  // Price from Wilcon Depot
      "Gaisano": 18000,       // Price from Gaisano
      "Local suppliers": 17800 // Price from Local suppliers
    }
  }
};

// Function to calculate estimated price using arithmetic mean
// Formula: Estimated Price = (P1 + P2 + P3 + ...) / n
// where P1, P2, P3 = prices from each store
// and n = number of sources
function calculateEstimatedPrice(wardrobeKey) {
  const wardrobeData = WARDROBE_PRICE_SOURCES[wardrobeKey];
  if (!wardrobeData) return 0;
  
  const prices = Object.values(wardrobeData.stores);
  const n = prices.length;
  
  if (n === 0) return 0;
  
  // Calculate arithmetic mean: Estimated Price = (P1 + P2 + P3 + ...) / n
  const sum = prices.reduce((acc, price) => acc + price, 0);
  const estimatedPrice = sum / n;
  
  // Round to 2 decimal places for currency
  return Math.round(estimatedPrice * 100) / 100;
}

// Helper function to get price breakdown for a wardrobe (for debugging/display)
function getPriceBreakdown(wardrobeKey) {
  const wardrobeData = WARDROBE_PRICE_SOURCES[wardrobeKey];
  if (!wardrobeData) return null;
  
  const prices = Object.entries(wardrobeData.stores);
  const estimatedPrice = calculateEstimatedPrice(wardrobeKey);
  
  return {
    name: wardrobeData.name,
    sources: prices.map(([store, price]) => ({ store, price })),
    estimatedPrice: estimatedPrice,
    sourceCount: prices.length
  };
}

// Compute estimated prices for all wardrobes
const COMPUTED_WARDROBE_PRICES = {};
console.log('=== PRICE CONSOLIDATION SYSTEM ===');
console.log('Computing estimated prices from multiple sources (Butuan City stores)...\n');
Object.keys(WARDROBE_PRICE_SOURCES).forEach(key => {
  const breakdown = getPriceBreakdown(key);
  COMPUTED_WARDROBE_PRICES[key] = calculateEstimatedPrice(key);
  
  console.log(`${breakdown.name}:`);
  breakdown.sources.forEach(({store, price}) => {
    console.log(`  - ${store}: ₱${price.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
  });
  const sum = breakdown.sources.reduce((acc, {price}) => acc + price, 0);
  console.log(`  Sum: ₱${sum.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
  console.log(`  Sources: ${breakdown.sourceCount}`);
  console.log(`  Estimated Price (Average): ₱${breakdown.estimatedPrice.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
  console.log(`  Formula: (${breakdown.sources.map(s => s.price).join(' + ')}) / ${breakdown.sourceCount} = ${breakdown.estimatedPrice}\n`);
});
console.log('=== PRICE CONSOLIDATION COMPLETE ===\n');

// Final price list with computed estimates
const PRICE_LIST = {
  table1: 8500, // ₱8,500 price for center table
  wardrobe1: COMPUTED_WARDROBE_PRICES.wardrobe1,
  wardrobe2: COMPUTED_WARDROBE_PRICES.wardrobe2,
  wardrobe3: COMPUTED_WARDROBE_PRICES.wardrobe3,
};

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

  // Position in-scene cost board at the right wall
  const costBoard = document.getElementById("cost-board");
  if (costBoard) {
    const boardX = aframeWidth / 2 - 0.1; // position just inside the wall for visibility
    costBoard.setAttribute("position", `${boardX} 1.5 0`);
    costBoard.setAttribute("rotation", `0 -90 0`);
    console.log(`Cost board positioned at: ${boardX} 1.5 0`);
  }

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

function toggleInstructions() {
  const instructions = document.getElementById("instructions");
  const toggle = document.getElementById("instructions-toggle");

  instructions.classList.toggle("collapsed");

  if (instructions.classList.contains("collapsed")) {
    toggle.textContent = "?";
  } else {
    toggle.textContent = "−";
  }
  
  // Update cost panel position after instructions panel changes
  updateCostPanelPosition();
}

function updateCostPanelPosition() {
  const instructions = document.getElementById("instructions");
  const costPanel = document.getElementById("cost-estimation-panel");
  
  if (!instructions || !costPanel) return;
  
  // Wait for any transitions to complete
  setTimeout(() => {
    // Get instructions panel position and dimensions
    const instructionsRect = instructions.getBoundingClientRect();
    const gap = 10; // Gap between panels
    
    // Calculate top position: instructions bottom + gap
    const topPosition = instructionsRect.bottom + gap - window.scrollY;
    
    // Update cost panel position
    costPanel.style.top = `${topPosition}px`;
  }, 50);
}

function toggleCostPanel() {
  const costPanel = document.getElementById("cost-estimation-panel");
  const toggle = document.getElementById("cost-toggle");

  costPanel.classList.toggle("collapsed");

  if (costPanel.classList.contains("collapsed")) {
    toggle.textContent = "💰";
  } else {
    toggle.textContent = "−";
  }
  
  // Update position after toggling (in case instructions panel changed)
  updateCostPanelPosition();
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
  placeholderEl.setAttribute("color", "#8B4513");
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
  furnitureEl.setAttribute(
    "obj-model",
    `obj: url(models/${draggedItem.model}.obj)`
  );
  furnitureEl.setAttribute("scale", draggedItem.scale);
  furnitureEl.setAttribute(
    "draggable-furniture",
    `roomWidth: ${roomWidth}; roomLength: ${roomLength}; objectWidth: 1.5; objectLength: 1.5; wallThickness: 0.1`
  );
  furnitureEl.setAttribute("clickable-furniture", "");
  furnitureEl.setAttribute("material", "color: #8B4513"); // Brown color for table
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
  addItemToCost(draggedItem.model, draggedItem.name);

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
  // Update 3D board lines
  const linesRoot = document.getElementById("cost-lines");
  if (linesRoot) {
    while (linesRoot.firstChild)
      linesRoot.removeChild(linesRoot.firstChild);
  }
  let y = 0; // start at 0, step down per line
  Object.keys(costState.items).forEach((key) => {
    const item = costState.items[key];
    const unitCost = item.unitCost || item.price; // Unit cost (estimated price per unit)
    const lineTotal = unitCost * item.qty; // Total cost for this item (unit cost × quantity)
    total += lineTotal;
    
    // HTML list (if exists - old panel)
    if (itemsContainer) {
      const row = document.createElement("div");
      row.className = "cost-item";
      row.innerHTML = `
        <div>
          <div class="cost-item-name">${item.name}</div>
          <div class="cost-item-meta">${item.qty} × ${peso(unitCost)} (unit cost)</div>
        </div>
        <div>${peso(lineTotal)}</div>
      `;
      itemsContainer.appendChild(row);
    }
    // New toggleable cost panel
    if (costItemsList) {
      const row = document.createElement("div");
      row.className = "cost-item";
      row.innerHTML = `
        <div>
          <div class="cost-item-name">${item.name}</div>
          <div class="cost-item-meta">${item.qty} × ${peso(unitCost)} (unit cost)</div>
        </div>
        <div>${peso(lineTotal)}</div>
      `;
      costItemsList.appendChild(row);
    }
    // 3D board line
    if (linesRoot) {
      const line = document.createElement("a-text");
      line.setAttribute(
        "value",
        `${item.name} x ${item.qty} = ${peso3D(lineTotal)}`
      );
      line.setAttribute("color", "#333");
      line.setAttribute("position", `0 ${y.toFixed(2)} 0`);
      line.setAttribute("width", "2.6");
      linesRoot.appendChild(line);
      y -= 0.18; // line spacing
    }
  });
  costState.total = total; // Total project cost (sum of all line totals)
  const totalEl = document.getElementById("cost-total");
  if (totalEl) totalEl.textContent = peso(total);
  const totalDisplay = document.getElementById("cost-total-display");
  if (totalDisplay) totalDisplay.textContent = peso(total);
  const total3D = document.getElementById("cost-total-text");
  if (total3D) total3D.setAttribute("value", `Total Project Cost: ${peso3D(total)}`);
  
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
  if (e.key === "h" || e.key === "H") {
    // Toggle instructions
    e.preventDefault();
    toggleInstructions();
  }
});

// Sub-category functions
function showWardrobeSubcategory() {
  const sidePanel = document.getElementById("side-panel");
  const mainContent = sidePanel.querySelector(".panel-header").nextElementSibling;
  
  // Store original content
  if (!sidePanel.dataset.originalContent) {
    sidePanel.dataset.originalContent = sidePanel.innerHTML;
  }
  
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
          <div class="model-name">Wardrobe 1</div>
        </div>
        <div
          class="model-item enabled"
          draggable="true"
          data-model="wardrobe2"
          data-scale="1 1 1"
        >
          <span class="model-icon">👔</span>
          <div class="model-name">Wardrobe 2</div>
        </div>
        <div
          class="model-item enabled"
          draggable="true"
          data-model="wardrobe3"
          data-scale="1 1 1"
        >
          <span class="model-icon">👔</span>
          <div class="model-name">Wardrobe 3</div>
        </div>
      </div>
    </div>
  `;
  
  // Replace panel content
  sidePanel.innerHTML = wardrobeContent;
  
  // Re-initialize drag and drop for new items
  initializeDragAndDrop();
}

function goBackToMainPanel() {
  const sidePanel = document.getElementById("side-panel");
  if (sidePanel.dataset.originalContent) {
    sidePanel.innerHTML = sidePanel.dataset.originalContent;
    // Re-initialize drag and drop
    initializeDragAndDrop();
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
window.addEventListener("load", function () {
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

  // Initialize cost panel position
  setTimeout(() => {
    updateCostPanelPosition();
  }, 100);
  
  // Update cost panel position when window resizes
  window.addEventListener("resize", updateCostPanelPosition);
  
  // Update cost panel position after instructions panel transitions
  const instructions = document.getElementById("instructions");
  if (instructions) {
    instructions.addEventListener("transitionend", updateCostPanelPosition);
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
});

