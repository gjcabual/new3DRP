// Wall-mounted furniture component for fixtures like mirrors and shelves
// These items can only move along walls (1D movement) and stick to the wall surface
AFRAME.registerComponent('wall-mounted-furniture', {
  schema: {
    roomWidth: {type: 'number', default: 10},
    roomLength: {type: 'number', default: 10},
    objectWidth: {type: 'number', default: 1.5},
    objectLength: {type: 'number', default: 1.5},
    wallThickness: {type: 'number', default: 0.1},
    wallOffset: {type: 'number', default: 0.01} // Distance from wall surface
  },
  
  init: function() {
    this.isDragging = false;
    this.originalPosition = null;
    this.dragStartPosition = null;
    this.camera = null;
    this.cameraObj = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.defaultColor = '#FF8C00'; // Default orange color
    this.attachedWall = null; // 'north', 'south', 'east', 'west'
    
    // Actual dimensions from 3D model (will be calculated when model loads)
    this.actualWidth = this.data.objectWidth;
    this.actualLength = this.data.objectLength;
    this.dimensionsCalculated = false;
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.calculateDimensions = this.calculateDimensions.bind(this);
    
    // Add event listeners
    this.el.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mouseup', this.onMouseUp);
    
    // Listen for model to load so we can calculate actual dimensions
    this.el.addEventListener('model-loaded', this.calculateDimensions);
    
    // Try to calculate dimensions immediately if model is already loaded
    setTimeout(() => {
      if (!this.dimensionsCalculated) {
        this.calculateDimensions();
      }
    }, 100);
    
    // Get camera reference
    this.camera = document.querySelector('a-camera');
    if (this.camera) {
      this.cameraObj = this.camera.getObject3D('camera');
    }
    
    // Detect and attach to nearest wall on init
    this.attachToNearestWall();
  },
  
  calculateDimensions: function() {
    const object3D = this.el.object3D;
    if (!object3D) return;
    
    object3D.updateMatrixWorld(true);
    
    const box = new THREE.Box3();
    let hasGeometry = false;
    
    object3D.traverse(function(child) {
      if (child.isMesh && child.geometry) {
        if (child.geometry.boundingBox === null) {
          child.geometry.computeBoundingBox();
        }
        
        const worldBox = new THREE.Box3();
        worldBox.setFromObject(child);
        
        if (!hasGeometry) {
          box.copy(worldBox);
          hasGeometry = true;
        } else {
          box.union(worldBox);
        }
      }
    });
    
    if (hasGeometry && box.min && box.max) {
      const size = new THREE.Vector3();
      box.getSize(size);
      
      this.actualWidth = Math.abs(size.x);
      this.actualLength = Math.abs(size.z);
      this.dimensionsCalculated = true;
    } else {
      this.actualWidth = this.data.objectWidth;
      this.actualLength = this.data.objectLength;
    }
  },
  
  /**
   * Detect which wall the item is closest to and attach to it
   */
  attachToNearestWall: function() {
    const pos = this.el.object3D.position;
    const roomWidth = this.data.roomWidth;
    const roomLength = this.data.roomLength;
    const wallThickness = this.data.wallThickness;
    
    // Calculate distances to each wall (inner wall faces)
    const innerX = roomWidth / 2 - wallThickness / 2;
    const innerZ = roomLength / 2 - wallThickness / 2;
    
    const distToWest = Math.abs(pos.x - (-innerX));
    const distToEast = Math.abs(pos.x - innerX);
    const distToSouth = Math.abs(pos.z - (-innerZ));
    const distToNorth = Math.abs(pos.z - innerZ);
    
    // Find closest wall
    const distances = {
      'west': distToWest,
      'east': distToEast,
      'south': distToSouth,
      'north': distToNorth
    };
    
    const closestWall = Object.keys(distances).reduce((a, b) => 
      distances[a] < distances[b] ? a : b
    );
    
    this.attachedWall = closestWall;
    this.snapToWall();
  },
  
  /**
   * Snap item to the wall surface and set proper rotation
   */
  snapToWall: function() {
    if (!this.attachedWall) return;
    
    const pos = this.el.object3D.position;
    const roomWidth = this.data.roomWidth;
    const roomLength = this.data.roomLength;
    const wallThickness = this.data.wallThickness;
    const wallOffset = this.data.wallOffset;
    const innerX = roomWidth / 2 - wallThickness / 2;
    const innerZ = roomLength / 2 - wallThickness / 2;
    
    let newX = pos.x;
    let newZ = pos.z;
    let newRotationY = 0;
    
    switch (this.attachedWall) {
      case 'north':
        // Attach to north wall (positive Z), face south
        newZ = innerZ - wallOffset;
        newRotationY = 180;
        break;
      case 'south':
        // Attach to south wall (negative Z), face north
        newZ = -innerZ + wallOffset;
        newRotationY = 0;
        break;
      case 'east':
        // Attach to east wall (positive X), face west
        newX = innerX - wallOffset;
        newRotationY = 90;
        break;
      case 'west':
        // Attach to west wall (negative X), face east
        newX = -innerX + wallOffset;
        newRotationY = -90;
        break;
    }
    
    this.el.setAttribute('position', `${newX} ${pos.y} ${newZ}`);
    this.el.setAttribute('rotation', `0 ${newRotationY} 0`);
  },
  
  /**
   * Constrain position to move only along the attached wall
   */
  constrainToWall: function(position) {
    if (!this.attachedWall) {
      this.attachToNearestWall();
    }
    
    const roomWidth = this.data.roomWidth;
    const roomLength = this.data.roomLength;
    const wallThickness = this.data.wallThickness;
    const wallOffset = this.data.wallOffset;
    const innerX = roomWidth / 2 - wallThickness / 2;
    const innerZ = roomLength / 2 - wallThickness / 2;
    
    // Use actual dimensions if available
    const objWidth = this.actualWidth || this.data.objectWidth;
    const objLength = this.actualLength || this.data.objectLength;
    
    let newX = position.x;
    let newZ = position.z;
    
    switch (this.attachedWall) {
      case 'north':
        // Constrain Z to wall, allow X movement within bounds
        newZ = innerZ - wallOffset;
        newX = Math.max(-innerX + objWidth/2, Math.min(innerX - objWidth/2, position.x));
        break;
      case 'south':
        // Constrain Z to wall, allow X movement within bounds
        newZ = -innerZ + wallOffset;
        newX = Math.max(-innerX + objWidth/2, Math.min(innerX - objWidth/2, position.x));
        break;
      case 'east':
        // Constrain X to wall, allow Z movement within bounds
        newX = innerX - wallOffset;
        newZ = Math.max(-innerZ + objLength/2, Math.min(innerZ - objLength/2, position.z));
        break;
      case 'west':
        // Constrain X to wall, allow Z movement within bounds
        newX = -innerX + wallOffset;
        newZ = Math.max(-innerZ + objLength/2, Math.min(innerZ - objLength/2, position.z));
        break;
    }
    
    return {
      x: newX,
      y: position.y,
      z: newZ
    };
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
      
      // Ensure we're attached to a wall
      if (!this.attachedWall) {
        this.attachToNearestWall();
      }
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
    
    // Raycast against ground plane
    this.raycaster.setFromCamera(this.mouse, this.cameraObj);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    
    if (this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      // Constrain movement to wall
      const constrainedPosition = this.constrainToWall(intersectionPoint);
      
      // Keep object at floor height
      const yFloor = 0;
      this.el.setAttribute('position', `${constrainedPosition.x} ${yFloor} ${constrainedPosition.z}`);
      
      // Green while dragging (wall-mounted items are always valid)
      this.el.setAttribute('material', 'color', '#4CAF50');
      this.el.setAttribute('material', 'emissive', '#2E7D32');
      this.el.setAttribute('material', 'emissiveIntensity', '0.3');
    }
  },
  
  onMouseUp: function(e) {
    if (this.isDragging) {
      this.isDragging = false;
      
      // Final constraint check
      const finalPosition = this.el.object3D.position;
      const constrainedPosition = this.constrainToWall(finalPosition);
      
      if (!this.positionsEqual(finalPosition, constrainedPosition)) {
        this.el.setAttribute('position', `${constrainedPosition.x} ${constrainedPosition.y} ${constrainedPosition.z}`);
      }
      
      // Ensure rotation is correct for the wall
      this.snapToWall();
      
      // Return to default color
      this.el.setAttribute('material', 'color', this.defaultColor);
      this.el.setAttribute('material', 'emissive', '#000000');
      this.el.setAttribute('material', 'emissiveIntensity', '0');
    }
  },
  
  tick: function() {
    // Skip if dragging (handled in onMouseMove)
    if (this.isDragging) return;
    
    // Check if object is selected
    const clickableComponent = this.el.components['clickable-furniture'];
    const isSelected = clickableComponent && clickableComponent.isSelected;
    
    // If selected, keep it green
    if (isSelected) {
      this.el.setAttribute('material', 'color', '#4CAF50');
      this.el.setAttribute('material', 'emissive', '#2E7D32');
      this.el.setAttribute('material', 'emissiveIntensity', '0.3');
      return;
    }
    
    // Ensure item stays on wall (in case of external position changes)
    const currentPos = this.el.object3D.position;
    const constrainedPos = this.constrainToWall(currentPos);
    
    if (!this.positionsEqual(currentPos, constrainedPos)) {
      this.el.setAttribute('position', `${constrainedPos.x} ${constrainedPos.y} ${constrainedPos.z}`);
    }
    
    // Default color for wall-mounted items
    const material = this.el.getAttribute('material');
    const currentColor = material && material.color ? material.color : this.defaultColor;
    
    if (currentColor !== this.defaultColor && currentColor !== '#4CAF50') {
      this.el.setAttribute('material', 'color', this.defaultColor);
      this.el.setAttribute('material', 'emissive', '#000000');
      this.el.setAttribute('material', 'emissiveIntensity', '0');
    }
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

