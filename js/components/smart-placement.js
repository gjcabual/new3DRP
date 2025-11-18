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

