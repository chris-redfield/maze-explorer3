# Maze Explorer 3D

A 3D first-person maze exploration game built with vanilla JavaScript and HTML5 Canvas, featuring raycasting graphics, AI pathfinding, and multiple game modes.

![Maze Explorer 3D](https://img.shields.io/badge/Game-Maze%20Explorer%203D-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Game Modes
- **Campaign Mode** - Progressive difficulty through 8 levels
- **Quick Maze** - Customizable level and seed generation
- **AI Play** - Watch an AI solve mazes automatically

### Graphics & Rendering
- **3D Raycasting Engine** - Classic DOOM-style rendering
- **Textured Walls** - Brick and door textures
- **Windows Mode** - Enhanced graphics with textured floors
- **Adaptive Quality** - Automatic performance optimization
- **Minimap** - Real-time exploration tracking

### AI Features
- **Pathfinding** - BFS algorithm for optimal maze solving
- **Smooth Movement** - Natural-looking AI navigation
- **Adaptive Speed** - Adjustable AI movement speed
- **Progressive Difficulty** - AI advances levels automatically

### Performance
- **Object Pooling** - Reduced garbage collection overhead
- **Adaptive Ray Count** - Dynamic quality adjustment based on FPS
- **Optimized Rendering** - Fast wall and floor rendering
- **Memory Management** - Efficient resource allocation

## Project Structure

```
maze-explorer3/
├── index.html              # Main HTML file
├── styles.css              # CSS styles
├── src/                    # JavaScript source files
│   ├── utils.js            # Utilities (Random, PerformanceUtils, ObjectPool)
│   ├── textures.js         # Texture management and generation
│   ├── maze.js             # Maze generation and rendering
│   ├── player.js           # Player logic and movement
│   ├── raycaster.js        # Raycasting engine
│   ├── ai.js               # AI pathfinding and automation
│   └── game.js             # Main game state management
└── README.md               # Project documentation

```

## How to Play

### Controls
- **WASD** - Move around the maze
- **Mouse** - Look around (click to lock pointer)
- **Space** - Continue to next level (when maze is completed)
- **+/-** - Adjust AI speed (in AI mode)

### Objective
Navigate through the maze to find the **green exit**. The starting position is marked in **orange** on the minimap.

## Quick Start

### Local Development
1. Clone the repository
2. Open `index.html` in a modern web browser
3. Start playing!

### GitHub Pages Deployment
1. Push to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Select main branch as source
4. Access your game at `https://yourusername.github.io/repository-name`

## Architecture

### Core Components

#### Game Manager (`game.js`)
- Main game loop and state management
- Event handling and UI updates
- Performance monitoring and adaptive quality

#### Player System (`player.js`)
- Movement and collision detection
- Input handling and camera controls
- Exit detection and game progression

#### Raycasting Engine (`raycaster.js`)
- 3D rendering using raycasting algorithm
- Wall and floor texture rendering
- Performance-optimized ray calculations

#### Maze Generation (`maze.js`)
- Recursive backtracking algorithm
- Procedural maze generation with seeds
- Minimap rendering and exploration tracking

#### AI Controller (`ai.js`)
- Breadth-First Search pathfinding
- Smooth AI movement and rotation
- Natural movement with noise injection

#### Texture Management (`textures.js`)
- Texture generation and caching
- Brick, door, and carpet textures
- Pixel data management for rendering

#### Utilities (`utils.js`)
- Random number generation with seeds
- Performance utilities and math functions
- Object pooling for memory optimization

## Customization

### Adding New Textures
Textures are managed in `src/textures.js`. To add a new texture:

1. Define texture data as a 32x32 array
2. Add generation logic in `TextureManager`
3. Update the raycaster to use the new texture

### Adjusting Performance
- Modify `rayCount` in `raycaster.js` for quality/performance balance
- Adjust adaptive quality thresholds in `game.js`
- Configure object pool sizes in `utils.js`

## Technical Details

### Technologies Used
- **Vanilla JavaScript (ES6+)** - No external dependencies
- **HTML5 Canvas** - 2D context for 3D rendering
- **CSS3** - Modern styling with flexbox and animations
- **Web APIs** - Pointer Lock, Performance API

### Performance Optimizations
- **Pre-calculated ray angles** - Avoid repeated trigonometric calculations
- **Object pooling** - Reduce garbage collection overhead
- **Manhattan distance** - Fast distance approximation for AI
- **Adaptive quality** - Dynamic ray count adjustment
- **Efficient collision detection** - Grid-based spatial optimization

### Browser Compatibility
- **Modern browsers** - Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Required features** - Canvas 2D, ES6 classes, Pointer Lock API
- **Mobile support** - Touch controls and responsive design

## Performance Metrics

- **Target FPS**: 60 FPS
- **Ray Count**: 120-240 (adaptive)
- **Maze Size**: 10x10 to 45x45 cells
- **Memory Usage**: ~5-10MB typical
- **Load Time**: <100ms on modern hardware

## Future Enhancements

- [ ] Sound effects and background music
- [ ] Multiplayer support
- [ ] Level editor
- [ ] Different maze algorithms
- [ ] Power-ups and collectibles
- [ ] Mobile-specific optimizations
- [ ] WebGL renderer option
- [ ] Save/load game progress
