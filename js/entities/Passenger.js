// Passenger.js and relevant Game.js passenger logic combined

class Passenger {
  constructor() {
    this.mesh = null;
    this.position = new THREE.Vector3();
    this.destination = new THREE.Vector3();
    this.mood = "neutral"; // 'happy', 'neutral', 'impatient', 'angry'
    this.waitTime = 0;
    this.maxWaitTime = 60; // seconds
    this.waiting = true; // renamed from isWaiting to avoid confusion
    this.tipAmount = 0;

    // Passenger properties
    this.name = this.generateRandomName();
    this.patience = 50 + Math.random() * 50; // 50-100
    this.preferredSpeed = 0.7 + Math.random() * 0.6; // 0.7-1.3 multiplier

    // Visual properties
    this.color = this.getRandomColor();
    this.height = 1.6 + Math.random() * 0.4;

    // Animation
    this.animationTime = 0;
    this.bobAmount = 0.1;
  }

  async init(position) {
    this.position.copy(position);
    this.destination = this.generateRandomDestination();
    this.createPassengerMesh();
    this.createWaitingIndicator();
    this.setInitialMood();
  }

  createPassengerMesh() {
    this.mesh = new THREE.Group();

    // Body - CylinderGeometry
    const bodyGeometry = new THREE.CylinderGeometry(
      0.3,
      0.3,
      this.height - 0.6,
      8
    );
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: this.color.body,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = this.height / 2;
    body.castShadow = true;

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25);
    const headMaterial = new THREE.MeshLambertMaterial({
      color: this.color.skin,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = this.height - 0.25;
    head.castShadow = true;

    // Hat/Hair
    const hatGeometry = new THREE.SphereGeometry(0.27);
    const hatMaterial = new THREE.MeshLambertMaterial({
      color: this.color.hair,
    });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = this.height - 0.1;
    hat.scale.y = 0.5;

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6);
    const armMaterial = new THREE.MeshLambertMaterial({
      color: this.color.skin,
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, this.height - 0.5, 0);
    leftArm.rotation.z = 0.3;

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, this.height - 0.5, 0);
    rightArm.rotation.z = -0.3;

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    const legMaterial = new THREE.MeshLambertMaterial({
      color: this.color.pants,
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.4, 0);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.4, 0);

    // Assemble passenger
    this.mesh.add(body);
    this.mesh.add(head);
    this.mesh.add(hat);
    this.mesh.add(leftArm);
    this.mesh.add(rightArm);
    this.mesh.add(leftLeg);
    this.mesh.add(rightLeg);

    // Store references
    this.body = body;
    this.head = head;
    this.leftArm = leftArm;
    this.rightArm = rightArm;

    // Position the mesh
    this.mesh.position.copy(this.position);
  }

  createWaitingIndicator() {
    // Exclamation mark above head
    const indicatorGeometry = new THREE.SphereGeometry(0.1);
    const indicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    });
    this.waitingIndicator = new THREE.Mesh(
      indicatorGeometry,
      indicatorMaterial
    );
    this.waitingIndicator.position.set(0, this.height + 0.5, 0);
    this.mesh.add(this.waitingIndicator);

    // Pulsing animation
    this.indicatorPulse = 0;
  }

  generateRandomName() {
    const firstNames = [
      "John",
      "Jane",
      "Mike",
      "Sarah",
      "David",
      "Lisa",
      "Tom",
      "Emma",
      "Chris",
      "Anna",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Brown",
      "Davis",
      "Wilson",
      "Miller",
      "Moore",
      "Taylor",
      "Anderson",
      "Thomas",
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${firstName} ${lastName}`;
  }

  getRandomColor() {
    const bodyColors = [
      0x0066cc, 0x009900, 0xcc0000, 0x9900cc, 0xff6600, 0x006666,
    ];
    const skinColors = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
    const hairColors = [0x8b4513, 0x000000, 0xffd700, 0x654321, 0x708090];
    const pantsColors = [0x000080, 0x8b4513, 0x000000, 0x2f4f4f, 0x556b2f];

    return {
      body: bodyColors[Math.floor(Math.random() * bodyColors.length)],
      skin: skinColors[Math.floor(Math.random() * skinColors.length)],
      hair: hairColors[Math.floor(Math.random() * hairColors.length)],
      pants: pantsColors[Math.floor(Math.random() * pantsColors.length)],
    };
  }

  generateRandomDestination() {
    // This would use the city layout to generate a valid destination
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 100;

    return new THREE.Vector3(
      this.position.x + Math.cos(angle) * distance,
      0,
      this.position.z + Math.sin(angle) * distance
    );
  }

  setInitialMood() {
    const moods = ["happy", "neutral", "impatient"];
    const weights = [0.3, 0.5, 0.2]; // 30% happy, 50% neutral, 20% impatient

    let random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < moods.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        this.mood = moods[i];
        break;
      }
    }

    this.updateMoodVisuals();
  }

  update(deltaTime) {
    if (!this.waiting) return;

    this.waitTime += deltaTime;
    this.animationTime += deltaTime;

    this.updateMood();
    this.animatePassenger(deltaTime);
    this.updateWaitingIndicator(deltaTime);

    if (this.waitTime > this.maxWaitTime) {
      this.giveUpWaiting();
    }
  }

  animatePassenger(deltaTime) {
    const bobOffset = Math.sin(this.animationTime * 2) * this.bobAmount;
    this.mesh.position.y = bobOffset;

    const swayAmount = this.mood === "impatient" ? 0.5 : 0.2;
    const swaySpeed = this.mood === "impatient" ? 4 : 1;

    this.leftArm.rotation.z =
      0.3 + Math.sin(this.animationTime * swaySpeed) * swayAmount;
    this.rightArm.rotation.z =
      -0.3 - Math.sin(this.animationTime * swaySpeed) * swayAmount;

    if (this.mood === "impatient" || this.mood === "angry") {
      this.head.rotation.y = Math.sin(this.animationTime * 3) * 0.5;
    }

    if (this.mood === "impatient") {
      const tapSpeed = 6;
      const tapAmount = 0.1;
      this.mesh.position.y +=
        Math.abs(Math.sin(this.animationTime * tapSpeed)) * tapAmount;
    }
  }

  updateWaitingIndicator(deltaTime) {
    if (!this.waitingIndicator) return;

    this.indicatorPulse += deltaTime * 3;

    const scale = 1 + Math.sin(this.indicatorPulse) * 0.3;
    this.waitingIndicator.scale.setScalar(scale);

    const colors = {
      happy: 0x00ff00,
      neutral: 0xffff00,
      impatient: 0xff8800,
      angry: 0xff0000,
    };

    this.waitingIndicator.material.color.setHex(colors[this.mood]);

    if (this.mood === "impatient" || this.mood === "angry") {
      this.indicatorPulse += deltaTime * 2;
    }
  }

  updateMood() {
    const waitRatio = this.waitTime / this.maxWaitTime;

    if (waitRatio > 0.8) {
      this.mood = "angry";
    } else if (waitRatio > 0.5) {
      this.mood = "impatient";
    } else if (waitRatio < 0.2 && this.mood !== "happy") {
      if (Math.random() < 0.3) {
        this.mood = "happy";
      }
    }

    this.updateMoodVisuals();
  }

  updateMoodVisuals() {
    const moodColors = {
      happy: 1.2,
      neutral: 1.0,
      impatient: 0.9,
      angry: 0.7,
    };

    const brightness = moodColors[this.mood];
    const originalColor = new THREE.Color(this.color.body);
    this.body.material.color.copy(originalColor).multiplyScalar(brightness);
  }

  giveUpWaiting() {
    this.waiting = false;
    this.mood = "angry";
    this.startWalkingAway();
    console.log(`${this.name} gave up waiting and walked away!`);
  }

  startWalkingAway() {
    const walkDirection = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2
    ).normalize();

    const walkSpeed = 2;
    const walkDistance = 20;

    const startPosition = this.mesh.position.clone();
    const endPosition = startPosition
      .clone()
      .add(walkDirection.multiplyScalar(walkDistance));

    this.walkAnimation = {
      startTime: Date.now(),
      duration: (walkDistance / walkSpeed) * 1000,
      startPosition: startPosition,
      endPosition: endPosition,
    };

    this.mesh.lookAt(endPosition);

    if (this.waitingIndicator) {
      this.mesh.remove(this.waitingIndicator);
      this.waitingIndicator = null;
    }
  }

  updateWalkingAway() {
    if (!this.walkAnimation) return;

    const elapsed = Date.now() - this.walkAnimation.startTime;
    const progress = Math.min(elapsed / this.walkAnimation.duration, 1);

    this.mesh.position.lerpVectors(
      this.walkAnimation.startPosition,
      this.walkAnimation.endPosition,
      progress
    );

    const walkCycle = elapsed * 0.01;
    this.leftArm.rotation.x = Math.sin(walkCycle) * 0.5;
    this.rightArm.rotation.x = -Math.sin(walkCycle) * 0.5;

    if (progress >= 1) {
      this.remove();
    }
  }

  pickUp() {
    this.waiting = false;
    this.calculateTip();

    if (this.waitingIndicator) {
      this.mesh.remove(this.waitingIndicator);
      this.waitingIndicator = null;
    }

    console.log(
      `${this.name} picked up! Mood: ${
        this.mood
      }, Tip: $${this.tipAmount.toFixed(2)}`
    );

    return {
      name: this.name,
      destination: this.destination,
      mood: this.mood,
      tip: this.tipAmount,
      waitTime: this.waitTime,
    };
  }

  calculateTip() {
    let baseTip = 2.0;

    const moodModifiers = {
      happy: 1.5,
      neutral: 1.0,
      impatient: 0.7,
      angry: 0.3,
    };

    const waitModifier = Math.max(
      0.2,
      1 - (this.waitTime / this.maxWaitTime) * 0.8
    );

    this.tipAmount = baseTip * moodModifiers[this.mood] * waitModifier;
  }

  getDestinationDescription() {
    const locations = [
      "Downtown Office Building",
      "Shopping Mall",
      "Airport Terminal",
      "Train Station",
      "Hospital",
      "University Campus",
      "City Park",
      "Restaurant District",
      "Residential Area",
      "Business District",
    ];

    return locations[Math.floor(Math.random() * locations.length)];
  }

  isWaiting() {
    return this.waiting;
  }

  remove() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }

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
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = Passenger;
}
