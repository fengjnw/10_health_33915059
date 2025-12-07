/**
 * Verification Code Generator
 * Generates secure 6-digit numeric verification codes
 */

/**
 * Generate a 6-digit numeric verification code
 * @returns {string} 6-digit verification code (e.g., "123456")
 */
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    generateVerificationCode
};
