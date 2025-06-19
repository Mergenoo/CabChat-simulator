class Dashboard {
  constructor() {
    this.elements = {
      fuel: document.getElementById("fuel-fill"),
      reputation: document.getElementById("reputation-score"),
      earnings: document.getElementById("earnings-amount"),
      currentFare: document.getElementById("current-fare"),
      tripDistance: document.getElementById("trip-distance"),
      tripTime: document.getElementById("trip-time"),
      missionsContainer: document.getElementById("missions-container"),
    };

    this.updateInterval = 100; // Update every 100ms
    this.lastUpdate = 0;

    // Animation properties
    this.animatedValues = {
      fuel: 100,
      earnings: 0,
      reputation: 100,
    };
  }

  init() {
    this.setupEventListeners();
    this.startUpdateLoop();
  }

  setupEventListeners() {
    // Add click handlers for dashboard elements
    if (this.elements.fuel) {
      this.elements.fuel.parentElement.addEventListener("click", () => {
        this.showFuelDetails();
      });
    }

    if (this.elements.reputation) {
      this.elements.reputation.addEventListener("click", () => {
        this.showReputationDetails();
      });
    }
  }

  update(gameState) {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;

    this.updateFuel(gameState.fuel);
    this.updateReputation(gameState.reputation);
    this.updateEarnings(gameState.earnings);
    this.updateMissions(gameState);

    this.lastUpdate = now;
  }

  updateFuel(targetFuel) {
    // Demo: static fuel level
    targetFuel = 75;
    this.animatedValues.fuel = targetFuel;

    if (this.elements.fuel) {
      const percentage = Math.max(0, Math.min(100, this.animatedValues.fuel));
      this.elements.fuel.style.width = `${percentage}%`;

      // Static demo color (green)
      this.elements.fuel.style.background = "#44ff44";
      this.elements.fuel.classList.remove("pulsing");
    }
  }

  updateReputation(targetReputation) {
    // Smooth animation to target reputation
    const diff = targetReputation - this.animatedValues.reputation;
    this.animatedValues.reputation += diff * 0.1;

    if (this.elements.reputation) {
      const reputation = Math.round(this.animatedValues.reputation);
      this.elements.reputation.textContent = reputation;

      // Change color based on reputation
      if (reputation < 30) {
        this.elements.reputation.style.color = "#ff4444";
      } else if (reputation < 70) {
        this.elements.reputation.style.color = "#ffaa00";
      } else {
        this.elements.reputation.style.color = "#44ff44";
      }
    }
  }

  updateEarnings(targetEarnings) {
    // Smooth animation to target earnings
    const diff = targetEarnings - this.animatedValues.earnings;
    this.animatedValues.earnings += diff * 0.1;

    if (this.elements.earnings) {
      this.elements.earnings.textContent =
        this.animatedValues.earnings.toFixed(2);
    }
  }

  updateFareMeter(fare, distance, time) {
    if (this.elements.currentFare) {
      this.elements.currentFare.textContent = fare.toFixed(2);
    }

    if (this.elements.tripDistance) {
      this.elements.tripDistance.textContent = distance.toFixed(1);
    }

    if (this.elements.tripTime) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      this.elements.tripTime.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  updateMissions(gameState) {
    if (!this.elements.missionsContainer) return;

    let missionsHTML = "";

    // Current passenger mission
    if (gameState.currentPassenger) {
      missionsHTML += `
                <div class="mission-item mission-dropoff">
                    <div class="mission-title">Drop off ${
                      gameState.currentPassenger.name
                    }</div>
                    <div class="mission-details">Destination: ${gameState.currentPassenger.getDestinationDescription()}</div>
                    <div class="mission-mood">Mood: ${
                      gameState.currentPassenger.mood
                    }</div>
                </div>
            `;
    }

    // Available pickup missions (nearby passengers)
    if (gameState.nearbyPassengers && gameState.nearbyPassengers.length > 0) {
      gameState.nearbyPassengers.forEach((passenger) => {
        missionsHTML += `
                    <div class="mission-item mission-pickup">
                        <div class="mission-title">Pick up ${
                          passenger.name
                        }</div>
                        <div class="mission-details">Distance: ${passenger.distance.toFixed(
                          0
                        )}m</div>
                        <div class="mission-mood">Mood: ${passenger.mood}</div>
                    </div>
                `;
      });
    }

    // Daily objectives
    missionsHTML += this.generateDailyObjectives(gameState);

    this.elements.missionsContainer.innerHTML =
      missionsHTML || '<div class="no-missions">No active missions</div>';
  }

  generateDailyObjectives(gameState) {
    const objectives = [
      {
        title: "Earn $100",
        progress: Math.min(100, (gameState.earnings / 100) * 100),
        completed: gameState.earnings >= 100,
      },
      {
        title: "Complete 10 trips",
        progress: Math.min(100, (gameState.completedTrips / 10) * 100),
        completed: gameState.completedTrips >= 10,
      },
      {
        title: "Maintain 80+ reputation",
        progress: Math.min(100, (gameState.reputation / 80) * 100),
        completed: gameState.reputation >= 80,
      },
    ];

    let objectivesHTML =
      '<div class="objectives-section"><h4>Daily Objectives</h4>';

    objectives.forEach((objective) => {
      const statusClass = objective.completed ? "completed" : "in-progress";
      objectivesHTML += `
                <div class="objective-item ${statusClass}">
                    <div class="objective-title">${objective.title}</div>
                    <div class="objective-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${
                              objective.progress
                            }%"></div>
                        </div>
                        <span class="progress-text">${objective.progress.toFixed(
                          0
                        )}%</span>
                    </div>
                </div>
            `;
    });

    objectivesHTML += "</div>";
    return objectivesHTML;
  }

  showFuelDetails() {
    const fuelLevel = this.animatedValues.fuel;
    let message = "";

    if (fuelLevel < 20) {
      message = "Fuel critically low! Find a gas station immediately.";
    } else if (fuelLevel < 50) {
      message = "Fuel running low. Consider refueling soon.";
    } else {
      message = "Fuel level is good.";
    }

    this.showNotification(message, fuelLevel < 20 ? "warning" : "info");
  }

  showReputationDetails() {
    const reputation = this.animatedValues.reputation;
    let message = "";

    if (reputation < 30) {
      message =
        "Your reputation is very poor. Drive more carefully and be punctual to improve it.";
    } else if (reputation < 70) {
      message =
        "Your reputation needs improvement. Avoid accidents and keep passengers happy.";
    } else if (reputation < 90) {
      message = "Good reputation! Keep up the professional driving.";
    } else {
      message = "Excellent reputation! You're a top-rated taxi driver.";
    }

    this.showNotification(message, "info");
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `dashboard-notification ${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

    // Add to dashboard
    const dashboard = document.getElementById("dashboard");
    dashboard.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);

    // Close button handler
    notification
      .querySelector(".notification-close")
      .addEventListener("click", () => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      });
  }

  updateEarnings() {
    // This method can be called externally to trigger earnings update
    if (this.elements.earnings) {
      // Add earning animation effect
      this.elements.earnings.classList.add("earning-animation");
      setTimeout(() => {
        this.elements.earnings.classList.remove("earning-animation");
      }, 1000);
    }
  }

  showTripComplete(tripData) {
    const tripSummary = document.createElement("div");
    tripSummary.className = "trip-summary";
    tripSummary.innerHTML = `
            <div class="trip-summary-content">
                <h3>Trip Complete!</h3>
                <div class="trip-details">
                    <div class="detail-row">
                        <span>Passenger:</span>
                        <span>${tripData.passengerName}</span>
                    </div>
                    <div class="detail-row">
                        <span>Distance:</span>
                        <span>${tripData.distance.toFixed(1)}km</span>
                    </div>
                    <div class="detail-row">
                        <span>Time:</span>
                        <span>${tripData.timeFormatted}</span>
                    </div>
                    <div class="detail-row">
                        <span>Base Fare:</span>
                        <span>$${tripData.baseFare.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span>Tip:</span>
                        <span>$${tripData.tip.toFixed(2)}</span>
                    </div>
                    <div class="detail-row total">
                        <span>Total Earned:</span>
                        <span>$${tripData.totalEarned.toFixed(2)}</span>
                    </div>
                    <div class="rating">
                        <span>Passenger Rating:</span>
                        <div class="stars">${this.generateStars(
                          tripData.rating
                        )}</div>
                    </div>
                </div>
                <button class="trip-summary-close">Continue</button>
            </div>
        `;

    document.body.appendChild(tripSummary);

    // Close button handler
    tripSummary
      .querySelector(".trip-summary-close")
      .addEventListener("click", () => {
        document.body.removeChild(tripSummary);
      });

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (tripSummary.parentNode) {
        tripSummary.parentNode.removeChild(tripSummary);
      }
    }, 10000);
  }

  generateStars(rating) {
    const maxStars = 5;
    let starsHTML = "";

    for (let i = 1; i <= maxStars; i++) {
      if (i <= rating) {
        starsHTML += '<span class="star filled">★</span>';
      } else {
        starsHTML += '<span class="star">☆</span>';
      }
    }

    return starsHTML;
  }

  showLevelUp(newLevel, rewards) {
    const levelUpModal = document.createElement("div");
    levelUpModal.className = "level-up-modal";
    levelUpModal.innerHTML = `
            <div class="level-up-content">
                <h2>Level Up!</h2>
                <div class="new-level">Level ${newLevel}</div>
                <div class="rewards">
                    <h3>Rewards:</h3>
                    <ul>
                        ${rewards
                          .map((reward) => `<li>${reward}</li>`)
                          .join("")}
                    </ul>
                </div>
                <button class="level-up-close">Awesome!</button>
            </div>
        `;

    document.body.appendChild(levelUpModal);

    levelUpModal
      .querySelector(".level-up-close")
      .addEventListener("click", () => {
        document.body.removeChild(levelUpModal);
      });
  }

  updateTime(timeString) {
    // Update time display if it exists
    const timeElement = document.getElementById("game-time");
    if (timeElement) {
      timeElement.textContent = timeString;
    }
  }

  updateWeather(weatherInfo) {
    // Update weather display if it exists
    const weatherElement = document.getElementById("weather-info");
    if (weatherElement) {
      weatherElement.innerHTML = `
                <span class="weather-type">${weatherInfo.type}</span>
                <span class="weather-intensity">${weatherInfo.intensity}</span>
            `;
    }
  }

  startUpdateLoop() {
    // Start the dashboard update loop
    const updateLoop = () => {
      this.updateAnimations();
      requestAnimationFrame(updateLoop);
    };
    updateLoop();
  }

  updateAnimations() {
    // Handle any ongoing animations
    const now = Date.now();

    // Pulse low fuel warning
    const fuelElement = this.elements.fuel;
    if (fuelElement && fuelElement.classList.contains("pulsing")) {
      const pulseIntensity = (Math.sin(now * 0.01) + 1) * 0.5;
      fuelElement.style.opacity = 0.5 + pulseIntensity * 0.5;
    }

    // Animate earnings counter
    if (
      this.elements.earnings &&
      this.elements.earnings.classList.contains("earning-animation")
    ) {
      const scale = 1 + Math.sin(now * 0.02) * 0.1;
      this.elements.earnings.style.transform = `scale(${scale})`;
    }
  }

  reset() {
    // Reset dashboard to initial state
    this.animatedValues = {
      fuel: 100,
      earnings: 0,
      reputation: 100,
    };

    if (this.elements.fuel) {
      this.elements.fuel.style.width = "100%";
      this.elements.fuel.classList.remove("pulsing");
    }

    if (this.elements.reputation) {
      this.elements.reputation.textContent = "100";
      this.elements.reputation.style.color = "#44ff44";
    }

    if (this.elements.earnings) {
      this.elements.earnings.textContent = "0.00";
    }

    if (this.elements.missionsContainer) {
      this.elements.missionsContainer.innerHTML =
        '<div class="no-missions">No active missions</div>';
    }
  }

  hide() {
    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
      dashboard.style.display = "none";
    }
  }

  show() {
    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
      dashboard.style.display = "block";
    }
  }

  toggleVisibility() {
    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
      dashboard.style.display =
        dashboard.style.display === "none" ? "block" : "none";
    }
  }
}
