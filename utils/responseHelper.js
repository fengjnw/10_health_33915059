// Response helper utilities for consistent API responses

const { generateToken } = require('../middleware/csrf');

// Send error response with optional CSRF token
function sendError(res, statusCode, message, req = null) {
    const response = { error: message };

    // Add CSRF token if request object is provided
    if (req) {
        response.csrfToken = generateToken(req, res);
    }

    return res.status(statusCode).json(response);
}

// Send success response
function sendSuccess(res, data = {}, message = null) {
    const response = { success: true };

    if (message) {
        response.message = message;
    }

    return res.json({ ...response, ...data });
}

// Send validation error with CSRF token
function sendValidationError(res, message, req) {
    return sendError(res, 400, message, req);
}

// Send authentication error
function sendAuthError(res, req = null) {
    return sendError(res, 401, 'Not authenticated', req);
}

// Send not found error
function sendNotFound(res, message = 'Resource not found') {
    return sendError(res, 404, message);
}

// Send forbidden error
function sendForbidden(res, message = 'Forbidden') {
    return sendError(res, 403, message);
}

// Send internal server error
function sendServerError(res, error = null, message = 'An error occurred') {
    if (error) {
        console.error('Server error:', error);
    }
    return sendError(res, 500, message);
}

module.exports = {
    sendError,
    sendSuccess,
    sendValidationError,
    sendAuthError,
    sendNotFound,
    sendForbidden,
    sendServerError
};
