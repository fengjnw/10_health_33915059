#!/bin/bash
# Interactive Database Setup for Health & Fitness Tracker

echo "======================================"
echo "Health & Fitness Tracker - DB Setup"
echo "======================================"
echo ""

# Step 1: Create user and grant privileges
echo "Step 1: Creating database user 'health_app'..."
echo "Please enter your MySQL root password when prompted:"
echo ""

mysql -u root -p << 'EOSQL'
CREATE USER IF NOT EXISTS 'health_app'@'localhost' IDENTIFIED BY 'qwertyuiop';
GRANT ALL PRIVILEGES ON health.* TO 'health_app'@'localhost';
FLUSH PRIVILEGES;
SELECT 'User health_app created successfully!' AS Status;
EOSQL

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to create user. Please check your MySQL root password."
    exit 1
fi

echo ""
echo "Step 2: Creating database schema..."
mysql -u health_app -pqwertyuiop < create_db.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to create database schema."
    exit 1
fi

echo ""
echo "Step 3: Inserting test data..."
mysql -u health_app -pqwertyuiop < insert_test_data.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to insert test data."
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Database setup completed successfully!"
echo "======================================"
echo ""
echo "You can now run: node index.js"
echo "Login with username: gold, password: smiths"
