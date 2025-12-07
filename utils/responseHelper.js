/**
 * Response Helper Utilities
 * Centralized response formatting for consistent API responses
 */

const { generateToken } = require('../middleware/csrf');

/**
 * Send error response with optional CSRF token update
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} req - Express request object (optional, for CSRF token)
 * @returns {Object} Response object
 */
function sendError(res, statusCode, message, req = null) {
    const response = { error: message };

    // Add CSRF token if request object is provided
    if (req) {
        response.csrfToken = generateToken(req, res);
    }

    return res.status(statusCode).json(response);
}

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} data - Success data
 * @param {string} message - Success message (optional)
 * @returns {Object} Response object
 */
function sendSuccess(res, data = {}, message = null) {
    const response = { success: true };

    if (message) {
        response.message = message;
    }

    return res.json({ ...response, ...data });
}

/**
 * Send validation error with CSRF token
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {Object} req - Express request object
 * @returns {Object} Response object
 */
function sendValidationError(res, message, req) {
    return sendError(res, 400, message, req);
}

/**
 * Send authentication error
 * @param {Object} res - Express response object
 * @param {Object} req - Express request object (optional)
 * @returns {Object} Response object
 */
function sendAuthError(res, req = null) {
    return sendError(res, 401, 'Not authenticated', req);
}

/**
 * Send not found error
 * @param {Object} res - Express response object
 * @param {string} message - Custom message (default: 'Resource not found')
 * @returns {Object} Response object
 */
function sendNotFound(res, message = 'Resource not found') {
    return sendError(res, 404, message);
}

/**
 * Send forbidden error
 * @param {Object} res - Express response object
 * @param {string} message - Custom message (default: 'Forbidden')
 * @returns {Object} Response object
 */
function sendForbidden(res, message = 'Forbidden') {
    return sendError(res, 403, message);
}

/**
 * Send internal server error
 * @param {Object} res - Express response object
 * @param {Error} error - Error object (for logging)
 * @param {string} message - Custom message (default: generic error)
 * @returns {Object} Response object
 */
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
