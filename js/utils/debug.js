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

