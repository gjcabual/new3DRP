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

