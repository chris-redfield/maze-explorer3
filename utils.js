/**
 * Utility classes and functions for Maze Explorer 3D
 */

// Seeded random number generator
class Random {
    constructor(seed) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

// Performance utilities
class PerformanceUtils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static interpolate(a, b, t) {
        return a + (b - a) * t;
    }

    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static fastDistance(x1, y1, x2, y2) {
        // Manhattan distance - faster approximation
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    static normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    // Fast inverse square root approximation
    static fastInvSqrt(number) {
        const x2 = number * 0.5;
        let y = number;
        const view = new DataView(new ArrayBuffer(4));
        view.setFloat32(0, y);
        let i = view.getUint32(0);
        i = 0x5f3759df - (i >> 1);
        view.setUint32(0, i);
        y = view.getFloat32(0);
        y = y * (1.5 - (x2 * y * y));
        return y;
    }
}

// Object pooling for better memory management
class ObjectPool {
    constructor(createFn, resetFn = null, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        
        // Pre-allocate objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }

    release(obj) {
        if (this.resetFn) {
            this.resetFn(obj);
        }
        this.pool.push(obj);
    }

    clear() {
        this.pool.length = 0;
    }
}