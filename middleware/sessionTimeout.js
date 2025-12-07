/**
 * Session Timeout Middleware
 * Tracks user activity and invalidates sessions after a period of inactivity
 * Idle timeout: 30 minutes of no activity
 */

const { EventTypes, logAuth } = require('../utils/auditLogger');

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD = 25 * 60 * 1000; // Show warning at 25 minutes

/**
 * Middleware to track user activity and manage session timeouts
 */
function sessionTimeoutMiddleware(req, res, next) {
    // Only apply to logged-in users
    if (!req.session.user) {
        return next();
    }

    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const timeSinceLastActivity = now - lastActivity;

    // Check if session has exceeded idle timeout
    if (timeSinceLastActivity > IDLE_TIMEOUT) {
        // Session has expired due to inactivity
        const userId = req.session.user.id;
        const username = req.session.user.username;

        // Log session timeout before destroying
        logAuth(EventTypes.SESSION_TIMEOUT, req, userId, username, 'Idle timeout exceeded')
            .catch(err => console.error('Error logging session timeout:', err));

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
        });

        // Log the automatic logout
        console.log(`[${new Date().toISOString()}] User "${username}" automatically logged out due to inactivity`);

        // Check if this is an AJAX/API request
        const isAjaxRequest = req.xhr || req.headers.accept?.includes('application/json');

        if (isAjaxRequest) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired due to inactivity. Please log in again.',
                redirectUrl: '/auth/login'
            });
        }

        // For regular page requests, show a message page with auto-redirect
        return res.render('message', {
            title: 'Session Expired',
            messageType: 'warning',
            messageTitle: 'Session Expired',
            message: 'Your session has expired due to inactivity. You will be redirected to the login page.',
            redirectUrl: '/auth/login',
            redirectDelay: 3
        });
    }

    // Check if we should warn the user (approaching timeout)
    if (timeSinceLastActivity > WARNING_THRESHOLD && timeSinceLastActivity <= IDLE_TIMEOUT) {
        // Make warning flag available to views
        res.locals.sessionWarning = true;
        res.locals.timeRemaining = Math.ceil((IDLE_TIMEOUT - timeSinceLastActivity) / 1000);
    }

    // Update last activity timestamp for this request
    req.session.lastActivity = now;

    next();
}

module.exports = {
    sessionTimeoutMiddleware,
    IDLE_TIMEOUT,
    WARNING_THRESHOLD
};
