-- Insert test data into the health database
USE health;

-- Insert default user (username: gold, password: smiths)
-- Password is hashed using bcrypt
-- Plain password: smiths
-- Hashed password generated with bcrypt salt rounds = 10
INSERT INTO users (username, password, email, first_name, last_name) VALUES
('gold', '$2b$10$dwtMACjDYnR3ZiFsO130ROZWXvkZEJO8x61Q0VTEKRvmEmGehFQwu', 'gold@example.com', 'Gold', 'Smith'),
('testuser', '$2b$10$dwtMACjDYnR3ZiFsO130ROZWXvkZEJO8x61Q0VTEKRvmEmGehFQwu', 'test@example.com', 'Test', 'User');

-- Insert sample fitness activities
INSERT INTO fitness_activities (user_id, activity_type, duration_minutes, distance_km, calories_burned, activity_date, notes) VALUES
(1, 'Running', 30, 5.0, 300, '2024-12-01', 'Morning run in the park'),
(1, 'Cycling', 45, 15.0, 400, '2024-12-02', 'Evening bike ride'),
(1, 'Swimming', 60, 2.0, 500, '2024-12-03', 'Pool session'),
(1, 'Gym', 90, NULL, 450, '2024-12-04', 'Weight training and cardio'),
(2, 'Running', 25, 4.0, 250, '2024-12-01', 'Quick jog'),
(2, 'Yoga', 60, NULL, 150, '2024-12-02', 'Relaxing yoga session');
