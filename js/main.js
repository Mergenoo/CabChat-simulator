// Main game initialization
let game;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize the game
  game = new TaxiGame();

  // Handle window resize
  window.addEventListener("resize", () => {
    game.handleResize();
  });

  // Handle visibility change (pause when tab is not active)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      game.pause();
    } else {
      game.resume();
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
  }

  // Start the game
  game.start();
});

// Handle errors
window.addEventListener("error", (e) => {
  console.error("Game Error:", e.error);
});
