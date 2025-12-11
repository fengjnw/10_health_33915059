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

echo "Step 3: Creating default test user (gold/smiths)..."
mysql -u health_app -pqwertyuiop health << SQL
-- Insert default test user with username 'gold' and password 'smiths'
-- Password is hashed using bcrypt - this hash corresponds to password 'smiths'
-- Hash generated with: bcrypt.hashSync('smiths', 10)
INSERT INTO users (username, password, email, first_name, last_name, is_admin) 
VALUES ('gold', '\$2b\$10\$mG.TgLxCJDYDgXMrjgvUSuxkiH8Qu9R8p7Nq9EpBWtQvSYYwP9f9.', 'gold@example.com', 'Test', 'User', true);

-- Insert second test user (testuser/password)
-- Password is hashed using bcrypt - this hash corresponds to password 'password'
INSERT INTO users (username, password, email, first_name, last_name, is_admin) 
VALUES ('testuser', '\$2b\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36EmYUnm', 'testuser@example.com', 'Test', 'User2', false);
SQL

echo "Step 4: Inserting test data..."
mysql -u health_app -pqwertyuiop < insert_test_data.sql

echo "Database setup complete!"
