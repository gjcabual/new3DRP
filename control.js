// Custom Movement Component for A-Frame
AFRAME.registerComponent('custom-movement', {
  schema: {
    speed: {type: 'number', default: 0.05}, // movement speed
    rotationSpeed: {type: 'number', default: 2} // rotation speed for camera
  },
  
  init: function () {
    this.keys = {}; // track pressed keys
    const self = this;
    
    // Debug logging
    console.log('Custom movement component initialized');
    console.log('Movement speed:', this.data.speed);
    
    // Bind event handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    
    // Add event listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    
    // Movement state
    this.isMoving = false;
    
    // Get camera reference
    this.camera = this.el.querySelector('a-camera');
  },
  
  onKeyDown: function(e) {
    const keyPressed = e.key.toLowerCase();
    
    // Debug: Log key presses
    if (['w', 'a', 's', 'd', 'q', 'e', 'r', 'f'].includes(keyPressed) || 
        e.key === ' ' || e.key === 'Shift') {
      console.log('Movement key pressed:', keyPressed, 'KeyCode:', e.keyCode);
    }
    
    // Prevent default behavior for movement keys
    if (['w', 'a', 's', 'd', 'q', 'e', 'r', 'f'].includes(keyPressed) || 
        e.key === ' ' || e.key === 'Shift') {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Track key state
    this.keys[keyPressed] = true;
    this.keys[e.keyCode] = true; // Also track by keyCode for compatibility
    
    // Special handling for space and shift
    if (e.key === ' ') this.keys['space'] = true;
    if (e.key === 'Shift') this.keys['shift'] = true;
  },
  
  onKeyUp: function(e) {
    const keyPressed = e.key.toLowerCase();
    
    // Prevent default behavior for movement keys
    if (['w', 'a', 's', 'd', 'q', 'e', 'r', 'f'].includes(keyPressed) || 
        e.key === ' ' || e.key === 'Shift') {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Clear key state
    this.keys[keyPressed] = false;
    this.keys[e.keyCode] = false;
    
    // Special handling for space and shift
    if (e.key === ' ') this.keys['space'] = false;
    if (e.key === 'Shift') this.keys['shift'] = false;
  },
  
  tick: function () {
    // Make sure we have a valid element and keys object
    if (!this.el || !this.el.object3D || !this.keys) {
      return;
    }
    
    const el = this.el;
    const pos = el.object3D.position;
    const speed = this.data.speed;
    
    // Track if any movement is happening for debugging
    let isMoving = false;
    let movements = [];
    
    // Get camera rotation for camera-relative movement
    const camera = this.camera;
    if (!camera) {
      this.camera = this.el.querySelector('a-camera');
      return; // Skip this frame if camera not found
    }
    
    const cameraRotation = camera.object3D.rotation;
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // Apply camera rotation to movement vectors
    forward.applyQuaternion(camera.object3D.quaternion);
    right.applyQuaternion(camera.object3D.quaternion);
    
    // Camera-relative movement (WASD)
    if (this.keys['w'] || this.keys[87]) {
      pos.x += forward.x * speed;
      pos.z += forward.z * speed;
      isMoving = true;
      movements.push('forward');
    }
    if (this.keys['s'] || this.keys[83]) {
      pos.x -= forward.x * speed;
      pos.z -= forward.z * speed;
      isMoving = true;
      movements.push('backward');
    }
    if (this.keys['a'] || this.keys[65]) {
      pos.x -= right.x * speed;
      pos.z -= right.z * speed;
      isMoving = true;
      movements.push('left');
    }
    if (this.keys['d'] || this.keys[68]) {
      pos.x += right.x * speed;
      pos.z += right.z * speed;
      isMoving = true;
      movements.push('right');
    }
    
    // Vertical movement - Multiple options for better compatibility
    // Q or R to move up
    if (this.keys['q'] || this.keys[81] || this.keys['r'] || this.keys[82]) {
      pos.y += speed;
      isMoving = true;
      movements.push('up');
      // Less frequent logging for vertical movement
      if (Math.random() < 0.01) { // Log ~1% of the time
        console.log('Moving up, Y position:', pos.y.toFixed(2));
      }
    }
    
    // E or F to move down
    if (this.keys['e'] || this.keys[69] || this.keys['f'] || this.keys[70]) {
      pos.y -= speed;
      isMoving = true;
      movements.push('down');
      if (Math.random() < 0.01) {
        console.log('Moving down, Y position:', pos.y.toFixed(2));
      }
    }
    
    // Alternative controls: Space and Shift
    if (this.keys['space'] || this.keys[32]) {
      pos.y += speed;
      isMoving = true;
      movements.push('up-space');
      if (Math.random() < 0.01) {
        console.log('Moving up with SPACE, Y position:', pos.y.toFixed(2));
      }
    }
    
    if (this.keys['shift'] || this.keys[16]) {
      pos.y -= speed;
      isMoving = true;
      movements.push('down-shift');
      if (Math.random() < 0.01) {
        console.log('Moving down with SHIFT, Y position:', pos.y.toFixed(2));
      }
    }
    
    // Boundary checking
    // Prevent going below ground level
    if (pos.y < 0.1) {
      pos.y = 0.1;
    }
    
    // Prevent going too high
    if (pos.y > 10) {
      pos.y = 10;
    }
    
    // Boundary checking for room (basic bounds)
    const maxBound = 20; // Maximum room boundary
    if (pos.x > maxBound) pos.x = maxBound;
    if (pos.x < -maxBound) pos.x = -maxBound;
    if (pos.z > maxBound) pos.z = maxBound;
    if (pos.z < -maxBound) pos.z = -maxBound;
    
    // Update movement state for debugging - log less frequently
    if (isMoving && !this.isMoving) {
      this.isMoving = true;
      console.log('Started moving:', movements.join(', '));
    } else if (!isMoving && this.isMoving) {
      this.isMoving = false;
      console.log('Stopped moving');
    }
  },
  
  remove: function () {
    // Clean up event listeners
    console.log('Removing movement component event listeners');
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
});

// Floor Resize Controls
AFRAME.registerComponent('floor-resize', {
  init: function () {
    const el = this.el;
    let width = parseFloat(el.getAttribute('width'));
    let height = parseFloat(el.getAttribute('height'));
    
    console.log('Floor resize component initialized. Initial size:', width, 'x', height);
    
    const onKeyDown = (e) => {
      let sizeChanged = false;
      
      switch (e.key) {
        case '[': // shrink floor
          width = Math.max(2, width - 1);
          height = Math.max(2, height - 1);
          sizeChanged = true;
          console.log('Floor shrunk to:', width, 'x', height);
          break;
        case ']': // expand floor
          width = Math.min(20, width + 1);
          height = Math.min(20, height + 1);
          sizeChanged = true;
          console.log('Floor expanded to:', width, 'x', height);
          break;
      }
      
      if (sizeChanged) {
        el.setAttribute('width', width);
        el.setAttribute('height', height);
        
        // Update room walls if they exist
        this.updateRoomWalls(width, height);
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    
    // Store the event handler for cleanup
    this.keydownHandler = onKeyDown;
  },
  
  updateRoomWalls: function(width, height) {
    // This function updates the room walls when floor is resized
    const wallsContainer = document.getElementById('room-walls');
    if (!wallsContainer) return;
    
    const wallHeight = 3;
    const wallThickness = 0.1;
    
    // Clear existing walls
    wallsContainer.innerHTML = '';
    
    // Create new walls with updated dimensions
    const walls = [
      { pos: `0 ${wallHeight/2} ${-height/2}`, size: `${width} ${wallHeight} ${wallThickness}` },
      { pos: `0 ${wallHeight/2} ${height/2}`, size: `${width} ${wallHeight} ${wallThickness}` },
      { pos: `${-width/2} ${wallHeight/2} 0`, size: `${wallThickness} ${wallHeight} ${height}` },
      { pos: `${width/2} ${wallHeight/2} 0`, size: `${wallThickness} ${wallHeight} ${height}` }
    ];
    
    walls.forEach((wall, i) => {
      const wallEl = document.createElement('a-box');
      wallEl.setAttribute('position', wall.pos);
      const [w, h, d] = wall.size.split(' ');
      wallEl.setAttribute('width', w);
      wallEl.setAttribute('height', h);
      wallEl.setAttribute('depth', d);
      wallEl.setAttribute('color', '#f5f5f5');
      wallEl.setAttribute('material', 'roughness: 0.8');
      wallsContainer.appendChild(wallEl);
    });
    
    console.log('Room walls updated to match floor size:', width, 'x', height);
  },
  
  remove: function () {
    // Clean up event listener
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
  }
});

// Smart placement system with collision detection and wall avoidance
AFRAME.registerComponent('smart-placement', {
  schema: {
    roomWidth: {type: 'number', default: 10},
    roomLength: {type: 'number', default: 10},
    objectWidth: {type: 'number', default: 1},
    objectLength: {type: 'number', default: 1}
  },
  
  init: function() {
    this.el.addEventListener('model-loaded', this.adjustPosition.bind(this));
    this.originalPosition = null;
    this.defaultColor = '#8B4513';
  },
  
  adjustPosition: function() {
    const pos = this.el.object3D.position;
    const roomWidth = this.data.roomWidth;
    const roomLength = this.data.roomLength;
    const objWidth = this.data.objectWidth;
    const objLength = this.data.objectLength;
    
    // Store original position for reference
    if (!this.originalPosition) {
      this.originalPosition = {x: pos.x, y: pos.y, z: pos.z};
    }
    
    // Calculate safe boundaries (half object size from walls)
    const safeXMin = -roomWidth/2 + objWidth/2;
    const safeXMax = roomWidth/2 - objWidth/2;
    const safeZMin = -roomLength/2 + objLength/2;
    const safeZMax = roomLength/2 - objLength/2;
    
    let newX = pos.x;
    let newZ = pos.z;
    let adjusted = false;
    let adjustmentReason = '';
    
    // Check X boundaries and find best alternative position
    if (pos.x < safeXMin) {
      // Try to place on the opposite side if there's space
      if (safeXMax > safeXMin) {
        newX = safeXMax;
        adjustmentReason = 'moved to opposite wall';
      } else {
        newX = safeXMin;
        adjustmentReason = 'moved to safe boundary';
      }
      adjusted = true;
    } else if (pos.x > safeXMax) {
      if (safeXMin < safeXMax) {
        newX = safeXMin;
        adjustmentReason = 'moved to opposite wall';
      } else {
        newX = safeXMax;
        adjustmentReason = 'moved to safe boundary';
      }
      adjusted = true;
    }
    
    // Check Z boundaries and find best alternative position
    if (pos.z < safeZMin) {
      if (safeZMax > safeZMin) {
        newZ = safeZMax;
        adjustmentReason += adjustmentReason ? ' and ' : '';
        adjustmentReason += 'moved to opposite wall';
      } else {
        newZ = safeZMin;
        adjustmentReason += adjustmentReason ? ' and ' : '';
        adjustmentReason += 'moved to safe boundary';
      }
      adjusted = true;
    } else if (pos.z > safeZMax) {
      if (safeZMin < safeZMax) {
        newZ = safeZMin;
        adjustmentReason += adjustmentReason ? ' and ' : '';
        adjustmentReason += 'moved to opposite wall';
      } else {
        newZ = safeZMax;
        adjustmentReason += adjustmentReason ? ' and ' : '';
        adjustmentReason += 'moved to safe boundary';
      }
      adjusted = true;
    }
    
    // Apply adjusted position with smooth transition
    if (adjusted) {
      this.el.setAttribute('position', `${newX} ${pos.y} ${newZ}`);
      
      // Add visual feedback for adjustment
      this.showAdjustmentFeedback(adjustmentReason);
      
      console.log(`Table position adjusted: ${adjustmentReason}`);
      console.log(`New position: ${newX.toFixed(2)}, ${newZ.toFixed(2)}`);
    }
  },
  
  showAdjustmentFeedback: function(reason) {
    // Temporarily change color to indicate adjustment
    const originalColor = this.el.getAttribute('material').color;
    this.el.setAttribute('material', 'color', '#FFA500'); // Orange for adjustment
    
    setTimeout(() => {
      this.el.setAttribute('material', 'color', originalColor);
    }, 1000);
    
    // Show adjustment message in console
    console.log(`🔄 Table placement adjusted: ${reason}`);
  }
});

// Draggable furniture component for moving tables around
AFRAME.registerComponent('draggable-furniture', {
  schema: {
    roomWidth: {type: 'number', default: 10},
    roomLength: {type: 'number', default: 10},
    objectWidth: {type: 'number', default: 1.5},
    objectLength: {type: 'number', default: 1.5},
    wallThickness: {type: 'number', default: 0.1}
  },
  
  init: function() {
    this.isDragging = false;
    this.originalPosition = null;
    this.dragStartPosition = null;
    this.camera = null;
    this.cameraObj = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    
    // Add event listeners
    this.el.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mouseup', this.onMouseUp);
    
    // Get camera reference
    this.camera = document.querySelector('a-camera');
    if (this.camera) {
      this.cameraObj = this.camera.getObject3D('camera');
    }
  },
  
  onMouseDown: function(e) {
    if (e.detail.intersection) {
      this.isDragging = true;
      this.originalPosition = this.el.object3D.position.clone();
      this.dragStartPosition = e.detail.intersection.point;
      
      // Visual feedback for drag start (green)
      this.el.setAttribute('material', 'color', '#4CAF50');
      this.el.setAttribute('material', 'emissive', '#2E7D32');
      this.el.setAttribute('material', 'emissiveIntensity', '0.3');
      
      console.log('Started dragging table:', this.el.id);
    }
  },
  
  onMouseMove: function(e) {
    if (!this.isDragging) return;
    if (!this.cameraObj) {
      const camEl = document.querySelector('a-camera');
      if (camEl) this.cameraObj = camEl.getObject3D('camera');
      if (!this.cameraObj) return;
    }
    
    // Update mouse position
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast against an infinite ground plane (y = 0)
    this.raycaster.setFromCamera(this.mouse, this.cameraObj);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      const newPosition = intersectionPoint;
      
      // Check boundaries and adjust if needed
      const adjustedPosition = this.checkBoundaries(newPosition);
      
      // Keep object on floor height y=0 (or small lift) while dragging
      const yFloor = 0;
      this.el.setAttribute('position', `${adjustedPosition.x} ${yFloor} ${adjustedPosition.z}`);
      
      // Visual feedback for collision
      if (this.isColliding(adjustedPosition)) {
        // Red when touching/over boundary
        this.el.setAttribute('material', 'color', '#FF6B6B');
        this.el.setAttribute('material', 'emissive', '#8B0000');
        this.el.setAttribute('material', 'emissiveIntensity', '0.25');
      } else {
        // Green while dragging inside bounds
        this.el.setAttribute('material', 'color', '#4CAF50');
        this.el.setAttribute('material', 'emissive', '#2E7D32');
        this.el.setAttribute('material', 'emissiveIntensity', '0.3');
      }
    }
  },
  
  onMouseUp: function(e) {
    if (this.isDragging) {
      this.isDragging = false;
      
      // Final boundary check
      const finalPosition = this.el.object3D.position;
      const adjustedPosition = this.checkBoundaries(finalPosition);
      
      if (!this.positionsEqual(finalPosition, adjustedPosition)) {
        this.el.setAttribute('position', `${adjustedPosition.x} ${adjustedPosition.y} ${adjustedPosition.z}`);
        console.log('Table position adjusted to stay within bounds');
      }
      
      // Reset visual feedback to default brown after drag stops
      this.el.setAttribute('material', 'color', this.defaultColor);
      this.el.setAttribute('material', 'emissive', '#000000');
      this.el.setAttribute('material', 'emissiveIntensity', '0');
      
      console.log('Stopped dragging table:', this.el.id);
    }
  },
  
  checkBoundaries: function(position) {
    const roomWidth = this.data.roomWidth;
    const roomLength = this.data.roomLength;
    const objWidth = this.data.objectWidth;
    const objLength = this.data.objectLength;
    const wallThickness = this.data.wallThickness;
    
    // Calculate safe boundaries using INNER wall faces (account for wall thickness)
    const innerX = roomWidth/2 - wallThickness/2;
    const innerZ = roomLength/2 - wallThickness/2;
    let safeXMin = -innerX + objWidth/2;
    let safeXMax = innerX - objWidth/2;
    const safeZMin = -innerZ + objLength/2;
    const safeZMax = innerZ - objLength/2;

    // If cost board exists on right side, clamp to just inside its plane
    const boardEl = document.getElementById('cost-board');
    if (boardEl && boardEl.object3D) {
      const boardX = boardEl.object3D.position.x;
      const proximity = 0.02; // 2cm margin before board
      const boardLimit = boardX - objWidth/2 - proximity;
      if (!isNaN(boardLimit)) {
        safeXMax = Math.min(safeXMax, boardLimit);
      }
    }
    
    let newX = Math.max(safeXMin, Math.min(safeXMax, position.x));
    let newZ = Math.max(safeZMin, Math.min(safeZMax, position.z));
    
    return {
      x: newX,
      y: position.y,
      z: newZ
    };
  },
  
  isColliding: function(position) {
    const roomWidth = this.data.roomWidth;
    const roomLength = this.data.roomLength;
    const objWidth = this.data.objectWidth;
    const objLength = this.data.objectLength;
    const wallThickness = this.data.wallThickness;
    const epsilon = 0.1; // Only turn red when very close to walls (almost touching)
    
    const innerX = roomWidth/2 - wallThickness/2;
    const innerZ = roomLength/2 - wallThickness/2;
    const safeXMin = -innerX + objWidth/2;
    const safeXMax = innerX - objWidth/2;
    const safeZMin = -innerZ + objLength/2;
    const safeZMax = innerZ - objLength/2;
    
    // Right-side board plane (if present) overrides right wall proximity
    let rightTouch = position.x >= safeXMax - epsilon;
    const boardEl = document.getElementById('cost-board');
    if (boardEl && boardEl.object3D) {
      const boardX = boardEl.object3D.position.x;
      const proximity = 0.05; // 5cm margin before board
      const boardTouchX = position.x + objWidth/2 >= boardX - proximity;
      rightTouch = boardTouchX; // prefer board proximity for visual feedback
    }
    
    // Only consider colliding when actually very close to or crossing boundaries
    return (position.x <= safeXMin + epsilon || rightTouch || 
            position.z <= safeZMin + epsilon || position.z >= safeZMax - epsilon);
  },
  
  positionsEqual: function(pos1, pos2) {
    return Math.abs(pos1.x - pos2.x) < 0.01 && 
           Math.abs(pos1.z - pos2.z) < 0.01;
  },
  
  remove: function() {
    // Clean up event listeners
    this.el.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mouseup', this.onMouseUp);
  }
});

// Enhanced furniture interaction component with selection and rotation controls
AFRAME.registerComponent('clickable-furniture', {
  init: function () {
    const el = this.el;
    this.isSelected = false;
    this.originalColor = null;
    this.rotationControls = null;
    this.currentRotation = 0; // Track current rotation in degrees
    
    el.addEventListener('click', function (evt) {
      console.log('Furniture clicked:', el.id);
      
      // Only handle selection if not dragging
      if (!this.el.components['draggable-furniture'] || !this.el.components['draggable-furniture'].isDragging) {
        // Deselect all other furniture first
        this.deselectAllOtherFurniture();
        
        // Toggle selection
        this.toggleSelection();
      }
    }.bind(this));
    
    // Store original material for restoration
    this.storeOriginalMaterial();
  },
  
  storeOriginalMaterial: function() {
    const material = this.el.getAttribute('material');
    if (material) {
      this.originalColor = material.color || '#8B4513'; // Default brown
    } else {
      this.originalColor = '#8B4513';
    }
  },
  
  deselectAllOtherFurniture: function() {
    // Find all furniture with clickable-furniture component and deselect them
    const allFurniture = document.querySelectorAll('[clickable-furniture]');
    allFurniture.forEach(furniture => {
      if (furniture !== this.el && furniture.components['clickable-furniture']) {
        furniture.components['clickable-furniture'].deselect();
      }
    });
  },
  
  toggleSelection: function() {
    if (this.isSelected) {
      this.deselect();
    } else {
      this.select();
    }
  },
  
  select: function() {
    this.isSelected = true;
    this.el.setAttribute('material', 'color', '#4CAF50'); // Green for selected
    this.el.setAttribute('material', 'emissive', '#2E7D32'); // Add glow effect
    this.el.setAttribute('material', 'emissiveIntensity', '0.3');
    
    // Show web-based control panel instead of 3D buttons
    if (typeof showControlPanel === 'function') {
      showControlPanel(this.el.id);
    }
    
    console.log('Furniture selected:', this.el.id);
  },
  
  deselect: function() {
    this.isSelected = false;
    this.el.setAttribute('material', 'color', this.originalColor);
    this.el.setAttribute('material', 'emissive', '#000000');
    this.el.setAttribute('material', 'emissiveIntensity', '0');
    
    // Hide control panel when deselecting
    if (typeof closeControlPanel === 'function') {
      closeControlPanel();
    }
    
    console.log('Furniture deselected:', this.el.id);
  },
  
  // 3D rotation controls removed - now using web-based control panel
  
  remove: function() {
    // Clean up when component is removed
    if (typeof closeControlPanel === 'function') {
      closeControlPanel();
    }
  }
});

// Debug component to show position info
AFRAME.registerComponent('position-debug', {
  init: function () {
    this.lastLogTime = 0;
    console.log('Position debug component initialized for:', this.el.id);
  },
  
  tick: function (time) {
    // Log position every 2 seconds when moving
    if (time - this.lastLogTime > 2000) {
      const pos = this.el.object3D.position;
      console.log('Camera position:', {
        x: pos.x.toFixed(2),
        y: pos.y.toFixed(2),
        z: pos.z.toFixed(2)
      });
      this.lastLogTime = time;
    }
  }
});

// Enhanced console commands for debugging
window.debugMovement = {
  // Get current camera position
  getPosition: function() {
    const cameraRig = document.getElementById('cameraRig');
    if (cameraRig) {
      const pos = cameraRig.object3D.position;
      const position = {
        x: pos.x.toFixed(2),
        y: pos.y.toFixed(2),
        z: pos.z.toFixed(2)
      };
      console.log('Current position:', position);
      return position;
    }
    console.error('Camera rig not found!');
    return null;
  },
  
  // Set camera position
  setPosition: function(x, y, z) {
    const cameraRig = document.getElementById('cameraRig');
    if (cameraRig) {
      cameraRig.setAttribute('position', `${x} ${y} ${z}`);
      console.log('Position set to:', x, y, z);
      return true;
    }
    console.error('Camera rig not found!');
    return false;
  },
  
  // Test movement system
  testMovement: function() {
    console.log('=== TESTING MOVEMENT SYSTEM ===');
    
    // Check if component exists
    const cameraRig = document.getElementById('cameraRig');
    if (!cameraRig) {
      console.error('❌ Camera rig not found!');
      return false;
    }
    
    const movementComponent = cameraRig.components['custom-movement'];
    if (!movementComponent) {
      console.error('❌ Custom movement component not found!');
      console.log('Available components:', Object.keys(cameraRig.components));
      return false;
    }
    
    console.log('✅ Movement component found');
    console.log('✅ Current position:', this.getPosition());
    console.log('✅ Movement speed:', movementComponent.data.speed);
    
    console.log('🎮 Try these keys:');
    console.log('  W/A/S/D → Horizontal movement');
    console.log('  Q/E → Vertical movement (primary)');
    console.log('  R/F → Vertical movement (alternative)');
    console.log('  SPACE/SHIFT → Vertical movement (backup)');
    
    // Test key detection
    console.log('🔍 Press any movement key now and watch for key detection logs...');
    
    return true;
  },
  
  // Test key detection
  testKeys: function() {
    console.log('=== KEY DETECTION TEST ===');
    const component = document.getElementById('cameraRig').components['custom-movement'];
    if (component) {
      console.log('Current key states:', component.keys);
      console.log('Press any key and check if it appears in the key states');
    }
  },
  
  // Force movement test
  forceMove: function(direction = 'forward') {
    const cameraRig = document.getElementById('cameraRig');
    const component = cameraRig.components['custom-movement'];
    
    if (!component) {
      console.error('Movement component not found');
      return;
    }
    
    console.log('🚀 Force moving:', direction);
    const oldPos = this.getPosition();
    
    // Simulate key press
    switch (direction) {
      case 'forward':
        component.keys['w'] = true;
        break;
      case 'back':
        component.keys['s'] = true;
        break;
      case 'left':
        component.keys['a'] = true;
        break;
      case 'right':
        component.keys['d'] = true;
        break;
      case 'up':
        component.keys['q'] = true;
        break;
      case 'down':
        component.keys['e'] = true;
        break;
    }
    
    // Wait a bit then stop
    setTimeout(() => {
      component.keys = {};
      const newPos = this.getPosition();
      console.log('Position changed from:', oldPos, 'to:', newPos);
    }, 100);
  },
  
  // Reset camera to center
  reset: function() {
    this.setPosition(0, 1.6, 5);
    console.log('Camera reset to default position');
  },
  
  // Show all available debug commands
  help: function() {
    console.log('=== MOVEMENT DEBUG COMMANDS ===');
    console.log('debugMovement.testMovement() - Test entire movement system');
    console.log('debugMovement.getPosition() - Show current camera position');
    console.log('debugMovement.setPosition(x, y, z) - Set camera position');
    console.log('debugMovement.testKeys() - Show current key states');
    console.log('debugMovement.forceMove("forward") - Force movement in direction');
    console.log('debugMovement.reset() - Reset camera to default position');
    console.log('debugMovement.help() - Show this help');
  }
};

// Initialize debug commands
console.log('🔧 Movement debug system loaded!');
console.log('📝 Type debugMovement.help() for available commands');
console.log('🧪 Type debugMovement.testMovement() to test the system');