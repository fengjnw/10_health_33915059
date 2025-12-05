-- Create database if not exists
CREATE DATABASE IF NOT EXISTS health;
USE health;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS fitness_activities;
DROP TABLE IF EXISTS users;

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
    activity_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for better search performance
CREATE INDEX idx_activity_type ON fitness_activities(activity_type);
CREATE INDEX idx_activity_date ON fitness_activities(activity_date);
CREATE INDEX idx_user_id ON fitness_activities(user_id);
