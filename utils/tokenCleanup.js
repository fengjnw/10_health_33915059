/**
 * Cleanup expired and used password reset tokens
 * Can be run periodically (e.g., via cron job or scheduled task)
 */

const db = require('../config/db');

async function cleanupExpiredTokens() {
    try {
        console.log('🧹 Starting password reset token cleanup...');

        // Delete expired tokens (older than 24 hours) and used tokens (older than 7 days)
        const [result] = await db.query(
            `DELETE FROM password_resets 
             WHERE expires_at < NOW() 
             OR (used_at IS NOT NULL AND used_at < DATE_SUB(NOW(), INTERVAL 7 DAY))`
        );

        console.log(`✅ Cleanup completed. Deleted ${result.affectedRows} records.`);
        return result.affectedRows;
    } catch (error) {
        console.error('❌ Cleanup error:', error.message);
        // Don't throw - just log the error to prevent server startup failure
    }
}

// Run cleanup on application startup
async function initializeCleanup() {
    try {
        // Run cleanup once on startup
        await cleanupExpiredTokens();

        // Schedule cleanup every 24 hours
        setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);
        console.log('📅 Password reset token cleanup scheduled for every 24 hours');
    } catch (error) {
        console.error('Failed to initialize cleanup:', error.message);
        // Don't fail startup if cleanup initialization fails
    }
}

module.exports = {
    cleanupExpiredTokens,
    initializeCleanup
};
