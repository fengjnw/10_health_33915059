// Import mysql2 module
const mysql = require('mysql2');

// Create connection pool using environment variables
const pool = mysql.createPool({
    host: process.env.HEALTH_HOST,
    user: process.env.HEALTH_USER,
    password: process.env.HEALTH_PASSWORD,
    database: process.env.HEALTH_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the promise-based pool for async/await usage
module.exports = pool.promise();
