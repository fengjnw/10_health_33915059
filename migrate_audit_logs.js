const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.HEALTH_HOST || 'localhost',
        user: process.env.HEALTH_USER || 'health_app',
        password: process.env.HEALTH_PASSWORD || '',
        database: process.env.HEALTH_DATABASE || 'health'
    });

    try {
        // Create audit_logs table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                username VARCHAR(50),
                event_type VARCHAR(50) NOT NULL,
                resource_type VARCHAR(50),
                resource_id INT,
                changes JSON,
                ip_address VARCHAR(45),
                user_agent TEXT,
                path VARCHAR(255),
                method VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_event_type (event_type),
                INDEX idx_created_at (created_at),
                INDEX idx_username (username)
            )
        `);
        console.log('✓ Created audit_logs table');

        console.log('✓ Database migration completed successfully');
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
