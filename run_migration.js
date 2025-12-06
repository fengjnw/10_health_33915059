const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.HEALTH_HOST || 'localhost',
        user: process.env.HEALTH_USER || 'health_app',
        password: process.env.HEALTH_PASSWORD || 'qwertyuiop',
        database: process.env.HEALTH_DATABASE || 'health'
    });

    try {
        // Create email_verifications table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS email_verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                new_email VARCHAR(100) NOT NULL,
                verification_code VARCHAR(10) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_verification_code (verification_code)
            )
        `);
        console.log('✓ Created email_verifications table');

        // Create email_verification_logs table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS email_verification_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                old_email VARCHAR(100),
                new_email VARCHAR(100),
                verification_code VARCHAR(10),
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_event_type (event_type)
            )
        `);
        console.log('✓ Created email_verification_logs table');

        console.log('✓ Database migration completed successfully');
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
