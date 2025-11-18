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
    this.defaultColor = '#8B4513'; // Default brown color
    
    // Actual dimensions from 3D model (will be calculated when model loads)
    this.actualWidth = this.data.objectWidth; // Fallback to schema default
    this.actualLength = this.data.objectLength; // Fallback to schema default
    this.dimensionsCalculated = false;
    this.lastRotationY = undefined; // Track rotation for dimension recalculation
    
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
  },
  
  calculateDimensions: function() {
    // Get the 3D object from the entity
    const object3D = this.el.object3D;
    if (!object3D) return;
    
    // Update world matrix to ensure transformations are applied
    object3D.updateMatrixWorld(true);
    
    // Create a bounding box helper
    const box = new THREE.Box3();
    
    // Traverse all meshes in the object to calculate combined bounding box
    let hasGeometry = false;
    const self = this;
    object3D.traverse(function(child) {
      if (child.isMesh && child.geometry) {
        // Update bounding box for this mesh's local geometry
        if (child.geometry.boundingBox === null) {
          child.geometry.computeBoundingBox();
        }
        
        // Get local bounding box
        const localBox = child.geometry.boundingBox.clone();
        
        // Transform to world space using the mesh's world matrix
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
      // Calculate dimensions from bounding box in world space
      // This accounts for rotation, scale, and position
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // The bounding box in world space already accounts for all transformations
      // Width is along X-axis, Length is along Z-axis
      this.actualWidth = Math.abs(size.x);
      this.actualLength = Math.abs(size.z);
      this.dimensionsCalculated = true;
      
      console.log(`Calculated dimensions for ${this.el.id}:`, {
        width: this.actualWidth,
        length: this.actualLength,
        boundingBox: {
          min: { x: box.min.x, y: box.min.y, z: box.min.z },
          max: { x: box.max.x, y: box.max.y, z: box.max.z },
          size: { x: size.x, y: size.y, z: size.z }
        }
      });
    } else {
      // Fallback to schema defaults if calculation fails
      console.warn(`Could not calculate dimensions for ${this.el.id}, using defaults`);
      this.actualWidth = this.data.objectWidth;
      this.actualLength = this.data.objectLength;
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
      
      // Don't reset color here - let tick() handle it based on collision state
      // This allows the object to stay red if it's near walls
      
      console.log('Stopped dragging table:', this.el.id);
    }
  },
  
  tick: function() {
    // Track rotation to recalculate dimensions when object rotates
    const currentRotation = this.el.getAttribute('rotation');
    if (currentRotation) {
      const rotY = typeof currentRotation === 'object' ? currentRotation.y : 
                   (typeof currentRotation === 'string' ? parseFloat(currentRotation.split(' ')[1]) : 0);
      
      // If rotation changed significantly, recalculate dimensions
      if (this.lastRotationY !== undefined && Math.abs(this.lastRotationY - rotY) > 1) {
        this.calculateDimensions();
      }
      this.lastRotationY = rotY;
    }
    
    // Skip collision checking while dragging (handled in onMouseMove)
    if (this.isDragging) return;
    
    // Check if object is selected (selected objects should stay green)
    const clickableComponent = this.el.components['clickable-furniture'];
    const isSelected = clickableComponent && clickableComponent.isSelected;
    
    // If selected, keep it green (selection takes priority)
    if (isSelected) return;
    
    // Check current position for wall proximity
    const currentPosition = this.el.object3D.position;
    const isNearWall = this.isColliding(currentPosition);
    
    // Get current material color
    const material = this.el.getAttribute('material');
    const currentColor = material && material.color ? material.color : this.defaultColor;
    
    // Update color based on wall proximity
    if (isNearWall) {
      // Turn red when near walls
      if (currentColor !== '#FF6B6B') {
        this.el.setAttribute('material', 'color', '#FF6B6B');
        this.el.setAttribute('material', 'emissive', '#8B0000');
        this.el.setAttribute('material', 'emissiveIntensity', '0.25');
      }
    } else {
      // Return to default color when away from walls
      if (currentColor !== this.defaultColor && currentColor !== '#4CAF50') {
        this.el.setAttribute('material', 'color', this.defaultColor);
        this.el.setAttribute('material', 'emissive', '#000000');
        this.el.setAttribute('material', 'emissiveIntensity', '0');
      }
    }
  },
  
  checkBoundaries: function(position) {
    const roomWidth = this.data.roomWidth;
    const roomLength = this.data.roomLength;
    // Use actual calculated dimensions from 3D model, fallback to schema defaults
    const objWidth = this.actualWidth || this.data.objectWidth;
    const objLength = this.actualLength || this.data.objectLength;
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
    // Use actual calculated dimensions from 3D model, fallback to schema defaults
    const objWidth = this.actualWidth || this.data.objectWidth;
    const objLength = this.actualLength || this.data.objectLength;
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

