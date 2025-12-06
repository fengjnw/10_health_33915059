/**
 * Session Timeout Middleware
 * Tracks user activity and invalidates sessions after a period of inactivity
 * Idle timeout: 30 minutes of no activity
 */

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
        const username = req.session.user.username;
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
        });

        // Log the automatic logout
        console.log(`[${new Date().toISOString()}] User "${username}" automatically logged out due to inactivity`);

        // If it's an API request, return JSON response
        if (req.accepts('json')) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired due to inactivity. Please log in again.'
            });
        }

        // For regular requests, redirect to login
        return res.redirect('/auth/login?timeout=true');
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
