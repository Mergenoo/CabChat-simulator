class DayNightSystem {
  constructor() {
    this.timeOfDay = 12; // 24-hour format (12 = noon)
    this.timeSpeed = 1; // 1 = real time, higher = faster
    this.dayDuration = 300; // seconds for full day cycle (5 minutes)

    // Sun and moon
    this.sun = null;
    this.moon = null;
    this.sunLight = null;
    this.moonLight = null;

    // Sky colors
    this.skyColors = {
      dawn: { top: 0xffd700, bottom: 0xff6347 },
      day: { top: 0x87ceeb, bottom: 0xffffff },
      dusk: { top: 0xff4500, bottom: 0x8b0000 },
      night: { top: 0x000033, bottom: 0x000066 },
    };

    // Lighting settings
    this.lightSettings = {
      dawn: { intensity: 0.6, color: 0xffd700 },
      day: { intensity: 1.0, color: 0xffffff },
      dusk: { intensity: 0.4, color: 0xff6347 },
      night: { intensity: 0.1, color: 0x4169e1 },
    };

    // Street lights
    this.streetLights = [];
    this.buildingLights = [];

    // Callbacks
    this.onTimeChange = null;
  }

  init(scene) {
    this.scene = scene;
    this.setupSun();
    this.setupMoon();
    this.setupSkybox();
    this.findStreetLights();
    this.updateTimeOfDay();
  }

  setupSun() {
    // Sun mesh (visual representation)
    const sunGeometry = new THREE.SphereGeometry(5, 16, 16);
    const sunMaterial = new THREE.MeshLambertMaterial({
      // Changed from MeshBasicMaterial
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);

    // Sun light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;

    this.scene.add(this.sun);
    this.scene.add(this.sunLight);
  }

  setupMoon() {
    // Moon mesh
    const moonGeometry = new THREE.SphereGeometry(3, 16, 16);
    const moonMaterial = new THREE.MeshLambertMaterial({
      // Changed from MeshBasicMaterial
      color: 0xf0f0f0,
      emissive: 0xf0f0f0,
      emissiveIntensity: 0.2,
    });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);

    // Moon light
    this.moonLight = new THREE.DirectionalLight(0x4169e1, 0.1);
    this.moonLight.castShadow = false; // Moon doesn't cast strong shadows

    this.scene.add(this.moon);
    this.scene.add(this.moonLight);
  }

  setupSkybox() {
    // Create gradient skybox
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);

    // Create gradient material
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
      fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
      side: THREE.BackSide,
    });

    this.skybox = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.scene.add(this.skybox);
  }

  findStreetLights() {
    // Find all street lights in the scene
    this.scene.traverse((child) => {
      if (child.userData && child.userData.isStreetLight) {
        this.streetLights.push(child);
      }
      if (child.userData && child.userData.isBuildingLight) {
        this.buildingLights.push(child);
      }
    });
  }

  update(deltaTime) {
    // Update time
    this.timeOfDay += (deltaTime / this.dayDuration) * 24;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
    }

    this.updateTimeOfDay();

    // Trigger callback if set
    if (this.onTimeChange) {
      this.onTimeChange(this.timeOfDay, this.getCurrentPeriod());
    }
  }

  updateTimeOfDay() {
    const period = this.getCurrentPeriod();

    // Update sun and moon positions
    this.updateCelestialBodies();

    // Update lighting
    this.updateLighting(period);

    // Update sky colors
    this.updateSkyColors(period);

    // Update street lights
    this.updateStreetLights(period);

    // Update building lights
    this.updateBuildingLights(period);
  }

  getCurrentPeriod() {
    if (this.timeOfDay >= 5 && this.timeOfDay < 7) {
      return "dawn";
    } else if (this.timeOfDay >= 7 && this.timeOfDay < 18) {
      return "day";
    } else if (this.timeOfDay >= 18 && this.timeOfDay < 20) {
      return "dusk";
    } else {
      return "night";
    }
  }

  updateCelestialBodies() {
    // Calculate sun position (rises at 6, sets at 18)
    const sunAngle = ((this.timeOfDay - 6) / 12) * Math.PI;
    const sunRadius = 200;

    this.sun.position.set(
      Math.cos(sunAngle + Math.PI / 2) * sunRadius,
      Math.sin(sunAngle + Math.PI / 2) * sunRadius,
      0
    );

    // Sun light follows sun position
    this.sunLight.position.copy(this.sun.position);
    this.sunLight.target.position.set(0, 0, 0);

    // Calculate moon position (opposite to sun)
    const moonAngle = sunAngle + Math.PI;
    const moonRadius = 180;

    this.moon.position.set(
      Math.cos(moonAngle + Math.PI / 2) * moonRadius,
      Math.sin(moonAngle + Math.PI / 2) * moonRadius,
      50
    );

    // Moon light follows moon position
    this.moonLight.position.copy(this.moon.position);
    this.moonLight.target.position.set(0, 0, 0);

    // Hide sun/moon when below horizon
    this.sun.visible = this.sun.position.y > -10;
    this.moon.visible = this.moon.position.y > -10 && !this.sun.visible;
  }

  updateLighting(period) {
    const settings = this.lightSettings[period];

    // Update sun light
    // Update sun light
    this.sunLight.intensity = this.sun.visible ? settings.intensity : 0;
    this.sunLight.color.setHex(settings.color);

    // Update moon light
    this.moonLight.intensity = this.moon.visible ? 0.1 : 0;

    // Smooth transitions between periods
    if (period === "dawn" || period === "dusk") {
      const transitionFactor = this.getTransitionFactor(period);
      this.sunLight.intensity *= transitionFactor;
    }

    // Update ambient light
    const ambientLight = this.scene.children.find(
      (child) => child.type === "AmbientLight"
    );
    if (ambientLight) {
      const ambientIntensity = {
        dawn: 0.3,
        day: 0.4,
        dusk: 0.2,
        night: 0.1,
      };
      ambientLight.intensity = ambientIntensity[period];
    }
  }

  getTransitionFactor(period) {
    if (period === "dawn") {
      // Transition from 5-7 AM
      return (this.timeOfDay - 5) / 2;
    } else if (period === "dusk") {
      // Transition from 18-20 PM
      return 1 - (this.timeOfDay - 18) / 2;
    }
    return 1;
  }

  updateSkyColors(period) {
    const colors = this.skyColors[period];

    // Smooth color transitions
    if (period === "dawn" || period === "dusk") {
      const factor = this.getTransitionFactor(period);
      const prevPeriod = period === "dawn" ? "night" : "day";
      const nextPeriod = period === "dawn" ? "day" : "night";

      const prevColors = this.skyColors[prevPeriod];
      const nextColors = this.skyColors[nextPeriod];

      const topColor = new THREE.Color(prevColors.top).lerp(
        new THREE.Color(nextColors.top),
        factor
      );
      const bottomColor = new THREE.Color(prevColors.bottom).lerp(
        new THREE.Color(nextColors.bottom),
        factor
      );

      this.skyMaterial.uniforms.topColor.value = topColor;
      this.skyMaterial.uniforms.bottomColor.value = bottomColor;
    } else {
      this.skyMaterial.uniforms.topColor.value.setHex(colors.top);
      this.skyMaterial.uniforms.bottomColor.value.setHex(colors.bottom);
    }
  }

  updateStreetLights(period) {
    const shouldBeOn =
      period === "night" ||
      period === "dusk" ||
      (period === "dawn" && this.timeOfDay < 6);

    this.streetLights.forEach((light) => {
      if (light.children) {
        light.children.forEach((child) => {
          if (child.type === "PointLight") {
            child.intensity = shouldBeOn ? 0.8 : 0.1;
          }
          if (child.material && child.material.emissive) {
            child.material.emissiveIntensity = shouldBeOn ? 0.8 : 0.1;
          }
        });
      }
    });
  }

  updateBuildingLights(period) {
    const lightProbability = {
      dawn: 0.3,
      day: 0.1,
      dusk: 0.7,
      night: 0.9,
    };

    const probability = lightProbability[period];

    this.buildingLights.forEach((light) => {
      const shouldBeOn = Math.random() < probability;

      if (light.material) {
        light.material.opacity = shouldBeOn ? 0.8 : 0.2;
        light.material.emissiveIntensity = shouldBeOn ? 0.5 : 0.1;
      }
    });
  }

  setTimeOfDay(time) {
    this.timeOfDay = Math.max(0, Math.min(24, time));
    this.updateTimeOfDay();
  }

  setTimeSpeed(speed) {
    this.timeSpeed = Math.max(0, speed);
  }

  setDayDuration(duration) {
    this.dayDuration = Math.max(60, duration); // Minimum 1 minute
  }

  getTimeOfDay() {
    return this.timeOfDay;
  }

  getFormattedTime() {
    const hours = Math.floor(this.timeOfDay);
    const minutes = Math.floor((this.timeOfDay - hours) * 60);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${displayHours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")} ${period}`;
  }

  isNight() {
    return this.getCurrentPeriod() === "night";
  }

  isDay() {
    return this.getCurrentPeriod() === "day";
  }

  isDawn() {
    return this.getCurrentPeriod() === "dawn";
  }

  isDusk() {
    return this.getCurrentPeriod() === "dusk";
  }

  onTimeChangeCallback(callback) {
    this.onTimeChange = callback;
  }

  skipToTime(targetTime) {
    // Smoothly transition to target time
    const timeDiff = targetTime - this.timeOfDay;
    const adjustedDiff = timeDiff < 0 ? timeDiff + 24 : timeDiff;

    // Animate time change over 2 seconds
    const startTime = this.timeOfDay;
    const duration = 2000; // 2 seconds
    const startTimestamp = Date.now();

    const animateTime = () => {
      const elapsed = Date.now() - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      this.timeOfDay = startTime + adjustedDiff * progress;
      if (this.timeOfDay >= 24) this.timeOfDay -= 24;

      this.updateTimeOfDay();

      if (progress < 1) {
        requestAnimationFrame(animateTime);
      }
    };

    animateTime();
  }

  addStreetLight(light) {
    this.streetLights.push(light);
  }

  addBuildingLight(light) {
    this.buildingLights.push(light);
  }

  getSunPosition() {
    return this.sun.position.clone();
  }

  getMoonPosition() {
    return this.moon.position.clone();
  }

  getLightingInfo() {
    const period = this.getCurrentPeriod();
    return {
      period: period,
      timeOfDay: this.timeOfDay,
      formattedTime: this.getFormattedTime(),
      sunVisible: this.sun.visible,
      moonVisible: this.moon.visible,
      lightIntensity: this.sunLight.intensity,
    };
  }
}
