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

