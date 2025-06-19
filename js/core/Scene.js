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
    // Ambient light - Increased for less harsh shadows
    const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
    this.scene.add(ambientLight);

    // Directional light (sun) - Reduced intensity and shadow settings
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
    this.sunLight.position.set(100, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 512; // Further reduced for performance
    this.sunLight.shadow.mapSize.height = 512;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -30; // Further reduced shadow area
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.sunLight.shadow.bias = -0.0001; // Reduce shadow acne/flickering
    this.scene.add(this.sunLight);
    this.currentShadowLights++;

    // Street lights (will be added during city generation)
    this.streetLights = [];
  }

  setupEnvironment() {
    // Ground plane with SF-style terrain
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B7355, // SF hills color
      transparent: false, // Remove transparency to fix flickering
      opacity: 1.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0; // Moved up slightly to reduce z-fighting
    ground.receiveShadow = false; // Disable shadows on ground to reduce flickering
    this.scene.add(ground);

    // Add SF-style bay water areas
    this.createBayAreas();

    // SF sky with marine layer influence - solid color to prevent flickering
    this.scene.background = new THREE.Color(0xB0C4DE); // Light steel blue

    // Disable fog to prevent flickering black spots
    this.scene.fog = null;
  }

  generateCity() {
    const citySize = 15; // REDUCED from 20 to improve performance
    const blockSize = 40;
    const streetWidth = 8;

    // Generate city grid - Create streets first, then buildings in blocks
    // First pass: Create street network
    for (let x = 0; x < citySize; x++) {
      for (let z = 0; z < citySize; z++) {
        const blockX = (x - citySize / 2) * (blockSize + streetWidth);
        const blockZ = (z - citySize / 2) * (blockSize + streetWidth);

        // Create streets around each block (but not through them)
        this.createStreetNetwork(x, z, blockX, blockZ, blockSize, streetWidth, citySize);
      }
    }

    // Second pass: Create buildings only in block centers (away from streets)
    for (let x = 0; x < citySize; x++) {
      for (let z = 0; z < citySize; z++) {
        const blockX = (x - citySize / 2) * (blockSize + streetWidth);
        const blockZ = (z - citySize / 2) * (blockSize + streetWidth);

        // Create building block - Reduced building density for better landmark visibility
        if (Math.random() > 0.6) {
          this.createBuilding(blockX, blockZ, blockSize);
        } else {
          this.createPark(blockX, blockZ, blockSize);
        }
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

    // Add San Francisco landmarks
    this.createLandmarks(citySize, blockSize, streetWidth);

    // Add SF-specific environmental details
    this.addSFEnvironmentalDetails(citySize, blockSize, streetWidth);

    // Create Market Street - SF's main diagonal thoroughfare
    this.createMarketStreet(citySize, blockSize, streetWidth);
  }

  createBuilding(x, z, size) {
    const height = 10 + Math.random() * 30;
    const geometry = new THREE.BoxGeometry(size * 0.8, height, size * 0.8);

    // Simplified building colors with better variety
    const buildingColors = [
      0xF5F5DC, // Beige (Victorian houses)
      0x4682B4, // Steel blue (modern buildings)
      0xD2B48C, // Tan (brownstone)
      0x8FBC8F, // Dark sea green (SF color)
      0xDDA0DD, // Plum (Painted Ladies)
      0xA0522D, // Brown (brick buildings)
    ];
    const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

    const material = new THREE.MeshLambertMaterial({ color });
    const building = new THREE.Mesh(geometry, material);

    building.position.set(x, height / 2, z);
    building.castShadow = false;
    building.receiveShadow = false;

    this.scene.add(building);
    this.cityLayout.buildings.push({
      position: new THREE.Vector3(x, 0, z),
      size: size * 0.8,
      height: height,
      mesh: building,
    });

    // Add simple windows to only 40% of buildings (reduced from 70%)
    if (Math.random() > 0.6) {
      this.addSimpleWindows(building, size * 0.8, height);
    }
  }

  addSimpleWindows(building, width, height) {
    const floors = Math.max(2, Math.floor(height / 8)); // Fewer floors, larger floor height
    const windowsPerFloor = Math.max(1, Math.floor(width / 8)); // Fewer windows per floor

    // Only add windows to front face to reduce geometry
    for (let floor = 0; floor < floors; floor++) {
      for (let window = 0; window < windowsPerFloor; window++) {
        if (Math.random() > 0.5) { // 50% chance for window
          const windowGeometry = new THREE.PlaneGeometry(1.5, 1.5);
          const isLit = Math.random() > 0.6;
          const windowMaterial = new THREE.MeshBasicMaterial({
            color: isLit ? 0xffff88 : 0x87ceeb,
            transparent: true,
            opacity: isLit ? 0.8 : 0.3,
          });
          const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

          windowMesh.position.set(
            (window - windowsPerFloor / 2 + 0.5) * (width / windowsPerFloor),
            (floor - floors / 2 + 0.5) * (height / floors),
            width / 2 + 0.05
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

  createStreetNetwork(x, z, blockX, blockZ, blockSize, streetWidth, citySize) {
    const streetMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // Create horizontal street (east-west) only on the bottom edge of each block
    if (z < citySize - 1) { // Don't create street on the last row
      const hStreetGeometry = new THREE.PlaneGeometry(blockSize, streetWidth);
      const hStreet = new THREE.Mesh(hStreetGeometry, streetMaterial);
      hStreet.rotation.x = -Math.PI / 2;
      hStreet.position.set(
        blockX,
        0.05,
        blockZ + blockSize / 2 + streetWidth / 2
      );
      hStreet.receiveShadow = false;
      this.scene.add(hStreet);

      // Add street markings
      if (Math.random() > 0.7) {
        this.addSimpleStreetMarkings(hStreet, blockSize, streetWidth, true);
      }
    }

    // Create vertical street (north-south) only on the right edge of each block
    if (x < citySize - 1) { // Don't create street on the last column
      const vStreetGeometry = new THREE.PlaneGeometry(streetWidth, blockSize);
      const vStreet = new THREE.Mesh(vStreetGeometry, streetMaterial);
      vStreet.rotation.x = -Math.PI / 2;
      vStreet.position.set(
        blockX + blockSize / 2 + streetWidth / 2,
        0.05,
        blockZ
      );
      vStreet.receiveShadow = false;
      this.scene.add(vStreet);

      // Add street markings
      if (Math.random() > 0.7) {
        this.addSimpleStreetMarkings(vStreet, streetWidth, blockSize, false);
      }
    }

    // Create intersection where streets meet
    if (x < citySize - 1 && z < citySize - 1) {
      const intersectionGeometry = new THREE.PlaneGeometry(streetWidth, streetWidth);
      const intersection = new THREE.Mesh(intersectionGeometry, streetMaterial);
      intersection.rotation.x = -Math.PI / 2;
      intersection.position.set(
        blockX + blockSize / 2 + streetWidth / 2,
        0.05,
        blockZ + blockSize / 2 + streetWidth / 2
      );
      intersection.receiveShadow = false;
      this.scene.add(intersection);
    }
  }

  addSimpleStreetMarkings(street, width, length, isHorizontal) {
    const lineGeometry = isHorizontal ? 
      new THREE.PlaneGeometry(0.2, 2) : 
      new THREE.PlaneGeometry(2, 0.2);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const stepSize = 8;
    const maxSteps = Math.floor(Math.min(width, length) / stepSize);
    
    for (let i = -maxSteps; i <= maxSteps; i += 2) {
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      if (isHorizontal) {
        line.position.set(i * stepSize, 0.06, 0);
      } else {
        line.position.set(0, 0.06, i * stepSize);
      }
      street.add(line);
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
      // Add traffic lights to fewer intersections to reduce clutter
      if (index % 4 === 0) { // Only every 4th intersection
        this.createTrafficLight(pos.x, pos.z, index);
      }
    });
  }

  // Simplified traffic light creation - 1 per intersection
  createTrafficLight(x, z, intersectionId) {
    const trafficLightGroup = new THREE.Group();
    trafficLightGroup.position.set(x, 0, z);

    // Single traffic light in center of intersection
    const intersectionLights = [];

    // Traffic light pole
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(0, 4, 0);
    pole.castShadow = true;
    trafficLightGroup.add(pole);

    // Traffic light box
    const boxGeometry = new THREE.BoxGeometry(0.8, 2.4, 0.4);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 6.2, 0);
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
        opacity: colorIndex === 2 ? 0.8 : 0.3, // Make green light more visible by default
      });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);

      // Position lights vertically centered in the box
      const lightY = 7.0 - colorIndex * 0.7;
      light.position.set(0, lightY, 0.25);

      trafficLightGroup.add(light);
      directionLights.push({
        mesh: light,
        color: colorData.name,
        material: lightMaterial,
      });
    });

    intersectionLights.push({
      direction: "center",
      lights: directionLights,
      pole: pole,
      box: box,
    });

    this.scene.add(trafficLightGroup);

    // Store traffic light data in intersections array
    this.cityLayout.intersections.push({
      id: intersectionId,
      position: new THREE.Vector3(x, 0, z),
      group: trafficLightGroup,
      directionalLights: intersectionLights,
      currentPhase: Math.floor(Math.random() * 3), // Random starting phase for variety
      timer: Math.random() * 2, // Random starting timer
      phaseDurations: [8, 2, 8], // Green, Yellow, Red (in seconds)
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

  // Create San Francisco landmarks
  createLandmarks(citySize, blockSize, streetWidth) {
    const gridCenter = citySize / 2;
    const blockSpacing = blockSize + streetWidth;

    // Calculate landmark positions on the grid
    // Using grid coordinates (0 to citySize-1) and converting to world positions
    
    // Golden Gate Bridge - Northwest (grid: x=2, z=2)
    const ggX = (2 - gridCenter) * blockSpacing;
    const ggZ = (2 - gridCenter) * blockSpacing;
    this.createGoldenGateBridge(ggX, ggZ);

    // Transamerica Pyramid - Financial District, Northeast (grid: x=11, z=4)
    const taX = (11 - gridCenter) * blockSpacing;
    const taZ = (4 - gridCenter) * blockSpacing;
    this.createTransamericaPyramid(taX, taZ);

    // Coit Tower - North Beach, North-central (grid: x=7, z=3)
    const ctX = (7 - gridCenter) * blockSpacing;
    const ctZ = (3 - gridCenter) * blockSpacing;
    this.createCoitTower(ctX, ctZ);

    // Ferry Building - Waterfront, East (grid: x=12, z=7)
    const fbX = (12 - gridCenter) * blockSpacing;
    const fbZ = (7 - gridCenter) * blockSpacing;
    this.createFerryBuilding(fbX, fbZ);

    // Salesforce Tower - SOMA, South of Market (grid: x=8, z=10)
    const stX = (8 - gridCenter) * blockSpacing;
    const stZ = (10 - gridCenter) * blockSpacing;
    this.createSalesforceTower(stX, stZ);
  }

  createGoldenGateBridge(x, z) {
    // Create bridge span
    const spanGeometry = new THREE.BoxGeometry(120, 4, 8);
    const spanMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 }); // International Orange
    const span = new THREE.Mesh(spanGeometry, spanMaterial);
    span.position.set(x, 25, z);
    span.castShadow = true;
    span.receiveShadow = true;
    this.scene.add(span);

    // Create two main towers
    for (let i = 0; i < 2; i++) {
      const towerGeometry = new THREE.BoxGeometry(6, 60, 6);
      const towerMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 });
      const tower = new THREE.Mesh(towerGeometry, towerMaterial);
      tower.position.set(x + (i === 0 ? -40 : 40), 30, z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.scene.add(tower);

      // Add cables
      const cableGeometry = new THREE.CylinderGeometry(0.2, 0.2, 50);
      const cableMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
      for (let j = 0; j < 8; j++) {
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        cable.position.set(x + (i === 0 ? -40 : 40) + (j - 4) * 5, 30, z);
        cable.rotation.z = (j - 4) * 0.1;
        this.scene.add(cable);
      }
    }
  }

  createTransamericaPyramid(x, z) {
    // Base building (the lower rectangular portion)
    const baseGeometry = new THREE.BoxGeometry(25, 30, 25);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, 15, z);
    base.castShadow = true;
    this.scene.add(base);

    // Add windows to the base building
    this.addTransamericaWindows(base, x, z, 25, 30);

    // Slender tapering pyramid body (square base, 4 faces)
    const pyramidHeight = 120;
    const pyramidGeometry = new THREE.ConeGeometry(18, pyramidHeight, 4);
    const pyramidMaterial = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }); // light quartz facade
    const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
    pyramid.position.set(x, 30 + pyramidHeight / 2, z); // sits atop 30-unit base block
    pyramid.rotation.y = Math.PI / 4; // align flat faces north/south/east/west
    pyramid.castShadow = true;
    this.scene.add(pyramid);

    const topY = 30 + pyramidHeight; // pyramid apex height

    // Facade lines temporarily disabled – could be re-enabled with new baseY if desired
    // this.addPyramidFacadeLines(x, z, topY - 40);

    // Crown/spire redesigned to sit correctly above stepped tiers
    const crownGeometry = new THREE.CylinderGeometry(0.3, 1.2, 12);
    const crownMaterial = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.set(x, topY + 6, z);
    this.scene.add(crown);

    // Antenna/spire tip adjusted relative to new crown height
    const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 8);
    const antennaMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(x, topY + 14, z);
    this.scene.add(antenna);

    // Wings (the distinctive "ears" of the Transamerica Pyramid)
    this.addTransamericaWings(x, z);
  }

  // Add detailed windows to Transamerica base
  addTransamericaWindows(base, x, z, width, height) {
    const floors = 8;
    const windowsPerFloor = 6;
    
    // Add windows to front and side faces
    for (let floor = 0; floor < floors; floor++) {
      for (let window = 0; window < windowsPerFloor; window++) {
        if (Math.random() > 0.2) { // 80% chance for lit windows
          // Front face windows
          const windowGeometry = new THREE.PlaneGeometry(1.8, 2.5);
          const isLit = Math.random() > 0.4;
          const windowMaterial = new THREE.MeshBasicMaterial({
            color: isLit ? 0xffff88 : 0x4682b4,
            transparent: true,
            opacity: isLit ? 0.9 : 0.6,
          });
          const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

          const windowX = (window - windowsPerFloor / 2 + 0.5) * 3.5;
          const windowY = (floor - floors / 2 + 0.5) * 3.5;

          windowMesh.position.set(x + windowX, 15 + windowY, z + width/2 + 0.1);
          this.scene.add(windowMesh);
        }
      }
    }
  }

  // Add facade lines to the pyramid for architectural detail
  addPyramidFacadeLines(x, z, baseY) {
    const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xd0d0d0 });
    
    // Vertical lines on each face of the pyramid
    for (let face = 0; face < 4; face++) {
      for (let line = 0; line < 3; line++) {
        const lineGeometry = new THREE.BoxGeometry(0.2, 85, 0.2);
        const linesMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        
        const angle = (face * Math.PI / 2) + (Math.PI / 4);
        const distance = 8 - (line * 2);
        
        linesMesh.position.set(
          x + Math.cos(angle) * distance,
          baseY,
          z + Math.sin(angle) * distance
        );
        this.scene.add(linesMesh);
      }
    }
  }

  // Add the distinctive wings/ears of the Transamerica Pyramid
  addTransamericaWings(x, z) {
    // East wing
    const wingGeometry = new THREE.BoxGeometry(3, 45, 8);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    
    const eastWing = new THREE.Mesh(wingGeometry, wingMaterial);
    eastWing.position.set(x + 18, 37.5, z);
    this.scene.add(eastWing);
    
    // West wing
    const westWing = new THREE.Mesh(wingGeometry, wingMaterial);
    westWing.position.set(x - 18, 37.5, z);
    this.scene.add(westWing);

    // Add small windows to wings
    for (let floor = 0; floor < 10; floor++) {
      if (Math.random() > 0.6) {
        // East wing window
        const wingWindowGeometry = new THREE.PlaneGeometry(1, 1.5);
        const wingWindowMaterial = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0xffff88 : 0x4682b4,
          transparent: true,
          opacity: 0.8,
        });
        const eastWingWindow = new THREE.Mesh(wingWindowGeometry, wingWindowMaterial);
        eastWingWindow.position.set(x + 18, 20 + (floor * 4), z + 4.1);
        this.scene.add(eastWingWindow);

        // West wing window
        const westWingWindow = new THREE.Mesh(wingWindowGeometry, wingWindowMaterial.clone());
        westWingWindow.position.set(x - 18, 20 + (floor * 4), z + 4.1);
        this.scene.add(westWingWindow);
      }
    }
  }

  createCoitTower(x, z) {
    // Create cylindrical tower
    const towerGeometry = new THREE.CylinderGeometry(8, 8, 50);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5dc }); // Beige/cream color
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(x, 25, z);
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.scene.add(tower);

    // Add viewing platform
    const platformGeometry = new THREE.CylinderGeometry(10, 10, 3);
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0xddd });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, 52, z);
    this.scene.add(platform);
  }

  createFerryBuilding(x, z) {
    // Main building base with detailed architecture
    const buildingGeometry = new THREE.BoxGeometry(45, 25, 18);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xd2b48c }); // Tan/beige color
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, 12.5, z);
    building.castShadow = true;
    this.scene.add(building);

    // Add arched entrance details
    this.addFerryBuildingArches(x, z);

    // Add decorative colonnade
    this.addFerryBuildingColumns(x, z);

    // Central clock tower with more detail
    const towerGeometry = new THREE.BoxGeometry(10, 45, 10);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0xd2b48c });
    const clockTower = new THREE.Mesh(towerGeometry, towerMaterial);
    clockTower.position.set(x, 35, z);
    clockTower.castShadow = true;
    this.scene.add(clockTower);

    // Add tower windows
    this.addClockTowerWindows(x, z);

    // Ornate green dome (signature Ferry Building feature)
    const domeGeometry = new THREE.SphereGeometry(7, 12, 8);
    const domeMaterial = new THREE.MeshLambertMaterial({ color: 0x2F5F3F }); // Darker green
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.set(x, 65, z);
    this.scene.add(dome);

    // Dome base/drum
    const drumGeometry = new THREE.CylinderGeometry(8, 8, 5);
    const drumMaterial = new THREE.MeshLambertMaterial({ color: 0xd2b48c });
    const drum = new THREE.Mesh(drumGeometry, drumMaterial);
    drum.position.set(x, 59, z);
    this.scene.add(drum);

    // Four clock faces (one on each side)
    this.addClockFaces(x, z);

    // Finial/weathervane on top
    const finialGeometry = new THREE.ConeGeometry(1, 4, 8);
    const finialMaterial = new THREE.MeshLambertMaterial({ color: 0x4682B4 });
    const finial = new THREE.Mesh(finialGeometry, finialMaterial);
    finial.position.set(x, 71, z);
    this.scene.add(finial);

    // Add building windows
    this.addFerryBuildingWindows(x, z);
  }

  // Add arched entrance details to Ferry Building
  addFerryBuildingArches(x, z) {
    const archMaterial = new THREE.MeshLambertMaterial({ color: 0xC0A080 }); // Slightly darker tan
    
    // Create several arched openings along the front
    for (let i = 0; i < 5; i++) {
      const archGeometry = new THREE.BoxGeometry(4, 8, 1);
      const arch = new THREE.Mesh(archGeometry, archMaterial);
      arch.position.set(x + (i - 2) * 8, 8, z + 9.5);
      this.scene.add(arch);

      // Arch top (semicircle)
      const archTopGeometry = new THREE.CylinderGeometry(2, 2, 1, 8, 1, false, 0, Math.PI);
      const archTop = new THREE.Mesh(archTopGeometry, archMaterial);
      archTop.position.set(x + (i - 2) * 8, 12, z + 9.5);
      archTop.rotation.z = Math.PI / 2;
      this.scene.add(archTop);
    }
  }

  // Add decorative columns to Ferry Building
  addFerryBuildingColumns(x, z) {
    const columnMaterial = new THREE.MeshLambertMaterial({ color: 0xE5D4B1 }); // Light tan
    
    for (let i = 0; i < 6; i++) {
      const columnGeometry = new THREE.CylinderGeometry(0.8, 0.8, 20);
      const column = new THREE.Mesh(columnGeometry, columnMaterial);
      column.position.set(x + (i - 2.5) * 7, 15, z + 10);
      this.scene.add(column);

      // Column capital
      const capitalGeometry = new THREE.CylinderGeometry(1.2, 0.8, 1.5);
      const capital = new THREE.Mesh(capitalGeometry, columnMaterial);
      capital.position.set(x + (i - 2.5) * 7, 25.5, z + 10);
      this.scene.add(capital);
    }
  }

  // Add windows to Ferry Building
  addFerryBuildingWindows(x, z) {
    const windowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x87CEEB, 
      transparent: true, 
      opacity: 0.7 
    });

    // Main building windows - three rows
    for (let floor = 0; floor < 3; floor++) {
      for (let window = 0; window < 8; window++) {
        if (window !== 4) { // Skip center where clock tower is
          const windowGeometry = new THREE.PlaneGeometry(2, 3);
          const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
          
          windowMesh.position.set(
            x + (window - 4) * 5,
            8 + (floor * 5),
            z + 9.1
          );
          this.scene.add(windowMesh);
        }
      }
    }
  }

  // Add windows to clock tower
  addClockTowerWindows(x, z) {
    const windowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x87CEEB, 
      transparent: true, 
      opacity: 0.6 
    });

    // Tower windows on front and back
    for (let floor = 0; floor < 6; floor++) {
      // Front window
      const frontWindowGeometry = new THREE.PlaneGeometry(1.5, 2);
      const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
      frontWindow.position.set(x, 30 + (floor * 4), z + 5.1);
      this.scene.add(frontWindow);

      // Back window
      const backWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
      backWindow.position.set(x, 30 + (floor * 4), z - 5.1);
      this.scene.add(backWindow);
    }
  }

  // Add four clock faces to the clock tower
  addClockFaces(x, z) {
    const clockFaceMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFF0 }); // Ivory white
    const clockHandMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black hands

    // Four directions for clock faces
    const directions = [
      { pos: [0, 0, 5.1], rot: [0, 0, 0] },      // Front
      { pos: [0, 0, -5.1], rot: [0, Math.PI, 0] }, // Back
      { pos: [5.1, 0, 0], rot: [0, Math.PI/2, 0] }, // Right
      { pos: [-5.1, 0, 0], rot: [0, -Math.PI/2, 0] } // Left
    ];

    directions.forEach(dir => {
      // Clock face
      const clockGeometry = new THREE.CircleGeometry(3.5, 16);
      const clock = new THREE.Mesh(clockGeometry, clockFaceMaterial);
      clock.position.set(x + dir.pos[0], 50, z + dir.pos[2]);
      clock.rotation.y = dir.rot[1];
      this.scene.add(clock);

      // Clock hands
      const hourHandGeometry = new THREE.BoxGeometry(0.1, 2, 0.1);
      const hourHand = new THREE.Mesh(hourHandGeometry, clockHandMaterial);
      hourHand.position.set(x + dir.pos[0], 50.5, z + dir.pos[2]);
      hourHand.rotation.y = dir.rot[1];
      hourHand.rotation.z = Math.PI / 6; // 2 o'clock position
      this.scene.add(hourHand);

      const minuteHandGeometry = new THREE.BoxGeometry(0.05, 2.8, 0.05);
      const minuteHand = new THREE.Mesh(minuteHandGeometry, clockHandMaterial);
      minuteHand.position.set(x + dir.pos[0], 50.3, z + dir.pos[2]);
      minuteHand.rotation.y = dir.rot[1];
      minuteHand.rotation.z = Math.PI / 4; // Quarter past position
      this.scene.add(minuteHand);
    });
  }

  createSalesforceTower(x, z) {
    // Main cylindrical tower
    const towerGeometry = new THREE.CylinderGeometry(12, 15, 70);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 }); // Silver/glass color
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(x, 35, z);
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.scene.add(tower);

    // LED crown (simplified as colored ring)
    const crownGeometry = new THREE.CylinderGeometry(13, 13, 5);
    const crownMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0088ff,
      transparent: true,
      opacity: 0.7
    });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.set(x, 72, z);
    this.scene.add(crown);

    // Make the crown glow/pulse
    setInterval(() => {
      if (crown.material.opacity > 0.3) {
        crown.material.opacity -= 0.02;
      } else {
        crown.material.opacity = 0.7;
      }
    }, 100);
  }

  // Create SF Bay Areas
  createBayAreas() {
    // Add water areas around the edges (SF is surrounded by water)
    const waterGeometry = new THREE.PlaneGeometry(1000, 200);
    const waterMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4682B4, // Steel blue for bay water
      transparent: false, // Remove transparency to prevent visual artifacts
      opacity: 1.0
    });

    // North bay (towards Marin)
    const northBay = new THREE.Mesh(waterGeometry, waterMaterial);
    northBay.rotation.x = -Math.PI / 2;
    northBay.position.set(0, -0.1, -400); // Slightly below ground to prevent z-fighting
    northBay.receiveShadow = false;
    this.scene.add(northBay);

    // East bay
    const eastBay = new THREE.Mesh(waterGeometry.clone(), waterMaterial.clone());
    eastBay.rotation.x = -Math.PI / 2;
    eastBay.rotation.z = Math.PI / 2;
    eastBay.position.set(400, -0.1, 0); // Slightly below ground to prevent z-fighting
    eastBay.receiveShadow = false;
    this.scene.add(eastBay);
  }

  // Add SF-specific environmental details
  addSFEnvironmentalDetails(citySize, blockSize, streetWidth) {
    // Add cable car tracks on select streets
    this.addCableCarTracks(citySize, blockSize, streetWidth);
    
    // Add some hills with elevated terrain
    this.addSFHills(citySize, blockSize, streetWidth);
    
    // Add SF-style street elements
    // this.addSFStreetDetails(); // DISABLED: Cylinders cluttering streets
  }

  // Add cable car tracks
  addCableCarTracks(citySize, blockSize, streetWidth) {
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown tracks
    
    // Add tracks on a few major "streets" (simplified for demo)
    for (let i = 0; i < 3; i++) {
      const trackGeometry = new THREE.BoxGeometry(200, 0.2, 0.5);
      const track = new THREE.Mesh(trackGeometry, trackMaterial);
      track.position.set(0, 0.2, -120 + i * 120);
      this.scene.add(track);
    }
  }

  // Add SF hills terrain - DISABLED to fix pink cylinder issue
  addSFHills(citySize, blockSize, streetWidth) {
    // Hills disabled due to visual artifacts (pink cylinders)
    // Create subtle elevation changes (simplified hills) - COMMENTED OUT
    /*
    const hillPositions = [
      { x: -100, z: -100, height: 8 },  // Nob Hill area
      { x: 50, z: -80, height: 6 },     // Russian Hill area
      { x: -80, z: 120, height: 10 },   // Twin Peaks area
    ];

    hillPositions.forEach(hill => {
      const hillGeometry = new THREE.CylinderGeometry(60, 80, hill.height, 8);
      const hillMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x9ACD32, // Yellow green for hills
        transparent: true,
        opacity: 0.3
      });
      const hillMesh = new THREE.Mesh(hillGeometry, hillMaterial);
      hillMesh.position.set(hill.x, hill.height / 2, hill.z);
      this.scene.add(hillMesh);
    });
    */
  }

  // Add SF street details
  addSFStreetDetails() {
    // Add some fire hydrants (iconic SF elements)
    for (let i = 0; i < 8; i++) {
      const hydrantGeometry = new THREE.CylinderGeometry(1, 1, 3);
      const hydrantMaterial = new THREE.MeshLambertMaterial({ color: 0xDC143C }); // Crimson
      const hydrant = new THREE.Mesh(hydrantGeometry, hydrantMaterial);
      
      const x = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      hydrant.position.set(x, 1.5, z);
      this.scene.add(hydrant);
    }

    // Add some SF-style lamp posts
    for (let i = 0; i < 12; i++) {
      this.createSFLampPost(
        (Math.random() - 0.5) * 350,
        (Math.random() - 0.5) * 350
      );
    }
  }

  // Create SF-style lamp post
  createSFLampPost(x, z) {
    const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 12);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F }); // Dark slate gray
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, 6, z);
    this.scene.add(pole);

    // Lamp head
    const lampGeometry = new THREE.SphereGeometry(1.5, 8, 6);
    const lampMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFFFE0, // Light yellow
      transparent: true,
      opacity: 0.7
    });
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.set(x, 11, z);
    this.scene.add(lamp);
  }

  // Add SF-style bay windows
  addBayWindows(building, width, height) {
    // Create protruding bay window
    const bayGeometry = new THREE.BoxGeometry(2, 6, 1.5);
    const bayMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xF5F5DC, // Beige
      transparent: false, // Remove transparency to prevent visual artifacts
      opacity: 1.0
    });
    const bayWindow = new THREE.Mesh(bayGeometry, bayMaterial);
    
    // Position on front face of building
    bayWindow.position.set(width / 4, height / 3, width / 2 + 0.8);
    bayWindow.castShadow = false;
    bayWindow.receiveShadow = false;
    building.add(bayWindow);

    // Add window glass - simplified to avoid transparency issues
    const glassGeometry = new THREE.PlaneGeometry(1.5, 4);
    const glassMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x87CEEB, // Sky blue
      transparent: false, // Remove transparency
      opacity: 1.0
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(0, 0, 0.8);
    bayWindow.add(glass);
  }

  // Create Market Street - SF's main diagonal thoroughfare
  createMarketStreet(citySize, blockSize, streetWidth) {
    const gridCenter = citySize / 2;
    const blockSpacing = blockSize + streetWidth;

    // Market Street runs diagonally from southwest to northeast, ending at Ferry Building
    // Ferry Building position (from createLandmarks)
    const ferryBuildingX = (12 - gridCenter) * blockSpacing;
    const ferryBuildingZ = (7 - gridCenter) * blockSpacing;

    // Market Street starts from southwest corner and goes to Ferry Building
    const startX = -200;
    const startZ = 200;

    // Create the diagonal street
    const streetLength = Math.sqrt(
      Math.pow(ferryBuildingX - startX, 2) + Math.pow(ferryBuildingZ - startZ, 2)
    );

    // Street geometry
    const streetGeometry = new THREE.PlaneGeometry(12, streetLength); // Wider than normal streets
    const streetMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x444444, // Dark gray asphalt
      transparent: false
    });
    const marketStreet = new THREE.Mesh(streetGeometry, streetMaterial);

    // Calculate angle for diagonal street
    const angle = Math.atan2(ferryBuildingX - startX, ferryBuildingZ - startZ);
    
    // Position and rotate the street
    const centerX = (startX + ferryBuildingX) / 2;
    const centerZ = (startZ + ferryBuildingZ) / 2;
    
    marketStreet.rotation.x = -Math.PI / 2;
    marketStreet.rotation.z = -angle;
    marketStreet.position.set(centerX, 0.1, centerZ);
    marketStreet.receiveShadow = false;
    
    this.scene.add(marketStreet);

    // Add Market Street signage
    this.addMarketStreetSigns(startX, startZ, ferryBuildingX, ferryBuildingZ);

    // Add trolley/cable car tracks along Market Street
    this.addMarketStreetTracks(startX, startZ, ferryBuildingX, ferryBuildingZ, streetLength, angle);

    // Store Market Street info for navigation
    this.marketStreet = {
      start: { x: startX, z: startZ },
      end: { x: ferryBuildingX, z: ferryBuildingZ },
      angle: angle,
      centerX: centerX,
      centerZ: centerZ
    };
  }

  // Add Market Street signage
  addMarketStreetSigns(startX, startZ, endX, endZ) {
    // Add a few "Market St" signs along the route
    const signPositions = [
      { x: startX + 50, z: startZ - 50 },
      { x: (startX + endX) / 2, z: (startZ + endZ) / 2 },
      { x: endX - 50, z: endZ + 50 }
    ];

    signPositions.forEach(pos => {
      // Sign post
      const postGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(pos.x, 4, pos.z);
      this.scene.add(post);

      // Sign board
      const signGeometry = new THREE.BoxGeometry(8, 2, 0.2);
      const signMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Green SF street sign
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      sign.position.set(pos.x, 7, pos.z);
      this.scene.add(sign);

      // "Market St" text (simplified as white rectangle)
      const textGeometry = new THREE.PlaneGeometry(6, 1);
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      const text = new THREE.Mesh(textGeometry, textMaterial);
      text.position.set(pos.x, 7, pos.z + 0.15);
      this.scene.add(text);
    });
  }

  // Add trolley tracks along Market Street
  addMarketStreetTracks(startX, startZ, endX, endZ, streetLength, angle) {
    // Create two parallel tracks
    for (let trackOffset of [-2, 2]) {
      const trackGeometry = new THREE.BoxGeometry(0.3, 0.1, streetLength);
      const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
      const track = new THREE.Mesh(trackGeometry, trackMaterial);
      
      const centerX = (startX + endX) / 2;
      const centerZ = (startZ + endZ) / 2;
      
      // Offset for parallel tracks
      const offsetX = Math.cos(angle + Math.PI/2) * trackOffset;
      const offsetZ = Math.sin(angle + Math.PI/2) * trackOffset;
      
      track.position.set(centerX + offsetX, 0.15, centerZ + offsetZ);
      track.rotation.y = -angle;
      this.scene.add(track);
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
