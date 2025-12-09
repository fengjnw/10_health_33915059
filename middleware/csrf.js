// CSRF protection middleware using session-based tokens
const crypto = require('crypto');

// Generate a CSRF token
function generateToken(req, res) {
    // Ensure session exists
    if (!req.session) {
        req.session = {};
    }

    // Generate and store token in session if it doesn't exist
    if (!req.session._csrfToken) {
        req.session._csrfToken = crypto.randomBytes(32).toString('hex');
    }

    return req.session._csrfToken;
}

// CSRF protection middleware
function doubleCsrfProtection(req, res, next) {
    // Skip CSRF for routes that explicitly use Bearer token auth
    // Bearer token is for external API consumption (no need for CSRF)
    const authHeader = req.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        return next();
    }

    // Skip CSRF for token issuance endpoint (POST /api/auth/token)
    // This is intentionally public for getting tokens
    if (req.path === '/api/auth/token' && req.method === 'POST') {
        return next();
    }

    // Skip CSRF check for GET, HEAD, OPTIONS (safe methods)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // All other requests (including /internal/* with session auth) require CSRF
    // Ensure session exists
    if (!req.session) {
        req.session = {};
    }

    // Generate token if not exists (for forms without loading GET first)
    if (!req.session._csrfToken) {
        req.session._csrfToken = crypto.randomBytes(32).toString('hex');
    }

    // Get token from multiple sources: body (for forms), header (for AJAX/JSON), or query
    const tokenFromBody = req.body && req.body._csrf;
    const tokenFromHeader = req.get('X-CSRF-Token');
    const tokenFromQuery = req.query._csrf;
    const tokenFromRequest = tokenFromBody || tokenFromHeader || tokenFromQuery;

    // Get token from session
    const tokenFromSession = req.session._csrfToken;

    // Verify tokens match
    if (!tokenFromRequest || !tokenFromSession || tokenFromRequest !== tokenFromSession) {
        const error = new Error('Invalid CSRF token');
        error.code = 'EBADCSRFTOKEN';
        return next(error);
    }

    // Generate new token for next request after successful verification
    req.session._csrfToken = crypto.randomBytes(32).toString('hex');

    next();
}

module.exports = {
    generateToken,
    doubleCsrfProtection
};
