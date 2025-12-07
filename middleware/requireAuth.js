/**
 * Authentication middleware
 * Checks if user is logged in and redirects to message page if not
 */

/**
 * Middleware to require authentication for a route
 * @param {string} action - Description of the action requiring authentication
 * @returns {Function} Express middleware function
 */
function requireAuth(action = 'access this page') {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.render('message', {
                title: 'Login Required',
                messageType: 'warning',
                messageTitle: 'Authentication Required',
                message: `You need to be logged in to ${action}. Please log in to continue.`,
                redirectUrl: '/auth/login',
                redirectDelay: 3
            });
        }
        next();
    };
}

module.exports = requireAuth;
