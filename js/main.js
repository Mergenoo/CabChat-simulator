// Main game initialization
let game;
let gameChatSystem;

document.addEventListener("DOMContentLoaded", () => {
  try {
    // Initialize the chat system first

    gameChatSystem = new GameChatSystem();
    window.gameChatSystem = gameChatSystem; // expose globally

    // Initialize the game

    game = new TaxiGame();
    window.game = game; // expose globally

    // Handle window resize
    window.addEventListener("resize", () => {
      game.handleResize();
      if (gameChatSystem && gameChatSystem.handleResize) {
        gameChatSystem.handleResize();
      }
    });

    // Handle visibility change (pause when tab is not active)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        game.pause();
        if (gameChatSystem && gameChatSystem.pause) {
          gameChatSystem.pause();
        }
      } else {
        game.resume();
        if (gameChatSystem && gameChatSystem.resume) {
          gameChatSystem.resume();
        }
      }
    });

    // Mobile device detection
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (isMobile) {
      document.body.classList.add("mobile");
      game.enableMobileControls();
      if (gameChatSystem && gameChatSystem.enableMobileMode) {
        gameChatSystem.enableMobileMode();
      }
    }

    // Start the game

    game.start();

    // Hook passenger pickup to automatically start chat
    if (game.pickUpPassenger) {
      const originalPickUpPassenger = game.pickUpPassenger.bind(game);
      game.pickUpPassenger = function () {
        // Call original pickup method
        originalPickUpPassenger();

        // Start chat with picked up passenger
        setTimeout(() => {
          if (game.gameState.currentPassenger && gameChatSystem) {
            const passenger = game.gameState.currentPassenger;
            console.log(
              `Auto-starting chat with picked up passenger: ${passenger.name}`
            );
            gameChatSystem.startConversationWithNPC(
              "passenger",
              passenger.name
            );
          }
        }, 1500); // 1.5 second delay for pickup animation
      };
    }

    // Add helpful console commands for testing
    window.testChat = function (
      npcType = "passenger",
      npcName = "Test Passenger"
    ) {
      if (gameChatSystem) {
        gameChatSystem.startConversationWithNPC(npcType, npcName);
      } else {
        console.error("Chat system not available");
      }
    };

    window.openChatWindow = function () {
      if (gameChatSystem) {
        gameChatSystem.openChat();
      } else {
        console.error("Chat system not available");
      }
    };
  } catch (error) {
    console.error("Failed to initialize game or chat system:", error);

    // Show error message to user
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        z-index: 10000;
        max-width: 400px;
        text-align: center;
      `;
    errorDiv.innerHTML = `
        <h3>Initialization Error</h3>
        <p>Failed to start the taxi game or chat system.</p>
        <p>Please refresh the page and try again.</p>
        <p><small>Error: ${error.message}</small></p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">Reload Page</button>
      `;
    document.body.appendChild(errorDiv);
  }
});

// Handle errors
window.addEventListener("error", (e) => {
  console.error("Game Error:", e.error);

  // Show user-friendly error for chat-related issues
  if (
    e.error &&
    e.error.message &&
    e.error.message.includes("GameChatSystem")
  ) {
    console.error(
      "Chat system error - make sure GameChatSystem.js is loaded before main.js"
    );
  }
});

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});
