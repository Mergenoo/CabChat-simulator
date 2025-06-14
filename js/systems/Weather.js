class WeatherSystem {
  constructor() {
    this.scene = null;
    this.rainParticles = null;
    this.snowParticles = null;
    this.currentWeather = "clear";
  }

  init(scene) {
    console.log("WeatherSystem init called with:", scene);
    console.log("Scene has fog?", scene.fog);
    this.scene = scene;
    this.setupWeatherEffects(); // Make sure this method exists
  }

  // Add the missing method
  setupWeatherEffects() {
    console.log("Setting up weather effects...");

    // Initialize particle systems
    this.createRainSystem();
    this.createSnowSystem();

    // Set initial weather
    this.setWeather("clear");
  }

  createRainSystem() {
    // Rain particle system setup
    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 1000;
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200; // x
      positions[i + 1] = Math.random() * 100; // y
      positions[i + 2] = (Math.random() - 0.5) * 200; // z
    }

    rainGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const rainMaterial = new THREE.PointsMaterial({
      color: 0x87ceeb,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
    });

    this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  createSnowSystem() {
    // Snow particle system setup
    const snowGeometry = new THREE.BufferGeometry();
    const snowCount = 500;
    const positions = new Float32Array(snowCount * 3);

    for (let i = 0; i < snowCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200; // x
      positions[i + 1] = Math.random() * 100; // y
      positions[i + 2] = (Math.random() - 0.5) * 200; // z
    }

    snowGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const snowMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.8,
    });

    this.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
    this.snowParticles.visible = false;
    this.scene.add(this.snowParticles);
  }

  setWeather(weatherType) {
    this.currentWeather = weatherType;

    // Hide all weather effects first
    if (this.rainParticles) this.rainParticles.visible = false;
    if (this.snowParticles) this.snowParticles.visible = false;

    // Show appropriate weather effect
    switch (weatherType) {
      case "rain":
        if (this.rainParticles) this.rainParticles.visible = true;
        break;
      case "snow":
        if (this.snowParticles) this.snowParticles.visible = true;
        break;
      case "clear":
      default:
        // All effects already hidden
        break;
    }
  }

  update(deltaTime) {
    // Animate weather particles
    if (this.rainParticles && this.rainParticles.visible) {
      this.updateRain(deltaTime);
    }

    if (this.snowParticles && this.snowParticles.visible) {
      this.updateSnow(deltaTime);
    }
  }

  updateRain(deltaTime) {
    const positions = this.rainParticles.geometry.attributes.position.array;

    for (let i = 1; i < positions.length; i += 3) {
      positions[i] -= 50 * deltaTime; // Fall speed

      if (positions[i] < 0) {
        positions[i] = 100; // Reset to top
      }
    }

    this.rainParticles.geometry.attributes.position.needsUpdate = true;
  }

  updateSnow(deltaTime) {
    const positions = this.snowParticles.geometry.attributes.position.array;

    for (let i = 1; i < positions.length; i += 3) {
      positions[i] -= 10 * deltaTime; // Slower fall speed

      if (positions[i] < 0) {
        positions[i] = 100; // Reset to top
      }
    }

    this.snowParticles.geometry.attributes.position.needsUpdate = true;
  }
}
