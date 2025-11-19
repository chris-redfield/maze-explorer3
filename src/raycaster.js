/**
 * Raycasting engine for Maze Explorer 3D
 */

class Raycaster {
    constructor() {
        this.fov = Math.PI / 3;
        this.rayCount = 240;
        this.stripWidth = Math.ceil(1400 / this.rayCount); // Default canvas width
        
        // Pre-calculate ray angles for performance
        this.rayAngles = new Float32Array(this.rayCount);
        this.updateRayAngles();
        
        // Object pool for ray results
        this.rayPool = new ObjectPool(
            () => ({ dist: 0, angle: 0, isExit: false, isStart: false, wallSide: null, hitX: 0, hitY: 0, textureType: 'brick' }),
            (ray) => {
                ray.dist = 0;
                ray.angle = 0;
                ray.isExit = false;
                ray.isStart = false;
                ray.wallSide = null;
                ray.hitX = 0;
                ray.hitY = 0;
                ray.textureType = 'brick';
            },
            this.rayCount
        );
    }

    updateRayAngles() {
        for (let i = 0; i < this.rayCount; i++) {
            this.rayAngles[i] = -this.fov / 2 + (this.fov * i / this.rayCount);
        }
    }

    updateStripWidth(canvasWidth) {
        this.stripWidth = Math.ceil(canvasWidth / this.rayCount);
    }

    castRays(player, maze) {
        const rays = [];
        
        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = player.angle + this.rayAngles[i];
            const ray = this.castRay(rayAngle, player, maze);
            rays.push(ray);
        }
        
        return rays;
    }

    castRay(angle, player, maze) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let dist = 0;
        const step = 0.5;
        const maxDist = 1000;
        let hitWall = false;
        let hitCellX = -1;
        let hitCellY = -1;
        let wallSide = null;
        let hitX = 0;
        let hitY = 0;
        let textureType = 'brick';
        
        while (!hitWall && dist < maxDist) {
            dist += step;
            const testX = player.x + dx * dist;
            const testY = player.y + dy * dist;
            
            const cellX = Math.floor(testX / maze.cellSize);
            const cellY = Math.floor(testY / maze.cellSize);
            
            if (cellX < 0 || cellX >= maze.cols || cellY < 0 || cellY >= maze.rows) {
                hitWall = true;
                break;
            }
            
            const cell = maze.grid[cellY][cellX];
            const localX = testX % maze.cellSize;
            const localY = testY % maze.cellSize;
            
            // Check wall collisions
            if (localY < 1 && cell.walls.top) {
                hitWall = true;
                hitCellX = cellX;
                hitCellY = cellY;
                wallSide = 'horizontal';
                hitX = testX;
                hitY = testY;
                textureType = cell.wallTextures.top;
            } else if (localY > maze.cellSize - 1 && cell.walls.bottom) {
                hitWall = true;
                hitCellX = cellX;
                hitCellY = cellY;
                wallSide = 'horizontal';
                hitX = testX;
                hitY = testY;
                textureType = cell.wallTextures.bottom;
            } else if (localX < 1 && cell.walls.left) {
                hitWall = true;
                hitCellX = cellX;
                hitCellY = cellY;
                wallSide = 'vertical';
                hitX = testX;
                hitY = testY;
                textureType = cell.wallTextures.left;
            } else if (localX > maze.cellSize - 1 && cell.walls.right) {
                hitWall = true;
                hitCellX = cellX;
                hitCellY = cellY;
                wallSide = 'vertical';
                hitX = testX;
                hitY = testY;
                textureType = cell.wallTextures.right;
            }
        }
        
        const isExit = (hitCellX === maze.exitX && hitCellY === maze.exitY);
        const isStart = (hitCellX === 0 && hitCellY === 0);
        
        return { dist, angle, isExit, isStart, wallSide, hitX, hitY, textureType };
    }

    render(player, maze, canvas, ctx, textureManager, windowsMode = false) {
        const rays = this.castRays(player, maze);
        const pitchOffset = player.pitch * 300;
        const horizonY = canvas.height / 2 + pitchOffset;
        
        // Draw sky
        const skyTexture = textureManager.getTexture('sky');

        if (skyTexture) {
            const width = skyTexture.width;
            const height = skyTexture.height;
            
            let angleRatio = player.angle / (2 * Math.PI);
            
            let xOffset = (angleRatio * width) % width;
            if (xOffset < 0) xOffset += width;

            const skyHeight = Math.max(0, horizonY);

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, canvas.width, skyHeight);
            ctx.clip();

            ctx.drawImage(skyTexture, 
                xOffset, 0, width - xOffset, height,
                0, 0, canvas.width * (1 - xOffset/width), skyHeight
            );
            
            if (xOffset > 0) {
                ctx.drawImage(skyTexture, 
                    0, 0, xOffset, height,
                    canvas.width * (1 - xOffset/width), 0, canvas.width * (xOffset/width), skyHeight
                );
            }
            
            ctx.restore();
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, Math.max(0, horizonY));
        }
        
        // Draw floor
        if (windowsMode) {
            this.renderTexturedFloor(player, canvas, ctx, textureManager, horizonY);
        } else {
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(0, Math.max(0, horizonY), canvas.width, canvas.height);
        }
        
        // Draw walls
        for (let i = 0; i < rays.length; i++) {
            const ray = rays[i];
            const correctedDist = ray.dist * Math.cos(ray.angle - player.angle);
            const wallHeight = (maze.cellSize * 300) / correctedDist;
            
            const wallTop = (canvas.height - wallHeight) / 2 + pitchOffset;
            const wallBottom = wallTop + wallHeight;
            
            const stripX = i * this.stripWidth;
            
            if (windowsMode && !ray.isExit && !ray.isStart) {
                this.renderTexturedWallStrip(ray, stripX, wallTop, wallBottom, correctedDist, maze, ctx, textureManager);
            } else {
                this.renderColoredWallStrip(ray, stripX, wallTop, wallBottom, correctedDist, canvas, ctx);
            }
        }
    }

    renderColoredWallStrip(ray, x, top, bottom, dist, canvas, ctx) {
        let brightness = Math.max(0, 1 - dist / 500);
        let r, g, b;
        
        if (ray.isExit) {
            r = 0;
            g = 255 * brightness;
            b = 136 * brightness;
        } else if (ray.isStart) {
            r = 255 * brightness;
            g = 170 * brightness;
            b = 0;
        } else {
            if (ray.wallSide === 'vertical') brightness *= 0.7;
            r = 74 * brightness;
            g = 144 * brightness;
            b = 226 * brightness;
        }
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, Math.max(0, top), this.stripWidth, Math.min(canvas.height, bottom) - Math.max(0, top));
    }

    renderTexturedWallStrip(ray, x, top, bottom, dist, maze, ctx, textureManager) {
        const textureData = ray.textureType === 'door' ? 
            textureManager.getPixelData('door') : 
            textureManager.getPixelData('brick');
        
        let worldPos = ray.wallSide === 'vertical' ? ray.hitY : ray.hitX;
        let texX = Math.floor((Math.abs(worldPos) * 2)) % 32;
        texX = PerformanceUtils.clamp(texX, 0, 31);
        
        let brightness = Math.max(0, 1 - dist / 500);
        if (ray.wallSide === 'vertical') brightness *= 0.7;
        
        const clampedTop = Math.max(0, Math.floor(top));
        const clampedBottom = Math.min(ctx.canvas.height, Math.ceil(bottom));
        const wallHeight = bottom - top;
        
        const sampleRate = Math.max(1, Math.floor((clampedBottom - clampedTop) / 32));
        
        for (let y = clampedTop; y < clampedBottom; y += sampleRate) {
            let worldHeight = ((y - top) / wallHeight) * maze.cellSize;
            let texY = Math.floor((worldHeight * 0.5)) % 32;
            texY = PerformanceUtils.clamp(texY, 0, 31);
            
            const texIndex = (texY * 32 + texX) * 4;
            const r = textureData[texIndex] * brightness;
            const g = textureData[texIndex + 1] * brightness;
            const b = textureData[texIndex + 2] * brightness;
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, this.stripWidth, sampleRate);
        }
    }

    renderTexturedFloor(player, canvas, ctx, textureManager, horizonY) {
        const skipX = 4;
        const skipY = 4;
        const carpetData = textureManager.getPixelData('carpet');
        
        for (let y = Math.max(0, Math.floor(horizonY)); y < canvas.height; y += skipY) {
            const floorDist = (canvas.height / 2) / (y - canvas.height / 2 - player.pitch * 300);
            
            for (let i = 0; i < this.rayCount; i += skipX) {
                const rayAngle = player.angle - this.fov / 2 + (this.fov * i / this.rayCount);
                const floorX = player.x + Math.cos(rayAngle) * floorDist * 100;
                const floorY = player.y + Math.sin(rayAngle) * floorDist * 100;
                
                let texX = Math.floor((Math.abs(floorX) * 4)) % 64;
                let texY = Math.floor((Math.abs(floorY) * 4)) % 64;
                texX = PerformanceUtils.clamp(texX, 0, 63);
                texY = PerformanceUtils.clamp(texY, 0, 63);
                
                const texIndex = (texY * 64 + texX) * 4;
                const brightness = Math.max(0.3, 1 - floorDist / 8);
                
                const r = carpetData[texIndex] * brightness;
                const g = carpetData[texIndex + 1] * brightness;
                const b = carpetData[texIndex + 2] * brightness;
                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                const stripX = i * this.stripWidth;
                ctx.fillRect(stripX, y, this.stripWidth * skipX, skipY);
            }
        }
    }

    drawHand(canvas, ctx) {
        const handWidth = 150;
        const handHeight = 200;
        const handX = canvas.width - handWidth - 20;
        const handY = canvas.height - handHeight;
        
        ctx.fillStyle = '#d4a574';
        
        // Palm
        ctx.beginPath();
        ctx.ellipse(handX + 60, handY + 120, 40, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Fingers
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(handX + 30 + i * 15, handY + 80 + i * 5, 12, 30, -0.2 + i * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Thumb
        ctx.beginPath();
        ctx.ellipse(handX + 20, handY + 130, 15, 25, -0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Weapon handle
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(handX + 35, handY + 150, 50, 50);
    }
}