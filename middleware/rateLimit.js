// Rate limiting middleware for authentication endpoints
// Stores failed attempts in memory with automatic cleanup

class RateLimiter {
    constructor(options = {}) {
        this.maxAttempts = options.maxAttempts || 5;
        this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
        this.lockoutMs = options.lockoutMs || 30 * 60 * 1000; // 30 minutes lockout
        this.store = new Map(); // IP -> { attempts, firstAttemptTime, lockedUntil }
        
        // Clean up old entries periodically (every 5 minutes)
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Middleware function for rate limiting
     */
    middleware() {
        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const key = `${ip}:${req.path}`;
            
            const now = Date.now();
            let record = this.store.get(key);

            // Check if IP is currently locked out
            if (record && record.lockedUntil && now < record.lockedUntil) {
                const remainingTime = Math.ceil((record.lockedUntil - now) / 1000);
                res.status(429); // Too Many Requests
                return res.render('error', {
                    title: 'Too Many Attempts',
                    message: `Too many failed attempts. Please try again in ${remainingTime} seconds.`,
                    user: res.locals?.user || req.session?.user || null
                });
            }

            // Reset record if window has expired
            if (record && now - record.firstAttemptTime > this.windowMs) {
                this.store.delete(key);
                record = null;
            }

            // Initialize new record if none exists
            if (!record) {
                this.store.set(key, {
                    attempts: 0,
                    firstAttemptTime: now,
                    lockedUntil: null
                });
                record = this.store.get(key);
            }

            // Store rate limit info in request for later use
            req.rateLimit = {
                key,
                record,
                recordIncrement: () => {
                    this.increment(key);
                    // Check if we just hit the limit
                    const updated = this.store.get(key);
                    if (updated && updated.lockedUntil && now + 100 > updated.lockedUntil) {
                        // Just locked
                        return true;
                    }
                    return false;
                },
                recordSuccess: () => this.success(key)
            };

            next();
        };
    }

    /**
     * Increment failed attempts
     */
    increment(key) {
        const record = this.store.get(key);
        if (!record) return;

        record.attempts++;
        console.log(`Rate limit increment for ${key}: ${record.attempts}/${this.maxAttempts}`);

        // Lock out if max attempts reached
        if (record.attempts >= this.maxAttempts) {
            record.lockedUntil = Date.now() + this.lockoutMs;
            console.log(`Rate limit LOCKOUT for ${key} until ${new Date(record.lockedUntil)}`);
        }

        this.store.set(key, record);
    }

    /**
     * Reset on successful authentication
     */
    success(key) {
        console.log(`Rate limit reset for ${key}`);
        this.store.delete(key);
    }

    /**
     * Clean up old entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
            // Remove if window has expired and no lockout
            if (now - record.firstAttemptTime > this.windowMs && !record.lockedUntil) {
                this.store.delete(key);
            }
            // Remove if lockout has expired
            else if (record.lockedUntil && now > record.lockedUntil) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Get attempt info for display (optional)
     */
    getAttemptInfo(key) {
        const record = this.store.get(key);
        if (!record) return null;
        return {
            attempts: record.attempts,
            maxAttempts: this.maxAttempts,
            remaining: Math.max(0, this.maxAttempts - record.attempts),
            isLocked: record.lockedUntil && Date.now() < record.lockedUntil
        };
    }
}

// Create rate limiters for login and register endpoints
const loginLimiter = new RateLimiter({
    maxAttempts: 5,           // 5 failed attempts
    windowMs: 15 * 60 * 1000,  // in 15 minutes
    lockoutMs: 30 * 60 * 1000  // then lock for 30 minutes
});

const registerLimiter = new RateLimiter({
    maxAttempts: 3,           // 3 failed attempts
    windowMs: 60 * 60 * 1000,  // in 1 hour
    lockoutMs: 60 * 60 * 1000  // then lock for 1 hour
});

module.exports = {
    loginLimiter,
    registerLimiter,
    RateLimiter
};
