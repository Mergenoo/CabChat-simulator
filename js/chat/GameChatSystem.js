class GameChatSystem {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.currentNPC = null;
    this.audioContext = null;
    this.currentVolume = 0.8;
    this.isChatOpen = false;
    this.nearbyNPCs = [];

    // Add these new properties for message queuing
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.currentAudio = null;
    this.audioQueue = [];
    this.isPlayingAudio = false;

    this.initializeEventListeners();
    this.initializeAudioContext();
    this.setWelcomeTime();
  }

  initializeEventListeners() {
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    const sendBtn = document.getElementById("sendBtn");
    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    const volumeSlider = document.getElementById("volumeSlider");
    if (volumeSlider) {
      volumeSlider.addEventListener("input", (e) => {
        this.currentVolume = parseFloat(e.target.value);
        const volumeValue = document.getElementById("volumeValue");
        if (volumeValue) {
          volumeValue.textContent = Math.round(this.currentVolume * 100) + "%";
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (this.nearbyNPCs.length > 0) {
          this.startConversationWithNearestNPC();
        } else {
          this.toggleChat();
        }
      }
      if (e.key === "Escape" && this.isChatOpen) {
        this.closeChat();
      }
    });

    const chatToggleBtn = document.getElementById("chat-toggle-btn");
    if (chatToggleBtn) {
      chatToggleBtn.addEventListener("click", () => this.toggleChat());
    }

    const chatMobileBtn = document.getElementById("chat-mobile-btn");
    if (chatMobileBtn) {
      chatMobileBtn.addEventListener("click", () => this.toggleChat());
    }
  }

  setWelcomeTime() {
    const welcomeTimeElement = document.getElementById("welcomeTime");
    if (welcomeTimeElement) {
      welcomeTimeElement.textContent = new Date().toLocaleTimeString();
    }
  }

  initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (error) {
      console.warn("Audio context not available:", error);
    }
  }

  connectToServer() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket("ws://localhost:3000");

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.updateStatus("Connected. Waiting for NPC...", true);
        resolve();
      };

      this.ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          console.error("❌ Invalid message format", err);
          return;
        }
        console.log("🔔 Received from server:", data);
        this.handleServerMessage(data);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateStatus("❌ Disconnected from server", false);
        console.warn("WebSocket closed");
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        this.updateStatus("WebSocket error", false);
        reject(error);
      };

      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          console.error("❌ Connection timed out");
          this.updateStatus("Connection timeout", false);
          reject(new Error("WebSocket connection timeout"));
        }
      }, 5000);
    });
  }

  handleServerMessage(data) {
    console.log("🔔 Processing server message:", data);

    switch (data.type) {
      case "status":
        console.log("📊 Server status:", data.message);

        if (data.message.includes("ready to chat")) {
          this.isConnected = true;

          const nameMatch = data.message.match(/(\w+) is ready to chat/);
          const npcName = nameMatch ? nameMatch[1] : "NPC";

          this.updateStatus(`Connected to ${npcName}`, true);
          this.updateNPCInfo(npcName, this.currentNPC?.type || "passenger");
          this.enableChatInput();

          console.log("✅ Chat enabled - you can now send messages!");
        } else {
          this.updateStatus(data.message, this.isConnected);
        }
        break;

      case "transcript":
        console.log("📝 Transcript received:", data);

        if (data.text && data.text.trim()) {
          const isUserMessage = data.isUser === true || data.isUser === "true";
          const speakerName = isUserMessage
            ? "You"
            : this.currentNPC?.name || "Stacy";

          // Don't add duplicate messages
          const lastMessage = document.querySelector(
            "#chatMessages .message:last-child .message-content"
          );
          if (
            lastMessage &&
            lastMessage.textContent.trim() === data.text.trim()
          ) {
            console.log("🚫 Skipping duplicate message");
            return;
          }

          this.addMessage(data.text, isUserMessage, speakerName);
        }
        break;

      case "audio":
        // Handle standalone audio
        console.log("🔊 Standalone audio data received");
        if (data.audio) {
          this.playAudioQueued(data.audio);
        }
        break;

      case "error":
        console.error("❌ Server error:", data.message);
        this.updateStatus("Server error: " + data.message, false);
        break;

      default:
        console.warn("❓ Unknown message type:", data.type, data);
    }
  }

  // Helper method to clean message text
  cleanMessageText(text) {
    return text
      .replace(/<\|eot_id\|>/g, "")
      .replace(/<\|start_header_id\|>/g, "")
      .replace(/<\|end_header_id\|>/g, "")
      .replace(/user<\|end_header_id\|>/g, "")
      .replace(/assistant<\|end_header_id\|>/g, "")
      .replace(/user$/g, "")
      .replace(/assistant$/g, "")
      .trim();
  }

  async startConversationWithNPC(npcType, npcName) {
    try {
      this.currentNPC = { type: npcType, name: npcName };
      this.openChat();
      this.updateStatus("Connecting...", false);
      this.updateNPCInfo(npcName, npcType);
      await this.connectToServer();

      this.ws.send(
        JSON.stringify({
          type: "start",
          npcType: npcType,
          userName: "Player",
        })
      );
    } catch (error) {
      console.error("🚨 Failed to start conversation:", error);
      this.updateStatus("❌ Could not connect to server", false);
    }
  }

  startConversationWithNearestNPC() {
    if (this.nearbyNPCs.length > 0) {
      const nearest = this.nearbyNPCs[0];
      this.startConversationWithNPC(nearest.type, nearest.name);
    }
  }

  sendMessage() {
    console.log("📤 sendMessage called");

    const input = document.getElementById("chatInput");
    if (!input) {
      console.error("❌ Chat input not found");
      return;
    }

    const message = input.value.trim();
    console.log("📝 Message to send:", message);

    if (!message) {
      console.log("⚠️ Empty message");
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("📡 Sending message via WebSocket");
      const messageData = { type: "user_message", text: message };

      try {
        this.ws.send(JSON.stringify(messageData));
        console.log("✅ Message sent successfully");

        // DON'T add the message here - let the server send it back via transcript
        // this.addMessage(message, true, "You"); // REMOVE THIS LINE
      } catch (error) {
        console.error("❌ Failed to send message:", error);
        // Only add message locally if sending failed
        this.addMessage(message, true, "You");
      }
    } else {
      console.log("❌ WebSocket not open");
      // Add message locally if no connection
      this.addMessage(message, true, "You");
    }

    // Clear input
    input.value = "";
  }
  // Add message to queue instead of displaying immediately
  queueMessage(text, isUser, npcName, audioData = null) {
    const message = {
      text: text,
      isUser: isUser,
      npcName: npcName,
      audioData: audioData,
      timestamp: Date.now(),
    };

    this.messageQueue.push(message);
    console.log("📥 Message queued:", message.text.substring(0, 50) + "...");

    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
  }

  // Process messages one by one with delays
  async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(
      "🔄 Processing message queue, length:",
      this.messageQueue.length
    );

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();

      // Add message to chat
      this.addMessage(message.text, message.isUser, message.npcName);

      // Play audio if available
      if (message.audioData && !message.isUser) {
        await this.playAudioQueued(message.audioData);
      }

      // Wait between messages (adjust timing as needed)
      if (this.messageQueue.length > 0) {
        await this.delay(message.isUser ? 500 : 1500); // Shorter delay for user messages
      }
    }

    this.isProcessingQueue = false;
    console.log("✅ Message queue processing complete");
  }

  // Helper function for delays
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Queue-aware audio playback
  async playAudioQueued(audioData) {
    return new Promise(async (resolve) => {
      try {
        if (!audioData) {
          resolve();
          return;
        }

        // Stop current audio if playing
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }

        console.log("🔊 Playing queued audio");

        const audio = new Audio(`data:audio/wav;base64,${audioData}`);
        audio.volume = this.currentVolume;
        this.currentAudio = audio;

        audio.onended = () => {
          console.log("🔊 Audio finished");
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (e) => {
          console.error("❌ Audio error:", e);
          this.currentAudio = null;
          resolve();
        };

        await audio.play();
      } catch (err) {
        console.error("❌ Audio playback failed:", err);
        resolve();
      }
    });
  }

  addMessage(text, isUser, npcName) {
    const container = document.getElementById("chatMessages");
    if (!container) {
      console.error("❌ Chat messages container not found");
      return;
    }

    // Clean the text - remove AI training tokens
    const cleanText = text
      .replace(/<\|eot_id\|>/g, "")
      .replace(/<\|start_header_id\|>/g, "")
      .replace(/<\|end_header_id\|>/g, "")
      .replace(/user<\|end_header_id\|>/g, "")
      .replace(/assistant<\|end_header_id\|>/g, "")
      .trim();

    // Don't add empty messages
    if (!cleanText) {
      console.log("⚠️ Skipping empty message after cleaning");
      return;
    }

    // Determine sender name
    let senderName;
    if (isUser) {
      senderName = "You";
    } else {
      senderName = npcName || this.currentNPC?.name || "NPC";
    }

    console.log(`💬 Adding message: ${senderName}: ${cleanText}`);

    const div = document.createElement("div");
    div.className = `message ${isUser ? "user" : "npc"}`;

    div.innerHTML = `
      <div class="message-sender">${senderName}</div>
      <div class="message-content">${cleanText}</div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  async playAudio(audioData) {
    try {
      if (!audioData) {
        console.warn("⚠️ No audio data provided");
        return;
      }

      console.log(
        "🔊 Attempting to play audio, data length:",
        audioData.length
      );

      // Create audio element
      const audio = new Audio();

      // Set up event listeners for debugging
      audio.addEventListener("loadstart", () =>
        console.log("🔊 Audio loading started")
      );
      audio.addEventListener("canplay", () => console.log("🔊 Audio can play"));
      audio.addEventListener("play", () =>
        console.log("🔊 Audio started playing")
      );
      audio.addEventListener("ended", () => console.log("🔊 Audio finished"));
      audio.addEventListener("error", (e) => {
        console.error("❌ Audio error:", e);
        console.error("❌ Audio error details:", audio.error);
      });

      // Set audio source and volume
      audio.src = `data:audio/wav;base64,${audioData}`;
      audio.volume = this.currentVolume;

      console.log("🔊 Audio volume set to:", this.currentVolume);
      console.log("🔊 Audio src set, attempting to play...");

      // Try to play
      await audio.play();
      console.log("✅ Audio play() called successfully");
    } catch (err) {
      console.error("❌ Audio playback failed:", err);

      // Check if it's an autoplay policy issue
      if (err.name === "NotAllowedError") {
        console.log("🔊 Autoplay blocked - user interaction required");
        this.updateStatus("Click anywhere to enable audio", false);

        // Try to enable audio on next user interaction
        document.addEventListener(
          "click",
          async () => {
            try {
              const audio = new Audio(`data:audio/wav;base64,${audioData}`);
              audio.volume = this.currentVolume;
              await audio.play();
              console.log("🔊 Audio played after user interaction");
            } catch (retryErr) {
              console.error(
                "❌ Audio still failed after user interaction:",
                retryErr
              );
            }
          },
          { once: true }
        );
      }
    }
  }

  updateStatus(message, isConnected) {
    const el = document.getElementById("chatStatus");
    if (!el) return;
    el.textContent = message;
    el.className = `chat-status ${
      isConnected ? "status-connected" : "status-disconnected"
    }`;
  }

  updateNPCInfo(name, type) {
    const npcNameEl = document.getElementById("npcName");
    const npcRoleEl = document.getElementById("npcRole");

    if (npcNameEl) npcNameEl.textContent = name;
    if (npcRoleEl) npcRoleEl.textContent = this.getNPCRoleDescription(type);
  }

  getNPCRoleDescription(type) {
    const roles = {
      taxi_driver: "Experienced Taxi Driver",
      passenger: "Business Passenger",
      pedestrian: "City Pedestrian",
      mechanic: "Auto Mechanic",
      dispatcher: "Taxi Dispatcher",
    };
    return roles[type] || "City Resident";
  }

  updateNearbyNPCs(npcs) {
    this.nearbyNPCs = npcs;
    const hint = document.getElementById("npcHint");
    if (!hint) return;

    if (npcs.length && !this.isChatOpen) {
      hint.style.display = "block";
      const text = hint.querySelector(".hint-text");
      if (text) {
        text.textContent = `Press TAB to chat with ${npcs[0].name}`;
      }
    } else {
      hint.style.display = "none";
    }
  }

  toggleChat() {
    if (this.isChatOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    const panel = document.getElementById("chatPanel");
    const btn = document.getElementById("chatToggleFloating");

    if (panel) panel.classList.add("open");
    if (btn) btn.classList.add("active");

    this.isChatOpen = true;
    const hint = document.getElementById("npcHint");
    if (hint) hint.style.display = "none";

    if (this.isConnected) {
      setTimeout(() => {
        const input = document.getElementById("chatInput");
        if (input) input.focus();
      }, 300);
    }

    if (window.game?.disableControls) window.game.disableControls();
  }

  closeChat() {
    const panel = document.getElementById("chatPanel");
    const btn = document.getElementById("chatToggleFloating");

    if (panel) panel.classList.remove("open");
    if (btn) btn.classList.remove("active");

    this.isChatOpen = false;

    const hint = document.getElementById("npcHint");
    if (hint && this.nearbyNPCs.length > 0) {
      hint.style.display = "block";
    }

    if (window.game?.enableControls) window.game.enableControls();
  }

  enableChatInput() {
    const input = document.getElementById("chatInput");
    const send = document.getElementById("sendBtn");

    if (input) input.disabled = false;
    if (send) send.disabled = false;
    input?.focus();
  }

  disableChatInput() {
    const input = document.getElementById("chatInput");
    const send = document.getElementById("sendBtn");

    if (input) input.disabled = true;
    if (send) send.disabled = true;
  }

  stopConversation() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "stop" }));
    }

    this.isConnected = false;
    this.currentNPC = null;
    this.updateStatus("Click on an NPC to start chatting", false);
    this.updateNPCInfo("Select an NPC", "Click on NPCs in the game");
    this.disableChatInput();
  }

  onNearNPC(npcData) {
    this.updateNearbyNPCs([npcData]);
  }

  onLeaveNPC() {
    this.updateNearbyNPCs([]);
  }

  onNPCClicked(npcType, npcName) {
    this.startConversationWithNPC(npcType, npcName);
  }

  enableMobileMode() {
    console.log("Chat mobile mode enabled");
  }

  pause() {
    console.log("Chat system paused");
  }

  resume() {
    console.log("Chat system resumed");
  }

  update() {}
}

// Expose to global
window.GameChatSystem = GameChatSystem;
