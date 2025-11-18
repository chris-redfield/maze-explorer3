/**
 * Player logic and movement for Maze Explorer 3D
 */

class Player {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.pitch = 0;
        this.moveSpeed = 3;
        this.rotSpeed = 0.05;
    }

    move(dx, dy, maze) {
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        // Check collision for X movement
        if (maze.isValidPosition(newX, this.y)) {
            this.x = newX;
        }
        
        // Check collision for Y movement
        if (maze.isValidPosition(this.x, newY)) {
            this.y = newY;
        }
    }

    checkExit(maze) {
        const { cellX, cellY } = maze.getCellCoords(this.x, this.y);
        return cellX === maze.exitX && cellY === maze.exitY;
    }

    // Update player angle and pitch
    rotate(deltaAngle) {
        this.angle += deltaAngle;
        this.angle = PerformanceUtils.normalizeAngle(this.angle);
    }

    lookUp(deltaPitch) {
        this.pitch += deltaPitch;
        const maxPitch = 1.4;
        this.pitch = PerformanceUtils.clamp(this.pitch, -maxPitch, maxPitch);
    }

    // Reset player to starting position
    reset(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.pitch = 0;
    }

    // Get movement vectors based on current angle
    getMovementVectors() {
        return {
            forward: {
                x: Math.cos(this.angle) * this.moveSpeed,
                y: Math.sin(this.angle) * this.moveSpeed
            },
            backward: {
                x: -Math.cos(this.angle) * this.moveSpeed,
                y: -Math.sin(this.angle) * this.moveSpeed
            },
            strafe: {
                x: Math.cos(this.angle + Math.PI / 2) * this.moveSpeed,
                y: Math.sin(this.angle + Math.PI / 2) * this.moveSpeed
            }
        };
    }

    // Get current cell coordinates
    getCurrentCell(maze) {
        return maze.getCellCoords(this.x, this.y);
    }
}