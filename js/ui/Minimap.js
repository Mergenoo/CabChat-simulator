class Minimap {
  constructor() {
    this.canvas = document.getElementById("minimap-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.size = 200;
    this.scale = 0.5; // World units per pixel
    this.centerOffset = { x: 0, y: 0 };

    // Colors
    this.colors = {
      background: "#1a1a1a",
      roads: "#444444",
      buildings: "#666666",
      player: "#ffff00",
      passengers: "#00ff00",
      destination: "#ff0000",
      traffic: "#888888",
      pickupZone: "#00ff0080",
    };

    // Map data
    this.cityLayout = null;
    this.playerPosition = new THREE.Vector3();
    this.passengers = [];
    this.traffic = [];
    this.currentDestination = null;

    // Animation
    this.blinkTimer = 0;
    this.rotationAngle = 0;

    // Settings
    this.followPlayer = true;
    this.showTraffic = true;
    this.showPassengers = true;
    this.zoom = 1.0;
  }

  init(cityLayout) {
    this.cityLayout = cityLayout;
    this.setupCanvas();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  setupCanvas() {
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx.imageSmoothingEnabled = false;
  }

  setupEventListeners() {
    // Mouse wheel for zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.5, Math.min(3.0, this.zoom * zoomFactor));
    });

    // Click to toggle follow mode
    this.canvas.addEventListener("click", () => {
      this.followPlayer = !this.followPlayer;
    });

    // Touch events for mobile
    let lastTouchDistance = 0;

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
    });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        if (lastTouchDistance > 0) {
          const zoomFactor = currentDistance / lastTouchDistance;
          this.zoom = Math.max(0.5, Math.min(3.0, this.zoom * zoomFactor));
        }

        lastTouchDistance = currentDistance;
      }
    });
  }

  update(playerPosition, passengers, currentPassenger) {
    this.playerPosition.copy(playerPosition);
    this.passengers = passengers || [];
    this.currentPassenger = currentPassenger;

    // Update center offset if following player
    if (this.followPlayer) {
      this.centerOffset.x = playerPosition.x;
      this.centerOffset.y = playerPosition.z;
    }

    // Update animation timers
    this.blinkTimer += 0.1;
    this.rotationAngle += 0.02;
  }

  startRenderLoop() {
    const render = () => {
      this.render();
      requestAnimationFrame(render);
    };
    render();
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.size, this.size);

    // Save context for transformations
    this.ctx.save();

    // Apply zoom and centering
    this.ctx.translate(this.size / 2, this.size / 2);
    this.ctx.scale(this.zoom, this.zoom);

    // Draw city elements
    this.drawRoads();
    this.drawBuildings();

    if (this.showTraffic) {
      this.drawTraffic();
    }

    if (this.showPassengers) {
      this.drawPassengers();
    }

    this.drawDestination();
    this.drawPlayer();
    this.drawPickupZone();

    // Restore context
    this.ctx.restore();

    // Draw UI elements (not affected by zoom/pan)
    this.drawCompass();
    this.drawZoomLevel();
    this.drawLegend();
  }

  drawRoads() {
    if (!this.cityLayout || !this.cityLayout.streets) return;

    this.ctx.strokeStyle = this.colors.roads;
    this.ctx.lineWidth = 2;

    this.cityLayout.streets.forEach((street) => {
      // Draw horizontal street
      if (street.horizontal) {
        const screenPos = this.worldToScreen(street.horizontal.position);
        this.ctx.beginPath();
        this.ctx.moveTo(
          screenPos.x - street.horizontal.length / 2,
          screenPos.y
        );
        this.ctx.lineTo(
          screenPos.x + street.horizontal.length / 2,
          screenPos.y
        );
        this.ctx.stroke();
      }

      // Draw vertical street
      if (street.vertical) {
        const screenPos = this.worldToScreen(street.vertical.position);
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y - street.vertical.length / 2);
        this.ctx.lineTo(screenPos.x, screenPos.y + street.vertical.length / 2);
        this.ctx.stroke();
      }
    });
  }

  drawBuildings() {
    if (!this.cityLayout || !this.cityLayout.buildings) return;

    this.ctx.fillStyle = this.colors.buildings;

    this.cityLayout.buildings.forEach((building) => {
      const screenPos = this.worldToScreen(building.position);
      const size = building.size * this.scale;

      this.ctx.fillRect(
        screenPos.x - size / 2,
        screenPos.y - size / 2,
        size,
        size
      );
    });
  }

  drawTraffic() {
    this.traffic.forEach((vehicle) => {
      const screenPos = this.worldToScreen(vehicle.position);

      this.ctx.fillStyle = this.colors.traffic;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawPassengers() {
    this.passengers.forEach((passenger) => {
      const screenPos = this.worldToScreen(passenger.position);

      // Blinking effect for waiting passengers
      const alpha = 0.7 + Math.sin(this.blinkTimer * 3) * 0.3;

      // Color based on mood
      let color = this.colors.passengers;
      switch (passenger.mood) {
        case "happy":
          color = "#00ff00";
          break;
        case "neutral":
          color = "#ffff00";
          break;
        case "impatient":
          color = "#ff8800";
          break;
        case "angry":
          color = "#ff0000";
          break;
      }

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw exclamation mark
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "8px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("!", screenPos.x, screenPos.y - 6);

      this.ctx.globalAlpha = 1.0;
    });
  }

  drawDestination() {
    if (!this.currentPassenger || !this.currentPassenger.destination) return;

    const screenPos = this.worldToScreen(this.currentPassenger.destination);

    // Pulsing destination marker
    const pulseSize = 4 + Math.sin(this.blinkTimer * 4) * 2;

    this.ctx.fillStyle = this.colors.destination;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, pulseSize, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw destination flag
    this.ctx.strokeStyle = this.colors.destination;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x, screenPos.y - pulseSize);
    this.ctx.lineTo(screenPos.x, screenPos.y - pulseSize - 8);
    this.ctx.stroke();

    // Flag
    this.ctx.fillStyle = this.colors.destination;
    this.ctx.fillRect(screenPos.x, screenPos.y - pulseSize - 8, 6, 4);
  }

  drawPlayer() {
    const screenPos = this.worldToScreen(this.playerPosition);

    this.ctx.save();
    this.ctx.translate(screenPos.x, screenPos.y);
    this.ctx.rotate(this.rotationAngle);

    // Draw taxi as a yellow rectangle with taxi sign
    this.ctx.fillStyle = this.colors.player;
    this.ctx.fillRect(-4, -2, 8, 4);

    // Taxi sign
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillRect(-2, -4, 4, 2);

    // Direction indicator
    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.moveTo(4, 0);
    this.ctx.lineTo(2, -1);
    this.ctx.lineTo(2, 1);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPickupZone() {
    if (!this.currentPassenger) return;

    // Draw pickup radius around nearby passengers
    this.passengers.forEach((passenger) => {
      const distance = this.playerPosition.distanceTo(passenger.position);
      if (distance < 10) {
        // Within pickup range
        const screenPos = this.worldToScreen(passenger.position);

        this.ctx.strokeStyle = this.colors.pickupZone;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, 10 * this.scale, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    });
  }

  drawCompass() {
    const compassSize = 30;
    const compassX = this.size - compassSize - 10;
    const compassY = 10 + compassSize;

    // Compass background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.beginPath();
    this.ctx.arc(compassX, compassY, compassSize / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // North indicator
    this.ctx.save();
    this.ctx.translate(compassX, compassY);
    this.ctx.rotate(-this.rotationAngle);

    this.ctx.fillStyle = "#ff0000";
    this.ctx.beginPath();
    this.ctx.moveTo(0, -compassSize / 2 + 5);
    this.ctx.lineTo(-3, -compassSize / 2 + 12);
    this.ctx.lineTo(3, -compassSize / 2 + 12);
    this.ctx.closePath();
    this.ctx.fill();

    // N label
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("N", 0, -compassSize / 2 + 20);

    this.ctx.restore();
  }

  drawZoomLevel() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(10, this.size - 30, 60, 20);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`${(this.zoom * 100).toFixed(0)}%`, 15, this.size - 15);
  }

  drawLegend() {
    const legendItems = [
      { color: this.colors.player, label: "You" },
      { color: this.colors.passengers, label: "Passengers" },
      { color: this.colors.destination, label: "Destination" },
      { color: this.colors.traffic, label: "Traffic" },
    ];

    const legendX = 10;
    let legendY = 10;

    // Legend background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(
      legendX - 5,
      legendY - 5,
      100,
      legendItems.length * 15 + 10
    );

    legendItems.forEach((item, index) => {
      const y = legendY + index * 15;

      // Color indicator
      this.ctx.fillStyle = item.color;
      this.ctx.fillRect(legendX, y, 10, 10);

      // Label
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "10px Arial";
      this.ctx.textAlign = "left";
      this.ctx.fillText(item.label, legendX + 15, y + 8);
    });
  }

  worldToScreen(worldPos) {
    const relativeX = worldPos.x - this.centerOffset.x;
    const relativeY = worldPos.z - this.centerOffset.y;

    return {
      x: relativeX * this.scale,
      y: relativeY * this.scale,
    };
  }

  screenToWorld(screenPos) {
    const relativeX = screenPos.x / this.scale;
    const relativeY = screenPos.y / this.scale;

    return new THREE.Vector3(
      relativeX + this.centerOffset.x,
      0,
      relativeY + this.centerOffset.y
    );
  }

  setTraffic(traffic) {
    this.traffic = traffic;
  }

  setDestination(destination) {
    this.currentDestination = destination;
  }

  clearDestination() {
    this.currentDestination = null;
  }

  setZoom(zoom) {
    this.zoom = Math.max(0.5, Math.min(3.0, zoom));
  }

  setFollowPlayer(follow) {
    this.followPlayer = follow;
  }

  toggleTrafficDisplay() {
    this.showTraffic = !this.showTraffic;
  }

  togglePassengerDisplay() {
    this.showPassengers = !this.showPassengers;
  }

  centerOnPosition(position) {
    this.centerOffset.x = position.x;
    this.centerOffset.y = position.z;
    this.followPlayer = false;
  }

  handleResize() {
    const container = this.canvas.parentElement;
    const newSize = Math.min(container.clientWidth, container.clientHeight);

    if (newSize !== this.size) {
      this.size = newSize;
      this.canvas.width = this.size;
      this.canvas.height = this.size;
    }
  }

  exportAsImage() {
    // Export minimap as image
    const link = document.createElement("a");
    link.download = "minimap.png";
    link.href = this.canvas.toDataURL();
    link.click();
  }

  reset() {
    this.passengers = [];
    this.traffic = [];
    this.currentDestination = null;
    this.centerOffset = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.followPlayer = true;
  }
}
