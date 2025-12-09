// Middleware to check if user is an administrator

function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).render('error', {
            title: 'Unauthorized',
            message: 'You must be logged in to access this page.',
            user: null
        });
    }

    if (!req.session.isAdmin) {
        return res.status(403).render('error', {
            title: 'Forbidden',
            message: 'Access denied. Administrator privileges required.',
            user: req.session.userId ? { username: req.session.username } : null
        });
    }

    next();
}

module.exports = { requireAdmin };
