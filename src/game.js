/**
 * Game state management and main game logic for Maze Explorer 3D
 */

class GameManager {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 1400;
        this.canvas.height = 900;

        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.minimapSize = 200;
        this.minimapCanvas.width = this.minimapSize;
        this.minimapCanvas.height = this.minimapSize;

        // Game components
        this.textureManager = new TextureManager();
        this.raycaster = new Raycaster();
        this.raycaster.updateStripWidth(this.canvas.width);

        // Game state
        this.windowsMode = false;
        this.gameMode = 'campaign';
        this.quickMazeConfig = { level: 1, seed: 12345 };
        this.gameState = { level: 1, seed: Date.now(), won: false };
        this.maze = null;
        this.player = null;
        this.pointerLocked = false;

        // AI state
        this.aiMode = false;
        this.aiController = null;
        this.aiMoveSpeed = 0.5;
        this.aiMazesSolved = 0;
        this.aiNextMazeTimer = 0;

        // Performance tracking
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        this.lastFrameTime = performance.now();
        
        // Adaptive quality
        this.adaptiveQuality = true;
        this.lowFPSCounter = 0;
        this.avgFPS = 60;

        // Input state
        this.keys = {};

        this.initializeEventListeners();
        this.updateUI();
    }

    initializeEventListeners() {
        // Menu buttons
        document.getElementById('windowsModeToggle').addEventListener('click', () => {
            this.toggleWindowsMode();
        });

        document.getElementById('campaignBtn').addEventListener('click', () => {
            this.startGame('campaign');
        });

        document.getElementById('quickMazeBtn').addEventListener('click', () => {
            const level = Math.max(1, Math.min(8, parseInt(document.getElementById('quickLevel').value) || 1));
            const seed = parseInt(document.getElementById('quickSeed').value) || Date.now();
            this.startGame('quick', { level, seed });
        });

        document.getElementById('aiPlayBtn').addEventListener('click', () => {
            const level = Math.max(1, Math.min(8, parseInt(document.getElementById('quickLevel').value) || 1));
            const seed = parseInt(document.getElementById('quickSeed').value) || Date.now();
            this.startGame('ai', { level, seed });
        });

        document.getElementById('resetBtn').addEventListener('click', () => this.resetCurrentMaze());
        document.getElementById('menuBtn').addEventListener('click', () => this.returnToMenu());
        document.getElementById('menuBtn2').addEventListener('click', () => this.returnToMenu());

        document.getElementById('nextLevelBtn').addEventListener('click', () => {
            this.nextLevel();
        });

        // Keyboard input
        window.addEventListener('keydown', e => this.handleKeyDown(e));
        window.addEventListener('keyup', e => this.handleKeyUp(e));

        // Mouse input
        this.canvas.addEventListener('click', () => this.handleCanvasClick());
        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('mousemove', e => this.handleMouseMove(e));

        // Sky upload
        document.getElementById('skyUpload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        this.textureManager.setSkyTexture(img);
                        alert('Sky texture loaded!');
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    toggleWindowsMode() {
        this.windowsMode = !this.windowsMode;
        const toggleSwitch = document.getElementById('toggleSwitch');
        if (this.windowsMode) {
            toggleSwitch.classList.add('active');
        } else {
            toggleSwitch.classList.remove('active');
        }
        this.updateUI();
    }

    startGame(mode, config = null) {
        this.gameMode = mode;
        document.getElementById('startMenu').classList.add('hidden');
        
        if (mode === 'ai') {
            this.aiMode = true;
            this.aiMazesSolved = 0;
            
            if (config) {
                this.gameState.level = config.level;
                this.gameState.seed = config.seed;
            } else {
                this.gameState.level = 1;
                this.gameState.seed = Date.now();
            }
            
            const mazeSize = 5 + this.gameState.level * 5;
            this.maze = new Maze(mazeSize, mazeSize, this.gameState.seed);
            this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
            this.aiController = new AIController();
            document.getElementById('aiStats').style.display = 'block';
            document.getElementById('aiInstructions').style.display = 'inline';
        } else if (mode === 'campaign') {
            this.aiMode = false;
            document.getElementById('aiStats').style.display = 'none';
            document.getElementById('aiInstructions').style.display = 'none';
            if (this.gameState.level > 8) this.gameState.level = 8;
            const mazeSize = 5 + this.gameState.level * 5;
            this.maze = new Maze(mazeSize, mazeSize, this.gameState.seed);
            this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
        } else {
            this.aiMode = false;
            document.getElementById('aiStats').style.display = 'none';
            document.getElementById('aiInstructions').style.display = 'none';
            this.quickMazeConfig = config;
            if (this.quickMazeConfig.level > 8) this.quickMazeConfig.level = 8;
            const mazeSize = 5 + this.quickMazeConfig.level * 5;
            this.maze = new Maze(mazeSize, mazeSize, this.quickMazeConfig.seed);
            this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
        }
        
        this.maze.markExplored(this.player.x, this.player.y);
        this.updateUI();
        
        if (!this.aiMode) {
            this.canvas.requestPointerLock();
        }
    }

    resetCurrentMaze() {
        if (this.gameMode === 'campaign') {
            const mazeSize = 5 + this.gameState.level * 5;
            this.maze = new Maze(mazeSize, mazeSize, this.gameState.seed);
            this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
            this.gameState.won = false;
            document.getElementById('win').style.display = 'none';
        } else {
            this.quickMazeConfig.seed = Date.now();
            const mazeSize = 5 + this.quickMazeConfig.level * 5;
            this.maze = new Maze(mazeSize, mazeSize, this.quickMazeConfig.seed);
            this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
            this.gameState.won = false;
            document.getElementById('win').style.display = 'none';
            this.updateUI();
        }
        
        if (this.aiMode && this.aiController) {
            this.aiController.reset();
        }
        
        this.maze.markExplored(this.player.x, this.player.y);
    }

    returnToMenu() {
        document.getElementById('startMenu').classList.remove('hidden');
        document.getElementById('win').style.display = 'none';
        document.getElementById('aiStats').style.display = 'none';
        this.gameState.won = false;
        this.aiMode = false;
        this.aiMoveSpeed = 0.5;
        document.exitPointerLock();
    }

    nextLevel() {
        if (this.gameMode === 'campaign') {
            if (this.gameState.level >= 8) {
                alert('🎉 Congratulations! You\'ve completed all 8 levels!\n\nStarting from Level 1 again...');
                this.gameState.level = 1;
            } else {
                this.gameState.level++;
            }
            this.gameState.seed = Date.now();
            this.gameState.won = false;
            document.getElementById('win').style.display = 'none';
            const mazeSize = 5 + this.gameState.level * 5;
            this.maze = new Maze(mazeSize, mazeSize, this.gameState.seed);
            this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
            this.maze.markExplored(this.player.x, this.player.y);
            this.updateUI();
        } else {
            this.quickMazeConfig.seed = Date.now();
            this.gameState.won = false;
            document.getElementById('win').style.display = 'none';
            const mazeSize = 5 + this.quickMazeConfig.level * 5;
            this.maze = new Maze(mazeSize, mazeSize, this.quickMazeConfig.seed);
            this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
            this.maze.markExplored(this.player.x, this.player.y);
            this.updateUI();
        }
    }

    updateUI() {
        if (this.gameMode === 'ai') {
            document.getElementById('modeDisplay').textContent = 'AI Runner';
            document.getElementById('level').textContent = this.gameState.level;
            document.getElementById('seedDisplay').textContent = this.gameState.seed;
            document.getElementById('mazesSolved').textContent = this.aiMazesSolved;
            document.getElementById('aiSpeed').textContent = this.aiMoveSpeed + 'x';
        } else if (this.gameMode === 'campaign') {
            document.getElementById('modeDisplay').textContent = 'Campaign';
            document.getElementById('level').textContent = this.gameState.level;
            document.getElementById('seedDisplay').textContent = this.gameState.seed;
        } else {
            document.getElementById('modeDisplay').textContent = 'Quick Maze';
            document.getElementById('level').textContent = this.quickMazeConfig.level;
            document.getElementById('seedDisplay').textContent = this.quickMazeConfig.seed;
        }
        
        document.getElementById('graphicsMode').textContent = this.windowsMode ? 'Windows' : 'Default';
        
        if (this.raycaster) {
            document.getElementById('rayCount').textContent = this.raycaster.rayCount;
        }
    }

    handleKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;
        
        if (e.key === ' ' && this.gameState.won && !this.aiMode) {
            document.getElementById('nextLevelBtn').click();
        }
        
        if (this.aiMode) {
            if (e.key === '+' || e.key === '=') {
                this.aiMoveSpeed = Math.min(10, this.aiMoveSpeed + 0.5);
                this.updateUI();
            }
            if (e.key === '-' || e.key === '_') {
                this.aiMoveSpeed = Math.max(0.5, this.aiMoveSpeed - 0.5);
                this.updateUI();
            }
        }
    }

    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    handleCanvasClick() {
        if (!document.getElementById('startMenu').classList.contains('hidden')) return;
        this.canvas.requestPointerLock();
    }

    handlePointerLockChange() {
        this.pointerLocked = document.pointerLockElement === this.canvas;
    }

    handleMouseMove(e) {
        if (this.pointerLocked && this.player && !this.aiMode) {
            this.player.rotate(e.movementX * 0.0014);
            this.player.lookUp(-e.movementY * 0.0014);
        }
    }

    update(deltaTime) {
        if (!this.maze || !this.player) return;

        const targetFrameTime = 1000 / 60;
        const deltaMultiplier = deltaTime / targetFrameTime;
        const cappedDelta = Math.min(deltaMultiplier, 3);

        if (!this.gameState.won) {
            if (this.aiMode && this.aiController) {
                this.aiController.update(this.player, this.maze, this.aiMoveSpeed);
                this.maze.markExplored(this.player.x, this.player.y);

                if (this.player.checkExit(this.maze)) {
                    this.gameState.won = true;
                    this.aiMazesSolved++;
                    this.aiNextMazeTimer = 60;

                    // Level up every 5 mazes
                    if (this.aiMazesSolved % 5 === 0 && this.gameState.level < 8) {
                        this.gameState.level++;
                    }

                    // Speed up every 10 mazes
                    if (this.aiMazesSolved % 10 === 0 && this.aiMoveSpeed < 3) {
                        this.aiMoveSpeed += 0.25;
                    }
                    
                    this.updateUI();
                }
            } else {
                // Human player movement
                const vectors = this.player.getMovementVectors();
                
                if (this.keys['w']) this.player.move(vectors.forward.x * cappedDelta, vectors.forward.y * cappedDelta, this.maze);
                if (this.keys['s']) this.player.move(vectors.backward.x * cappedDelta, vectors.backward.y * cappedDelta, this.maze);
                if (this.keys['a']) this.player.move(-vectors.strafe.x * cappedDelta, -vectors.strafe.y * cappedDelta, this.maze);
                if (this.keys['d']) this.player.move(vectors.strafe.x * cappedDelta, vectors.strafe.y * cappedDelta, this.maze);

                this.maze.markExplored(this.player.x, this.player.y);

                if (this.player.checkExit(this.maze)) {
                    this.gameState.won = true;
                    document.getElementById('win').style.display = 'block';
                }
            }
        } else if (this.aiMode && this.aiNextMazeTimer > 0) {
            this.aiNextMazeTimer--;
            if (this.aiNextMazeTimer === 0) {
                this.gameState.seed = Date.now();
                this.gameState.won = false;
                const mazeSize = 5 + this.gameState.level * 5;
                this.maze = new Maze(mazeSize, mazeSize, this.gameState.seed);
                this.player = new Player(this.maze.cellSize / 2, this.maze.cellSize / 2, 0);
                this.aiController = new AIController();
                this.maze.markExplored(this.player.x, this.player.y);
                this.updateUI();
            }
        }
    }

    render() {
        if (!this.maze || !this.player) return;

        // Render 3D view
        this.raycaster.render(this.player, this.maze, this.canvas, this.ctx, this.textureManager, this.windowsMode);
        
        // Draw hand
        this.raycaster.drawHand(this.canvas, this.ctx);
        
        // Draw minimap
        this.maze.drawMinimap(this.player.x, this.player.y, this.minimapCanvas, this.minimapCtx, this.minimapSize);
    }

    gameLoop(currentTime) {
        if (!document.getElementById('startMenu').classList.contains('hidden')) {
            requestAnimationFrame(currentTime => this.gameLoop(currentTime));
            return;
        }

        const deltaTime = currentTime - (this.lastTime || currentTime);
        this.lastTime = currentTime;

        // FPS counter and adaptive quality
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.avgFPS = this.frameCount;
            document.getElementById('fps').textContent = this.frameCount;
            
            // Adaptive quality adjustment
            if (this.adaptiveQuality) {
                if (this.avgFPS < 45) {
                    this.lowFPSCounter++;
                    if (this.lowFPSCounter >= 3 && this.raycaster.rayCount > 120) {
                        // Reduce ray count for better performance
                        this.raycaster.rayCount = Math.max(120, this.raycaster.rayCount - 20);
                        this.raycaster.updateStripWidth(this.canvas.width);
                        this.raycaster.updateRayAngles();
                        console.log(`Reduced ray count to ${this.raycaster.rayCount} for better performance`);
                        this.lowFPSCounter = 0;
                    }
                } else if (this.avgFPS > 55 && this.raycaster.rayCount < 240) {
                    // Increase ray count for better quality
                    this.raycaster.rayCount = Math.min(240, this.raycaster.rayCount + 20);
                    this.raycaster.updateStripWidth(this.canvas.width);
                    this.raycaster.updateRayAngles();
                    this.lowFPSCounter = 0;
                }
                
                this.updateUI(); // Update ray count display
            }
            
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(currentTime => this.gameLoop(currentTime));
    }

    start() {
        this.gameLoop(performance.now());
    }
}

// Initialize the game when the page loads
let gameManager;
window.addEventListener('load', () => {
    gameManager = new GameManager();
    gameManager.start();
});