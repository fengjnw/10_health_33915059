/**
 * Audit Logger - Security Event Logging Module
 * Records sensitive operations for security monitoring and compliance
 */

const fs = require('fs').promises;
const path = require('path');

// Log file configuration
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// Event types
const EventTypes = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    ACTIVITY_CREATE: 'ACTIVITY_CREATE',
    ACTIVITY_UPDATE: 'ACTIVITY_UPDATE',
    ACTIVITY_DELETE: 'ACTIVITY_DELETE',
    SESSION_TIMEOUT: 'SESSION_TIMEOUT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    CSRF_VIOLATION: 'CSRF_VIOLATION',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS'
};

/**
 * Ensure log directory exists
 */
async function ensureLogDirectory() {
    try {
        await fs.access(LOG_DIR);
    } catch (error) {
        await fs.mkdir(LOG_DIR, { recursive: true });
    }
}

/**
 * Rotate log file if it exceeds max size
 */
async function rotateLogIfNeeded() {
    try {
        const stats = await fs.stat(LOG_FILE);
        if (stats.size > MAX_LOG_SIZE) {
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const archiveFile = path.join(LOG_DIR, `audit-${timestamp}.log`);
            await fs.rename(LOG_FILE, archiveFile);
            console.log(`Log file rotated: ${archiveFile}`);
        }
    } catch (error) {
        // Log file doesn't exist yet, no rotation needed
    }
}

/**
 * Format log entry
 */
function formatLogEntry(eventType, details) {
    const timestamp = new Date().toISOString();
    const entry = {
        timestamp,
        eventType,
        ...details
    };
    return JSON.stringify(entry) + '\n';
}

/**
 * Write log entry to file
 */
async function writeLog(eventType, details) {
    try {
        await ensureLogDirectory();
        await rotateLogIfNeeded();

        const logEntry = formatLogEntry(eventType, details);
        await fs.appendFile(LOG_FILE, logEntry);

        // Also log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUDIT] ${eventType}:`, details);
        }
    } catch (error) {
        console.error('Error writing audit log:', error);
    }
}

/**
 * Extract client information from request
 */
function getClientInfo(req) {
    return {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        path: req.path,
        method: req.method
    };
}

/**
 * Log authentication events
 */
async function logAuth(eventType, req, userId = null, username = null, reason = null) {
    const details = {
        userId,
        username,
        reason,
        ...getClientInfo(req)
    };
    await writeLog(eventType, details);
}

/**
 * Log data modification events
 */
async function logDataChange(eventType, req, resourceType, resourceId, changes = null) {
    const details = {
        userId: req.session?.user?.id,
        username: req.session?.user?.username,
        resourceType,
        resourceId,
        changes,
        ...getClientInfo(req)
    };
    await writeLog(eventType, details);
}

/**
 * Log security violations
 */
async function logSecurityEvent(eventType, req, details = {}) {
    const logDetails = {
        userId: req.session?.user?.id,
        username: req.session?.user?.username,
        ...details,
        ...getClientInfo(req)
    };
    await writeLog(eventType, logDetails);
}

/**
 * Read recent audit logs (for admin viewing)
 */
async function getRecentLogs(limit = 100) {
    try {
        const content = await fs.readFile(LOG_FILE, 'utf-8');
        const lines = content.trim().split('\n');
        const logs = lines.slice(-limit).map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(log => log !== null);
        return logs.reverse(); // Most recent first
    } catch (error) {
        return [];
    }
}

/**
 * Get logs by user
 */
async function getLogsByUser(username, limit = 50) {
    const allLogs = await getRecentLogs(1000);
    return allLogs
        .filter(log => log.username === username)
        .slice(0, limit);
}

/**
 * Get logs by event type
 */
async function getLogsByEventType(eventType, limit = 50) {
    const allLogs = await getRecentLogs(1000);
    return allLogs
        .filter(log => log.eventType === eventType)
        .slice(0, limit);
}

module.exports = {
    EventTypes,
    logAuth,
    logDataChange,
    logSecurityEvent,
    getRecentLogs,
    getLogsByUser,
    getLogsByEventType
};
