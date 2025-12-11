#!/bin/bash
# Setup database for Health & Fitness Tracker

echo "Step 1: Creating database user..."
mysql -u root -p << SQL
CREATE USER IF NOT EXISTS 'health_app'@'localhost' IDENTIFIED BY 'qwertyuiop';
GRANT ALL PRIVILEGES ON health.* TO 'health_app'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "Step 2: Creating database schema..."
mysql -u health_app -pqwertyuiop < create_db.sql

echo "Step 3: Inserting test data..."
mysql -u health_app -pqwertyuiop < insert_test_data.sql

echo "Database setup complete!"
