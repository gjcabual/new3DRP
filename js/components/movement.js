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
    this.enabled = true; // Allow disabling movement
    
    // Get camera reference
    this.camera = this.el.querySelector('a-camera');
  },
  
  /**
   * Check if movement should be disabled (e.g., when modal is open)
   */
  isMovementDisabled: function() {
    const authModal = document.getElementById('auth-modal');
    const furnitureControlPanel = document.getElementById('furniture-control-panel');
    
    // Disable if auth modal is open or control panel is visible
    const modalOpen = authModal && authModal.style.display === 'flex';
    const panelOpen = furnitureControlPanel && furnitureControlPanel.style.display === 'block';
    
    // Also check if any input/textarea is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    return !this.enabled || modalOpen || panelOpen || isInputFocused;
  },
  
  onKeyDown: function(e) {
    // Don't process movement keys if movement is disabled
    if (this.isMovementDisabled()) {
      return;
    }
    
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
    // Don't process movement keys if movement is disabled
    if (this.isMovementDisabled()) {
      // Still clear key state to prevent stuck keys
      const keyPressed = e.key.toLowerCase();
      this.keys[keyPressed] = false;
      this.keys[e.keyCode] = false;
      if (e.key === ' ') this.keys['space'] = false;
      if (e.key === 'Shift') this.keys['shift'] = false;
      return;
    }
    
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
    
    // Don't process movement if disabled
    if (this.isMovementDisabled()) {
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

