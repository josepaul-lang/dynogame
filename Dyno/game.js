// Web Audio Synthesizer for retro sounds (Jump, Score milestone, Crash)
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playScoreMilestone() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [587.33, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.1);
      });
    } catch (e) {}
  }

  playCrash() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }
}

// Main Dino Game Engine
class DinoGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundSystem();

    // Game state
    this.state = 'START'; // START, PLAYING, PAUSED, GAMEOVER
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('dino_high_score') || '0', 10);
    this.baseSpeed = 6;
    this.currentSpeed = this.baseSpeed;
    this.maxSpeed = 14;
    this.lastTime = 0;
    this.nightMode = false;
    this.autoDayNight = true;

    // Dimensions
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.groundY = 250;

    // Dino entity
    this.dino = {
      x: 60,
      y: this.groundY - 48,
      width: 44,
      height: 48,
      duckWidth: 56,
      duckHeight: 30,
      velocityY: 0,
      gravity: 0.65,
      jumpForce: -12.5,
      isGrounded: true,
      isDucking: false,
      legFrame: 0,
      legTimer: 0
    };

    // Obstacles & Environment
    this.obstacles = [];
    this.nextObstacleTimer = 60;
    this.clouds = [
      { x: 150, y: 50, speed: 0.8 },
      { x: 420, y: 75, speed: 0.6 },
      { x: 720, y: 40, speed: 0.9 }
    ];
    this.groundBumps = [];
    this.initGroundBumps();

    // DOM UI elements
    this.overlay = document.getElementById('gameOverlay');
    this.overlayTitle = document.getElementById('overlayTitle');
    this.overlaySubtitle = document.getElementById('overlaySubtitle');
    this.startBtn = document.getElementById('startBtn');
    this.currentScoreText = document.getElementById('currentScoreText');
    this.highScoreText = document.getElementById('highScoreText');
    this.speedText = document.getElementById('speedText');
    this.audioToggleBtn = document.getElementById('audioToggleBtn');
    this.audioIcon = document.getElementById('audioIcon');
    this.audioLabel = document.getElementById('audioLabel');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.themeIcon = document.getElementById('themeIcon');
    this.themeLabel = document.getElementById('themeLabel');

    this.touchJumpBtn = document.getElementById('touchJumpBtn');
    this.touchDuckBtn = document.getElementById('touchDuckBtn');

    this.updateScoreDisplay();
    this.setupListeners();
    this.render(); // Initial static frame
  }

  initGroundBumps() {
    this.groundBumps = [];
    for (let x = 0; x < this.width + 100; x += 35 + Math.random() * 40) {
      this.groundBumps.push({
        x: x,
        length: 8 + Math.random() * 12,
        heightOffset: Math.floor(Math.random() * 3)
      });
    }
  }

  setupListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.sound.init();
        if (this.state === 'START' || this.state === 'GAMEOVER') {
          this.startGame();
        } else if (this.state === 'PLAYING') {
          this.jump();
        }
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        if (this.state === 'PLAYING') {
          this.setDucking(true);
        }
      } else if (e.code === 'KeyP') {
        this.togglePause();
      } else if (e.code === 'KeyM') {
        this.toggleAudio();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.setDucking(false);
      }
    });

    // Start Button
    this.startBtn.addEventListener('click', () => {
      this.sound.init();
      this.startGame();
    });

    // Sound Button
    this.audioToggleBtn.addEventListener('click', () => {
      this.sound.init();
      this.toggleAudio();
    });

    // Theme Button
    this.themeToggleBtn.addEventListener('click', () => {
      this.autoDayNight = false; // manual override
      this.setTheme(!this.nightMode);
    });

    // Touch controls
    const triggerJump = (e) => {
      e.preventDefault();
      this.sound.init();
      if (this.state === 'START' || this.state === 'GAMEOVER') {
        this.startGame();
      } else {
        this.jump();
      }
    };

    this.touchJumpBtn.addEventListener('touchstart', triggerJump);
    this.touchJumpBtn.addEventListener('mousedown', triggerJump);

    const triggerDuckStart = (e) => {
      e.preventDefault();
      this.setDucking(true);
    };
    const triggerDuckEnd = (e) => {
      e.preventDefault();
      this.setDucking(false);
    };

    this.touchDuckBtn.addEventListener('touchstart', triggerDuckStart);
    this.touchDuckBtn.addEventListener('touchend', triggerDuckEnd);
    this.touchDuckBtn.addEventListener('mousedown', triggerDuckStart);
    this.touchDuckBtn.addEventListener('mouseup', triggerDuckEnd);

    // Canvas click also jumps / starts
    this.canvas.addEventListener('pointerdown', () => {
      this.sound.init();
      if (this.state === 'START' || this.state === 'GAMEOVER') {
        this.startGame();
      } else if (this.state === 'PLAYING') {
        this.jump();
      }
    });
  }

  toggleAudio() {
    this.sound.enabled = !this.sound.enabled;
    this.audioIcon.textContent = this.sound.enabled ? '🔊' : '🔇';
    this.audioLabel.textContent = this.sound.enabled ? 'Sound ON' : 'Sound OFF';
  }

  setTheme(isNight) {
    this.nightMode = isNight;
    if (this.nightMode) {
      document.body.classList.add('night-mode');
      this.themeIcon.textContent = '☀️';
      this.themeLabel.textContent = 'Day Mode';
    } else {
      document.body.classList.remove('night-mode');
      this.themeIcon.textContent = '🌙';
      this.themeLabel.textContent = 'Night Mode';
    }
  }

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.currentSpeed = this.baseSpeed;
    this.obstacles = [];
    this.nextObstacleTimer = 50;
    this.dino.y = this.groundY - this.dino.height;
    this.dino.velocityY = 0;
    this.dino.isGrounded = true;
    this.dino.isDucking = false;
    this.overlay.classList.add('hidden');
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.overlayTitle.textContent = 'GAME PAUSED';
      this.overlaySubtitle.textContent = 'Press P or Click below to resume';
      this.startBtn.textContent = 'RESUME';
      this.overlay.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.overlay.classList.add('hidden');
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.sound.playCrash();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('dino_high_score', this.highScore.toString());
    }
    this.updateScoreDisplay();

    this.overlayTitle.textContent = 'GAME OVER';
    this.overlaySubtitle.textContent = `You scored ${this.score} points!`;
    this.startBtn.textContent = 'PLAY AGAIN';
    this.overlay.classList.remove('hidden');
  }

  jump() {
    if (this.dino.isGrounded) {
      this.dino.velocityY = this.dino.jumpForce;
      this.dino.isGrounded = false;
      this.sound.playJump();
    }
  }

  setDucking(ducking) {
    this.dino.isDucking = ducking;
    if (ducking && !this.dino.isGrounded) {
      // Fast fall mechanic
      this.dino.velocityY += 4.5;
    }
  }

  update(delta) {
    if (this.state !== 'PLAYING') return;

    // Increment score & accelerate
    this.score += 1;
    if (this.score % 100 === 0) {
      this.sound.playScoreMilestone();
    }

    // Dynamic speed curve
    this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + Math.floor(this.score / 250) * 0.75);

    // Auto day / night cycle every 600 points
    if (this.autoDayNight) {
      const cycle = Math.floor(this.score / 500) % 2;
      this.setTheme(cycle === 1);
    }

    this.updateScoreDisplay();

    // Dino Physics
    this.dino.velocityY += this.dino.gravity;
    this.dino.y += this.dino.velocityY;

    const currentHeight = this.dino.isDucking ? this.dino.duckHeight : this.dino.height;
    if (this.dino.y >= this.groundY - currentHeight) {
      this.dino.y = this.groundY - currentHeight;
      this.dino.velocityY = 0;
      this.dino.isGrounded = true;
    }

    // Dino Running Animation
    this.dino.legTimer++;
    if (this.dino.legTimer > 6) {
      this.dino.legFrame = (this.dino.legFrame + 1) % 2;
      this.dino.legTimer = 0;
    }

    // Clouds
    this.clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x < -60) {
        cloud.x = this.width + Math.random() * 80;
        cloud.y = 30 + Math.random() * 60;
      }
    });

    // Ground Bumps
    this.groundBumps.forEach(b => {
      b.x -= this.currentSpeed;
    });
    this.groundBumps = this.groundBumps.filter(b => b.x > -50);
    const lastBump = this.groundBumps[this.groundBumps.length - 1];
    if (lastBump && lastBump.x < this.width) {
      this.groundBumps.push({
        x: this.width + 30 + Math.random() * 40,
        length: 8 + Math.random() * 12,
        heightOffset: Math.floor(Math.random() * 3)
      });
    }

    // Spawn Obstacles
    this.nextObstacleTimer--;
    if (this.nextObstacleTimer <= 0) {
      this.spawnObstacle();
      // randomize interval based on speed
      const minInterval = Math.max(35, Math.floor(80 - this.currentSpeed * 3));
      const maxInterval = minInterval + 45;
      this.nextObstacleTimer = Math.floor(minInterval + Math.random() * (maxInterval - minInterval));
    }

    // Move & Check Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.currentSpeed;

      // Pterodactyl wings flap
      if (obs.type === 'bird') {
        obs.wingTimer = (obs.wingTimer || 0) + 1;
        if (obs.wingTimer > 8) {
          obs.wingFrame = (obs.wingFrame || 0) === 0 ? 1 : 0;
          obs.wingTimer = 0;
        }
      }

      // Collision Detection (AABB with slight padding)
      const dinoBox = {
        x: this.dino.x + 4,
        y: this.dino.y + 4,
        w: (this.dino.isDucking ? this.dino.duckWidth : this.dino.width) - 8,
        h: (this.dino.isDucking ? this.dino.duckHeight : this.dino.height) - 6
      };

      const obsBox = {
        x: obs.x + 4,
        y: obs.y + 4,
        w: obs.width - 8,
        h: obs.height - 6
      };

      if (
        dinoBox.x < obsBox.x + obsBox.w &&
        dinoBox.x + dinoBox.w > obsBox.x &&
        dinoBox.y < obsBox.y + obsBox.h &&
        dinoBox.y + dinoBox.h > obsBox.y
      ) {
        this.gameOver();
        return;
      }

      // Remove offscreen
      if (obs.x + obs.width < -20) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  spawnObstacle() {
    // Cactus (single, double, triple, tall) or Pterodactyl (bird)
    const canSpawnBird = this.score > 250;
    const isBird = canSpawnBird && Math.random() < 0.28;

    if (isBird) {
      // 3 possible heights: low (must jump), mid (must duck), high (can walk under)
      const birdHeights = [this.groundY - 30, this.groundY - 52, this.groundY - 80];
      const selectedY = birdHeights[Math.floor(Math.random() * birdHeights.length)];
      this.obstacles.push({
        type: 'bird',
        x: this.width + 20,
        y: selectedY,
        width: 42,
        height: 28,
        wingFrame: 0,
        wingTimer: 0
      });
    } else {
      // Cactus
      const types = ['small', 'double', 'large'];
      const variant = types[Math.floor(Math.random() * types.length)];
      let w = 22;
      let h = 42;
      if (variant === 'double') {
        w = 40;
        h = 42;
      } else if (variant === 'large') {
        w = 28;
        h = 54;
      }

      this.obstacles.push({
        type: 'cactus',
        variant: variant,
        x: this.width + 20,
        y: this.groundY - h,
        width: w,
        height: h
      });
    }
  }

  updateScoreDisplay() {
    const pad = (num, len = 5) => String(num).padStart(len, '0');
    this.currentScoreText.textContent = pad(this.score);
    this.highScoreText.textContent = pad(this.highScore);
    this.speedText.textContent = (this.currentSpeed / this.baseSpeed).toFixed(1) + 'x';
  }

  gameLoop(timestamp) {
    if (this.state !== 'PLAYING') {
      this.render();
      return;
    }
    const delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(delta);
    this.render();

    if (this.state === 'PLAYING') {
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  // Pixel Art Drawing Helpers
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const isNight = this.nightMode;
    const fgColor = isNight ? '#e2e8f0' : '#475569';
    const groundColor = isNight ? '#64748b' : '#64748b';

    // 1. Draw Clouds
    ctx.fillStyle = isNight ? '#334155' : '#cbd5e1';
    this.clouds.forEach(c => {
      this.drawCloud(c.x, c.y);
    });

    // 2. Draw Ground Line & Texture
    ctx.strokeStyle = groundColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();

    // Ground details
    ctx.fillStyle = groundColor;
    this.groundBumps.forEach(b => {
      ctx.fillRect(b.x, this.groundY + 4 + b.heightOffset, b.length, 2);
    });

    // 3. Draw Dino
    this.drawDino(fgColor);

    // 4. Draw Obstacles
    this.obstacles.forEach(obs => {
      if (obs.type === 'cactus') {
        this.drawCactus(obs, fgColor);
      } else if (obs.type === 'bird') {
        this.drawBird(obs, fgColor);
      }
    });
  }

  drawCloud(x, y) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.arc(x + 14, y - 6, 16, 0, Math.PI * 2);
    ctx.arc(x + 30, y - 2, 13, 0, Math.PI * 2);
    ctx.arc(x + 40, y + 4, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDino(color) {
    const ctx = this.ctx;
    const d = this.dino;
    ctx.fillStyle = color;

    if (d.isDucking) {
      // Ducking Dino Sprite representation
      // Body
      ctx.fillRect(d.x, d.y + 12, 44, 14);
      // Head outstretched
      ctx.fillRect(d.x + 38, d.y + 4, 18, 14);
      // Eye
      ctx.fillStyle = this.nightMode ? '#0f172a' : '#ffffff';
      ctx.fillRect(d.x + 48, d.y + 7, 3, 3);
      ctx.fillStyle = color;
      // Snout/Mouth
      ctx.fillRect(d.x + 52, d.y + 12, 4, 2);
      // Tail
      ctx.fillRect(d.x - 6, d.y + 14, 8, 8);
      // Feet
      if (d.legFrame === 0) {
        ctx.fillRect(d.x + 12, d.y + 26, 6, 4);
        ctx.fillRect(d.x + 28, d.y + 24, 6, 6);
      } else {
        ctx.fillRect(d.x + 12, d.y + 24, 6, 6);
        ctx.fillRect(d.x + 28, d.y + 26, 6, 4);
      }
      return;
    }

    // Normal Dino Sprite
    // Body & Belly
    ctx.fillRect(d.x + 6, d.y + 16, 24, 22);
    // Tail
    ctx.fillRect(d.x, d.y + 20, 8, 12);
    ctx.fillRect(d.x - 4, d.y + 22, 5, 6);
    // Neck
    ctx.fillRect(d.x + 18, d.y + 6, 12, 14);
    // Head
    ctx.fillRect(d.x + 18, d.y, 22, 14);
    // Snout
    ctx.fillRect(d.x + 38, d.y + 4, 6, 10);
    // Eye
    ctx.fillStyle = this.nightMode ? '#0f172a' : '#ffffff';
    ctx.fillRect(d.x + 28, d.y + 3, 3, 3);
    ctx.fillStyle = color;
    // Small hands
    ctx.fillRect(d.x + 28, d.y + 22, 6, 4);
    ctx.fillRect(d.x + 32, d.y + 24, 2, 4);

    // Legs animation
    if (!d.isGrounded) {
      // Jump pose: legs together
      ctx.fillRect(d.x + 10, d.y + 38, 5, 8);
      ctx.fillRect(d.x + 20, d.y + 38, 5, 8);
    } else if (d.legFrame === 0) {
      // Step A
      ctx.fillRect(d.x + 8, d.y + 38, 5, 10);
      ctx.fillRect(d.x + 8, d.y + 46, 9, 2); // foot
      ctx.fillRect(d.x + 20, d.y + 38, 5, 6);
    } else {
      // Step B
      ctx.fillRect(d.x + 8, d.y + 38, 5, 6);
      ctx.fillRect(d.x + 20, d.y + 38, 5, 10);
      ctx.fillRect(d.x + 20, d.y + 46, 9, 2); // foot
    }
  }

  drawCactus(obs, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;

    if (obs.variant === 'double') {
      // Left stalk
      ctx.fillRect(obs.x + 4, obs.y + 6, 10, obs.height - 6);
      ctx.fillRect(obs.x, obs.y + 14, 6, 10);
      // Right stalk
      ctx.fillRect(obs.x + 22, obs.y, 12, obs.height);
      ctx.fillRect(obs.x + 32, obs.y + 12, 6, 12);
    } else if (obs.variant === 'large') {
      // Tall thick cactus
      ctx.fillRect(obs.x + 8, obs.y, 12, obs.height);
      // Left arm
      ctx.fillRect(obs.x, obs.y + 16, 8, 6);
      ctx.fillRect(obs.x, obs.y + 10, 6, 10);
      // Right arm
      ctx.fillRect(obs.x + 20, obs.y + 20, 8, 6);
      ctx.fillRect(obs.x + 22, obs.y + 12, 6, 12);
    } else {
      // Standard small cactus
      ctx.fillRect(obs.x + 6, obs.y, 10, obs.height);
      // Left branch
      ctx.fillRect(obs.x, obs.y + 12, 6, 5);
      ctx.fillRect(obs.x, obs.y + 6, 5, 10);
      // Right branch
      ctx.fillRect(obs.x + 16, obs.y + 16, 6, 5);
      ctx.fillRect(obs.x + 17, obs.y + 10, 5, 10);
    }
  }

  drawBird(obs, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;

    // Bird body
    ctx.fillRect(obs.x + 12, obs.y + 8, 20, 10);
    // Head & beak
    ctx.fillRect(obs.x, obs.y + 4, 14, 8);
    ctx.fillRect(obs.x - 4, obs.y + 7, 5, 3);
    // Eye
    ctx.fillStyle = this.nightMode ? '#0f172a' : '#ffffff';
    ctx.fillRect(obs.x + 4, obs.y + 5, 2, 2);
    ctx.fillStyle = color;

    // Flapping Wings
    if (obs.wingFrame === 0) {
      // Wing up
      ctx.fillRect(obs.x + 14, obs.y - 6, 10, 14);
      ctx.fillRect(obs.x + 18, obs.y - 12, 6, 8);
    } else {
      // Wing down
      ctx.fillRect(obs.x + 14, obs.y + 16, 10, 12);
      ctx.fillRect(obs.x + 18, obs.y + 24, 6, 6);
    }
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new DinoGame();
});
