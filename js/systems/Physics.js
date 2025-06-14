class PhysicsSystem {
  constructor() {
    this.scene = null;
    this.world = null;
    this.vehicles = [];
    this.buildings = [];
    this.collisionObjects = [];

    // Spatial partitioning for optimization
    this.spatialGrid = new Map(); // FIXED: Initialize as Map
    this.gridSize = 50; // Size of each grid cell
    this.worldBounds = {
      min: { x: -500, z: -500 },
      max: { x: 500, z: 500 },
    };

    // Physics constants
    this.gravity = -9.81;
    this.friction = 0.8;
    this.restitution = 0.3;
  }

  init(scene) {
    this.scene = scene;
    this.initializeSpatialGrid();
    this.buildCollisionObjects();
    console.log("Physics system initialized");
  }

  initializeSpatialGrid() {
    this.spatialGrid.clear();

    // Calculate grid dimensions
    const gridWidth = Math.ceil(
      (this.worldBounds.max.x - this.worldBounds.min.x) / this.gridSize
    );
    const gridHeight = Math.ceil(
      (this.worldBounds.max.z - this.worldBounds.min.z) / this.gridSize
    );

    // Initialize grid cells
    for (let x = 0; x < gridWidth; x++) {
      for (let z = 0; z < gridHeight; z++) {
        const key = `${x},${z}`;
        this.spatialGrid.set(key, []);
      }
    }

    console.log(`Spatial grid initialized: ${gridWidth}x${gridHeight} cells`);
  }

  buildCollisionObjects() {
    if (!this.scene) return;

    this.buildings = [];
    this.collisionObjects = [];

    // Traverse scene to find collision objects
    this.scene.traverse((object) => {
      if (object.isMesh) {
        // Check if it's a building or static object
        if (object.geometry && object.geometry.type === "BoxGeometry") {
          // Assume box geometries are buildings
          const bounds = this.calculateBounds(object);
          if (bounds.size.y > 5) {
            // Buildings are tall
            this.buildings.push({
              mesh: object,
              bounds: bounds,
              position: object.position.clone(),
            });
          }
        }

        // Add to collision objects if it should block movement
        if (object.userData.collision !== false) {
          this.collisionObjects.push({
            mesh: object,
            bounds: this.calculateBounds(object),
            position: object.position.clone(),
          });
        }
      }
    });

    console.log(
      `Found ${this.buildings.length} buildings and ${this.collisionObjects.length} collision objects`
    );
  }

  calculateBounds(object) {
    const box = new THREE.Box3().setFromObject(object);
    return {
      min: box.min.clone(),
      max: box.max.clone(),
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
    };
  }

  updateVehicle(vehicle, deltaTime) {
    if (!vehicle || !vehicle.position) return;

    try {
      // Update spatial grid
      this.updateSpatialGrid(vehicle);

      // Apply physics forces
      this.applyGravity(vehicle, deltaTime);
      this.applyFriction(vehicle, deltaTime);

      // Check collisions
      this.checkVehicleCollisions(vehicle);
      this.checkBuildingCollisions(vehicle);

      // Keep vehicle in bounds
      this.constrainToBounds(vehicle);
    } catch (error) {
      console.error("Error updating vehicle physics:", error);
    }
  }

  updateSpatialGrid(vehicle) {
    if (!vehicle || !vehicle.position) return;

    // Calculate grid position
    const gridX = Math.floor(
      (vehicle.position.x - this.worldBounds.min.x) / this.gridSize
    );
    const gridZ = Math.floor(
      (vehicle.position.z - this.worldBounds.min.z) / this.gridSize
    );
    const key = `${gridX},${gridZ}`;

    // Remove from old grid position if exists
    if (vehicle.gridKey && vehicle.gridKey !== key) {
      const oldCell = this.spatialGrid.get(vehicle.gridKey);
      if (oldCell) {
        const index = oldCell.indexOf(vehicle);
        if (index > -1) {
          oldCell.splice(index, 1);
        }
      }
    }

    // Add to new grid position
    const newCell = this.spatialGrid.get(key);
    if (newCell && !newCell.includes(vehicle)) {
      newCell.push(vehicle);
    }

    vehicle.gridKey = key;
  }

  applyGravity(vehicle, deltaTime) {
    // Simple gravity - keep vehicles on ground
    if (vehicle.position.y > 0) {
      vehicle.position.y = Math.max(
        0,
        vehicle.position.y + this.gravity * deltaTime
      );
    }
  }

  applyFriction(vehicle, deltaTime) {
    if (vehicle.velocity) {
      // Apply friction to velocity
      vehicle.velocity.multiplyScalar(this.friction);

      // Stop very slow movement
      if (vehicle.velocity.length() < 0.1) {
        vehicle.velocity.set(0, 0, 0);
      }
    }
  }

  checkVehicleCollisions(vehicle) {
    if (!vehicle.gridKey) return;

    // Get nearby vehicles from spatial grid
    const nearbyVehicles = this.getNearbyVehicles(vehicle);

    nearbyVehicles.forEach((otherVehicle) => {
      if (otherVehicle === vehicle) return;

      const distance = vehicle.position.distanceTo(otherVehicle.position);
      const minDistance = 4; // Minimum safe distance

      if (distance < minDistance) {
        this.resolveVehicleCollision(vehicle, otherVehicle);
      }
    });
  }

  getNearbyVehicles(vehicle) {
    const nearby = [];
    const gridX = Math.floor(
      (vehicle.position.x - this.worldBounds.min.x) / this.gridSize
    );
    const gridZ = Math.floor(
      (vehicle.position.z - this.worldBounds.min.z) / this.gridSize
    );

    // Check surrounding grid cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${gridX + dx},${gridZ + dz}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          nearby.push(...cell);
        }
      }
    }

    return nearby;
  }

  resolveVehicleCollision(vehicle1, vehicle2) {
    // Calculate collision response
    const direction = vehicle1.position
      .clone()
      .sub(vehicle2.position)
      .normalize();
    const pushDistance = 2;

    // Push vehicles apart
    vehicle1.position.add(direction.clone().multiplyScalar(pushDistance * 0.5));
    vehicle2.position.add(
      direction.clone().multiplyScalar(-pushDistance * 0.5)
    );

    // Reduce speeds
    if (vehicle1.currentSpeed !== undefined) {
      vehicle1.currentSpeed *= 0.5;
    }
    if (vehicle2.currentSpeed !== undefined) {
      vehicle2.currentSpeed *= 0.5;
    }
  }

  checkBuildingCollisions(vehicle) {
    if (!vehicle || !vehicle.position) return false;

    const vehicleRadius = 2; // Approximate vehicle radius

    for (const building of this.buildings) {
      if (
        this.isPointInBounds(vehicle.position, building.bounds, vehicleRadius)
      ) {
        this.resolveBuildingCollision(vehicle, building);
        return true;
      }
    }

    return false;
  }

  checkBuildingCollision(vehicle) {
    // Alias for compatibility
    return this.checkBuildingCollisions(vehicle);
  }

  isPointInBounds(point, bounds, radius = 0) {
    return (
      point.x >= bounds.min.x - radius &&
      point.x <= bounds.max.x + radius &&
      point.z >= bounds.min.z - radius &&
      point.z <= bounds.max.z + radius
    );
  }

  resolveBuildingCollision(vehicle, building) {
    // Push vehicle away from building
    const direction = vehicle.position.clone().sub(building.bounds.center);
    direction.y = 0; // Keep on ground plane
    direction.normalize();

    // Move vehicle outside building bounds
    const pushDistance = 3;
    vehicle.position.add(direction.multiplyScalar(pushDistance));

    // Stop the vehicle
    if (vehicle.currentSpeed !== undefined) {
      vehicle.currentSpeed = 0;
    }
    if (vehicle.velocity) {
      vehicle.velocity.set(0, 0, 0);
    }
  }

  constrainToBounds(vehicle) {
    if (!vehicle || !vehicle.position) return;

    // Keep vehicle within world bounds
    vehicle.position.x = Math.max(
      this.worldBounds.min.x,
      Math.min(this.worldBounds.max.x, vehicle.position.x)
    );

    vehicle.position.z = Math.max(
      this.worldBounds.min.z,
      Math.min(this.worldBounds.max.z, vehicle.position.z)
    );

    // Keep on ground
    vehicle.position.y = Math.max(0, vehicle.position.y);
  }

  // Raycast for line-of-sight checks
  raycast(origin, direction, maxDistance = 100) {
    if (!this.scene) return null;

    const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    return intersects.length > 0 ? intersects[0] : null;
  }

  // Get ground height at position
  getGroundHeight(position) {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(position.x, 100, position.z),
      new THREE.Vector3(0, -1, 0)
    );

    if (this.scene) {
      const intersects = raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        return intersects[0].point.y;
      }
    }

    return 0; // Default ground level
  }

  // Add vehicle to physics system
  addVehicle(vehicle) {
    if (vehicle && !this.vehicles.includes(vehicle)) {
      this.vehicles.push(vehicle);
    }
  }

  // Remove vehicle from physics system
  removeVehicle(vehicle) {
    const index = this.vehicles.indexOf(vehicle);
    if (index > -1) {
      this.vehicles.splice(index, 1);
    }

    // Remove from spatial grid
    if (vehicle.gridKey) {
      const cell = this.spatialGrid.get(vehicle.gridKey);
      if (cell) {
        const cellIndex = cell.indexOf(vehicle);
        if (cellIndex > -1) {
          cell.splice(cellIndex, 1);
        }
      }
    }
  }

  // Update world bounds
  setWorldBounds(bounds) {
    this.worldBounds = bounds;
    this.initializeSpatialGrid();
  }

  // Get physics statistics
  getStats() {
    let totalVehiclesInGrid = 0;
    this.spatialGrid.forEach((cell) => {
      totalVehiclesInGrid += cell.length;
    });

    return {
      vehicles: this.vehicles.length,
      buildings: this.buildings.length,
      collisionObjects: this.collisionObjects.length,
      gridCells: this.spatialGrid.size,
      vehiclesInGrid: totalVehiclesInGrid,
    };
  }

  // Cleanup
  dispose() {
    this.spatialGrid.clear();
    this.vehicles = [];
    this.buildings = [];
    this.collisionObjects = [];
    this.scene = null;
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = PhysicsSystem;
}
