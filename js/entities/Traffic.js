class TrafficVehicle {
  constructor() {
    this.mesh = null;
    this.position = new THREE.Vector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.velocity = new THREE.Vector3();

    // Vehicle properties
    this.speed = 10 + Math.random() * 15;
    this.maxSpeed = this.speed;
    this.currentSpeed = 0;
    this.acceleration = 8;
    this.brakeForce = 15;
    this.turnSpeed = 1.5;

    // AI properties
    this.targetPosition = new THREE.Vector3();
    this.path = [];
    this.currentPathIndex = 0;
    this.stuckTimer = 0;
    this.maxStuckTime = 3;

    // Traffic behavior
    this.followDistance = 8;
    this.laneChangeTimer = 0;
    this.laneChangeDelay = 5 + Math.random() * 10;

    // Vehicle type
    this.vehicleType = this.getRandomVehicleType();
    this.color = this.getRandomColor();

    // State
    this.isMoving = false;
    this.isBraking = false;
    this.isChangingLanes = false;

    // Materials storage for safe access
    this.materials = {};
  }

  async init(position) {
    this.position.copy(position);
    this.createVehicleMesh();
    this.generatePath();
    this.setRandomDirection();
  }

  getRandomVehicleType() {
    const types = ["sedan", "suv", "truck", "van", "sports"];
    const weights = [0.4, 0.25, 0.15, 0.15, 0.05];

    let random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < types.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return types[i];
      }
    }

    return "sedan";
  }

  getRandomColor() {
    const colors = [
      0x000000, 0xffffff, 0x808080, 0x0000ff, 0xff0000, 0x008000, 0xffff00,
      0x800080, 0xffa500, 0x8b4513,
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }

  createVehicleMesh() {
    this.mesh = new THREE.Group();

    const dimensions = this.getVehicleDimensions();

    // Create materials with proper emissive properties
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: this.color,
      emissive: new THREE.Color(0x000000),
    });

    const headlightMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffaa,
      emissive: new THREE.Color(0x000000),
    });

    const taillightMaterial = new THREE.MeshLambertMaterial({
      color: 0xff0000,
      emissive: new THREE.Color(0x000000),
    });

    // Store materials for safe access
    this.materials = {
      body: bodyMaterial,
      headlight: headlightMaterial,
      taillight: taillightMaterial,
    };

    // Main body
    const bodyGeometry = new THREE.BoxGeometry(
      dimensions.width,
      dimensions.height,
      dimensions.length
    );
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = dimensions.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;

    this.mesh.add(body);
    this.body = body;

    // Windows
    if (this.vehicleType !== "truck") {
      const windowGeometry = new THREE.BoxGeometry(
        dimensions.width * 0.9,
        dimensions.height * 0.4,
        dimensions.length * 0.6
      );
      const windowMaterial = new THREE.MeshLambertMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.7,
      });
      const windows = new THREE.Mesh(windowGeometry, windowMaterial);
      windows.position.y = dimensions.height * 0.7;
      this.mesh.add(windows);
    }

    // Wheels
    this.createWheels(dimensions);

    // Lights
    this.createLights(dimensions);

    // Position the mesh
    this.mesh.position.copy(this.position);
  }

  getVehicleDimensions() {
    const dimensions = {
      sedan: { width: 3.5, height: 1.4, length: 7 },
      suv: { width: 4, height: 2, length: 8 },
      truck: { width: 4.5, height: 2.5, length: 10 },
      van: { width: 4, height: 2.2, length: 9 },
      sports: { width: 3.2, height: 1.2, length: 6.5 },
    };

    return dimensions[this.vehicleType] || dimensions.sedan;
  }

  createWheels(dimensions) {
    const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const wheelPositions = [
      { x: -dimensions.width / 2 + 0.5, z: dimensions.length / 2 - 1 },
      { x: dimensions.width / 2 - 0.5, z: dimensions.length / 2 - 1 },
      { x: -dimensions.width / 2 + 0.5, z: -dimensions.length / 2 + 1 },
      { x: dimensions.width / 2 - 0.5, z: -dimensions.length / 2 + 1 },
    ];

    this.wheels = [];
    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, 0.6, pos.z);
      wheel.castShadow = true;
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });
  }

  createLights(dimensions) {
    // Headlights - using the stored material
    const headlightGeometry = new THREE.SphereGeometry(0.2);

    const leftHeadlight = new THREE.Mesh(
      headlightGeometry,
      this.materials.headlight
    );
    leftHeadlight.position.set(
      -dimensions.width / 2 + 0.5,
      1,
      dimensions.length / 2
    );

    const rightHeadlight = new THREE.Mesh(
      headlightGeometry,
      this.materials.headlight
    );
    rightHeadlight.position.set(
      dimensions.width / 2 - 0.5,
      1,
      dimensions.length / 2
    );

    this.mesh.add(leftHeadlight);
    this.mesh.add(rightHeadlight);

    // Taillights - using the stored material
    const leftTaillight = new THREE.Mesh(
      headlightGeometry,
      this.materials.taillight
    );
    leftTaillight.position.set(
      -dimensions.width / 2 + 0.5,
      1,
      -dimensions.length / 2
    );

    const rightTaillight = new THREE.Mesh(
      headlightGeometry,
      this.materials.taillight
    );
    rightTaillight.position.set(
      dimensions.width / 2 - 0.5,
      1,
      -dimensions.length / 2
    );

    this.mesh.add(leftTaillight);
    this.mesh.add(rightTaillight);

    // Create actual light sources (NO SHADOWS)
    const leftHeadlightBeam = new THREE.SpotLight(
      0xffffaa,
      0.2,
      15,
      Math.PI / 8
    );
    leftHeadlightBeam.position.copy(leftHeadlight.position);
    leftHeadlightBeam.castShadow = false; // NO SHADOWS

    const rightHeadlightBeam = new THREE.SpotLight(
      0xffffaa,
      0.2,
      15,
      Math.PI / 8
    );
    rightHeadlightBeam.position.copy(rightHeadlight.position);
    rightHeadlightBeam.castShadow = false; // NO SHADOWS

    this.mesh.add(leftHeadlightBeam);
    this.mesh.add(rightHeadlightBeam);

    // Store references with proper structure
    this.headlights = [
      {
        mesh: leftHeadlight,
        light: leftHeadlightBeam,
        material: this.materials.headlight,
      },
      {
        mesh: rightHeadlight,
        light: rightHeadlightBeam,
        material: this.materials.headlight,
      },
    ];

    this.taillights = [
      { mesh: leftTaillight, material: this.materials.taillight },
      { mesh: rightTaillight, material: this.materials.taillight },
    ];
  }

  generatePath() {
    const pathLength = 5 + Math.floor(Math.random() * 10);
    this.path = [];

    let currentPos = this.position.clone();

    for (let i = 0; i < pathLength; i++) {
      const angle = ((Math.random() - 0.5) * Math.PI) / 2;
      const distance = 20 + Math.random() * 30;

      const nextPos = currentPos.clone();
      nextPos.x += Math.sin(angle) * distance;
      nextPos.z += Math.cos(angle) * distance;

      this.path.push(nextPos);
      currentPos = nextPos;
    }

    this.currentPathIndex = 0;
    if (this.path.length > 0) {
      this.targetPosition.copy(this.path[0]);
    }
  }

  setRandomDirection() {
    this.rotation.y = Math.random() * Math.PI * 2;
    this.mesh.rotation.y = this.rotation.y;
  }

  update(deltaTime) {
    this.updateAI(deltaTime);
    this.updateMovement(deltaTime);
    this.updateVisuals(deltaTime);
    this.updateWheels(deltaTime);

    // Update mesh position and rotation
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation.y;
  }

  updateAI(deltaTime) {
    if (this.path.length === 0) {
      this.generatePath();
      return;
    }

    const distanceToTarget = this.position.distanceTo(this.targetPosition);

    if (distanceToTarget < 5) {
      this.currentPathIndex++;
      if (this.currentPathIndex >= this.path.length) {
        this.generatePath();
        return;
      }
      this.targetPosition.copy(this.path[this.currentPathIndex]);
    }

    const direction = this.targetPosition
      .clone()
      .sub(this.position)
      .normalize();
    const targetAngle = Math.atan2(direction.x, direction.z);

    let angleDiff = targetAngle - this.rotation.y;

    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const maxTurnRate = this.turnSpeed * deltaTime;
    if (Math.abs(angleDiff) > maxTurnRate) {
      this.rotation.y += Math.sign(angleDiff) * maxTurnRate;
    } else {
      this.rotation.y = targetAngle;
    }

    this.avoidObstacles(deltaTime);

    if (this.currentSpeed < 1) {
      this.stuckTimer += deltaTime;
      if (this.stuckTimer > this.maxStuckTime) {
        this.handleStuckSituation();
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  avoidObstacles(deltaTime) {
    const shouldBrake = this.checkTrafficAhead();
    this.isBraking = shouldBrake;

    if (shouldBrake) {
      this.currentSpeed = Math.max(
        0,
        this.currentSpeed - this.brakeForce * deltaTime
      );
    } else {
      this.currentSpeed = Math.min(
        this.maxSpeed,
        this.currentSpeed + this.acceleration * deltaTime
      );
    }

    this.laneChangeTimer += deltaTime;
    if (this.laneChangeTimer > this.laneChangeDelay && !this.isChangingLanes) {
      if (Math.random() < 0.1) {
        this.startLaneChange();
      }
      this.laneChangeTimer = 0;
    }
  }

  checkTrafficAhead() {
    return Math.random() < 0.05;
  }

  startLaneChange() {
    this.isChangingLanes = true;

    const laneOffset = (Math.random() - 0.5) * 6;
    this.targetPosition.x += laneOffset;

    setTimeout(() => {
      this.isChangingLanes = false;
    }, 2000 + Math.random() * 2000);
  }

  handleStuckSituation() {
    this.stuckTimer = 0;
    this.generatePath();
    this.position.x += (Math.random() - 0.5) * 5;
    this.position.z += (Math.random() - 0.5) * 5;
  }

  updateMovement(deltaTime) {
    this.currentSpeed *= 0.98;

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

    const movement = direction.multiplyScalar(this.currentSpeed * deltaTime);
    this.position.add(movement);

    this.velocity.copy(movement).divideScalar(deltaTime);
    this.isMoving = this.currentSpeed > 0.5;
  }

  updateVisuals(deltaTime) {
    // Safe taillight updates
    this.taillights.forEach((taillight) => {
      if (taillight && taillight.material && taillight.material.emissive) {
        const brakeIntensity = this.isBraking ? 1.0 : 0.3;
        taillight.material.emissive.setRGB(brakeIntensity, 0, 0);
      }
    });

    // Safe headlight updates
    this.headlights.forEach((headlight) => {
      if (headlight && headlight.light) {
        headlight.light.intensity = this.isNightTime() ? 0.2 : 0.05;
      }
      if (headlight && headlight.material && headlight.material.emissive) {
        const headlightIntensity = this.isNightTime() ? 0.5 : 0.1;
        headlight.material.emissive.setRGB(
          headlightIntensity,
          headlightIntensity,
          headlightIntensity * 0.8
        );
      }
    });

    // Turn signals during lane changes
    if (this.isChangingLanes) {
      this.updateTurnSignals(deltaTime);
    }
  }

  updateTurnSignals(deltaTime) {
    const blinkRate = 2; // blinks per second
    const blink = Math.sin(Date.now() * 0.001 * blinkRate * Math.PI * 2) > 0;

    if (blink) {
      // Determine which side is turning (simplified)
      const turnSide = Math.random() > 0.5 ? 0 : 1;

      // Safe headlight turn signal update
      if (
        this.headlights[turnSide] &&
        this.headlights[turnSide].mesh &&
        this.headlights[turnSide].mesh.material
      ) {
        this.headlights[turnSide].mesh.material.color.setHex(0xffa500); // Orange
      }

      // Safe taillight turn signal update
      if (
        this.taillights[turnSide] &&
        this.taillights[turnSide].mesh &&
        this.taillights[turnSide].mesh.material
      ) {
        this.taillights[turnSide].mesh.material.color.setHex(0xffa500);
      }
    } else {
      // Reset colors safely
      this.headlights.forEach((headlight) => {
        if (headlight && headlight.mesh && headlight.mesh.material) {
          headlight.mesh.material.color.setHex(0xffffaa);
        }
      });

      this.taillights.forEach((taillight) => {
        if (taillight && taillight.mesh && taillight.mesh.material) {
          taillight.mesh.material.color.setHex(0xff0000);
        }
      });
    }
  }

  updateWheels(deltaTime) {
    if (!this.wheels) return;

    const rotationSpeed = this.currentSpeed * 0.1;

    this.wheels.forEach((wheel) => {
      if (wheel) {
        wheel.rotation.x += rotationSpeed * deltaTime;
      }
    });
  }

  isNightTime() {
    // This would be connected to the day/night system
    return false; // Placeholder
  }

  getSpeed() {
    return this.currentSpeed;
  }

  getPosition() {
    return this.position.clone();
  }

  setMaxSpeed(speed) {
    this.maxSpeed = speed;
  }

  brake() {
    this.isBraking = true;
    this.currentSpeed *= 0.5;
  }

  honk() {
    // Visual feedback for honking with safety checks
    this.headlights.forEach((headlight) => {
      if (headlight && headlight.mesh && headlight.mesh.material) {
        const originalColor = headlight.mesh.material.color.getHex();
        headlight.mesh.material.color.setHex(0xffffff);
        setTimeout(() => {
          if (headlight && headlight.mesh && headlight.mesh.material) {
            headlight.mesh.material.color.setHex(originalColor);
          }
        }, 200);
      }
    });
  }

  // Method to check collision with other vehicles
  checkCollision(otherVehicle) {
    if (!otherVehicle || !otherVehicle.mesh) return false;

    const distance = this.position.distanceTo(otherVehicle.position);
    const minDistance = 4; // Minimum safe distance

    return distance < minDistance;
  }

  // Method to avoid collision with specific vehicle
  avoidVehicle(otherVehicle, deltaTime) {
    if (!otherVehicle) return;

    const distance = this.position.distanceTo(otherVehicle.position);
    const safeDistance = 8;

    if (distance < safeDistance) {
      // Calculate avoidance direction
      const avoidanceDirection = this.position
        .clone()
        .sub(otherVehicle.position)
        .normalize();

      // Apply avoidance force
      const avoidanceForce = avoidanceDirection.multiplyScalar(2 * deltaTime);
      this.position.add(avoidanceForce);

      // Slow down
      this.currentSpeed *= 0.8;
      this.isBraking = true;
    }
  }

  // Method to follow traffic rules at intersections
  handleIntersection(intersection) {
    if (!intersection) return true; // Can proceed

    const distance = this.position.distanceTo(intersection.position);
    const stopDistance = 10;

    if (distance < stopDistance) {
      // Check traffic light state
      if (intersection.currentLight === 0) {
        // Red light
        this.isBraking = true;
        this.currentSpeed = 0;
        return false; // Cannot proceed
      } else if (intersection.currentLight === 1) {
        // Yellow light
        if (distance < 5) {
          this.isBraking = true;
          return false;
        }
      }
      // Green light or far from intersection - can proceed
    }

    return true;
  }

  // Method to update vehicle based on traffic conditions
  updateTrafficBehavior(nearbyVehicles, nearbyIntersections, deltaTime) {
    // Handle nearby vehicles
    if (nearbyVehicles && nearbyVehicles.length > 0) {
      nearbyVehicles.forEach((vehicle) => {
        if (vehicle !== this) {
          this.avoidVehicle(vehicle, deltaTime);
        }
      });
    }

    // Handle intersections
    if (nearbyIntersections && nearbyIntersections.length > 0) {
      const closestIntersection = nearbyIntersections.reduce(
        (closest, intersection) => {
          const distToCurrent = this.position.distanceTo(intersection.position);
          const distToClosest = closest
            ? this.position.distanceTo(closest.position)
            : Infinity;
          return distToCurrent < distToClosest ? intersection : closest;
        },
        null
      );

      if (closestIntersection) {
        this.handleIntersection(closestIntersection);
      }
    }
  }

  // Method to get vehicle bounds for collision detection
  getBounds() {
    const dimensions = this.getVehicleDimensions();
    return {
      min: {
        x: this.position.x - dimensions.width / 2,
        z: this.position.z - dimensions.length / 2,
      },
      max: {
        x: this.position.x + dimensions.width / 2,
        z: this.position.z + dimensions.length / 2,
      },
    };
  }

  // Method to check if vehicle is in bounds of the city
  isInBounds(cityBounds) {
    if (!cityBounds) return true;

    return (
      this.position.x >= cityBounds.min.x &&
      this.position.x <= cityBounds.max.x &&
      this.position.z >= cityBounds.min.z &&
      this.position.z <= cityBounds.max.z
    );
  }

  // Method to respawn vehicle if it goes out of bounds
  respawn(streetPositions) {
    if (!streetPositions || streetPositions.length === 0) return;

    const randomIndex = Math.floor(Math.random() * streetPositions.length);
    this.position.copy(streetPositions[randomIndex]);
    this.generatePath();
    this.setRandomDirection();
    this.currentSpeed = 0;
    this.stuckTimer = 0;
  }

  // Method to update vehicle state for debugging
  getDebugInfo() {
    return {
      position: this.position.clone(),
      rotation: this.rotation.y,
      speed: this.currentSpeed,
      maxSpeed: this.maxSpeed,
      vehicleType: this.vehicleType,
      isMoving: this.isMoving,
      isBraking: this.isBraking,
      isChangingLanes: this.isChangingLanes,
      pathLength: this.path.length,
      currentPathIndex: this.currentPathIndex,
      stuckTimer: this.stuckTimer,
    };
  }

  // Method to set vehicle color (for customization)
  setColor(color) {
    this.color = color;
    if (this.body && this.body.material) {
      this.body.material.color.setHex(color);
    }
  }

  // Method to set vehicle type and update dimensions
  setVehicleType(type) {
    this.vehicleType = type;
    // Would need to recreate mesh with new dimensions
    // This is a simplified version
    this.maxSpeed = this.getSpeedForType(type);
  }

  getSpeedForType(type) {
    const speeds = {
      sedan: 25,
      suv: 22,
      truck: 18,
      van: 20,
      sports: 35,
    };
    return speeds[type] || 25;
  }

  // Method to handle emergency vehicles (future feature)
  handleEmergencyVehicle(emergencyVehicle) {
    if (!emergencyVehicle) return;

    const distance = this.position.distanceTo(emergencyVehicle.position);
    const emergencyDistance = 15;

    if (distance < emergencyDistance) {
      // Move to side of road
      const avoidanceDirection = this.position
        .clone()
        .sub(emergencyVehicle.position)
        .normalize();
      avoidanceDirection.multiplyScalar(3);
      this.position.add(avoidanceDirection);

      // Stop or slow down
      this.currentSpeed *= 0.3;
      this.isBraking = true;
    }
  }

  remove() {
    // Clean up vehicle mesh and references
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }

    // Dispose of geometries and materials
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    // Clear references
    this.mesh = null;
    this.headlights = null;
    this.taillights = null;
    this.wheels = null;
    this.materials = null;
    this.path = [];
  }
}

// Traffic Manager Class to handle multiple vehicles
class TrafficManager {
  constructor(scene, maxVehicles = 20) {
    this.scene = scene;
    this.vehicles = [];
    this.maxVehicles = maxVehicles;
    this.spawnTimer = 0;
    this.spawnInterval = 3; // seconds between spawns
    this.streetPositions = [];
    this.intersections = [];
    this.cityBounds = {
      min: { x: -200, z: -200 },
      max: { x: 200, z: 200 },
    };
  }

  init(streetPositions, intersections) {
    this.streetPositions = streetPositions || [];
    this.intersections = intersections || [];

    // Spawn initial vehicles
    const initialVehicles = Math.min(5, this.maxVehicles);
    for (let i = 0; i < initialVehicles; i++) {
      this.spawnVehicle();
    }
  }

  async spawnVehicle() {
    if (this.vehicles.length >= this.maxVehicles) return;
    if (this.streetPositions.length === 0) return;

    const vehicle = new TrafficVehicle();
    const spawnPosition = this.getRandomStreetPosition();

    await vehicle.init(spawnPosition);
    this.scene.add(vehicle.mesh);
    this.vehicles.push(vehicle);
  }

  getRandomStreetPosition() {
    if (this.streetPositions.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }
    const randomIndex = Math.floor(Math.random() * this.streetPositions.length);
    return this.streetPositions[randomIndex].clone();
  }

  update(deltaTime) {
    // Update spawn timer
    this.spawnTimer += deltaTime;
    if (
      this.spawnTimer >= this.spawnInterval &&
      this.vehicles.length < this.maxVehicles
    ) {
      this.spawnVehicle();
      this.spawnTimer = 0;
    }

    // Update all vehicles
    this.vehicles.forEach((vehicle, index) => {
      if (!vehicle || !vehicle.mesh) {
        this.removeVehicle(index);
        return;
      }

      // Get nearby vehicles and intersections for this vehicle
      const nearbyVehicles = this.getNearbyVehicles(vehicle, 20);
      const nearbyIntersections = this.getNearbyIntersections(vehicle, 15);

      // Update vehicle with traffic behavior
      vehicle.updateTrafficBehavior(
        nearbyVehicles,
        nearbyIntersections,
        deltaTime
      );
      vehicle.update(deltaTime);

      // Check if vehicle is out of bounds
      if (!vehicle.isInBounds(this.cityBounds)) {
        vehicle.respawn(this.streetPositions);
      }
    });

    // Remove vehicles that are too far or stuck for too long
    this.cleanupVehicles();
  }

  getNearbyVehicles(vehicle, radius) {
    return this.vehicles.filter((otherVehicle) => {
      if (otherVehicle === vehicle) return false;
      const distance = vehicle.position.distanceTo(otherVehicle.position);
      return distance <= radius;
    });
  }

  getNearbyIntersections(vehicle, radius) {
    return this.intersections.filter((intersection) => {
      const distance = vehicle.position.distanceTo(intersection.position);
      return distance <= radius;
    });
  }

  removeVehicle(index) {
    if (index >= 0 && index < this.vehicles.length) {
      const vehicle = this.vehicles[index];
      if (vehicle) {
        vehicle.remove();
      }
      this.vehicles.splice(index, 1);
    }
  }

  cleanupVehicles() {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i];

      // Remove vehicles that have been stuck too long
      if (vehicle.stuckTimer > vehicle.maxStuckTime * 3) {
        this.removeVehicle(i);
        continue;
      }

      // Remove vehicles that are too far from any street position
      const minDistanceToStreet = Math.min(
        ...this.streetPositions.map((pos) => vehicle.position.distanceTo(pos))
      );

      if (minDistanceToStreet > 50) {
        this.removeVehicle(i);
        continue;
      }
    }
  }

  // Method to get all vehicles within a certain area
  getVehiclesInArea(center, radius) {
    return this.vehicles.filter((vehicle) => {
      const distance = vehicle.position.distanceTo(center);
      return distance <= radius;
    });
  }

  // Method to clear all vehicles
  clearAllVehicles() {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      this.removeVehicle(i);
    }
  }

  // Method to set traffic density
  setTrafficDensity(density) {
    // density: 0.0 to 1.0
    const newMaxVehicles = Math.floor(density * 30); // Max 30 vehicles at full density
    this.maxVehicles = Math.max(1, newMaxVehicles);

    // Remove excess vehicles if needed
    while (this.vehicles.length > this.maxVehicles) {
      this.removeVehicle(this.vehicles.length - 1);
    }

    // Adjust spawn interval based on density
    this.spawnInterval = Math.max(1, 5 - density * 4); // 1-5 seconds

    console.log(
      `Traffic density set to ${density}, max vehicles: ${this.maxVehicles}`
    );
  }

  // Method to pause/resume traffic
  pauseTraffic() {
    this.vehicles.forEach((vehicle) => {
      vehicle.currentSpeed = 0;
      vehicle.maxSpeed = 0;
    });
  }

  resumeTraffic() {
    this.vehicles.forEach((vehicle) => {
      vehicle.maxSpeed = vehicle.getSpeedForType(vehicle.vehicleType);
    });
  }

  // Method to get traffic statistics
  getTrafficStats() {
    const stats = {
      totalVehicles: this.vehicles.length,
      maxVehicles: this.maxVehicles,
      averageSpeed: 0,
      vehicleTypes: {},
      movingVehicles: 0,
      brakingVehicles: 0,
    };

    this.vehicles.forEach((vehicle) => {
      stats.averageSpeed += vehicle.currentSpeed;

      // Count vehicle types
      stats.vehicleTypes[vehicle.vehicleType] =
        (stats.vehicleTypes[vehicle.vehicleType] || 0) + 1;

      if (vehicle.isMoving) stats.movingVehicles++;
      if (vehicle.isBraking) stats.brakingVehicles++;
    });

    if (this.vehicles.length > 0) {
      stats.averageSpeed /= this.vehicles.length;
    }

    return stats;
  }

  // Method to handle day/night cycle
  updateTimeOfDay(isNight) {
    this.vehicles.forEach((vehicle) => {
      // Update headlight behavior
      if (vehicle.headlights) {
        vehicle.headlights.forEach((headlight) => {
          if (headlight.light) {
            headlight.light.intensity = isNight ? 0.3 : 0.05;
          }
        });
      }
    });
  }

  // Method to add emergency vehicle behavior
  addEmergencyVehicle(position) {
    // This would create a special emergency vehicle
    // For now, just make nearby vehicles move aside
    const emergencyRadius = 20;
    const nearbyVehicles = this.getVehiclesInArea(position, emergencyRadius);

    nearbyVehicles.forEach((vehicle) => {
      vehicle.handleEmergencyVehicle({ position: position });
    });
  }

  // Method to update city bounds
  setCityBounds(bounds) {
    this.cityBounds = bounds;
  }

  // Method to get debug information
  getDebugInfo() {
    return {
      vehicleCount: this.vehicles.length,
      maxVehicles: this.maxVehicles,
      spawnTimer: this.spawnTimer,
      spawnInterval: this.spawnInterval,
      streetPositions: this.streetPositions.length,
      intersections: this.intersections.length,
      vehicles: this.vehicles.map((v) => v.getDebugInfo()),
    };
  }

  // Method to dispose of all resources
  dispose() {
    this.clearAllVehicles();
    this.streetPositions = [];
    this.intersections = [];
    this.scene = null;
  }
}

// Utility functions for traffic system

// Function to calculate safe following distance
function calculateFollowingDistance(speed, reactionTime = 1.5) {
  // Distance = speed * reaction_time + braking_distance
  const reactionDistance = speed * reactionTime;
  const brakingDistance = (speed * speed) / (2 * 9.8 * 0.7); // Assuming 0.7 friction coefficient
  return reactionDistance + brakingDistance;
}

// Function to interpolate between two positions for smooth movement
function smoothInterpolate(current, target, factor) {
  return current.clone().lerp(target, factor);
}

// Function to calculate turn radius for realistic vehicle movement
function calculateTurnRadius(speed, maxTurnAngle) {
  // Simplified turn radius calculation
  return speed / Math.tan(maxTurnAngle);
}

// Function to check if a position is on a valid road
function isValidRoadPosition(position, streetPositions, tolerance = 5) {
  return streetPositions.some(
    (streetPos) => position.distanceTo(streetPos) <= tolerance
  );
}

// Function to find nearest road position
function findNearestRoadPosition(position, streetPositions) {
  if (streetPositions.length === 0) return position.clone();

  let nearestPos = streetPositions[0];
  let minDistance = position.distanceTo(nearestPos);

  streetPositions.forEach((streetPos) => {
    const distance = position.distanceTo(streetPos);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPos = streetPos;
    }
  });

  return nearestPos.clone();
}

// Export classes and functions
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TrafficVehicle,
    TrafficManager,
    calculateFollowingDistance,
    smoothInterpolate,
    calculateTurnRadius,
    isValidRoadPosition,
    findNearestRoadPosition,
  };
} else if (typeof window !== "undefined") {
  // Browser environment
  window.TrafficVehicle = TrafficVehicle;
  window.TrafficManager = TrafficManager;
  window.TrafficUtils = {
    calculateFollowingDistance,
    smoothInterpolate,
    calculateTurnRadius,
    isValidRoadPosition,
    findNearestRoadPosition,
  };
}
