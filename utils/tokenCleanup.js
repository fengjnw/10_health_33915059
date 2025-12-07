/**
 * Cleanup expired and used password reset tokens
 * Can be run periodically (e.g., via cron job or scheduled task)
 */

let db = null;

function getDb() {
    if (!db) {
        db = require('../config/db');
    }
    return db;
}

async function cleanupExpiredTokens() {
    try {
        console.log('🧹 Starting password reset token cleanup...');

        const database = getDb();

        // Delete expired tokens (older than 24 hours) and used tokens (older than 7 days)
        const [result1] = await database.query(
            `DELETE FROM password_resets 
             WHERE expires_at < NOW() 
             OR (used_at IS NOT NULL AND used_at < DATE_SUB(NOW(), INTERVAL 7 DAY))`
        );

        // Delete expired verification codes (older than 1 hour) and used codes (older than 1 day)
        const [result2] = await database.query(
            `DELETE FROM password_reset_verifications 
             WHERE expires_at < NOW() 
             OR (used_at IS NOT NULL AND used_at < DATE_SUB(NOW(), INTERVAL 1 DAY))`
        );

        const totalDeleted = result1.affectedRows + result2.affectedRows;
        console.log(`✅ Cleanup completed. Deleted ${totalDeleted} records (${result1.affectedRows} tokens, ${result2.affectedRows} codes).`);
        return totalDeleted;
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
