class Taxi {
  constructor() {
    this.mesh = null;
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = { x: 0, y: 0, z: 0 };
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();

    // Vehicle properties
    this.maxSpeed = 60; // CHANGED: from 30 to 60
    this.currentSpeed = 0;
    this.acceleration = 25; // CHANGED: from 15 to 25 (faster acceleration)
    this.brakeForce = 35; // CHANGED: from 25 to 35 (better brakes)
    this.turnSpeed = 3; // CHANGED: from 2 to 3 (faster turning)
    this.friction = 0.98;

    // Controls
    this.controls = {
      forward: 0,
      turn: 0,
      brake: false,
    };

    // Vehicle state
    this.health = 100;
    this.fuel = 100;
    this.isEngineOn = true;

    // Audio
    this.engineSound = null;
    this.hornSound = null;

    // Visual effects
    this.headlights = [];
    this.taillights = [];
    this.wheels = [];
  }

  async init() {
    this.createTaxiMesh();
    this.setupLights();
    this.setupWheels();
    this.setupAudio();
    this.setupParticles();
  }

  createTaxiMesh() {
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    body.receiveShadow = true;

    // Roof
    const roofGeometry = new THREE.BoxGeometry(3.5, 1, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 2.25;
    roof.castShadow = true;

    // Windows
    const windowGeometry = new THREE.BoxGeometry(3.6, 0.8, 3.8);
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.7,
    });
    const windows = new THREE.Mesh(windowGeometry, windowMaterial);
    windows.position.y = 2.25;

    // Taxi sign
    const signGeometry = new THREE.BoxGeometry(2, 0.5, 0.8);
    const signMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 3, 0);

    // Add taxi text to sign
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.font = "20px Arial";
    context.textAlign = "center";
    context.fillText("TAXI", 64, 20);

    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const textGeometry = new THREE.PlaneGeometry(1.8, 0.4);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, 0, 0.41);
    sign.add(textMesh);

    // Combine all parts
    this.mesh = new THREE.Group();
    this.mesh.add(body);
    this.mesh.add(roof);
    this.mesh.add(windows);
    this.mesh.add(sign);

    // Store references
    this.body = body;
    this.roof = roof;
    this.windows = windows;
    this.sign = sign;
  }

  setupLights() {
    // Headlights
    const headlightGeometry = new THREE.SphereGeometry(0.3);
    const headlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
    });

    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-1.2, 0.8, 3.8);
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(1.2, 0.8, 3.8);

    this.mesh.add(leftHeadlight);
    this.mesh.add(rightHeadlight);

    // Headlight beams
    const leftBeam = new THREE.SpotLight(0xffffaa, 1, 30, Math.PI / 6);
    leftBeam.position.copy(leftHeadlight.position);
    leftBeam.target.position.set(-1.2, 0, 20);
    leftBeam.castShadow = true;

    const rightBeam = new THREE.SpotLight(0xffffaa, 1, 30, Math.PI / 6);
    rightBeam.position.copy(rightHeadlight.position);
    rightBeam.target.position.set(1.2, 0, 20);
    rightBeam.castShadow = true;

    this.mesh.add(leftBeam);
    this.mesh.add(rightBeam);
    this.mesh.add(leftBeam.target);
    this.mesh.add(rightBeam.target);

    this.headlights = [
      { mesh: leftHeadlight, light: leftBeam },
      { mesh: rightHeadlight, light: rightBeam },
    ];

    // Taillights - FIX: Use MeshLambertMaterial with emissive property
    const taillightMaterial = new THREE.MeshLambertMaterial({
      color: 0xff0000,
      emissive: new THREE.Color(0x000000), // Initialize emissive property
    });

    const leftTaillight = new THREE.Mesh(
      headlightGeometry,
      taillightMaterial.clone()
    );
    leftTaillight.position.set(-1.2, 0.8, -3.8);
    const rightTaillight = new THREE.Mesh(
      headlightGeometry,
      taillightMaterial.clone()
    );
    rightTaillight.position.set(1.2, 0.8, -3.8);

    this.mesh.add(leftTaillight);
    this.mesh.add(rightTaillight);

    this.taillights = [leftTaillight, rightTaillight];
  }

  setupWheels() {
    const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const wheelPositions = [
      { x: -1.5, z: 2.5 }, // Front left
      { x: 1.5, z: 2.5 }, // Front right
      { x: -1.5, z: -2.5 }, // Rear left
      { x: 1.5, z: -2.5 }, // Rear right
    ];

    wheelPositions.forEach((pos, index) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, 0.5, pos.z);
      wheel.castShadow = true;

      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });
  }

  setupAudio() {
    // Engine sound (placeholder - would use actual audio files)
    this.engineSound = {
      play: () => {},
      stop: () => {},
      setVolume: (volume) => {},
    };

    this.hornSound = {
      play: () => console.log("Horn sound!"),
    };
  }

  setupParticles() {
    // Exhaust particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = 0;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x666666,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    this.exhaustParticles = new THREE.Points(
      particleGeometry,
      particleMaterial
    );
    this.exhaustParticles.position.set(0, 0.5, -4);
    this.mesh.add(this.exhaustParticles);
  }

  setControls(forward, turn, brake) {
    this.controls.forward = Math.max(-1, Math.min(1, forward));
    this.controls.turn = Math.max(-1, Math.min(1, turn));
    this.controls.brake = brake;
  }

  update(deltaTime) {
    this.updateMovement(deltaTime);
    this.updateVisuals(deltaTime);
    this.updateAudio();
    this.updateParticles(deltaTime);

    // Update mesh position and rotation
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation.y;
  }

  updateMovement(deltaTime) {
    if (!this.isEngineOn) return;

    // Calculate acceleration
    const forwardForce = this.controls.forward * this.acceleration;
    const brakeForce = this.controls.brake ? -this.brakeForce : 0;

    // Apply forces
    this.currentSpeed += (forwardForce + brakeForce) * deltaTime;
    this.currentSpeed = Math.max(
      -this.maxSpeed * 0.5,
      Math.min(this.maxSpeed, this.currentSpeed)
    );

    // Apply friction
    this.currentSpeed *= this.friction;

    // Calculate turning (only when moving)
    if (Math.abs(this.currentSpeed) > 0.1) {
      const turnAmount = this.controls.turn * this.turnSpeed * deltaTime;
      const speedFactor = Math.abs(this.currentSpeed) / this.maxSpeed;
      this.rotation.y += turnAmount * speedFactor;
    }

    // Update position based on rotation and speed
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
    direction.multiplyScalar(this.currentSpeed * deltaTime);
    this.position.add(direction);

    // Update velocity for physics calculations
    this.velocity.copy(direction).divideScalar(deltaTime);

    // Wheel rotation
    this.updateWheelRotation(deltaTime);
  }

  updateWheelRotation(deltaTime) {
    const rotationSpeed = this.currentSpeed * 0.1;

    this.wheels.forEach((wheel, index) => {
      // Rotate wheels based on speed
      wheel.rotation.x += rotationSpeed * deltaTime;

      // Turn front wheels based on steering
      if (index < 2) {
        // Front wheels
        wheel.rotation.y = this.controls.turn * 0.3;
      }
    });
  }

  updateVisuals(deltaTime) {
    // Update headlight intensity based on time of day
    const intensity = this.isNightTime() ? 1.0 : 0.3;
    this.headlights.forEach((headlight) => {
      if (headlight && headlight.light) {
        headlight.light.intensity = intensity;
      }
    });

    // Brake lights - FIX: Check if emissive exists before calling setRGB
    const brakeIntensity = this.controls.brake ? 1.5 : 0.5;
    this.taillights.forEach((taillight) => {
      if (taillight && taillight.material && taillight.material.emissive) {
        taillight.material.emissive.setRGB(brakeIntensity * 0.5, 0, 0);
      }
    });

    // Turn signals (if turning)
    this.updateTurnSignals();
  }

  updateTurnSignals() {
    const time = Date.now() * 0.005;
    const blink = Math.sin(time) > 0;

    if (Math.abs(this.controls.turn) > 0.5) {
      const side = this.controls.turn > 0 ? 1 : 0; // 0 = left, 1 = right

      // Blink appropriate headlight and taillight
      if (blink) {
        // Check if headlight exists and has material
        if (
          this.headlights[side] &&
          this.headlights[side].mesh &&
          this.headlights[side].mesh.material
        ) {
          this.headlights[side].mesh.material.color.setHex(0xffa500); // Orange
        }
        // Check if taillight exists and has material
        if (this.taillights[side] && this.taillights[side].material) {
          this.taillights[side].material.color.setHex(0xffa500);
        }
      } else {
        // Check if headlight exists and has material
        if (
          this.headlights[side] &&
          this.headlights[side].mesh &&
          this.headlights[side].mesh.material
        ) {
          this.headlights[side].mesh.material.color.setHex(0xffffaa); // White
        }
        // Check if taillight exists and has material
        if (this.taillights[side] && this.taillights[side].material) {
          this.taillights[side].material.color.setHex(0xff0000); // Red
        }
      }
    } else {
      // Reset colors - with safety checks
      this.headlights.forEach((headlight) => {
        if (headlight && headlight.mesh && headlight.mesh.material) {
          headlight.mesh.material.color.setHex(0xffffaa);
        }
      });
      this.taillights.forEach((taillight) => {
        if (taillight && taillight.material) {
          taillight.material.color.setHex(0xff0000);
        }
      });
    }
  }

  updateAudio() {
    const speedRatio = Math.abs(this.currentSpeed) / this.maxSpeed;
    this.engineSound.setVolume(0.3 + speedRatio * 0.7);

    if (this.isMoving()) {
      this.engineSound.play();
    } else {
      this.engineSound.stop();
    }
  }

  updateParticles(deltaTime) {
    if (!this.exhaustParticles) return;

    const positions = this.exhaustParticles.geometry.attributes.position.array;
    const speedFactor = Math.abs(this.currentSpeed) / this.maxSpeed;

    // Update particle positions
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += (Math.random() - 0.5) * 0.1; // X
      positions[i + 1] += Math.random() * 0.2; // Y
      positions[i + 2] -= speedFactor * 2; // Z

      // Reset particles that have moved too far
      if (positions[i + 2] < -5) {
        positions[i] = (Math.random() - 0.5) * 0.5;
        positions[i + 1] = 0;
        positions[i + 2] = 0;
      }
    }

    this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
    this.exhaustParticles.material.opacity = speedFactor * 0.6;
  }

  honk() {
    this.hornSound.play();

    // Visual feedback - FIX: Check if sign and material exist
    if (this.sign && this.sign.material) {
      this.sign.material.color.setHex(0x00ff00);
      setTimeout(() => {
        if (this.sign && this.sign.material) {
          this.sign.material.color.setHex(0xff0000);
        }
      }, 200);
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.health = Math.max(0, this.health);

    // Visual damage effects - FIX: Check if body and material exist
    if (this.health < 50 && this.body && this.body.material) {
      this.body.material.color.lerp(new THREE.Color(0x8b4513), 0.3); // Brown damage
    }

    if (this.health <= 0) {
      this.breakdown();
    }
  }

  breakdown() {
    this.isEngineOn = false;
    this.maxSpeed = 0;

    // Smoke particles
    this.createSmokeEffect();

    console.log("Taxi has broken down!");
  }

  createSmokeEffect() {
    const smokeGeometry = new THREE.BufferGeometry();
    const smokeCount = 100;
    const positions = new Float32Array(smokeCount * 3);

    for (let i = 0; i < smokeCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2;
      positions[i + 1] = Math.random() * 5;
      positions[i + 2] = (Math.random() - 0.5) * 2;
    }

    smokeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const smokeMaterial = new THREE.PointsMaterial({
      color: 0x333333,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    smoke.position.set(0, 1, 2);
    this.mesh.add(smoke);
  }

  repair() {
    this.health = 100;
    this.isEngineOn = true;
    this.maxSpeed = 30;

    // Reset visual damage - FIX: Check if body and material exist
    if (this.body && this.body.material) {
      this.body.material.color.setHex(0xffff00);
    }

    console.log("Taxi repaired!");
  }

  refuel(amount = 100) {
    this.fuel = Math.min(100, this.fuel + amount);
    console.log(`Refueled! Fuel: ${this.fuel}%`);
  }

  isMoving() {
    return Math.abs(this.currentSpeed) > 0.1;
  }

  isNightTime() {
    // This would be connected to the day/night system
    return false; // Placeholder
  }

  setMaxSpeed(speed) {
    this.maxSpeed = speed;
  }

  getSpeed() {
    return Math.abs(this.currentSpeed);
  }

  getHealth() {
    return this.health;
  }

  getFuel() {
    return this.fuel;
  }
}
