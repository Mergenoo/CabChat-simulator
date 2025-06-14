// Utility functions for the taxi game

class Utils {
  // Math utilities
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  static smoothstep(edge0, edge1, x) {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static degToRad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  static radToDeg(radians) {
    return (radians * 180) / Math.PI;
  }

  // Vector utilities
  static distance2D(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  static angle2D(from, to) {
    return Math.atan2(to.z - from.z, to.x - from.x);
  }

  static normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  static shortestAngleDifference(angle1, angle2) {
    let diff = angle2 - angle1;
    return this.normalizeAngle(diff);
  }

  // Color utilities
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  static rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  static lerpColor(color1, color2, factor) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, factor);
  }

  // Time utilities
  static formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  }

  static formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  // String utilities
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static truncate(str, length) {
    return str.length > length ? str.substring(0, length) + "..." : str;
  }

  // Array utilities
  static shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  static weightedChoice(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  // Performance utilities
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Storage utilities
  static saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
      return false;
    }
  }

  static loadFromLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      return defaultValue;
    }
  }

  // Device detection
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  static isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  static getDevicePixelRatio() {
    return window.devicePixelRatio || 1;
  }

  // Performance monitoring
  static createPerformanceMonitor() {
    return {
      frameCount: 0,
      lastTime: performance.now(),
      fps: 0,

      update() {
        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.lastTime >= 1000) {
          this.fps = Math.round(
            (this.frameCount * 1000) / (currentTime - this.lastTime)
          );
          this.frameCount = 0;
          this.lastTime = currentTime;
        }

        return this.fps;
      },
    };
  }

  // Geometry utilities
  static createRoundedRectangleGeometry(width, height, radius, segments = 8) {
    const shape = new THREE.Shape();

    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(
      x + width,
      y + height,
      x + width,
      y + height - radius
    );
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);

    return new THREE.ShapeGeometry(shape, segments);
  }

  // Audio utilities
  static createAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
  }

  static loadAudioBuffer(audioContext, url) {
    return fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => audioContext.decodeAudioData(data));
  }

  // Animation utilities
  static easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeIn(t) {
    return t * t;
  }

  static easeOut(t) {
    return t * (2 - t);
  }

  static bounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }

  // Validation utilities
  static isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Random generators
  static generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  static generateRandomName() {
    const firstNames = [
      "Alex",
      "Jordan",
      "Taylor",
      "Morgan",
      "Casey",
      "Riley",
      "Avery",
      "Quinn",
      "Sage",
      "River",
      "Phoenix",
      "Skyler",
      "Cameron",
      "Dakota",
      "Emery",
      "Finley",
    ];

    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
    ];

    return `${this.randomChoice(firstNames)} ${this.randomChoice(lastNames)}`;
  }

  // Collision detection utilities
  static pointInRectangle(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  static circleIntersectsRectangle(circle, rect) {
    const distX = Math.abs(circle.x - rect.x - rect.width / 2);
    const distY = Math.abs(circle.y - rect.y - rect.height / 2);

    if (distX > rect.width / 2 + circle.radius) return false;
    if (distY > rect.height / 2 + circle.radius) return false;

    if (distX <= rect.width / 2) return true;
    if (distY <= rect.height / 2) return true;

    const dx = distX - rect.width / 2;
    const dy = distY - rect.height / 2;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  static lineIntersectsLine(line1, line2) {
    const x1 = line1.start.x,
      y1 = line1.start.y;
    const x2 = line1.end.x,
      y2 = line1.end.y;
    const x3 = line2.start.x,
      y3 = line2.start.y;
    const x4 = line2.end.x,
      y4 = line2.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null; // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }

    return null;
  }

  // Texture utilities
  static createCanvasTexture(width, height, drawFunction) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    drawFunction(context, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  static createGradientTexture(width, height, colors, direction = "vertical") {
    return this.createCanvasTexture(width, height, (ctx, w, h) => {
      const gradient =
        direction === "vertical"
          ? ctx.createLinearGradient(0, 0, 0, h)
          : ctx.createLinearGradient(0, 0, w, 0);

      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    });
  }

  // Error handling
  static handleError(error, context = "Unknown") {
    console.error(`Error in ${context}:`, error);

    // Send error to analytics service (if available)
    if (window.gtag) {
      window.gtag("event", "exception", {
        description: `${context}: ${error.message}`,
        fatal: false,
      });
    }

    return {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
    };
  }

  // Feature detection
  static supportsWebGL() {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  static supportsWebGL2() {
    try {
      const canvas = document.createElement("canvas");
      return !!(window.WebGL2RenderingContext && canvas.getContext("webgl2"));
    } catch (e) {
      return false;
    }
  }

  static getWebGLInfo() {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) return null;

    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Utils;
}
