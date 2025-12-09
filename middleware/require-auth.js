// Authentication middleware - checks if user is logged in

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
