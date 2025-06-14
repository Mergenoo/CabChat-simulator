class TaxiGame {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.isInitialized = false;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });

    // Initialize systems
    this.gameScene = new GameScene(); // Changed from this.scene
    this.camera = new GameCamera();
    this.physics = new PhysicsSystem();
    this.gps = new GPSSystem();
    this.weather = new WeatherSystem();
    this.dayNight = new DayNightSystem();

    // Game objects
    this.taxi = null;
    this.passengers = [];
    this.trafficManager = null; // Changed from this.traffic array

    // UI systems
    this.ui = new GameUI();
    this.dashboard = new Dashboard();
    this.minimap = new Minimap();

    // Game state
    this.gameState = {
      isRunning: false,
      isPaused: false,
      score: 0,
      earnings: 0,
      fuel: 100,
      reputation: 100,
      currentPassenger: null,
      activeTrip: null,
    };

    this.clock = new THREE.Clock();
    this.mobileInput = { forward: 0, turn: 0 };

    this.setupRenderer();
    this.setupControls();

    this.init();
  }

  handleKeyDown(event) {
    switch (event.code) {
      case "KeyH":
        if (this.taxi) this.taxi.honk();
        break;
      case "KeyP":
        this.togglePause();
        break;
      case "KeyM":
        this.ui.toggleMinimap();
        break;
      case "KeyL":
        if (this.taxi) this.taxi.toggleHeadlights();
        break;
      case "KeyE": // E KEY for passenger pickup
        event.preventDefault();
        this.handlePassengerInteraction();
        break;
      case "Space":
        // Space only for brake now
        break;
      case "KeyT":
        this.adjustTrafficDensity();
        break;
    }
  }

  setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // Changed from PCFSoftShadowMap
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Add performance monitoring
    this.renderer.info.autoReset = false;
  }

  setupControls() {
    this.keys = {};
    this.mouse = { x: 0, y: 0 };

    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      this.handleKeyDown(e);
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Mouse controls
    document.addEventListener("mousemove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Touch controls for mobile
    this.setupTouchControls();

    // UI controls
    this.setupUIControls();

    // Window resize
    window.addEventListener("resize", () => this.handleResize());
  }

  setupTouchControls() {
    const joystick = document.getElementById("movement-joystick");
    if (!joystick) return; // Element might not exist

    let joystickActive = false;
    let joystickCenter = { x: 0, y: 0 };

    joystick.addEventListener("touchstart", (e) => {
      e.preventDefault();
      joystickActive = true;
      const rect = joystick.getBoundingClientRect();
      joystickCenter.x = rect.left + rect.width / 2;
      joystickCenter.y = rect.top + rect.height / 2;
    });

    document.addEventListener("touchmove", (e) => {
      if (!joystickActive) return;
      e.preventDefault();

      const touch = e.touches[0];
      let deltaX = touch.clientX - joystickCenter.x;
      let deltaY = touch.clientY - joystickCenter.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 40;

      if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        deltaX = Math.cos(angle) * maxDistance;
        deltaY = Math.sin(angle) * maxDistance;
      }

      // Convert to movement input
      this.mobileInput = {
        forward: -deltaY / maxDistance,
        turn: deltaX / maxDistance,
      };
    });

    document.addEventListener("touchend", () => {
      joystickActive = false;
      this.mobileInput = { forward: 0, turn: 0 };
    });
  }

  setupUIControls() {
    // Camera toggle
    const cameraToggle = document.getElementById("camera-toggle");
    if (cameraToggle) {
      cameraToggle.addEventListener("click", () => {
        this.camera.toggleView();
      });
    }

    // GPS toggle
    const gpsToggle = document.getElementById("gps-toggle");
    if (gpsToggle) {
      gpsToggle.addEventListener("click", () => {
        this.ui.toggleGPS();
      });
    }

    // Radio toggle
    const radioToggle = document.getElementById("radio-toggle");
    if (radioToggle) {
      radioToggle.addEventListener("click", () => {
        this.ui.toggleRadio();
      });
    }

    // Radio stations
    document.querySelectorAll(".station-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.changeRadioStation(e.target.dataset.station);
      });
    });
  }

  async init() {
    try {
      console.log("Game initialization started");

      // Initialize scene first
      await this.gameScene.init();
      this.gameScene.finalizeScene();
      console.log("Scene initialized, fog exists:", !!this.gameScene.scene.fog);

      // Initialize taxi
      this.taxi = new Taxi();
      await this.taxi.init();
      this.gameScene.add(this.taxi.mesh);

      // Initialize camera with taxi
      this.camera.init(this.taxi);

      // Initialize physics with the scene
      this.physics.init(this.gameScene.scene);

      // Initialize GPS with city layout
      this.gps.init(this.gameScene.cityLayout);

      // Initialize weather with scene
      console.log("Initializing weather with scene:", this.gameScene.scene);
      this.weather.init(this.gameScene.scene);

      // Initialize day/night system
      this.dayNight.init(this.gameScene.scene);

      // Initialize traffic manager
      this.trafficManager = new TrafficManager(this.gameScene.scene, 12); // Max 12 vehicles
      const streetPositions = this.gameScene.streetPositions || [];
      const intersections = this.gameScene.cityLayout.intersections || [];
      this.trafficManager.init(streetPositions, intersections);

      // Set city bounds for traffic
      this.trafficManager.setCityBounds({
        min: { x: -250, z: -250 },
        max: { x: 250, z: 250 },
      });

      // Generate passengers
      this.generatePassengers();

      // Initialize UI systems
      this.ui.init();
      this.dashboard.init();
      this.minimap.init(this.gameScene.cityLayout);

      // Set initialization flag
      this.isInitialized = true;

      console.log("Game initialized successfully");

      // Log performance stats
      const stats = this.gameScene.getPerformanceStats();
      console.log("Scene performance stats:", stats);
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

  update() {
    if (this.gameState.isPaused || !this.isInitialized) return;

    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time

    try {
      // Update taxi
      if (this.taxi) {
        this.updateTaxiControls();
        this.taxi.update(deltaTime);
        this.physics.updateVehicle(this.taxi, deltaTime);
      }

      // Update passengers
      this.passengers.forEach((passenger) => {
        if (passenger && passenger.update) {
          passenger.update(deltaTime);
        }
      });

      // Update traffic manager
      if (this.trafficManager) {
        this.trafficManager.update(deltaTime);
      }

      // Update scene systems
      if (this.gameScene) {
        this.gameScene.updateTrafficLights(deltaTime);
      }

      // Update weather and day/night
      this.weather.update(deltaTime);
      this.dayNight.update(deltaTime);

      // Update GPS
      if (this.taxi) {
        this.gps.update(this.taxi.position);
      }

      // Update active trip
      if (this.gameState.activeTrip) {
        this.updateActiveTrip(deltaTime);
      }

      // Update camera
      this.camera.update(deltaTime);

      // Update UI
      this.dashboard.update(this.gameState);
      if (this.taxi) {
        this.minimap.update(
          this.taxi.position,
          this.passengers,
          this.gameState.currentPassenger
        );
      }

      // Update fuel consumption
      this.updateFuel(deltaTime);

      // Check for collisions
      this.checkCollisions();

      // Performance monitoring
      this.monitorPerformance();
    } catch (error) {
      console.error("Error in game update:", error);
    }
  }

  generatePassengers() {
    const passengerCount = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < passengerCount; i++) {
      try {
        const passenger = new Passenger();
        const spawnPosition = this.gameScene.getRandomStreetPosition();
        passenger.init(spawnPosition);
        this.passengers.push(passenger);
        this.gameScene.add(passenger.mesh);
      } catch (error) {
        console.error("Error generating passenger:", error);
      }
    }
  }

  finalizeScene() {}

  handleKeyDown(event) {
    switch (event.code) {
      case "KeyH":
        if (this.taxi) this.taxi.honk();
        break;
      case "KeyP":
        this.togglePause();
        break;
      case "KeyM":
        this.ui.toggleMinimap();
        break;
      case "KeyL":
        if (this.taxi) this.taxi.toggleHeadlights();
        break;
      case "Space":
        event.preventDefault();
        this.handlePassengerInteraction();
        break;
      case "KeyT":
        // Toggle traffic density for testing
        this.adjustTrafficDensity();
        break;
    }
  }

  handlePassengerInteraction() {
    if (this.gameState.currentPassenger) {
      this.dropOffPassenger();
    } else {
      this.pickUpPassenger();
    }
  }

  // In Game.js, fix the pickUpPassenger method:
  pickUpPassenger() {
    console.log("Attempting to pick up passenger...");

    const nearbyPassenger = this.findNearbyPassenger();
    if (nearbyPassenger) {
      console.log(`Picking up passenger: ${nearbyPassenger.name}`);

      // Pick up the passenger
      const passengerInfo = nearbyPassenger.pickUp();

      // Set up the trip
      this.gameState.currentPassenger = nearbyPassenger;
      this.gameState.activeTrip = {
        startTime: Date.now(),
        startPosition: this.taxi.position.clone(),
        destination: nearbyPassenger.destination.clone(),
        baseFare: 5.0 + Math.random() * 10, // $5-15 base fare
        distance: 0,
        passengerInfo: passengerInfo,
      };

      // Remove passenger from scene and array
      this.gameScene.remove(nearbyPassenger.mesh);
      this.passengers = this.passengers.filter((p) => p !== nearbyPassenger);

      // Set GPS destination
      if (this.gps && this.gps.setDestination) {
        this.gps.setDestination(nearbyPassenger.destination);
      }

      // Show pickup message
      console.log(`✓ Passenger ${nearbyPassenger.name} picked up!`);
      console.log(
        `Destination: ${nearbyPassenger.destination.x.toFixed(
          1
        )}, ${nearbyPassenger.destination.z.toFixed(1)}`
      );
    } else {
      console.log("No passenger nearby to pick up");
    }
  }

  // Fix the dropOffPassenger method:
  dropOffPassenger() {
    if (!this.gameState.currentPassenger || !this.gameState.activeTrip) return;

    const destination = this.gameState.activeTrip.destination;
    const distance = this.taxi.position.distanceTo(destination);

    console.log(`Distance to destination: ${distance.toFixed(2)}`);

    if (distance < 15) {
      // Increased drop-off range
      const trip = this.gameState.activeTrip;
      const passenger = this.gameState.currentPassenger;

      // Calculate fare
      const tripTime = (Date.now() - trip.startTime) / 1000;
      const tripDistance =
        trip.startPosition.distanceTo(this.taxi.position) / 10; // Convert to km
      const fare = this.calculateFare(tripDistance, tripTime, passenger.mood);

      // Calculate tip
      const tip = passenger.getTipAmount ? passenger.getTipAmount() : 0;
      const totalEarnings = fare + tip;

      // Update game state - FIXED
      this.gameState.earnings += totalEarnings;
      this.gameState.reputation += Math.max(0, tip);
      this.gameState.score += Math.floor(totalEarnings * 10);

      console.log(`💰 Trip completed!`);
      console.log(`Fare: $${fare.toFixed(2)}`);
      console.log(`Tip: $${tip.toFixed(2)}`);
      console.log(`Total: $${totalEarnings.toFixed(2)}`);
      console.log(`Total Earnings: $${this.gameState.earnings.toFixed(2)}`);

      // Clear current trip
      this.gameState.currentPassenger = null;
      this.gameState.activeTrip = null;

      // Clear GPS
      if (this.gps && this.gps.clearDestination) {
        this.gps.clearDestination();
      }

      // Generate new passenger after delay
      setTimeout(() => {
        this.generateNewPassenger();
      }, 3000 + Math.random() * 5000);

      // Update UI
      this.updateEarningsDisplay();
    } else {
      console.log(
        `Get closer to destination! Distance: ${distance.toFixed(1)} units`
      );
    }
  }

  // Add method to generate single new passenger:
  generateNewPassenger() {
    try {
      const passenger = new Passenger();
      const spawnPosition = this.gameScene.getRandomStreetPosition();
      spawnPosition.y = 0;

      passenger.init(spawnPosition);
      this.passengers.push(passenger);
      this.gameScene.add(passenger.mesh);

      console.log(`✓ New passenger spawned: ${passenger.name}`);
    } catch (error) {
      console.error("Error generating new passenger:", error);
    }
  }

  // Add this to your GameScene class
  updateVehicles(deltaTime) {
    const currentTime = Date.now() / 1000;

    // Spawn new vehicles
    if (currentTime - this.lastVehicleSpawn > 1 / this.vehicleSpawnRate) {
      if (this.vehicles.length < this.maxVehicles) {
        this.spawnRandomVehicle();
        this.lastVehicleSpawn = currentTime;
      }
    }

    // Update existing vehicles
    this.vehicles.forEach((vehicle, index) => {
      this.updateVehicleMovement(vehicle, deltaTime);
      this.updateVehicleLights(vehicle);
      this.updateEmergencyLights(vehicle, deltaTime);

      // Remove vehicles that are too far from center
      const distanceFromCenter = vehicle.position.distanceTo(
        new THREE.Vector3(0, 0, 0)
      );
      if (distanceFromCenter > 300) {
        this.removeVehicle(index);
      }
    });
  }

  // Make sure you also have these supporting methods:
  updateVehicleMovement(vehicle, deltaTime) {
    if (!vehicle.userData.isMoving) return;

    const speed = vehicle.userData.speed;
    const moveDistance = speed * deltaTime * 15; // Speed multiplier

    // Simple forward movement
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(vehicle.quaternion);

    vehicle.position.add(direction.multiplyScalar(moveDistance));

    // Rotate wheels
    if (vehicle.userData.wheels) {
      const wheelRotation =
        moveDistance / (vehicle.userData.config?.wheels?.radius || 0.3);
      vehicle.userData.wheels.forEach((wheel) => {
        wheel.rotation.x += wheelRotation;
      });
    }

    // Simple turning at intersections
    if (Math.random() < 0.002) {
      // 0.2% chance per frame to turn
      const turnAngle = (Math.random() - 0.5) * Math.PI;
      vehicle.rotation.y += turnAngle;
    }

    // Vary speed slightly
    if (Math.random() < 0.001) {
      const baseSpeed = vehicle.userData.config?.speed || 0.8;
      vehicle.userData.speed = baseSpeed * (0.7 + Math.random() * 0.6);
    }
  }

  updateVehicleLights(vehicle) {
    const isNight = this.isNightTime();

    if (vehicle.userData.headlights) {
      vehicle.userData.headlights.forEach((light) => {
        light.material.opacity = isNight ? 1.0 : 0.3;
      });
    }

    if (vehicle.userData.taillights) {
      vehicle.userData.taillights.forEach((light) => {
        light.material.opacity = isNight ? 0.8 : 0.2;
      });
    }
  }

  updateEmergencyLights(vehicle, deltaTime) {
    if (!vehicle.userData.emergencyLights) return;

    const time = Date.now() / 1000;
    const flashRate = 3; // Flashes per second
    const isFlashing = Math.floor(time * flashRate) % 2 === 0;

    vehicle.userData.emergencyLights.forEach((light, index) => {
      // Alternate flashing
      light.material.opacity =
        (isFlashing && index === 0) || (!isFlashing && index === 1) ? 1.0 : 0.3;
    });
  }

  removeVehicle(index) {
    if (index >= 0 && index < this.vehicles.length) {
      const vehicle = this.vehicles[index];
      this.scene.remove(vehicle);
      this.vehicles.splice(index, 1);
    }
  }

  isNightTime() {
    const hour = new Date().getHours();
    return hour < 6 || hour > 18;
  }

  // Add method to update earnings display:
  updateEarningsDisplay() {
    // Update dashboard if it exists
    if (this.dashboard && this.dashboard.updateEarnings) {
      this.dashboard.updateEarnings();
    }

    // Update any UI elements that show earnings
    const earningsElement = document.getElementById("earnings-display");
    if (earningsElement) {
      earningsElement.textContent = `$${this.gameState.earnings.toFixed(2)}`;
    }

    // Log to console for debugging
    console.log(`Current earnings: $${this.gameState.earnings.toFixed(2)}`);
  }

  findNearbyPassenger() {
    if (!this.taxi) return null;

    const taxiPosition = this.taxi.position;
    const pickupRange = 5;

    return this.passengers.find((passenger) => {
      if (!passenger || !passenger.position) return false;
      const distance = taxiPosition.distanceTo(passenger.position);
      return (
        distance < pickupRange && passenger.isWaiting && passenger.isWaiting()
      );
    });
  }

  calculateFare(distance, time, passengerMood) {
    const baseFare = 5.0;
    const distanceRate = 2.0;
    const timeRate = 0.5;

    let fare = baseFare + distance * distanceRate + (time / 60) * timeRate;

    // Mood modifier
    switch (passengerMood) {
      case "happy":
        fare *= 1.2;
        break;
      case "angry":
        fare *= 0.8;
        break;
      case "impatient":
        fare *= 0.9;
        break;
    }

    return Math.max(fare, baseFare * 0.5);
  }

  updateTaxiControls() {
    if (!this.taxi) return;

    let forward = 0;
    let turn = 0;
    let brake = false;

    // Keyboard controls - FIX: Reverse the turn direction
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) forward += 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) forward -= 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) turn += 1; // CHANGED: was turn -= 1
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) turn -= 1; // CHANGED: was turn += 1
    if (this.keys["Space"]) brake = true;

    // Mobile controls - FIX: Also reverse mobile turning
    if (this.mobileInput) {
      forward += this.mobileInput.forward;
      turn -= this.mobileInput.turn; // CHANGED: was turn += this.mobileInput.turn
    }

    this.taxi.setControls(forward, turn, brake);
  }

  updateActiveTrip(deltaTime) {
    if (!this.gameState.activeTrip || !this.taxi) return;

    const trip = this.gameState.activeTrip;
    const currentDistance = trip.startPosition.distanceTo(this.taxi.position);
    trip.distance = currentDistance / 100; // Convert to km

    // Update fare meter
    const tripTime = (Date.now() - trip.startTime) / 1000;
    const currentFare = this.calculateFare(
      trip.distance,
      tripTime,
      this.gameState.currentPassenger
        ? this.gameState.currentPassenger.mood
        : "neutral"
    );

    this.dashboard.updateFareMeter(currentFare, trip.distance, tripTime);
  }

  updateFuel(deltaTime) {
    if (this.taxi && this.taxi.isMoving && this.taxi.isMoving()) {
      const fuelConsumption = 0.5 * deltaTime;
      this.gameState.fuel = Math.max(0, this.gameState.fuel - fuelConsumption);

      if (this.gameState.fuel <= 0) {
        this.handleOutOfFuel();
      }
    }
  }

  checkCollisions() {
    if (!this.taxi || !this.trafficManager) return;

    // Check taxi vs traffic collisions
    const nearbyVehicles = this.trafficManager.getVehiclesInArea(
      this.taxi.position,
      10
    );
    nearbyVehicles.forEach((vehicle) => {
      const distance = this.taxi.position.distanceTo(vehicle.position);
      if (distance < 4) {
        this.handleCollision(vehicle);
      }
    });

    // Check taxi vs buildings (handled by physics system)
    if (
      this.physics.checkBuildingCollision &&
      this.physics.checkBuildingCollision(this.taxi)
    ) {
      this.handleBuildingCollision();
    }
  }

  handleCollision(vehicle) {
    // Reduce reputation and potentially damage taxi
    this.gameState.reputation = Math.max(0, this.gameState.reputation - 10);

    if (this.taxi.takeDamage) {
      this.taxi.takeDamage(5);
    }

    // Visual/audio feedback
    this.ui.showMessage("Collision! Be more careful!");

    // Make the other vehicle react
    if (vehicle && vehicle.brake) {
      vehicle.brake();
      vehicle.honk();
    }

    console.log("Vehicle collision!");
  }

  handleBuildingCollision() {
    this.gameState.reputation = Math.max(0, this.gameState.reputation - 5);

    if (this.taxi.takeDamage) {
      this.taxi.takeDamage(2);
    }

    this.ui.showMessage("Watch where you're going!");
  }

  handleOutOfFuel() {
    this.ui.showMessage("Out of fuel! Find a gas station!");

    if (this.taxi.setMaxSpeed) {
      this.taxi.setMaxSpeed(0.1); // Very slow movement
    }
  }

  // Performance monitoring
  monitorPerformance() {
    // Simple FPS monitoring
    if (!this.performanceMonitor) {
      this.performanceMonitor = {
        lastTime: performance.now(),
        frameCount: 0,
        fps: 60,
      };
    }

    this.performanceMonitor.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.performanceMonitor.lastTime >= 1000) {
      this.performanceMonitor.fps = this.performanceMonitor.frameCount;
      this.performanceMonitor.frameCount = 0;
      this.performanceMonitor.lastTime = currentTime;

      // Auto-adjust traffic density based on performance
      if (this.performanceMonitor.fps < 25 && this.trafficManager) {
        const currentDensity = this.trafficManager.maxVehicles / 30;
        const newDensity = Math.max(0.2, currentDensity - 0.1);
        this.trafficManager.setTrafficDensity(newDensity);
        console.log(
          `Low FPS (${this.performanceMonitor.fps}), reduced traffic density`
        );
      }
    }
  }

  // Traffic density adjustment for testing/performance
  adjustTrafficDensity() {
    if (!this.trafficManager) return;

    const currentStats = this.trafficManager.getTrafficStats();
    const currentDensity = currentStats.totalVehicles / 30;

    // Cycle through density levels: 0.3, 0.6, 1.0, 0.3...
    let newDensity;
    if (currentDensity < 0.4) {
      newDensity = 0.6;
    } else if (currentDensity < 0.7) {
      newDensity = 1.0;
    } else {
      newDensity = 0.3;
    }

    this.trafficManager.setTrafficDensity(newDensity);
    this.ui.showMessage(`Traffic density: ${Math.round(newDensity * 100)}%`);
  }

  // Day/night cycle control
  setTimeOfDay(timeOfDay) {
    const isNight = timeOfDay === "night" || timeOfDay === "dusk";

    // Update traffic headlights
    if (this.trafficManager) {
      this.trafficManager.updateTimeOfDay(isNight);
    }

    // Update scene lighting
    if (this.gameScene) {
      this.gameScene.updateStreetLights(isNight);
      this.gameScene.updateSkybox(timeOfDay);
    }

    // Update taxi headlights
    if (this.taxi && isNight) {
      this.taxi.headlightsOn = true;
    }
  }

  // Radio station management
  changeRadioStation(station) {
    console.log(`Changed to ${station} station`);
    this.ui.showMessage(`Now playing: ${station.toUpperCase()}`);

    // Here you could implement actual audio playback
    // this.audioManager.playStation(station);
  }

  // Game state management
  togglePause() {
    this.gameState.isPaused = !this.gameState.isPaused;
    this.ui.showPauseMenu(this.gameState.isPaused);

    if (this.gameState.isPaused) {
      this.clock.stop();
    } else {
      this.clock.start();
    }
  }

  pause() {
    this.gameState.isPaused = true;
    this.clock.stop();
  }

  resume() {
    this.gameState.isPaused = false;
    this.clock.start();
  }

  start() {
    this.gameState.isRunning = true;
    this.clock.start();
    this.gameLoop();
  }

  stop() {
    this.gameState.isRunning = false;
    this.clock.stop();
  }

  gameLoop() {
    if (!this.gameState.isRunning) return;

    try {
      this.update();
      this.render();
    } catch (error) {
      console.error("Error in game loop:", error);
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  render() {
    if (!this.gameScene || !this.camera) return;

    // Reset renderer info for performance monitoring
    this.renderer.info.reset();

    // Render the scene
    this.renderer.render(this.gameScene.scene, this.camera.camera);
  }

  // Window resize handler
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update camera
    if (this.camera && this.camera.camera) {
      this.camera.camera.aspect = width / height;
      this.camera.camera.updateProjectionMatrix();
    }

    // Update renderer
    this.renderer.setSize(width, height);

    // Update minimap
    if (this.minimap && this.minimap.handleResize) {
      this.minimap.handleResize();
    }
  }

  // Mobile controls
  enableMobileControls() {
    const mobileControls = document.getElementById("mobile-controls");
    if (mobileControls) {
      mobileControls.style.display = "block";
    }
    this.mobileInput = { forward: 0, turn: 0 };
  }

  disableMobileControls() {
    const mobileControls = document.getElementById("mobile-controls");
    if (mobileControls) {
      mobileControls.style.display = "none";
    }
  }

  // Save/Load game state
  saveGameState() {
    const saveData = {
      earnings: this.gameState.earnings,
      reputation: this.gameState.reputation,
      fuel: this.gameState.fuel,
      taxiPosition: this.taxi ? this.taxi.position.toArray() : [0, 0, 0],
      timestamp: Date.now(),
    };

    localStorage.setItem("taxiGameSave", JSON.stringify(saveData));
    this.ui.showMessage("Game saved!");
  }

  loadGameState() {
    const saveData = localStorage.getItem("taxiGameSave");
    if (!saveData) {
      this.ui.showMessage("No save data found!");
      return false;
    }

    try {
      const data = JSON.parse(saveData);

      this.gameState.earnings = data.earnings || 0;
      this.gameState.reputation = data.reputation || 100;
      this.gameState.fuel = data.fuel || 100;

      if (this.taxi && data.taxiPosition) {
        this.taxi.position.fromArray(data.taxiPosition);
      }

      this.ui.showMessage("Game loaded!");
      return true;
    } catch (error) {
      console.error("Error loading save data:", error);
      this.ui.showMessage("Error loading save data!");
      return false;
    }
  }

  // Debug methods
  getDebugInfo() {
    return {
      gameState: this.gameState,
      isInitialized: this.isInitialized,
      fps: this.performanceMonitor ? this.performanceMonitor.fps : 0,
      trafficStats: this.trafficManager
        ? this.trafficManager.getTrafficStats()
        : null,
      sceneStats: this.gameScene ? this.gameScene.getPerformanceStats() : null,
      taxiInfo: this.taxi
        ? this.taxi.getDebugInfo
          ? this.taxi.getDebugInfo()
          : this.taxi.position
        : null,
    };
  }

  // Emergency methods
  resetGame() {
    console.log("Resetting game...");

    // Stop the game loop
    this.gameState.isRunning = false;

    // Clear all objects
    if (this.trafficManager) {
      this.trafficManager.dispose();
    }

    // Reset game state
    this.gameState = {
      isRunning: false,
      isPaused: false,
      score: 0,
      earnings: 0,
      fuel: 100,
      reputation: 100,
      currentPassenger: null,
      activeTrip: null,
    };

    // Reinitialize
    this.isInitialized = false;
    this.init()
      .then(() => {
        this.ui.showMessage("Game reset complete!");
      })
      .catch((error) => {
        console.error("Error resetting game:", error);
      });
  }

  // Cleanup method
  dispose() {
    console.log("Disposing game resources...");

    this.stop();

    if (this.trafficManager) {
      this.trafficManager.dispose();
    }

    if (this.gameScene && this.gameScene.scene) {
      // Dispose of all scene objects
      this.gameScene.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

// Auto-start the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing game...");

  try {
    const game = new TaxiGame();

    // Make game globally accessible for debugging
    window.game = game;

    // Start the game
    game.start();

    // Add global error handler
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);
      // Could show user-friendly error message
    });

    // Add unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
    });
  } catch (error) {
    console.error("Failed to initialize game:", error);

    // Show error message to user
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 0, 0, 0.9);
          color: white;
          padding: 20px;
          border-radius: 10px;
          font-family: Arial, sans-serif;
          z-index: 10000;
        `;
    errorDiv.innerHTML = `
          <h3>Game Initialization Error</h3>
          <p>Failed to start the taxi game. Please refresh the page and try again.</p>
          <p><small>Error: ${error.message}</small></p>
        `;
    document.body.appendChild(errorDiv);
  }
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = TaxiGame;
}
