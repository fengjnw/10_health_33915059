// Middleware to check if user is an administrator

function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).render('error', {
            title: 'Unauthorized',
            message: 'You must be logged in to access this page.',
            user: null,
            error: null
        });
    }

    if (!req.session.isAdmin) {
        return res.status(403).render('error', {
            title: 'Forbidden',
            message: 'Access denied. Administrator privileges required.',
            user: req.session.user || null,
            error: null
        });
    }

    next();
}

module.exports = { requireAdmin };
