// Rate limiting middleware using express-rate-limit
const rateLimit = require('express-rate-limit');

// Custom store that extends MemoryStore to allow manual operations
class ResettableMemoryStore {
    constructor() {
        this.hits = new Map();
        this.resetTime = new Map();
    }

    async increment(key) {
        const hit = this.hits.get(key) || { count: 0, resetTime: Date.now() + this.windowMs };
        hit.count++;
        this.hits.set(key, hit);

        if (!this.resetTime.has(key)) {
            this.resetTime.set(key, hit.resetTime);
        }

        return {
            totalHits: hit.count,
            resetTime: this.resetTime.get(key)
        };
    }

    async decrement(key) {
        const hit = this.hits.get(key);
        if (hit && hit.count > 0) {
            hit.count--;
            if (hit.count === 0) {
                this.hits.delete(key);
                this.resetTime.delete(key);
            } else {
                this.hits.set(key, hit);
            }
        }
    }

    async resetKey(key) {
        this.hits.delete(key);
        this.resetTime.delete(key);
    }

    // Manual increment for failed attempts
    async manualIncrement(key) {
        await this.increment(key);
    }

    init(options) {
        this.windowMs = options.windowMs;
        // Cleanup old entries every 5 minutes
        setInterval(() => {
            const now = Date.now();
            for (const [key, time] of this.resetTime.entries()) {
                if (now > time) {
                    this.hits.delete(key);
                    this.resetTime.delete(key);
                }
            }
        }, 5 * 60 * 1000);
    }

    async resetAll() {
        this.hits.clear();
        this.resetTime.clear();
    }

    get(key) {
        return this.hits.get(key);
    }
}

// Create stores
const loginStore = new ResettableMemoryStore();
const registerStore = new ResettableMemoryStore();

// Login rate limiter - only kicks in when store reaches limit
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    store: loginStore,
    handler: (req, res) => {
        res.status(429);
        return res.render('error', {
            title: 'Too Many Attempts',
            message: 'Too many failed login attempts. Please try again later.',
            user: res.locals?.user || req.session?.user || null
        });
    },
    skip: () => true, // We manually control counting via recordIncrement
    standardHeaders: true,
    legacyHeaders: false
});

// Register rate limiter
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    store: registerStore,
    handler: (req, res) => {
        res.status(429);
        return res.render('error', {
            title: 'Too Many Attempts',
            message: 'Too many registration attempts. Please try again later.',
            user: res.locals?.user || req.session?.user || null
        });
    },
    skip: () => true, // We manually control counting
    standardHeaders: true,
    legacyHeaders: false
});

// Helper middleware to attach functions to request
const attachRateLimitHelpers = (store) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${ip}`;

        req.rateLimit = {
            recordSuccess: async () => {
                await store.resetKey(key);
            },
            recordIncrement: async () => {
                await store.manualIncrement(key);
                // Check if we've hit the limit
                const hit = store.get(key);
                return hit && hit.count >= (store === loginStore ? 5 : 3);
            }
        };
        next();
    };
};

module.exports = {
    loginLimiter,
    registerLimiter,
    loginStore,
    registerStore,
    attachRateLimitHelpers
};

// ===== API Rate Limiting =====

// General API rate limiter - applies to all API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        // Skip rate limiting for GET requests (read operations)
        return req.method === 'GET';
    }
});

// Stricter rate limiter for token generation endpoint
const apiTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        error: 'Too many token requests, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});

module.exports = {
    loginLimiter,
    registerLimiter,
    loginStore,
    registerStore,
    attachRateLimitHelpers,
    apiLimiter,
    apiTokenLimiter
};
