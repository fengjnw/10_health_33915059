// Audit logger - records security events to database

let db = null;

function getDb() {
    if (!db) {
        db = require('../config/db');
    }
    return db;
}

// Event types
const EventTypes = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PASSWORD_RESET: 'PASSWORD_RESET',
    ACCOUNT_UPDATE: 'ACCOUNT_UPDATE',
    ACTIVITY_CREATE: 'ACTIVITY_CREATE',
    ACTIVITY_UPDATE: 'ACTIVITY_UPDATE',
    ACTIVITY_DELETE: 'ACTIVITY_DELETE',
    SESSION_TIMEOUT: 'SESSION_TIMEOUT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    CSRF_VIOLATION: 'CSRF_VIOLATION',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    EMAIL_VERIFICATION_REQUESTED: 'EMAIL_VERIFICATION_REQUESTED'
};

// Extract client information from request
function getClientInfo(req) {
    return {
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        path: req.path,
        method: req.method
    };
}

// Log authentication events
async function logAuth(eventType, req, userId = null, username = null, reason = null) {
    try {
        const clientInfo = getClientInfo(req);

        await getDb().query(
            `INSERT INTO audit_logs 
            (user_id, username, event_type, ip_address, user_agent, path, method, changes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                username,
                eventType,
                clientInfo.ip_address,
                clientInfo.user_agent,
                clientInfo.path,
                clientInfo.method,
                reason ? JSON.stringify({ reason }) : null
            ]
        );

    } catch (error) {
        // Silent fail for audit logging to not disrupt user experience
    }
}

/**
 * Log data modification events
 */
async function logDataChange(eventType, req, resourceType, resourceId, changes = null) {
    try {
        const clientInfo = getClientInfo(req);
        const userId = req.session?.user?.id;
        const username = req.session?.user?.username;

        await getDb().query(
            `INSERT INTO audit_logs 
            (user_id, username, event_type, resource_type, resource_id, ip_address, user_agent, path, method, changes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                username,
                eventType,
                resourceType,
                resourceId,
                clientInfo.ip_address,
                clientInfo.user_agent,
                clientInfo.path,
                clientInfo.method,
                changes ? JSON.stringify(changes) : null
            ]
        );

    } catch (error) {
        // Silent fail for audit logging to not disrupt user experience
    }
}

/**
 * Log security violations
 */
async function logSecurityEvent(eventType, req, details = {}) {
    try {
        const clientInfo = getClientInfo(req);
        const userId = req.session?.user?.id;
        const username = req.session?.user?.username;

        await getDb().query(
            `INSERT INTO audit_logs 
            (user_id, username, event_type, ip_address, user_agent, path, method, changes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                username,
                eventType,
                clientInfo.ip_address,
                clientInfo.user_agent,
                clientInfo.path,
                clientInfo.method,
                Object.keys(details).length > 0 ? JSON.stringify(details) : null
            ]
        );

    } catch (error) {
        // Silent fail for audit logging to not disrupt user experience
    }
}

// Get recent audit logs
async function getRecentLogs(limit = 100) {
    try {
        const [logs] = await getDb().query(
            `SELECT * FROM audit_logs 
            ORDER BY created_at DESC 
            LIMIT ?`,
            [limit]
        );
        return logs;
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return [];
    }
}

// Get logs by user
async function getLogsByUser(username, limit = 50) {
    try {
        const [logs] = await getDb().query(
            `SELECT * FROM audit_logs 
            WHERE username = ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
            [username, limit]
        );
        return logs;
    } catch (error) {
        console.error('Error fetching user logs:', error);
        return [];
    }
}

// Get logs by event type
async function getLogsByEventType(eventType, limit = 50) {
    try {
        const [logs] = await getDb().query(
            `SELECT * FROM audit_logs 
            WHERE event_type = ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
            [eventType, limit]
        );
        return logs;
    } catch (error) {
        console.error('Error fetching event logs:', error);
        return [];
    }
}

// Get logs by date range
async function getLogsByDateRange(startDate, endDate, limit = 100) {
    try {
        const [logs] = await getDb().query(
            `SELECT * FROM audit_logs 
            WHERE created_at BETWEEN ? AND ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
            [startDate, endDate, limit]
        );
        return logs;
    } catch (error) {
        console.error('Error fetching logs by date range:', error);
        return [];
    }
}

// Get logs for specific resource
async function getLogsByResource(resourceType, resourceId, limit = 50) {
    try {
        const [logs] = await getDb().query(
            `SELECT * FROM audit_logs 
            WHERE resource_type = ? AND resource_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
            [resourceType, resourceId, limit]
        );
        return logs;
    } catch (error) {
        console.error('Error fetching resource logs:', error);
        return [];
    }
}

// Purge old audit logs (for maintenance)
async function purgeOldLogs(daysToKeep = 90) {
    try {
        const result = await getDb().query(
            `DELETE FROM audit_logs 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [daysToKeep]
        );
        return result;
    } catch (error) {
        // Silent fail for audit logging to not disrupt user experience
        throw error;
    }
}

module.exports = {
    EventTypes,
    logAuth,
    logDataChange,
    logSecurityEvent,
    getRecentLogs,
    getLogsByUser,
    getLogsByEventType,
    getLogsByDateRange,
    getLogsByResource,
    purgeOldLogs
};
