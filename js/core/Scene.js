class GameScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.cityLayout = {
      blocks: [],
      streets: [],
      intersections: [],
      buildings: [],
    };
    this.streetPositions = [];

    // Add light management
    this.maxShadowLights = 3; // CRITICAL: Limit shadow-casting lights
    this.currentShadowLights = 0;
  }

  async init() {
    this.setupLighting();
    this.setupEnvironment();
    this.generateCity();
    this.setupSkybox();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4); // Increased intensity
    this.scene.add(ambientLight);

    // Directional light (sun) - REDUCED shadow map size
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(100, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024; // REDUCED from 2048
    this.sunLight.shadow.mapSize.height = 1024; // REDUCED from 2048
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300; // REDUCED from 500
    this.sunLight.shadow.camera.left = -50; // REDUCED from -100
    this.sunLight.shadow.camera.right = 50; // REDUCED from 100
    this.sunLight.shadow.camera.top = 50; // REDUCED from 100
    this.sunLight.shadow.camera.bottom = -50; // REDUCED from -100
    this.scene.add(this.sunLight);
    this.currentShadowLights++;

    // Street lights (will be added during city generation)
    this.streetLights = [];
  }

  setupEnvironment() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x2d5a27,
      transparent: true,
      opacity: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Initialize fog
    this.scene.fog = new THREE.Fog(0xcccccc, 100, 400);
  }

  generateCity() {
    const citySize = 15; // REDUCED from 20 to improve performance
    const blockSize = 40;
    const streetWidth = 8;

    // Generate city grid
    for (let x = 0; x < citySize; x++) {
      for (let z = 0; z < citySize; z++) {
        const blockX = (x - citySize / 2) * (blockSize + streetWidth);
        const blockZ = (z - citySize / 2) * (blockSize + streetWidth);

        // Create building block
        if (Math.random() > 0.1) {
          this.createBuilding(blockX, blockZ, blockSize);
        } else {
          this.createPark(blockX, blockZ, blockSize);
        }

        // Create streets
        this.createStreets(blockX, blockZ, blockSize, streetWidth);
      }
    }

    // Generate street positions for spawning
    this.generateStreetPositions(citySize, blockSize, streetWidth);

    // Calculate intersections BEFORE adding traffic lights
    this.calculateIntersections(citySize, blockSize, streetWidth);

    // Add street lights (MUCH fewer)
    this.addStreetLights();

    // Add traffic lights at ALL intersections
    this.addTrafficLights();
  }

  createBuilding(x, z, size) {
    const height = 10 + Math.random() * 40;
    const geometry = new THREE.BoxGeometry(size * 0.8, height, size * 0.8);

    const colors = [0x8b4513, 0x696969, 0x2f4f4f, 0x708090, 0x556b2f];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const material = new THREE.MeshLambertMaterial({ color });
    const building = new THREE.Mesh(geometry, material);

    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;

    this.scene.add(building);
    this.cityLayout.buildings.push({
      position: new THREE.Vector3(x, 0, z),
      size: size * 0.8,
      height: height,
      mesh: building,
    });

    // Add windows (reduced frequency)
    if (Math.random() > 0.5) {
      // Only 50% of buildings get windows
      this.addWindows(building, size * 0.8, height);
    }
  }

  addWindows(building, width, height) {
    const windowsPerFloor = Math.max(2, Math.floor(width / 6)); // Fewer windows
    const floors = Math.max(2, Math.floor(height / 6)); // Fewer floors

    for (let floor = 0; floor < floors; floor++) {
      for (let window = 0; window < windowsPerFloor; window++) {
        if (Math.random() > 0.7) {
          // Reduced from 0.3 to 0.7 (fewer lit windows)
          const windowGeometry = new THREE.PlaneGeometry(1, 1);
          const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff88,
            transparent: true,
            opacity: 0.6, // Reduced opacity
          });
          const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

          windowMesh.position.set(
            (window - windowsPerFloor / 2) * 4,
            (floor - floors / 2) * 4,
            width / 2 + 0.1
          );

          building.add(windowMesh);
        }
      }
    }
  }

  createPark(x, z, size) {
    // Create grass area
    const grassGeometry = new THREE.PlaneGeometry(size * 0.8, size * 0.8);
    const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(x, 0.1, z);
    grass.receiveShadow = true;
    this.scene.add(grass);

    // Add fewer trees
    const treeCount = 1 + Math.floor(Math.random() * 3); // REDUCED tree count
    for (let i = 0; i < treeCount; i++) {
      this.createTree(
        x + (Math.random() - 0.5) * size * 0.6,
        z + (Math.random() - 0.5) * size * 0.6
      );
    }
  }

  createTree(x, z) {
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 4);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    // Tree foliage
    const foliageGeometry = new THREE.SphereGeometry(3, 6, 4); // REDUCED geometry complexity
    const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(x, 6, z);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    this.scene.add(foliage);
  }

  createStreets(blockX, blockZ, blockSize, streetWidth) {
    // Horizontal street
    const hStreetGeometry = new THREE.PlaneGeometry(
      blockSize + streetWidth * 2,
      streetWidth
    );
    const streetMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const hStreet = new THREE.Mesh(hStreetGeometry, streetMaterial);
    hStreet.rotation.x = -Math.PI / 2;
    hStreet.position.set(
      blockX,
      0.05,
      blockZ + blockSize / 2 + streetWidth / 2
    );
    hStreet.receiveShadow = true;
    this.scene.add(hStreet);

    // Vertical street
    const vStreetGeometry = new THREE.PlaneGeometry(
      streetWidth,
      blockSize + streetWidth * 2
    );
    const vStreet = new THREE.Mesh(vStreetGeometry, streetMaterial);
    vStreet.rotation.x = -Math.PI / 2;
    vStreet.position.set(
      blockX + blockSize / 2 + streetWidth / 2,
      0.05,
      blockZ
    );
    vStreet.receiveShadow = true;
    this.scene.add(vStreet);

    // Add street markings (reduced frequency)
    if (Math.random() > 0.5) {
      // Only 50% of streets get markings
      this.addStreetMarkings(hStreet, vStreet);
    }

    // Store street data
    this.cityLayout.streets.push({
      horizontal: {
        position: hStreet.position.clone(),
        width: streetWidth,
        length: blockSize + streetWidth * 2,
      },
      vertical: {
        position: vStreet.position.clone(),
        width: streetWidth,
        length: blockSize + streetWidth * 2,
      },
    });
  }

  addStreetMarkings(hStreet, vStreet) {
    // Add lane dividers (fewer)
    const lineGeometry = new THREE.PlaneGeometry(0.2, 2);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Horizontal street markings (fewer)
    for (let i = -8; i <= 8; i += 8) {
      // REDUCED frequency
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i, 0.06, 0);
      hStreet.add(line);
    }

    // Vertical street markings (fewer)
    const vLineGeometry = new THREE.PlaneGeometry(2, 0.2);
    for (let i = -8; i <= 8; i += 8) {
      // REDUCED frequency
      const line = new THREE.Mesh(vLineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.06, i);
      vStreet.add(line);
    }
  }

  generateStreetPositions(citySize, blockSize, streetWidth) {
    for (let x = 0; x < citySize; x++) {
      for (let z = 0; z < citySize; z++) {
        const blockX = (x - citySize / 2) * (blockSize + streetWidth);
        const blockZ = (z - citySize / 2) * (blockSize + streetWidth);

        // Add positions along streets
        this.streetPositions.push(
          new THREE.Vector3(
            blockX,
            0,
            blockZ + blockSize / 2 + streetWidth / 2
          ),
          new THREE.Vector3(blockX + blockSize / 2 + streetWidth / 2, 0, blockZ)
        );
      }
    }
  }

  addStreetLights() {
    // CRITICAL FIX: Much fewer street lights and NO SHADOWS
    this.streetPositions.forEach((position, index) => {
      if (index % 20 === 0) {
        // CHANGED from 4 to 20 (much fewer lights)
        this.createStreetLight(position.x, position.z);
      }
    });
  }

  createStreetLight(x, z) {
    // Light pole
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, 4, z);
    pole.castShadow = true;
    this.scene.add(pole);

    // Light fixture
    const lightGeometry = new THREE.SphereGeometry(0.5);
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.8,
    });
    const lightFixture = new THREE.Mesh(lightGeometry, lightMaterial);
    lightFixture.position.set(x, 7.5, z);
    this.scene.add(lightFixture);

    // Point light - CRITICAL: NO SHADOWS!
    const pointLight = new THREE.PointLight(0xffffaa, 0.3, 15); // Reduced intensity and range
    pointLight.position.set(x, 7.5, z);
    pointLight.castShadow = false; // DISABLED SHADOWS
    this.scene.add(pointLight);

    this.streetLights.push({
      pole: pole,
      fixture: lightFixture,
      light: pointLight,
      position: new THREE.Vector3(x, 7.5, z),
    });
  }

  // UPDATED: Calculate intersections properly
  calculateIntersections(citySize, blockSize, streetWidth) {
    this.intersectionPositions = [];

    // Streets are created for each block, so intersections occur between blocks
    for (let x = 0; x < citySize - 1; x++) {
      for (let z = 0; z < citySize - 1; z++) {
        // Calculate block positions
        const blockX = (x - citySize / 2) * (blockSize + streetWidth);
        const blockZ = (z - citySize / 2) * (blockSize + streetWidth);

        const intersectionX = blockX + blockSize / 2 + streetWidth / 2;
        const intersectionZ = blockZ + blockSize / 2 + streetWidth / 2;

        this.intersectionPositions.push(
          new THREE.Vector3(intersectionX, 0, intersectionZ)
        );
      }
    }
  }

  // UPDATED: Better traffic light positioning at actual intersections
  createTrafficLight(x, z, intersectionId) {
    const trafficLightGroup = new THREE.Group();
    trafficLightGroup.position.set(x, 0, z);

    // Create 4 traffic lights for each direction, positioned at intersection corners
    const directions = [
      { name: "North", pos: [1.5, 0, 1.5], rot: [0, Math.PI, 0] }, // NE corner facing south
      { name: "South", pos: [-1.5, 0, -1.5], rot: [0, 0, 0] }, // SW corner facing north
      { name: "East", pos: [1.5, 0, -1.5], rot: [0, Math.PI / 2, 0] }, // SE corner facing west
      { name: "West", pos: [-1.5, 0, 1.5], rot: [0, -Math.PI / 2, 0] }, // NW corner facing east
    ];

    const intersectionLights = [];

    directions.forEach((dir, dirIndex) => {
      // Traffic light pole
      const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 6);
      const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(dir.pos[0], 3, dir.pos[2]);
      pole.castShadow = true;
      trafficLightGroup.add(pole);

      // Traffic light box
      const boxGeometry = new THREE.BoxGeometry(0.8, 2.4, 0.4);
      const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.set(dir.pos[0], 5.5, dir.pos[2]);
      box.rotation.set(dir.rot[0], dir.rot[1], dir.rot[2]);
      trafficLightGroup.add(box);

      // Traffic light colors (red, yellow, green)
      const colors = [
        { color: 0xff0000, name: "red" },
        { color: 0xffff00, name: "yellow" },
        { color: 0x00ff00, name: "green" },
      ];

      const directionLights = [];

      colors.forEach((colorData, colorIndex) => {
        const lightGeometry = new THREE.CircleGeometry(0.25, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
          color: colorData.color,
          transparent: true,
          opacity: 0.3,
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);

        // Position lights vertically in the box
        const lightY = 6.2 - colorIndex * 0.7;
        light.position.set(dir.pos[0], lightY, dir.pos[2]);
        light.rotation.set(dir.rot[0], dir.rot[1], dir.rot[2]);

        // Offset slightly forward from the box based on direction
        const offset = 0.25;
        const offsetX = Math.sin(dir.rot[1]) * offset;
        const offsetZ = Math.cos(dir.rot[1]) * offset;
        light.position.x += offsetX;
        light.position.z += offsetZ;

        trafficLightGroup.add(light);
        directionLights.push({
          mesh: light,
          color: colorData.name,
          material: lightMaterial,
        });
      });

      intersectionLights.push({
        direction: dir.name,
        lights: directionLights,
        pole: pole,
        box: box,
      });
    });

    this.scene.add(trafficLightGroup);

    // Store traffic light data in intersections array
    this.cityLayout.intersections.push({
      id: intersectionId,
      position: new THREE.Vector3(x, 0, z),
      group: trafficLightGroup,
      directionalLights: intersectionLights,
      currentPhase: Math.floor(Math.random() * 4), // Random starting phase for variety
      timer: Math.random() * 2, // Random starting timer
      phaseDurations: [8, 2, 8, 2], // Green, Yellow, Green, Yellow (in seconds)
    });
  }

  // UPDATED: Add traffic lights to ALL intersections
  // UPDATED: Add traffic lights to ALL intersections
  addTrafficLights() {
    if (
      !this.intersectionPositions ||
      this.intersectionPositions.length === 0
    ) {
      console.warn("No intersection positions found");
      return;
    }

    console.log(
      `Adding traffic lights to ${this.intersectionPositions.length} intersections`
    );

    this.intersectionPositions.forEach((pos, index) => {
      // Add traffic lights to EVERY intersection (removed the modulo filter)
      this.createTrafficLight(pos.x, pos.z, index);
    });
  }

  // UPDATED: Enhanced traffic light creation with better positioning
  createTrafficLight(x, z, intersectionId) {
    const trafficLightGroup = new THREE.Group();
    trafficLightGroup.position.set(x, 0, z);

    // Create 4 traffic lights for each direction (North, South, East, West)
    const directions = [
      { name: "North", pos: [2, 0, 4], rot: [0, 0, 0] },
      { name: "South", pos: [-2, 0, -4], rot: [0, Math.PI, 0] },
      { name: "East", pos: [4, 0, -2], rot: [0, -Math.PI / 2, 0] },
      { name: "West", pos: [-4, 0, 2], rot: [0, Math.PI / 2, 0] },
    ];

    const intersectionLights = [];

    directions.forEach((dir, dirIndex) => {
      // Traffic light pole
      const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 6);
      const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(dir.pos[0], 3, dir.pos[2]);
      pole.castShadow = true;
      trafficLightGroup.add(pole);

      // Traffic light box
      const boxGeometry = new THREE.BoxGeometry(0.8, 2.4, 0.4);
      const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.set(dir.pos[0], 5.5, dir.pos[2]);
      box.rotation.set(dir.rot[0], dir.rot[1], dir.rot[2]);
      trafficLightGroup.add(box);

      // Traffic light colors (red, yellow, green)
      const colors = [
        { color: 0xff0000, name: "red" },
        { color: 0xffff00, name: "yellow" },
        { color: 0x00ff00, name: "green" },
      ];

      const directionLights = [];

      colors.forEach((colorData, colorIndex) => {
        const lightGeometry = new THREE.CircleGeometry(0.25, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
          color: colorData.color,
          transparent: true,
          opacity: 0.3,
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);

        // Position lights vertically in the box
        const lightY = 6.2 - colorIndex * 0.7;
        light.position.set(dir.pos[0], lightY, dir.pos[2]);
        light.rotation.set(dir.rot[0], dir.rot[1], dir.rot[2]);

        // Offset slightly forward from the box
        const offset = 0.25;
        if (dir.name === "North") light.position.z += offset;
        else if (dir.name === "South") light.position.z -= offset;
        else if (dir.name === "East") light.position.x += offset;
        else if (dir.name === "West") light.position.x -= offset;

        trafficLightGroup.add(light);
        directionLights.push({
          mesh: light,
          color: colorData.name,
          material: lightMaterial,
        });
      });

      intersectionLights.push({
        direction: dir.name,
        lights: directionLights,
        pole: pole,
        box: box,
      });
    });

    this.scene.add(trafficLightGroup);

    // Store traffic light data in intersections array
    this.cityLayout.intersections.push({
      id: intersectionId,
      position: new THREE.Vector3(x, 0, z),
      group: trafficLightGroup,
      directionalLights: intersectionLights,
      currentPhase: 0, // 0: NS green/EW red, 1: NS yellow/EW red, 2: NS red/EW green, 3: NS red/EW yellow
      timer: 0,
      phaseDurations: [8, 2, 8, 2], // Green, Yellow, Green, Yellow (in seconds)
    });
  }

  setupSkybox() {
    const skyboxGeometry = new THREE.SphereGeometry(400, 16, 16); // REDUCED complexity
    const skyboxMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
      fog: false, // Don't apply fog to skybox
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    this.scene.add(skybox);
    this.skybox = skybox;
  }

  getRandomStreetPosition() {
    if (this.streetPositions.length === 0) {
      // Fallback position if no street positions available
      return new THREE.Vector3(0, 0, 0);
    }
    const randomIndex = Math.floor(Math.random() * this.streetPositions.length);
    return this.streetPositions[randomIndex].clone();
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  // UPDATED: Enhanced traffic light update system
  updateTrafficLights(deltaTime) {
    this.cityLayout.intersections.forEach((intersection) => {
      intersection.timer += deltaTime;

      const currentPhaseDuration =
        intersection.phaseDurations[intersection.currentPhase];

      // Change phase when timer exceeds current phase duration
      if (intersection.timer >= currentPhaseDuration) {
        intersection.timer = 0;
        intersection.currentPhase = (intersection.currentPhase + 1) % 4;
        this.updateIntersectionLights(intersection);
      }
    });
  }

  // NEW: Update individual intersection lights based on current phase
  updateIntersectionLights(intersection) {
    const phase = intersection.currentPhase;

    intersection.directionalLights.forEach((dirLight) => {
      const isNorthSouth =
        dirLight.direction === "North" || dirLight.direction === "South";
      const isEastWest =
        dirLight.direction === "East" || dirLight.direction === "West";

      dirLight.lights.forEach((light) => {
        // Reset all lights to dim
        light.material.opacity = 0.3;

        switch (phase) {
          case 0: // NS Green, EW Red
            if (isNorthSouth && light.color === "green")
              light.material.opacity = 1.0;
            if (isEastWest && light.color === "red")
              light.material.opacity = 1.0;
            break;
          case 1: // NS Yellow, EW Red
            if (isNorthSouth && light.color === "yellow")
              light.material.opacity = 1.0;
            if (isEastWest && light.color === "red")
              light.material.opacity = 1.0;
            break;
          case 2: // NS Red, EW Green
            if (isNorthSouth && light.color === "red")
              light.material.opacity = 1.0;
            if (isEastWest && light.color === "green")
              light.material.opacity = 1.0;
            break;
          case 3: // NS Red, EW Yellow
            if (isNorthSouth && light.color === "red")
              light.material.opacity = 1.0;
            if (isEastWest && light.color === "yellow")
              light.material.opacity = 1.0;
            break;
        }
      });
    });
  }

  // NEW: Get traffic light state for AI/vehicle navigation
  getTrafficLightState(intersectionId) {
    const intersection = this.cityLayout.intersections.find(
      (i) => i.id === intersectionId
    );
    if (!intersection) return null;

    const phase = intersection.currentPhase;
    return {
      northSouth: phase === 0 ? "green" : phase === 1 ? "yellow" : "red",
      eastWest: phase === 2 ? "green" : phase === 3 ? "yellow" : "red",
      phase: phase,
      timeRemaining: intersection.phaseDurations[phase] - intersection.timer,
    };
  }

  // NEW: Get nearest intersection to a position
  getNearestIntersection(position) {
    if (!this.cityLayout.intersections.length) return null;

    let nearest = null;
    let minDistance = Infinity;

    this.cityLayout.intersections.forEach((intersection) => {
      const distance = position.distanceTo(intersection.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = intersection;
      }
    });

    return { intersection: nearest, distance: minDistance };
  }

  updateSkybox(timeOfDay) {
    // Change skybox color based on time of day
    const colors = {
      dawn: 0xffb347,
      day: 0x87ceeb,
      dusk: 0xff6347,
      night: 0x191970,
    };

    if (this.skybox && this.skybox.material && colors[timeOfDay]) {
      this.skybox.material.color.setHex(colors[timeOfDay]);
    }
  }

  updateStreetLights(isNight) {
    this.streetLights.forEach((streetLight) => {
      if (streetLight && streetLight.light) {
        streetLight.light.intensity = isNight ? 0.4 : 0.05; // REDUCED intensity
      }
      if (streetLight && streetLight.fixture && streetLight.fixture.material) {
        streetLight.fixture.material.opacity = isNight ? 0.9 : 0.3;
      }
    });
  }

  // Add method to manage total light count
  getLightCount() {
    let lightCount = 0;
    this.scene.traverse((object) => {
      if (object.isLight) {
        lightCount++;
      }
    });
    return lightCount;
  }

  // Method to disable excess lights if needed
  optimizeLights() {
    const lights = [];
    this.scene.traverse((object) => {
      if (object.isLight && object.castShadow) {
        lights.push(object);
      }
    });

    // Keep only the most important shadow-casting lights
    lights.sort((a, b) => {
      // Prioritize directional lights (sun/moon)
      if (a.isDirectionalLight && !b.isDirectionalLight) return -1;
      if (!a.isDirectionalLight && b.isDirectionalLight) return 1;

      // Then by intensity
      return (b.intensity || 0) - (a.intensity || 0);
    });

    // Disable shadows on excess lights
    for (let i = this.maxShadowLights; i < lights.length; i++) {
      lights[i].castShadow = false;
    }
  }

  // Method to get performance stats
  getPerformanceStats() {
    const stats = {
      totalObjects: 0,
      totalLights: 0,
      shadowLights: 0,
      triangles: 0,
      trafficLights: this.cityLayout.intersections.length,
    };

    this.scene.traverse((object) => {
      stats.totalObjects++;

      if (object.isLight) {
        stats.totalLights++;
        if (object.castShadow) {
          stats.shadowLights++;
        }
      }

      if (object.geometry) {
        if (object.geometry.index) {
          stats.triangles += object.geometry.index.count / 3;
        } else if (object.geometry.attributes.position) {
          stats.triangles += object.geometry.attributes.position.count / 3;
        }
      }
    });

    return stats;
  }

  // Method to reduce scene complexity if needed
  optimizeScene() {
    // Get current stats
    const stats = this.getPerformanceStats();

    // Optimize lights
    this.optimizeLights();

    // Reduce shadow map quality if too many shadow lights
    if (stats.shadowLights > this.maxShadowLights) {
      this.sunLight.shadow.mapSize.width = 512;
      this.sunLight.shadow.mapSize.height = 512;
    }

    // Disable shadows on some objects if scene is too complex
    if (stats.triangles > 50000) {
      let disabledCount = 0;
      this.scene.traverse((object) => {
        if (object.isMesh && object.castShadow && disabledCount < 100) {
          // Keep shadows on important objects (buildings, vehicles)
          if (!object.userData.important) {
            object.castShadow = false;
            disabledCount++;
          }
        }
      });
      console.log(`Disabled shadows on ${disabledCount} objects`);
    }
  }

  // Method to mark important objects that should keep shadows
  markImportantObjects() {
    this.cityLayout.buildings.forEach((building) => {
      if (building.mesh) {
        building.mesh.userData.important = true;
      }
    });
  }

  // Call this after scene generation
  finalizeScene() {
    this.markImportantObjects();
    this.optimizeScene();

    const finalStats = this.getPerformanceStats();

    if (finalStats.shadowLights > this.maxShadowLights) {
      console.warn(
        `Warning: Still have ${finalStats.shadowLights} shadow lights, may cause performance issues`
      );
    }
  }
}

// Export the class
if (typeof module !== "undefined" && module.exports) {
  module.exports = GameScene;
}
