/**
 * AI pathfinding and automation for Maze Explorer 3D
 */

class AIController {
    constructor() {
        this.path = [];
        this.currentWaypoint = 0;
        this.recalcInterval = 60; // Frames between path recalculation
        this.framesSinceRecalc = 0;
        this.rotationSpeed = 0.05; // Smooth rotation speed
        this.targetAngle = null; // Store the target angle for smooth transitions
        this.angleNoise = 0; // Small random noise for natural movement
        this.noiseUpdateCounter = 0;
    }

    findPath(maze, startX, startY, endX, endY) {
        const startCellX = Math.floor(startX / maze.cellSize);
        const startCellY = Math.floor(startY / maze.cellSize);
        const endCellX = endX;
        const endCellY = endY;

        // BFS pathfinding
        const queue = [[startCellX, startCellY, []]];
        const visited = new Set();
        visited.add(`${startCellX},${startCellY}`);

        while (queue.length > 0) {
            const [x, y, path] = queue.shift();

            // Found the target
            if (x === endCellX && y === endCellY) {
                return path.map(([cx, cy]) => ({
                    x: cx * maze.cellSize + maze.cellSize / 2,
                    y: cy * maze.cellSize + maze.cellSize / 2
                }));
            }

            // Get valid neighbors using maze's method
            const neighbors = maze.getNeighbors(x, y);

            for (const [nx, ny] of neighbors) {
                const key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push([nx, ny, [...path, [nx, ny]]]);
                }
            }
        }

        return []; // No path found
    }

    smoothRotateTowards(currentAngle, targetAngle, speed) {
        // Normalize angles to -PI to PI range
        let diff = targetAngle - currentAngle;
        
        // Handle wrapping around
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        
        // Apply rotation speed limit
        // Stop rotating if we're very close (prevents overshooting)
        if (Math.abs(diff) < speed * 1.5) {
            return targetAngle;
        }
        
        return currentAngle + Math.sign(diff) * speed;
    }

    update(player, maze, moveSpeed = 0.5) {
        this.framesSinceRecalc++;

        // Recalculate path periodically or if we don't have one
        if (this.path.length === 0 || this.framesSinceRecalc >= this.recalcInterval) {
            this.path = this.findPath(maze, player.x, player.y, maze.exitX, maze.exitY);
            this.currentWaypoint = 0;
            this.framesSinceRecalc = 0;
            this.targetAngle = null; // Reset target angle on path recalc
        }

        // Follow the path
        if (this.path.length > 0 && this.currentWaypoint < this.path.length) {
            const target = this.path[this.currentWaypoint];
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const dist = PerformanceUtils.fastDistance(player.x, player.y, target.x, target.y);

            // Move to next waypoint if close enough
            if (dist < 10) {
                this.currentWaypoint++;
                this.targetAngle = null; // Reset target angle when reaching waypoint
                return;
            }

            // Update noise periodically for natural movement (every 90 frames)
            this.noiseUpdateCounter++;
            if (this.noiseUpdateCounter >= 90) {
                // Small random noise between -0.015 and 0.015 radians (~0.86 degrees)
                this.angleNoise = (Math.random() - 0.5) * 0.03;
                this.noiseUpdateCounter = 0;
            }

            // Calculate the base target angle
            const baseTargetAngle = Math.atan2(dy, dx);
            
            // Add noise to make movement more natural
            const noisyTargetAngle = baseTargetAngle + this.angleNoise;
            
            // Only update target angle if we don't have one or if we've moved to a new waypoint
            if (this.targetAngle === null) {
                this.targetAngle = noisyTargetAngle;
            }

            // Smooth rotation towards the target with noise
            player.angle = this.smoothRotateTowards(player.angle, noisyTargetAngle, this.rotationSpeed);

            // Only move if we're roughly facing the right direction (within 30 degrees)
            const angleDiff = Math.abs(noisyTargetAngle - player.angle);
            const normalizedDiff = Math.min(angleDiff, Math.abs(angleDiff - 2 * Math.PI));
            
            if (normalizedDiff < Math.PI / 6) { // 30 degrees threshold
                // Move forward in the direction we're facing
                const moveX = Math.cos(player.angle) * player.moveSpeed * moveSpeed;
                const moveY = Math.sin(player.angle) * player.moveSpeed * moveSpeed;
                player.move(moveX, moveY, maze);
            }
        }
    }

    // Get current pathfinding status
    getStatus() {
        return {
            hasPath: this.path.length > 0,
            waypointsRemaining: this.path.length - this.currentWaypoint,
            totalWaypoints: this.path.length,
            currentTarget: this.currentWaypoint < this.path.length ? this.path[this.currentWaypoint] : null
        };
    }

    // Reset AI state
    reset() {
        this.path = [];
        this.currentWaypoint = 0;
        this.framesSinceRecalc = 0;
        this.targetAngle = null;
        this.angleNoise = 0;
        this.noiseUpdateCounter = 0;
    }

    // Draw debug info (path visualization)
    drawDebugPath(maze, canvas, ctx) {
        if (this.path.length === 0) return;

        ctx.save();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;

        // Draw path lines
        ctx.beginPath();
        for (let i = 0; i < this.path.length - 1; i++) {
            const current = this.path[i];
            const next = this.path[i + 1];
            
            if (i === 0) {
                ctx.moveTo(current.x, current.y);
            }
            ctx.lineTo(next.x, next.y);
        }
        ctx.stroke();

        // Draw waypoints
        ctx.fillStyle = '#00ff88';
        for (let i = 0; i < this.path.length; i++) {
            const waypoint = this.path[i];
            ctx.beginPath();
            ctx.arc(waypoint.x, waypoint.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Highlight current target
        if (this.currentWaypoint < this.path.length) {
            const target = this.path[this.currentWaypoint];
            ctx.strokeStyle = '#ff3366';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}