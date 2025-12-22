/**
 * Campaign Maze with BSP (Binary Space Partitioning) for Maze Explorer 3D
 * Features:
 * - BSP-based region generation with mini-mazes
 * - Corridors connecting regions
 * - Selective rendering (only visible regions)
 * - Teleport cells at higher levels
 */

// Color palette for mini-mazes
const MAZE_COLORS = [
    { r: 74, g: 144, b: 226 },   // Blue
    { r: 226, g: 74, b: 144 },   // Pink
    { r: 144, g: 226, b: 74 },   // Green
    { r: 226, g: 144, b: 74 },   // Orange
    { r: 144, g: 74, b: 226 },   // Purple
    { r: 74, g: 226, b: 144 },   // Teal
    { r: 226, g: 226, b: 74 },   // Yellow
    { r: 74, g: 226, b: 226 },   // Cyan
    { r: 226, g: 74, b: 74 },    // Red
    { r: 74, g: 74, b: 226 },    // Indigo
    { r: 226, g: 74, b: 226 },   // Magenta
    { r: 144, g: 144, b: 74 },   // Olive
];

// BSP Tree Node
class BSPNode3D {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.left = null;
        this.right = null;
        this.isLeaf = true;
        this.region = null;
        this.color = null;
        this.regionId = -1;
        this.discovered = false;
        this.connections = [];
    }

    split(rng, minSize) {
        if (!this.isLeaf) return false;

        let splitHorizontal;
        if (this.width / this.height >= 1.25) {
            splitHorizontal = false;
        } else if (this.height / this.width >= 1.25) {
            splitHorizontal = true;
        } else {
            splitHorizontal = rng.next() > 0.5;
        }

        const max = (splitHorizontal ? this.height : this.width) - minSize;
        if (max <= minSize) return false;

        const splitPos = Math.floor(rng.next() * (max - minSize)) + minSize;

        if (splitHorizontal) {
            this.left = new BSPNode3D(this.x, this.y, this.width, splitPos);
            this.right = new BSPNode3D(this.x, this.y + splitPos, this.width, this.height - splitPos);
        } else {
            this.left = new BSPNode3D(this.x, this.y, splitPos, this.height);
            this.right = new BSPNode3D(this.x + splitPos, this.y, this.width - splitPos, this.height);
        }

        this.isLeaf = false;
        return true;
    }

    getLeaves() {
        if (this.isLeaf) return [this];
        return [...this.left.getLeaves(), ...this.right.getLeaves()];
    }
}

// Campaign Maze using BSP for 3D
class CampaignMaze3D {
    constructor(level, seed) {
        this.level = level;
        this.seed = seed;
        this.rng = new Random(seed);
        this.cellSize = 64; // Match 3D maze cell size

        // Scaled-down sizes for 3D performance
        // Level 1: ~15x15, Level 2: ~19x19, Level 3: ~24x24, etc. (25% growth)
        const baseSize = Math.floor(15 * Math.pow(1.25, level - 1));
        this.cols = baseSize;
        this.rows = baseSize;

        // Number of splits: Level 1 = 0, Level 2 = 1, Level 3 = 2, etc.
        this.numSplits = level - 1;

        // Initialize the grid
        this.grid = [];
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = {
                    walls: { top: true, right: true, bottom: true, left: true },
                    wallTextures: { top: 'brick', right: 'brick', bottom: 'brick', left: 'brick' },
                    visited: false,
                    explored: false,
                    regionId: -1,
                    isConnection: false,
                    isCorridor: false,
                    color: null,
                    isTeleport: false,
                    isExit: false,
                    isStart: false
                };
            }
        }

        // Create BSP tree
        this.root = new BSPNode3D(0, 0, this.cols, this.rows);
        this.regions = [];
        this.corridors = [];
        this.teleportCells = [];

        // Visibility tracking
        this.currentRegion = null;
        this.currentCorridor = null;
        this.visibleCells = new Set(); // Set of "x,y" strings for visible cells

        // Generate the maze
        this.generate();

        // Initialize exit position
        this.exitX = this.exitRegion.region.startX + this.exitRegion.region.width - 1;
        this.exitY = this.exitRegion.region.startY + this.exitRegion.region.height - 1;
    }

    generate() {
        this.performSplits();

        const leaves = this.root.getLeaves();
        const shuffledColors = [...MAZE_COLORS];
        this.shuffleArray(shuffledColors);

        leaves.forEach((leaf, index) => {
            leaf.color = shuffledColors[index % shuffledColors.length];
            leaf.regionId = index;
        });

        this.shrinkRegions(leaves);

        leaves.forEach((leaf, index) => {
            this.generateMiniMaze(leaf, index);
        });

        this.createCorridors(this.root);
        this.setupStartAndExit(leaves);

        this.teleportCells = [];
        this.placeTeleportCells(leaves);

        this.regions = leaves;

        // Update corridor connects arrays after regionIds were reassigned in setupStartAndExit
        for (const corridor of this.corridors) {
            corridor.connects = [corridor.leafA.regionId, corridor.leafB.regionId];
        }

        // Discover the starting region
        this.regions[0].discovered = true;
        this.currentRegion = this.startRegion;
        this.currentCorridor = null;

        // Initialize visible cells
        this.updateVisibleCells();
    }

    performSplits() {
        const minSize = 5; // Smaller minimum for 3D (was 8)
        let nodesToSplit = [this.root];

        for (let i = 0; i < this.numSplits; i++) {
            const nextNodes = [];
            for (const node of nodesToSplit) {
                if (node.split(this.rng, minSize)) {
                    nextNodes.push(node.left, node.right);
                } else {
                    nextNodes.push(node);
                }
            }
            nodesToSplit = nextNodes;
        }
    }

    shrinkRegions(leaves) {
        const corridorWidth = 1;
        const padding = 1; // Smaller padding for 3D

        leaves.forEach(leaf => {
            leaf.innerX = leaf.x + padding;
            leaf.innerY = leaf.y + padding;
            leaf.innerWidth = leaf.width - padding * 2 - corridorWidth;
            leaf.innerHeight = leaf.height - padding * 2 - corridorWidth;

            if (leaf.innerWidth < 3) leaf.innerWidth = 3;
            if (leaf.innerHeight < 3) leaf.innerHeight = 3;
        });
    }

    generateMiniMaze(leaf, regionId) {
        const startX = leaf.innerX;
        const startY = leaf.innerY;
        const width = leaf.innerWidth;
        const height = leaf.innerHeight;

        for (let y = startY; y < startY + height && y < this.rows; y++) {
            for (let x = startX; x < startX + width && x < this.cols; x++) {
                this.grid[y][x].regionId = regionId;
                this.grid[y][x].color = leaf.color;
                this.grid[y][x].visited = false;
            }
        }

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

            this.shuffleArray(directions);

            let foundUnvisited = false;
            for (const dir of directions) {
                const nx = cx + dir.dx;
                const ny = cy + dir.dy;

                if (nx >= startX && nx < startX + width &&
                    ny >= startY && ny < startY + height &&
                    ny < this.rows && nx < this.cols &&
                    !this.grid[ny][nx].visited) {

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

        leaf.region = { startX, startY, width, height };
    }

    createCorridors(node) {
        if (node.isLeaf) return;
        this.connectRegions(node.left, node.right);
        this.createCorridors(node.left);
        this.createCorridors(node.right);
    }

    connectRegions(nodeA, nodeB) {
        const leavesA = nodeA.getLeaves();
        const leavesB = nodeB.getLeaves();

        let bestPair = null;
        let bestDistance = Infinity;

        for (const leafA of leavesA) {
            for (const leafB of leavesB) {
                const dist = this.regionDistance(leafA, leafB);
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestPair = [leafA, leafB];
                }
            }
        }

        if (bestPair) {
            this.createCorridorBetween(bestPair[0], bestPair[1]);
        }
    }

    regionDistance(leafA, leafB) {
        const centerAX = leafA.x + leafA.width / 2;
        const centerAY = leafA.y + leafA.height / 2;
        const centerBX = leafB.x + leafB.width / 2;
        const centerBY = leafB.y + leafB.height / 2;
        return Math.abs(centerAX - centerBX) + Math.abs(centerAY - centerBY);
    }

    createCorridorBetween(leafA, leafB) {
        const regA = leafA.region;
        const regB = leafB.region;

        if (!regA || !regB) return;

        const horizontal = Math.abs((leafA.x + leafA.width / 2) - (leafB.x + leafB.width / 2)) >
                          Math.abs((leafA.y + leafA.height / 2) - (leafB.y + leafB.height / 2));

        let connectionPoint;

        if (horizontal) {
            const leftLeaf = leafA.x < leafB.x ? leafA : leafB;
            const rightLeaf = leafA.x < leafB.x ? leafB : leafA;
            const leftReg = leftLeaf.region;
            const rightReg = rightLeaf.region;

            const overlapStart = Math.max(leftReg.startY, rightReg.startY);
            const overlapEnd = Math.min(leftReg.startY + leftReg.height, rightReg.startY + rightReg.height);

            if (overlapEnd > overlapStart) {
                const corridorY = Math.floor(overlapStart + this.rng.next() * (overlapEnd - overlapStart - 1));
                const startX = leftReg.startX + leftReg.width;
                const endX = rightReg.startX;
                connectionPoint = this.carveCorridor(startX, corridorY, endX, corridorY, leftLeaf, rightLeaf);
            }
        } else {
            const topLeaf = leafA.y < leafB.y ? leafA : leafB;
            const bottomLeaf = leafA.y < leafB.y ? leafB : leafA;
            const topReg = topLeaf.region;
            const bottomReg = bottomLeaf.region;

            const overlapStart = Math.max(topReg.startX, bottomReg.startX);
            const overlapEnd = Math.min(topReg.startX + topReg.width, bottomReg.startX + bottomReg.width);

            if (overlapEnd > overlapStart) {
                const corridorX = Math.floor(overlapStart + this.rng.next() * (overlapEnd - overlapStart - 1));
                const startY = topReg.startY + topReg.height;
                const endY = bottomReg.startY;
                connectionPoint = this.carveCorridor(corridorX, startY, corridorX, endY, topLeaf, bottomLeaf);
            }
        }

        if (connectionPoint) {
            leafA.connections.push({ target: leafB, point: connectionPoint });
            leafB.connections.push({ target: leafA, point: connectionPoint });
        }
    }

    carveCorridor(x1, y1, x2, y2, leafA, leafB) {
        const corridor = [];
        const dx = x2 > x1 ? 1 : (x2 < x1 ? -1 : 0);
        const dy = y2 > y1 ? 1 : (y2 < y1 ? -1 : 0);

        let x = x1;
        let y = y1;

        const regA = leafA.region;
        const regB = leafB.region;

        // Open exit from region A
        if (dx !== 0) {
            const exitX = regA.startX + regA.width - 1;
            const exitY = y1;
            if (exitY >= 0 && exitY < this.rows && exitX >= 0 && exitX < this.cols) {
                this.grid[exitY][exitX].walls.right = false;
                if (x1 >= 0 && x1 < this.cols) {
                    this.grid[y1][x1].walls.left = false;
                }
            }
        } else {
            const exitX = x1;
            const exitY = regA.startY + regA.height - 1;
            if (exitY >= 0 && exitY < this.rows && exitX >= 0 && exitX < this.cols) {
                this.grid[exitY][exitX].walls.bottom = false;
                if (y1 >= 0 && y1 < this.rows) {
                    this.grid[y1][x1].walls.top = false;
                }
            }
        }

        // Carve corridor cells
        let prevX = -1, prevY = -1;
        while (true) {
            if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                const cell = this.grid[y][x];
                if (cell.regionId === -1) {
                    cell.isCorridor = true;
                    cell.regionId = -2;
                    cell.color = { r: 74, g: 144, b: 226 }; // Blue for corridors
                    corridor.push({ x, y });
                }

                if (prevX >= 0 && prevY >= 0) {
                    if (prevX < x) {
                        this.grid[prevY][prevX].walls.right = false;
                        cell.walls.left = false;
                    } else if (prevX > x) {
                        this.grid[prevY][prevX].walls.left = false;
                        cell.walls.right = false;
                    } else if (prevY < y) {
                        this.grid[prevY][prevX].walls.bottom = false;
                        cell.walls.top = false;
                    } else if (prevY > y) {
                        this.grid[prevY][prevX].walls.top = false;
                        cell.walls.bottom = false;
                    }
                }

                prevX = x;
                prevY = y;
            }

            if (x === x2 && y === y2) break;
            if (x !== x2) x += dx;
            else if (y !== y2) y += dy;
        }

        // Open entry to region B
        if (dx !== 0) {
            const entryX = regB.startX;
            const entryY = y2;
            if (entryY >= 0 && entryY < this.rows && entryX >= 0 && entryX < this.cols) {
                this.grid[entryY][entryX].walls.left = false;
                if (x2 >= 0 && x2 < this.cols && y2 >= 0 && y2 < this.rows) {
                    this.grid[y2][x2].walls.right = false;
                }
            }
        } else {
            const entryX = x2;
            const entryY = regB.startY;
            if (entryY >= 0 && entryY < this.rows && entryX >= 0 && entryX < this.cols) {
                this.grid[entryY][entryX].walls.top = false;
                if (x2 >= 0 && x2 < this.cols && y2 >= 0 && y2 < this.rows) {
                    this.grid[y2][x2].walls.bottom = false;
                }
            }
        }

        this.corridors.push({ cells: corridor, connects: [leafA.regionId, leafB.regionId], leafA, leafB });

        const midIdx = Math.floor(corridor.length / 2);
        return corridor[midIdx] || corridor[0];
    }

    setupStartAndExit(leaves) {
        let startLeaf = leaves[0];
        let minDist = startLeaf.x + startLeaf.y;

        for (const leaf of leaves) {
            const dist = leaf.x + leaf.y;
            if (dist < minDist) {
                minDist = dist;
                startLeaf = leaf;
            }
        }

        const startIdx = leaves.indexOf(startLeaf);
        if (startIdx > 0) {
            [leaves[0], leaves[startIdx]] = [leaves[startIdx], leaves[0]];
            leaves.forEach((leaf, idx) => leaf.regionId = idx);
        }

        let exitLeaf = leaves[leaves.length - 1];
        let maxDist = 0;

        for (const leaf of leaves) {
            const dist = (leaf.x + leaf.width) + (leaf.y + leaf.height);
            if (dist > maxDist && leaf !== startLeaf) {
                maxDist = dist;
                exitLeaf = leaf;
            }
        }

        this.startRegion = startLeaf;
        this.startX = startLeaf.region.startX;
        this.startY = startLeaf.region.startY;

        this.exitRegion = exitLeaf;
        const exitCellX = exitLeaf.region.startX + exitLeaf.region.width - 1;
        const exitCellY = exitLeaf.region.startY + exitLeaf.region.height - 1;

        if (exitCellY < this.rows && exitCellX < this.cols) {
            this.grid[exitCellY][exitCellX].isExit = true;
        }

        if (this.startY < this.rows && this.startX < this.cols) {
            this.grid[this.startY][this.startX].isStart = true;
        }
    }

    placeTeleportCells(leaves) {
        if (this.level < 3) return;
        const numTeleports = this.level - 2;

        const availableCorners = [];

        for (const leaf of leaves) {
            const reg = leaf.region;
            if (!reg) continue;
            if (leaf === this.startRegion) continue;
            if (leaf === this.exitRegion) continue;

            const corners = [
                { x: reg.startX, y: reg.startY, region: leaf },
                { x: reg.startX + reg.width - 1, y: reg.startY, region: leaf },
                { x: reg.startX, y: reg.startY + reg.height - 1, region: leaf },
                { x: reg.startX + reg.width - 1, y: reg.startY + reg.height - 1, region: leaf }
            ];

            for (const corner of corners) {
                availableCorners.push(corner);
            }
        }

        this.shuffleArray(availableCorners);

        for (let i = 0; i < Math.min(numTeleports, availableCorners.length); i++) {
            const corner = availableCorners[i];
            if (corner.y < this.rows && corner.x < this.cols) {
                this.grid[corner.y][corner.x].isTeleport = true;
                this.teleportCells.push({
                    x: corner.x,
                    y: corner.y,
                    region: corner.region
                });
            }
        }
    }

    // Update visible cells based on current region/corridor
    updateVisibleCells() {
        this.visibleCells.clear();

        if (this.currentCorridor) {
            // In corridor: show corridor + both connecting regions
            for (const c of this.currentCorridor.cells) {
                this.visibleCells.add(`${c.x},${c.y}`);
            }

            const leafA = this.currentCorridor.leafA;
            const leafB = this.currentCorridor.leafB;

            if (leafA && leafA.region) {
                this.addRegionToVisible(leafA);
                // Also add all corridors connected to leafA
                this.addCorridorsForRegion(leafA);
            }
            if (leafB && leafB.region) {
                this.addRegionToVisible(leafB);
                // Also add all corridors connected to leafB
                this.addCorridorsForRegion(leafB);
            }
        } else if (this.currentRegion && this.currentRegion.region) {
            // In region: show region + all connected corridors + connected regions
            this.addRegionToVisible(this.currentRegion);

            // Add connected corridors and their other regions using leaf references (more reliable)
            for (const corridor of this.corridors) {
                const isConnected = corridor.leafA === this.currentRegion || corridor.leafB === this.currentRegion;
                if (isConnected) {
                    // Add all corridor cells
                    for (const c of corridor.cells) {
                        this.visibleCells.add(`${c.x},${c.y}`);
                    }

                    // Add the connected region
                    const otherLeaf = corridor.leafA === this.currentRegion ? corridor.leafB : corridor.leafA;
                    if (otherLeaf && otherLeaf.region) {
                        this.addRegionToVisible(otherLeaf);
                    }
                }
            }
        }
    }

    // Helper to add all corridors connected to a region
    addCorridorsForRegion(leaf) {
        for (const corridor of this.corridors) {
            if (corridor.leafA === leaf || corridor.leafB === leaf) {
                for (const c of corridor.cells) {
                    this.visibleCells.add(`${c.x},${c.y}`);
                }
            }
        }
    }

    addRegionToVisible(leaf) {
        if (!leaf || !leaf.region) return;
        const reg = leaf.region;
        for (let y = reg.startY; y < reg.startY + reg.height && y < this.rows; y++) {
            for (let x = reg.startX; x < reg.startX + reg.width && x < this.cols; x++) {
                this.visibleCells.add(`${x},${y}`);
            }
        }
    }

    // Check if a cell is currently visible for rendering
    isCellVisible(x, y) {
        return this.visibleCells.has(`${x},${y}`);
    }

    // Check discovery and update visibility
    checkDiscovery(playerX, playerY) {
        const cellX = Math.floor(playerX / this.cellSize);
        const cellY = Math.floor(playerY / this.cellSize);

        if (cellY >= 0 && cellY < this.rows && cellX >= 0 && cellX < this.cols) {
            const cell = this.grid[cellY][cellX];

            if (cell.isCorridor && cell.regionId === -2) {
                for (const corridor of this.corridors) {
                    for (const c of corridor.cells) {
                        if (c.x === cellX && c.y === cellY) {
                            corridor.discovered = true;
                            if (this.currentCorridor !== corridor) {
                                this.currentCorridor = corridor;
                                this.currentRegion = null;
                                this.updateVisibleCells();
                            }
                            break;
                        }
                    }
                }
            } else if (cell.regionId >= 0 && cell.regionId < this.regions.length) {
                const region = this.regions[cell.regionId];
                if (!region.discovered) {
                    region.discovered = true;
                }
                if (this.currentRegion !== region) {
                    this.currentRegion = region;
                    this.currentCorridor = null;
                    this.updateVisibleCells();
                }

                for (const corridor of this.corridors) {
                    if (corridor.connects.includes(cell.regionId)) {
                        corridor.discovered = true;
                    }
                }
            }

            // Mark explored for minimap
            this.markExplored(playerX, playerY);
        }
    }

    markExplored(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        if (cellX >= 0 && cellX < this.cols && cellY >= 0 && cellY < this.rows) {
            this.grid[cellY][cellX].explored = true;

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

    // Check teleport
    checkTeleport(playerX, playerY) {
        const cellX = Math.floor(playerX / this.cellSize);
        const cellY = Math.floor(playerY / this.cellSize);

        if (cellY >= 0 && cellY < this.rows && cellX >= 0 && cellX < this.cols) {
            const cell = this.grid[cellY][cellX];
            if (cell.isTeleport) {
                const dest = this.getRandomTeleportDestination(playerX, playerY);
                if (dest) {
                    cell.isTeleport = false;
                    this.teleportCells = this.teleportCells.filter(t =>
                        t.x !== cellX || t.y !== cellY
                    );
                }
                return dest;
            }
        }
        return null;
    }

    getRandomTeleportDestination(currentX, currentY) {
        const roll = this.rng.next();
        const currentCellX = Math.floor(currentX / this.cellSize);
        const currentCellY = Math.floor(currentY / this.cellSize);
        let currentRegionId = -1;

        if (currentCellY >= 0 && currentCellY < this.rows && currentCellX >= 0 && currentCellX < this.cols) {
            currentRegionId = this.grid[currentCellY][currentCellX].regionId;
        }

        if (roll < 1/3) {
            const undiscoveredRegions = this.regions.filter(r =>
                !r.discovered && r.regionId !== currentRegionId
            );

            if (undiscoveredRegions.length > 0) {
                const dest = undiscoveredRegions[Math.floor(this.rng.next() * undiscoveredRegions.length)];
                dest.discovered = true;
                this.currentRegion = dest;
                this.currentCorridor = null;
                this.updateVisibleCells();

                return {
                    x: dest.region.startX * this.cellSize + this.cellSize / 2,
                    y: dest.region.startY * this.cellSize + this.cellSize / 2
                };
            }
        }

        const discoveredRegions = this.regions.filter(r =>
            r.discovered && r.regionId !== currentRegionId
        );

        if (discoveredRegions.length > 0) {
            const dest = discoveredRegions[Math.floor(this.rng.next() * discoveredRegions.length)];
            this.currentRegion = dest;
            this.currentCorridor = null;
            this.updateVisibleCells();

            return {
                x: dest.region.startX * this.cellSize + this.cellSize / 2,
                y: dest.region.startY * this.cellSize + this.cellSize / 2
            };
        }

        return null;
    }

    // Check win condition
    checkWin(playerX, playerY) {
        const cellX = Math.floor(playerX / this.cellSize);
        const cellY = Math.floor(playerY / this.cellSize);
        return cellX === this.exitX && cellY === this.exitY && this.exitRegion.discovered;
    }

    // Get starting position
    getStartPosition() {
        return {
            x: this.startX * this.cellSize + this.cellSize / 2,
            y: this.startY * this.cellSize + this.cellSize / 2
        };
    }

    // Get cell at position (for compatibility with Maze class)
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

    // Check if position is valid (not hitting walls)
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

    // Get neighbors for AI pathfinding
    getNeighbors(cellX, cellY) {
        const neighbors = [];
        const cell = this.grid[cellY][cellX];

        if (!cell.walls.top && cellY > 0) neighbors.push([cellX, cellY - 1]);
        if (!cell.walls.bottom && cellY < this.rows - 1) neighbors.push([cellX, cellY + 1]);
        if (!cell.walls.left && cellX > 0) neighbors.push([cellX - 1, cellY]);
        if (!cell.walls.right && cellX < this.cols - 1) neighbors.push([cellX + 1, cellY]);

        return neighbors;
    }

    // Draw minimap with colored regions
    drawMinimap(playerX, playerY, minimapCanvas, minimapCtx, minimapSize) {
        minimapCtx.fillStyle = '#000';
        minimapCtx.fillRect(0, 0, minimapSize, minimapSize);

        const cellSize = Math.min(minimapSize / this.cols, minimapSize / this.rows);

        minimapCtx.lineWidth = 1;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];

                // Skip unexplored cells
                if (!cell.explored) continue;

                // Skip empty padding cells (not part of any region or corridor)
                if (cell.regionId === -1) continue;

                const screenX = x * cellSize;
                const screenY = y * cellSize;

                // Draw colored background for regions
                if (cell.color && cell.regionId >= 0) {
                    minimapCtx.fillStyle = `rgba(${cell.color.r}, ${cell.color.g}, ${cell.color.b}, 0.3)`;
                    minimapCtx.fillRect(screenX, screenY, cellSize, cellSize);
                } else if (cell.isCorridor) {
                    minimapCtx.fillStyle = 'rgba(74, 144, 226, 0.3)';
                    minimapCtx.fillRect(screenX, screenY, cellSize, cellSize);
                }

                // Highlight start
                if (cell.isStart) {
                    minimapCtx.fillStyle = '#ffaa00';
                    minimapCtx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
                }

                // Highlight exit
                if (cell.isExit) {
                    minimapCtx.fillStyle = '#00ff88';
                    minimapCtx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
                }

                // Highlight teleport
                if (cell.isTeleport) {
                    minimapCtx.fillStyle = '#8b5cf6';
                    minimapCtx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
                }

                // Draw walls with region color
                const color = cell.color || { r: 74, g: 144, b: 226 };
                minimapCtx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
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

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
