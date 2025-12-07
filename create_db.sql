-- Create database if not exists
CREATE DATABASE IF NOT EXISTS health;
USE health;

-- Drop existing tables if they exist (in reverse dependency order)
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS fitness_activities;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS=1;

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fitness_activities table
CREATE TABLE fitness_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    duration_minutes INT NOT NULL,
    distance_km DECIMAL(5, 2),
    calories_burned INT,
    activity_time DATETIME NOT NULL,
    notes TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create email_verifications table
-- Used for both email change verification AND password reset verification
CREATE TABLE email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    new_email VARCHAR(100) NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_new_email (new_email),
    INDEX idx_verification_code (verification_code),
    INDEX idx_expires_at (expires_at)
);

-- Create indexes for better search performance
CREATE INDEX idx_activity_type ON fitness_activities(activity_type);
CREATE INDEX idx_activity_time ON fitness_activities(activity_time);
CREATE INDEX idx_user_id ON fitness_activities(user_id);
