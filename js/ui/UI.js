class GameUI {
  constructor() {
    this.isGPSVisible = false;
    this.isRadioVisible = false;
    this.isMinimapVisible = true;
    this.isPaused = false;

    // Message system
    this.messageQueue = [];
    this.currentMessage = null;
    this.messageTimeout = null;

    // Mobile detection
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // UI state
    this.uiElements = {
      gpsPanel: document.getElementById("gps-panel"),
      radioPanel: document.getElementById("radio-panel"),
      minimap: document.getElementById("minimap"),
      controls: document.getElementById("controls"),
      mobileControls: document.getElementById("mobile-controls"),
    };
  }

  init() {
    this.setupMessageSystem();
    this.setupMobileUI();
    this.setupKeyboardShortcuts();
    this.setupNotificationSystem();

    // Show initial help message
    setTimeout(() => {
      this.showMessage(
        "Welcome to Taxi Driver! Use WASD to drive, SPACE to interact with passengers."
      );
    }, 2000);
  }

  setupMessageSystem() {
    // Create message container if it doesn't exist
    if (!document.getElementById("message-container")) {
      const messageContainer = document.createElement("div");
      messageContainer.id = "message-container";
      messageContainer.className = "message-container";
      document.body.appendChild(messageContainer);
    }
  }

  setupMobileUI() {
    if (this.isMobile) {
      // Show mobile controls
      if (this.uiElements.mobileControls) {
        this.uiElements.mobileControls.style.display = "block";
      }

      // Hide desktop-only controls
      if (this.uiElements.controls) {
        this.uiElements.controls.style.display = "none";
      }

      // Adjust UI for mobile
      this.adjustUIForMobile();
    }
  }

  adjustUIForMobile() {
    // Make UI elements larger for touch
    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
      dashboard.classList.add("mobile-dashboard");
    }

    // Adjust minimap size
    const minimap = document.getElementById("minimap");
    if (minimap) {
      minimap.style.width = "120px";
      minimap.style.height = "120px";
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "KeyG":
          this.toggleGPS();
          break;
        case "KeyR":
          this.toggleRadio();
          break;
        case "KeyM":
          this.toggleMinimap();
          break;
        case "KeyH":
          this.showHelp();
          break;
        case "Escape":
          this.togglePauseMenu();
          break;
      }
    });
  }

  setupNotificationSystem() {
    // Request notification permission for important alerts
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  showMessage(text, duration = 3000, type = "info") {
    const message = {
      text: text,
      duration: duration,
      type: type,
      id: Date.now(),
    };

    this.messageQueue.push(message);

    if (!this.currentMessage) {
      this.displayNextMessage();
    }
  }

  displayNextMessage() {
    if (this.messageQueue.length === 0) {
      this.currentMessage = null;
      return;
    }

    const message = this.messageQueue.shift();
    this.currentMessage = message;

    const messageContainer = document.getElementById("message-container");
    const messageElement = document.createElement("div");
    messageElement.className = `game-message ${message.type}`;
    messageElement.textContent = message.text;
    messageElement.id = `message-${message.id}`;

    messageContainer.appendChild(messageElement);

    // Animate in
    setTimeout(() => {
      messageElement.classList.add("show");
    }, 10);

    // Auto-remove after duration
    this.messageTimeout = setTimeout(() => {
      this.hideMessage(message.id);
    }, message.duration);
  }

  hideMessage(messageId) {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.classList.remove("show");
      messageElement.classList.add("hide");

      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }

        // Display next message
        this.displayNextMessage();
      }, 300);
    }
  }

  showPickupMessage(passenger) {
    this.showMessage(
      `Picked up ${
        passenger.name
      }. Take them to ${passenger.getDestinationDescription()}.`,
      4000,
      "success"
    );
  }

  showDropoffMessage(fare) {
    this.showMessage(
      `Passenger dropped off! Earned $${fare.toFixed(2)}`,
      3000,
      "success"
    );
  }

  toggleGPS() {
    this.isGPSVisible = !this.isGPSVisible;

    if (this.uiElements.gpsPanel) {
      this.uiElements.gpsPanel.classList.toggle("hidden", !this.isGPSVisible);
    }

    this.showMessage(this.isGPSVisible ? "GPS enabled" : "GPS disabled", 1000);
  }

  toggleRadio() {
    this.isRadioVisible = !this.isRadioVisible;

    if (this.uiElements.radioPanel) {
      this.uiElements.radioPanel.classList.toggle(
        "hidden",
        !this.isRadioVisible
      );
    }

    this.showMessage(
      this.isRadioVisible ? "Radio opened" : "Radio closed",
      1000
    );
  }

  toggleMinimap() {
    this.isMinimapVisible = !this.isMinimapVisible;

    if (this.uiElements.minimap) {
      this.uiElements.minimap.style.display = this.isMinimapVisible
        ? "block"
        : "none";
    }

    this.showMessage(
      this.isMinimapVisible ? "Minimap shown" : "Minimap hidden",
      1000
    );
  }

  showHelp() {
    const helpModal = document.createElement("div");
    helpModal.className = "help-modal";
    helpModal.innerHTML = `
            <div class="help-content">
                <h2>Game Controls</h2>
                <div class="help-sections">
                    <div class="help-section">
                        <h3>Driving</h3>
                        <ul>
                            <li><strong>W/↑</strong> - Accelerate</li>
                            <li><strong>S/↓</strong> - Reverse/Brake</li>
                            <li><strong>A/←</strong> - Turn Left</li>
                            <li><strong>D/→</strong> - Turn Right</li>
                            <li><strong>Space</strong> - Handbrake</li>
                            <li><strong>H</strong> - Horn</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>Game Actions</h3>
                        <ul>
                            <li><strong>Space</strong> - Pick up/Drop off passengers</li>
                            <li><strong>G</strong> - Toggle GPS</li>
                            <li><strong>R</strong> - Toggle Radio</li>
                            <li><strong>M</strong> - Toggle Minimap</li>
                            <li><strong>P</strong> - Pause Game</li>
                            <li><strong>Esc</strong> - Pause Menu</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>Camera</h3>
                        <ul>
                            <li><strong>C</strong> - Change Camera View</li>
                            <li><strong>Mouse</strong> - Look Around (First Person)</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h3>Tips</h3>
                        <ul>
                            <li>Green dots on minimap are waiting passengers</li>
                            <li>Red dot shows your destination</li>
                            <li>Passenger mood affects tips</li>
                            <li>Avoid accidents to maintain reputation</li>
                            <li>Watch your fuel level</li>
                        </ul>
                    </div>
                </div>
                <button class="help-close">Close</button>
            </div>
        `;

    document.body.appendChild(helpModal);

    helpModal.querySelector(".help-close").addEventListener("click", () => {
      document.body.removeChild(helpModal);
    });

    // Close on escape
    const closeOnEscape = (e) => {
      if (e.code === "Escape") {
        document.body.removeChild(helpModal);
        document.removeEventListener("keydown", closeOnEscape);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
  }

  togglePauseMenu() {
    this.isPaused = !this.isPaused;
    this.showPauseMenu(this.isPaused);
  }

  showPauseMenu(show) {
    if (show) {
      const pauseMenu = document.createElement("div");
      pauseMenu.id = "pause-menu";
      pauseMenu.className = "pause-menu";
      pauseMenu.innerHTML = `
                <div class="pause-content">
                    <h2>Game Paused</h2>
                    <div class="pause-buttons">
                        <button id="resume-btn">Resume</button>
                        <button id="settings-btn">Settings</button>
                        <button id="help-btn">Help</button>
                        <button id="restart-btn">Restart</button>
                        <button id="quit-btn">Quit to Menu</button>
                    </div>
                </div>
            `;

      document.body.appendChild(pauseMenu);

      // Button event listeners
      document.getElementById("resume-btn").addEventListener("click", () => {
        this.hidePauseMenu();
      });

      document.getElementById("settings-btn").addEventListener("click", () => {
        this.showSettings();
      });

      document.getElementById("help-btn").addEventListener("click", () => {
        this.showHelp();
      });

      document.getElementById("restart-btn").addEventListener("click", () => {
        this.confirmRestart();
      });

      document.getElementById("quit-btn").addEventListener("click", () => {
        this.confirmQuit();
      });
    } else {
      this.hidePauseMenu();
    }
  }

  hidePauseMenu() {
    const pauseMenu = document.getElementById("pause-menu");
    if (pauseMenu) {
      document.body.removeChild(pauseMenu);
    }
    this.isPaused = false;
  }

  showSettings() {
    const settingsModal = document.createElement("div");
    settingsModal.className = "settings-modal";
    settingsModal.innerHTML = `
            <div class="settings-content">
                <h2>Settings</h2>
                <div class="settings-sections">
                    <div class="setting-group">
                        <h3>Graphics</h3>
                        <div class="setting-item">
                            <label>Graphics Quality:</label>
                            <select id="graphics-quality">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div class="setting-item">
                            <label>Shadow Quality:</label>
                            <select id="shadow-quality">
                                <option value="off">Off</option>
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <h3>Audio</h3>
                        <div class="setting-item">
                            <label>Master Volume:</label>
                            <input type="range" id="master-volume" min="0" max="100" value="70">
                            <span id="master-volume-value">70%</span>
                        </div>
                        <div class="setting-item">
                            <label>Music Volume:</label>
                            <input type="range" id="music-volume" min="0" max="100" value="50">
                            <span id="music-volume-value">50%</span>
                        </div>
                        <div class="setting-item">
                            <label>SFX Volume:</label>
                            <input type="range" id="sfx-volume" min="0" max="100" value="80">
                            <span id="sfx-volume-value">80%</span>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <h3>Gameplay</h3>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="auto-gps" checked>
                                Auto-enable GPS for new passengers
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="damage-enabled" checked>
                                Vehicle damage enabled
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>Difficulty:</label>
                            <select id="difficulty">
                                <option value="easy">Easy</option>
                                <option value="normal" selected>Normal</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <h3>Controls</h3>
                        <div class="setting-item">
                            <label>Mouse Sensitivity:</label>
                            <input type="range" id="mouse-sensitivity" min="0.1" max="2.0" step="0.1" value="1.0">
                            <span id="mouse-sensitivity-value">1.0</span>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="invert-mouse">
                                Invert mouse Y-axis
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="settings-buttons">
                    <button id="settings-apply">Apply</button>
                    <button id="settings-reset">Reset to Default</button>
                    <button id="settings-close">Close</button>
                </div>
            </div>
        `;

    document.body.appendChild(settingsModal);

    // Setup range input updates
    this.setupRangeInputs(settingsModal);

    // Button handlers
    document.getElementById("settings-apply").addEventListener("click", () => {
      this.applySettings();
      this.showMessage("Settings applied", 2000, "success");
    });

    document.getElementById("settings-reset").addEventListener("click", () => {
      this.resetSettings();
    });

    document.getElementById("settings-close").addEventListener("click", () => {
      document.body.removeChild(settingsModal);
    });
  }

  setupRangeInputs(container) {
    const ranges = container.querySelectorAll('input[type="range"]');
    ranges.forEach((range) => {
      const valueSpan = container.querySelector(`#${range.id}-value`);
      if (valueSpan) {
        range.addEventListener("input", () => {
          const value = range.id.includes("volume")
            ? `${range.value}%`
            : range.value;
          valueSpan.textContent = value;
        });
      }
    });
  }

  applySettings() {
    // Apply graphics settings
    const graphicsQuality = document.getElementById("graphics-quality").value;
    const shadowQuality = document.getElementById("shadow-quality").value;

    // Apply audio settings
    const masterVolume = document.getElementById("master-volume").value / 100;
    const musicVolume = document.getElementById("music-volume").value / 100;
    const sfxVolume = document.getElementById("sfx-volume").value / 100;

    // Apply gameplay settings
    const autoGPS = document.getElementById("auto-gps").checked;
    const damageEnabled = document.getElementById("damage-enabled").checked;
    const difficulty = document.getElementById("difficulty").value;

    // Apply control settings
    const mouseSensitivity = parseFloat(
      document.getElementById("mouse-sensitivity").value
    );
    const invertMouse = document.getElementById("invert-mouse").checked;

    // Store settings in localStorage
    const settings = {
      graphics: { quality: graphicsQuality, shadows: shadowQuality },
      audio: { master: masterVolume, music: musicVolume, sfx: sfxVolume },
      gameplay: { autoGPS, damageEnabled, difficulty },
      controls: { mouseSensitivity, invertMouse },
    };

    localStorage.setItem("taxiGameSettings", JSON.stringify(settings));

    // Apply settings to game (would need game reference)
    this.onSettingsChanged?.(settings);
  }

  resetSettings() {
    // Reset all settings to default values
    document.getElementById("graphics-quality").value = "medium";
    document.getElementById("shadow-quality").value = "medium";
    document.getElementById("master-volume").value = "70";
    document.getElementById("music-volume").value = "50";
    document.getElementById("sfx-volume").value = "80";
    document.getElementById("auto-gps").checked = true;
    document.getElementById("damage-enabled").checked = true;
    document.getElementById("difficulty").value = "normal";
    document.getElementById("mouse-sensitivity").value = "1.0";
    document.getElementById("invert-mouse").checked = false;

    // Update value displays
    document.getElementById("master-volume-value").textContent = "70%";
    document.getElementById("music-volume-value").textContent = "50%";
    document.getElementById("sfx-volume-value").textContent = "80%";
    document.getElementById("mouse-sensitivity-value").textContent = "1.0";
  }

  confirmRestart() {
    const confirmModal = document.createElement("div");
    confirmModal.className = "confirm-modal";
    confirmModal.innerHTML = `
            <div class="confirm-content">
                <h3>Restart Game?</h3>
                <p>Are you sure you want to restart? All progress will be lost.</p>
                <div class="confirm-buttons">
                    <button id="confirm-restart">Yes, Restart</button>
                    <button id="cancel-restart">Cancel</button>
                </div>
            </div>
        `;

    document.body.appendChild(confirmModal);

    document.getElementById("confirm-restart").addEventListener("click", () => {
      document.body.removeChild(confirmModal);
      this.hidePauseMenu();
      this.onGameRestart?.();
    });

    document.getElementById("cancel-restart").addEventListener("click", () => {
      document.body.removeChild(confirmModal);
    });
  }

  confirmQuit() {
    const confirmModal = document.createElement("div");
    confirmModal.className = "confirm-modal";
    confirmModal.innerHTML = `
            <div class="confirm-content">
                <h3>Quit to Menu?</h3>
                <p>Are you sure you want to quit? Progress will be saved.</p>
                <div class="confirm-buttons">
                    <button id="confirm-quit">Yes, Quit</button>
                    <button id="cancel-quit">Cancel</button>
                </div>
            </div>
        `;

    document.body.appendChild(confirmModal);

    document.getElementById("confirm-quit").addEventListener("click", () => {
      document.body.removeChild(confirmModal);
      this.hidePauseMenu();
      this.onGameQuit?.();
    });

    document.getElementById("cancel-quit").addEventListener("click", () => {
      document.body.removeChild(confirmModal);
    });
  }

  showNotification(title, message, type = "info") {
    // Browser notification for important events
    // Browser notification for important events
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico", // Add your game icon
        tag: "taxi-game",
      });
    }

    // Also show in-game message
    this.showMessage(`${title}: ${message}`, 4000, type);
  }

  showLoadingScreen(show, message = "Loading...") {
    if (show) {
      const loadingScreen = document.createElement("div");
      loadingScreen.id = "loading-screen";
      loadingScreen.className = "loading-screen";
      loadingScreen.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="loading-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="loading-progress-text">0%</div>
                    </div>
                </div>
            `;

      document.body.appendChild(loadingScreen);
    } else {
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) {
        loadingScreen.classList.add("fade-out");
        setTimeout(() => {
          if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
          }
        }, 500);
      }
    }
  }

  updateLoadingProgress(progress, message) {
    const progressFill = document.getElementById("loading-progress-fill");
    const progressText = document.getElementById("loading-progress-text");
    const loadingMessage = document.querySelector(".loading-message");

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }

    if (message && loadingMessage) {
      loadingMessage.textContent = message;
    }
  }

  showGameOver(stats) {
    const gameOverModal = document.createElement("div");
    gameOverModal.className = "game-over-modal";
    gameOverModal.innerHTML = `
            <div class="game-over-content">
                <h2>Game Over</h2>
                <div class="final-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Earnings:</span>
                        <span class="stat-value">$${stats.earnings.toFixed(
                          2
                        )}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Trips Completed:</span>
                        <span class="stat-value">${stats.tripsCompleted}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Final Reputation:</span>
                        <span class="stat-value">${stats.reputation}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Time Played:</span>
                        <span class="stat-value">${this.formatTime(
                          stats.timePlayed
                        )}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Best Trip:</span>
                        <span class="stat-value">$${stats.bestTrip.toFixed(
                          2
                        )}</span>
                    </div>
                </div>
                
                <div class="achievements">
                    <h3>Achievements Unlocked</h3>
                    <div class="achievement-list" id="achievement-list">
                        ${this.generateAchievements(stats)}
                    </div>
                </div>
                
                <div class="game-over-buttons">
                    <button id="play-again-btn">Play Again</button>
                    <button id="main-menu-btn">Main Menu</button>
                    <button id="share-score-btn">Share Score</button>
                </div>
            </div>
        `;

    document.body.appendChild(gameOverModal);

    // Button handlers
    document.getElementById("play-again-btn").addEventListener("click", () => {
      document.body.removeChild(gameOverModal);
      this.onGameRestart?.();
    });

    document.getElementById("main-menu-btn").addEventListener("click", () => {
      document.body.removeChild(gameOverModal);
      this.onGameQuit?.();
    });

    document.getElementById("share-score-btn").addEventListener("click", () => {
      this.shareScore(stats);
    });
  }

  generateAchievements(stats) {
    const achievements = [];

    if (stats.earnings >= 100) achievements.push("First $100 earned");
    if (stats.earnings >= 500) achievements.push("Big Earner - $500+");
    if (stats.tripsCompleted >= 10) achievements.push("Experienced Driver");
    if (stats.tripsCompleted >= 50) achievements.push("Veteran Cabbie");
    if (stats.reputation >= 90) achievements.push("5-Star Driver");
    if (stats.bestTrip >= 50) achievements.push("Big Tipper");
    if (stats.timePlayed >= 3600) achievements.push("Marathon Driver");

    if (achievements.length === 0) {
      return '<div class="no-achievements">No achievements unlocked this session</div>';
    }

    return achievements
      .map(
        (achievement) => `<div class="achievement-item">🏆 ${achievement}</div>`
      )
      .join("");
  }

  shareScore(stats) {
    const shareText = `I just earned $${stats.earnings.toFixed(
      2
    )} as a taxi driver! 🚕 Completed ${stats.tripsCompleted} trips with ${
      stats.reputation
    } reputation. Can you beat my score?`;

    if (navigator.share) {
      navigator.share({
        title: "Taxi Driver Game Score",
        text: shareText,
        url: window.location.href,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        this.showMessage("Score copied to clipboard!", 2000, "success");
      });
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  showConnectionStatus(connected) {
    const statusElement =
      document.getElementById("connection-status") ||
      this.createConnectionStatus();

    statusElement.className = `connection-status ${
      connected ? "connected" : "disconnected"
    }`;
    statusElement.textContent = connected ? "Online" : "Offline";

    if (!connected) {
      this.showMessage(
        "Connection lost. Game will continue offline.",
        3000,
        "warning"
      );
    }
  }

  createConnectionStatus() {
    const statusElement = document.createElement("div");
    statusElement.id = "connection-status";
    statusElement.className = "connection-status";
    document.body.appendChild(statusElement);
    return statusElement;
  }

  showPerformanceWarning() {
    this.showMessage(
      "Performance warning: Consider lowering graphics settings",
      5000,
      "warning"
    );
  }

  updateFPS(fps) {
    const fpsElement =
      document.getElementById("fps-counter") || this.createFPSCounter();
    fpsElement.textContent = `${Math.round(fps)} FPS`;

    // Color code based on performance
    if (fps >= 50) {
      fpsElement.className = "fps-counter good";
    } else if (fps >= 30) {
      fpsElement.className = "fps-counter okay";
    } else {
      fpsElement.className = "fps-counter poor";
    }
  }

  createFPSCounter() {
    const fpsElement = document.createElement("div");
    fpsElement.id = "fps-counter";
    fpsElement.className = "fps-counter";
    fpsElement.style.position = "absolute";
    fpsElement.style.top = "10px";
    fpsElement.style.right = "10px";
    fpsElement.style.background = "rgba(0,0,0,0.7)";
    fpsElement.style.color = "white";
    fpsElement.style.padding = "5px";
    fpsElement.style.borderRadius = "3px";
    fpsElement.style.fontSize = "12px";
    fpsElement.style.fontFamily = "monospace";
    document.body.appendChild(fpsElement);
    return fpsElement;
  }

  // Event handlers (to be set by game)
  onSettingsChanged = null;
  onGameRestart = null;
  onGameQuit = null;

  // Cleanup
  destroy() {
    // Clear any active timeouts
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    // Remove event listeners
    document.removeEventListener("keydown", this.keydownHandler);

    // Clear message queue
    this.messageQueue = [];
    this.currentMessage = null;

    // Remove UI elements
    const elementsToRemove = [
      "message-container",
      "loading-screen",
      "pause-menu",
      "connection-status",
      "fps-counter",
    ];

    elementsToRemove.forEach((id) => {
      const element = document.getElementById(id);
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }
}
