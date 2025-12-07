const crypto = require('crypto');

/**
 * Generate a password reset token
 * Returns both plain token (for email) and hash (for database)
 */
function generateResetToken() {
    // Generate 32 random bytes and convert to hex
    const token = crypto.randomBytes(32).toString('hex');

    // Create SHA256 hash of the token for database storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return {
        token,      // Plain token to send in email link
        tokenHash   // Hash to store in database
    };
}

/**
 * Hash a password reset token (for verification)
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
    generateResetToken,
    hashToken
};
