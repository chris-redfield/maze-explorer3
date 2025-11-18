/**
 * Maze generation and rendering for Maze Explorer 3D
 */

class Maze {
    constructor(cols, rows, seed) {
        this.cols = cols;
        this.rows = rows;
        this.cellSize = 64;
        this.grid = [];
        this.rng = new Random(seed);
        this.doorLocation = null;
        
        this.initializeGrid();
        this.generateMaze(0, 0);
        this.placeRandomDoor();
        
        this.exitX = this.cols - 1;
        this.exitY = this.rows - 1;
        this.grid[this.exitY][this.exitX].isExit = true;
    }

    initializeGrid() {
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = {
                    walls: { top: true, right: true, bottom: true, left: true },
                    wallTextures: { top: 'brick', right: 'brick', bottom: 'brick', left: 'brick' },
                    visited: false,
                    explored: false
                };
            }
        }
    }

    generateMaze(startX, startY) {
        const stack = [[startX, startY]];
        
        while (stack.length > 0) {
            const [cx, cy] = stack[stack.length - 1];
            this.grid[cy][cx].visited = true;
            
            const directions = [
                { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },
                { dx: 1, dy: 0, wall: 'right', opposite: 'left' },
                { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },
                { dx: -1, dy: 0, wall: 'left', opposite: 'right' }
            ];
            
            // Shuffle directions using seeded random
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(this.rng.next() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }
            
            let foundUnvisited = false;
            for (const dir of directions) {
                const nx = cx + dir.dx;
                const ny = cy + dir.dy;
                
                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && !this.grid[ny][nx].visited) {
                    this.grid[cy][cx].walls[dir.wall] = false;
                    this.grid[ny][nx].walls[dir.opposite] = false;
                    stack.push([nx, ny]);
                    foundUnvisited = true;
                    break;
                }
            }
            
            if (!foundUnvisited) {
                stack.pop();
            }
        }
    }

    placeRandomDoor() {
        const maxAttempts = 100;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const x = Math.floor(this.rng.next() * this.cols);
            const y = Math.floor(this.rng.next() * this.rows);
            const cell = this.grid[y][x];
            
            const wallSides = [];
            if (cell.walls.top) wallSides.push('top');
            if (cell.walls.right) wallSides.push('right');
            if (cell.walls.bottom) wallSides.push('bottom');
            if (cell.walls.left) wallSides.push('left');
            
            if (wallSides.length > 0) {
                const side = wallSides[Math.floor(this.rng.next() * wallSides.length)];
                this.setDoorTexture(x, y, side);
                this.doorLocation = { x, y, side };
                return;
            }
            
            attempts++;
        }
    }

    setDoorTexture(x, y, side) {
        this.grid[y][x].wallTextures[side] = 'door';
        
        // Set door texture on adjacent cell as well
        if (side === 'top' && y > 0) {
            this.grid[y - 1][x].wallTextures.bottom = 'door';
        } else if (side === 'bottom' && y < this.rows - 1) {
            this.grid[y + 1][x].wallTextures.top = 'door';
        } else if (side === 'left' && x > 0) {
            this.grid[y][x - 1].wallTextures.right = 'door';
        } else if (side === 'right' && x < this.cols - 1) {
            this.grid[y][x + 1].wallTextures.left = 'door';
        }
    }

    getCell(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        if (cellX < 0 || cellX >= this.cols || cellY < 0 || cellY >= this.rows) {
            return null;
        }
        return this.grid[cellY][cellX];
    }

    getCellCoords(x, y) {
        return {
            cellX: Math.floor(x / this.cellSize),
            cellY: Math.floor(y / this.cellSize)
        };
    }

    markExplored(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        if (cellX >= 0 && cellX < this.cols && cellY >= 0 && cellY < this.rows) {
            this.grid[cellY][cellX].explored = true;
            
            // Mark adjacent cells as explored too for better visibility
            const radius = 1;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = cellX + dx;
                    const ny = cellY + dy;
                    if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                        this.grid[ny][nx].explored = true;
                    }
                }
            }
        }
    }

    drawMinimap(playerX, playerY, minimapCanvas, minimapCtx, minimapSize) {
        minimapCtx.fillStyle = '#000';
        minimapCtx.fillRect(0, 0, minimapSize, minimapSize);

        const cellSize = Math.min(minimapSize / this.cols, minimapSize / this.rows);
        
        minimapCtx.strokeStyle = '#4a90e2';
        minimapCtx.lineWidth = 1;

        // Draw maze cells
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                
                if (!cell.explored) continue;

                const screenX = x * cellSize;
                const screenY = y * cellSize;

                // Highlight start position
                if (x === 0 && y === 0) {
                    minimapCtx.fillStyle = '#ffaa00';
                    minimapCtx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
                }

                // Highlight exit
                if (cell.isExit) {
                    minimapCtx.fillStyle = '#00ff88';
                    minimapCtx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
                }

                // Draw walls
                minimapCtx.beginPath();
                if (cell.walls.top) {
                    minimapCtx.moveTo(screenX, screenY);
                    minimapCtx.lineTo(screenX + cellSize, screenY);
                }
                if (cell.walls.right) {
                    minimapCtx.moveTo(screenX + cellSize, screenY);
                    minimapCtx.lineTo(screenX + cellSize, screenY + cellSize);
                }
                if (cell.walls.bottom) {
                    minimapCtx.moveTo(screenX, screenY + cellSize);
                    minimapCtx.lineTo(screenX + cellSize, screenY + cellSize);
                }
                if (cell.walls.left) {
                    minimapCtx.moveTo(screenX, screenY);
                    minimapCtx.lineTo(screenX, screenY + cellSize);
                }
                minimapCtx.stroke();
            }
        }

        // Draw player
        const playerCellX = Math.floor(playerX / this.cellSize);
        const playerCellY = Math.floor(playerY / this.cellSize);
        minimapCtx.fillStyle = '#ff3366';
        minimapCtx.beginPath();
        minimapCtx.arc(
            playerCellX * cellSize + cellSize / 2,
            playerCellY * cellSize + cellSize / 2,
            cellSize / 3,
            0,
            Math.PI * 2
        );
        minimapCtx.fill();
    }

    // Check if a position is valid (not hitting walls)
    isValidPosition(x, y, margin = 8) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        
        if (cellX < 0 || cellX >= this.cols || cellY < 0 || cellY >= this.rows) {
            return false;
        }
        
        const cell = this.grid[cellY][cellX];
        const localX = x % this.cellSize;
        const localY = y % this.cellSize;
        
        if (localY < margin && cell.walls.top) return false;
        if (localY > this.cellSize - margin && cell.walls.bottom) return false;
        if (localX < margin && cell.walls.left) return false;
        if (localX > this.cellSize - margin && cell.walls.right) return false;
        
        return true;
    }

    // Get all valid neighbor cells for pathfinding
    getNeighbors(cellX, cellY) {
        const neighbors = [];
        const cell = this.grid[cellY][cellX];

        if (!cell.walls.top && cellY > 0) neighbors.push([cellX, cellY - 1]);
        if (!cell.walls.bottom && cellY < this.rows - 1) neighbors.push([cellX, cellY + 1]);
        if (!cell.walls.left && cellX > 0) neighbors.push([cellX - 1, cellY]);
        if (!cell.walls.right && cellX < this.cols - 1) neighbors.push([cellX + 1, cellY]);

        return neighbors;
    }
}