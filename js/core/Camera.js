class GameCamera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.currentView = "third-person"; // 'first-person', 'third-person', 'top-down'
    this.target = null;
    this.offset = new THREE.Vector3(0, 10, -20);
    this.lookAtOffset = new THREE.Vector3(0, 2, 0);

    // Camera smoothing
    this.smoothFactor = 0.1;
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // View configurations
    this.viewConfigs = {
      "first-person": {
        offset: new THREE.Vector3(0, 2, 2),
        lookAtOffset: new THREE.Vector3(0, 2, 10),
        fov: 75,
      },
      "third-person": {
        offset: new THREE.Vector3(0, 10, -20),
        lookAtOffset: new THREE.Vector3(0, 2, 0),
        fov: 75,
      },
      "top-down": {
        offset: new THREE.Vector3(0, 50, 0),
        lookAtOffset: new THREE.Vector3(0, 0, 0),
        fov: 60,
      },
    };
  }

  init(target) {
    this.target = target;
    this.updateCameraView();
  }

  toggleView() {
    const views = Object.keys(this.viewConfigs);
    const currentIndex = views.indexOf(this.currentView);
    const nextIndex = (currentIndex + 1) % views.length;
    this.currentView = views[nextIndex];
    this.updateCameraView();
  }

  updateCameraView() {
    const config = this.viewConfigs[this.currentView];
    this.offset.copy(config.offset);
    this.lookAtOffset.copy(config.lookAtOffset);
    this.camera.fov = config.fov;
    this.camera.updateProjectionMatrix();
  }

  update(deltaTime) {
    if (!this.target) return;

    // Calculate desired position and look-at point
    const targetPosition = this.target.position.clone();
    const targetRotation = this.target.rotation.y;

    // Apply rotation to offset
    const rotatedOffset = this.offset.clone();
    rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);

    const desiredPosition = targetPosition.clone().add(rotatedOffset);

    // Calculate look-at point
    const rotatedLookAtOffset = this.lookAtOffset.clone();
    rotatedLookAtOffset.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      targetRotation
    );
    const desiredLookAt = targetPosition.clone().add(rotatedLookAtOffset);

    // Smooth camera movement
    this.currentPosition.lerp(desiredPosition, this.smoothFactor);
    this.currentLookAt.lerp(desiredLookAt, this.smoothFactor);

    // Apply to camera
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);

    // Special handling for first-person view
    if (this.currentView === "first-person") {
      this.handleFirstPersonView();
    }
  }

  handleFirstPersonView() {
    // Add slight camera shake for realism
    const shakeIntensity = this.target.velocity.length() * 0.001;
    this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
  }

  setTarget(target) {
    this.target = target;
  }

  getCurrentView() {
    return this.currentView;
  }
}
