class GPSSystem {
  constructor() {
    this.cityLayout = null;
    this.pathfinder = new PathFinder();
    this.currentRoute = null;
    this.destination = null;
    this.isActive = false;

    // GPS settings
    this.recalculateDistance = 20; // Recalculate route if off by this distance
    this.routeUpdateInterval = 2; // Update route every 2 seconds
    this.lastRouteUpdate = 0;

    // Voice guidance
    this.voiceEnabled = true;
    this.lastInstruction = null;
    this.instructionDistance = 50; // Give instruction 50 units before turn

    // Route visualization
    this.routeLine = null;
    this.routeMaterial = null;
  }

  init(cityLayout) {
    this.cityLayout = cityLayout;
    this.pathfinder.init(cityLayout);
    this.setupRouteVisualization();
  }

  setupRouteVisualization() {
    // Create material for route line
    this.routeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 3,
      transparent: true,
      opacity: 0.8,
    });
  }

  setDestination(destination) {
    this.destination = destination.clone();
    this.isActive = true;
  }

  clearDestination() {
    this.destination = null;
    this.currentRoute = null;
    this.isActive = false;
    this.clearRouteVisualization();
  }

  update(currentPosition) {
    if (!this.isActive || !this.destination) return;

    const currentTime = Date.now();

    // Update route periodically or if significantly off course
    if (this.shouldUpdateRoute(currentPosition, currentTime)) {
      this.calculateRoute(currentPosition, this.destination);
      this.lastRouteUpdate = currentTime;
    }

    // Update navigation instructions
    if (this.currentRoute) {
      this.updateNavigationInstructions(currentPosition);
      this.updateRouteVisualization();
    }
  }

  shouldUpdateRoute(currentPosition, currentTime) {
    // Update if no route exists
    if (!this.currentRoute) return true;

    // Update periodically
    if (currentTime - this.lastRouteUpdate > this.routeUpdateInterval * 1000) {
      return true;
    }

    // Update if significantly off course
    if (this.currentRoute.path && this.currentRoute.path.length > 0) {
      const nearestPoint = this.findNearestPointOnRoute(currentPosition);
      const distanceToRoute = currentPosition.distanceTo(nearestPoint);

      if (distanceToRoute > this.recalculateDistance) {
        return true;
      }
    }

    return false;
  }

  calculateRoute(start, end) {
    try {
      const route = this.pathfinder.findPath(start, end);

      if (route && route.length > 0) {
        this.currentRoute = {
          path: route,
          totalDistance: this.calculateRouteDistance(route),
          currentSegment: 0,
          instructions: this.generateInstructions(route),
        };
      } else {
        console.warn("No route found to destination");
        this.currentRoute = null;
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      this.currentRoute = null;
    }
  }

  calculateRouteDistance(path) {
    let totalDistance = 0;

    for (let i = 1; i < path.length; i++) {
      totalDistance += path[i - 1].distanceTo(path[i]);
    }

    return totalDistance;
  }

  generateInstructions(path) {
    const instructions = [];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const current = path[i];
      const next = path[i + 1];

      const instruction = this.calculateTurnInstruction(prev, current, next);
      if (instruction) {
        instructions.push({
          position: current.clone(),
          instruction: instruction,
          distance: this.calculateDistanceFromStart(path, i),
        });
      }
    }

    // Add final destination instruction
    instructions.push({
      position: path[path.length - 1].clone(),
      instruction: "You have arrived at your destination",
      distance: this.calculateRouteDistance(path),
    });

    return instructions;
  }

  calculateTurnInstruction(prev, current, next) {
    const vec1 = current.clone().sub(prev).normalize();
    const vec2 = next.clone().sub(current).normalize();

    const cross = vec1.cross(vec2);
    const dot = vec1.dot(vec2);

    const angle = Math.atan2(cross.y, dot);
    const degrees = (angle * 180) / Math.PI;

    if (Math.abs(degrees) < 15) {
      return "Continue straight";
    } else if (degrees > 15 && degrees < 75) {
      return "Turn slight right";
    } else if (degrees >= 75 && degrees < 105) {
      return "Turn right";
    } else if (degrees >= 105) {
      return "Turn sharp right";
    } else if (degrees < -15 && degrees > -75) {
      return "Turn slight left";
    } else if (degrees <= -75 && degrees > -105) {
      return "Turn left";
    } else if (degrees <= -105) {
      return "Turn sharp left";
    }

    return null;
  }

  calculateDistanceFromStart(path, index) {
    let distance = 0;

    for (let i = 1; i <= index; i++) {
      distance += path[i - 1].distanceTo(path[i]);
    }

    return distance;
  }

  updateNavigationInstructions(currentPosition) {
    if (!this.currentRoute || !this.currentRoute.instructions) return;

    const instructions = this.currentRoute.instructions;

    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];
      const distance = currentPosition.distanceTo(instruction.position);

      // Give instruction when approaching turn
      if (
        distance <= this.instructionDistance &&
        instruction !== this.lastInstruction
      ) {
        this.giveVoiceInstruction(instruction.instruction, distance);
        this.lastInstruction = instruction;
        break;
      }
    }
  }

  giveVoiceInstruction(instruction, distance) {
    if (!this.voiceEnabled) return;

    const distanceText =
      distance > 10
        ? `In ${Math.round(distance)} meters, ${instruction.toLowerCase()}`
        : instruction;

    // Update UI
    this.updateGPSPanel(distanceText);

    // In a real implementation, this would use text-to-speech
    // this.speakInstruction(distanceText);
  }

  updateGPSPanel(instruction) {
    const gpsPanel = document.getElementById("gps-directions");
    if (gpsPanel) {
      gpsPanel.innerHTML = `
                <div class="gps-instruction">
                    <div class="instruction-text">${instruction}</div>
                    <div class="destination-info">
                        Destination: ${this.getDestinationName()}
                    </div>
                    <div class="route-info">
                        Distance: ${this.getRemainingDistance().toFixed(1)}m
                        | Time: ${this.getEstimatedTime()}
                    </div>
                </div>
            `;
    }
  }

  getDestinationName() {
    // Generate a friendly name for the destination
    const names = [
      "Downtown Office",
      "Shopping Center",
      "Airport Terminal",
      "Train Station",
      "Hospital",
      "University",
      "City Park",
      "Restaurant District",
    ];

    return names[Math.floor(Math.random() * names.length)];
  }

  getRemainingDistance() {
    if (!this.currentRoute) return 0;

    // Calculate remaining distance on route
    // This is a simplified calculation
    return this.currentRoute.totalDistance * 0.7; // Placeholder
  }

  getEstimatedTime() {
    const distance = this.getRemainingDistance();
    const averageSpeed = 25; // km/h
    const timeInHours = distance / 1000 / averageSpeed;
    const minutes = Math.round(timeInHours * 60);

    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  findNearestPointOnRoute(position) {
    if (!this.currentRoute || !this.currentRoute.path) {
      return position.clone();
    }

    let nearestPoint = this.currentRoute.path[0].clone();
    let minDistance = position.distanceTo(nearestPoint);

    // Check each segment of the route
    for (let i = 1; i < this.currentRoute.path.length; i++) {
      const segmentStart = this.currentRoute.path[i - 1];
      const segmentEnd = this.currentRoute.path[i];

      const closestPoint = this.getClosestPointOnSegment(
        position,
        segmentStart,
        segmentEnd
      );
      const distance = position.distanceTo(closestPoint);

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = closestPoint;
      }
    }

    return nearestPoint;
  }

  getClosestPointOnSegment(point, segmentStart, segmentEnd) {
    const segment = segmentEnd.clone().sub(segmentStart);
    const segmentLength = segment.length();

    if (segmentLength === 0) return segmentStart.clone();

    const pointToStart = point.clone().sub(segmentStart);
    const projection =
      pointToStart.dot(segment) / (segmentLength * segmentLength);

    // Clamp to segment
    const clampedProjection = Math.max(0, Math.min(1, projection));

    return segmentStart.clone().add(segment.multiplyScalar(clampedProjection));
  }

  updateRouteVisualization() {
    if (!this.currentRoute || !this.currentRoute.path) {
      this.clearRouteVisualization();
      return;
    }

    // Clear existing route line
    this.clearRouteVisualization();

    // Create new route line
    const points = this.currentRoute.path.map(
      (point) => new THREE.Vector3(point.x, point.y + 0.5, point.z)
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.routeLine = new THREE.Line(geometry, this.routeMaterial);

    // Add to scene (this would need scene reference)
    if (this.scene) {
      this.scene.add(this.routeLine);
    }
  }

  clearRouteVisualization() {
    if (this.routeLine && this.scene) {
      this.scene.remove(this.routeLine);
      this.routeLine.geometry.dispose();
      this.routeLine = null;
    }
  }

  getNextTurn(currentPosition) {
    if (!this.currentRoute || !this.currentRoute.instructions) return null;

    for (const instruction of this.currentRoute.instructions) {
      const distance = currentPosition.distanceTo(instruction.position);
      if (distance > 5) {
        // Only return upcoming turns
        return {
          instruction: instruction.instruction,
          distance: distance,
          position: instruction.position,
        };
      }
    }

    return null;
  }

  isDestinationReached(currentPosition, threshold = 10) {
    if (!this.destination) return false;

    const distance = currentPosition.distanceTo(this.destination);
    return distance <= threshold;
  }

  reroute(currentPosition) {
    if (!this.destination) return;

    this.calculateRoute(currentPosition, this.destination);
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
  }

  setInstructionDistance(distance) {
    this.instructionDistance = distance;
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  getDestination() {
    return this.destination;
  }

  isActive() {
    return this.isActive;
  }
}
