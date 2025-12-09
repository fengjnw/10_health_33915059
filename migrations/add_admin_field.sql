-- Add is_admin field to existing users table
USE health;

-- Add is_admin column (ignore error if it already exists)
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER last_name;

-- Note: To create an admin user, register through the website first, then run:
-- UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
