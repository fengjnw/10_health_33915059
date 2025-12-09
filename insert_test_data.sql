-- Insert test data into the health database
USE health;

-- Insert default users
-- Password is hashed using bcrypt (salt rounds = 10)
-- User 1: username: gold, password: smiths
-- User 2: username: testuser, password: smiths
-- User 3 (ADMIN): username: admin, password: qwerty
INSERT INTO users (username, password, email, first_name, last_name, is_admin) VALUES
('gold', '$2b$10$dwtMACjDYnR3ZiFsO130ROZWXvkZEJO8x61Q0VTEKRvmEmGehFQwu', 'gold@example.com', 'Gold', 'Smith', FALSE),
('testuser', '$2b$10$dwtMACjDYnR3ZiFsO130ROZWXvkZEJO8x61Q0VTEKRvmEmGehFQwu', 'test@example.com', 'Test', 'User', FALSE),
('admin', '$2b$10$6TMiIeOd.3kIvGhEAzUFBuZVtykl4MUVQU.YHtWv3dHAHoXNhdRaW', 'admin@example.com', 'Admin', 'User', TRUE);

-- Insert sample fitness activities - User 1 (gold) with diverse types, durations, calories
INSERT INTO fitness_activities (user_id, activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes, is_public) VALUES
(1, 'Running', 30, 5.0, 300, '2025-12-01 08:30:00', 'Morning run in the park', 1),
(1, 'Cycling', 45, 15.0, 400, '2025-12-02 18:00:00', 'Evening bike ride', 1),
(1, 'Swimming', 60, 2.0, 500, '2025-12-03 14:00:00', 'Pool session', 0),
(1, 'Gym', 90, NULL, 450, '2025-12-04 10:00:00', 'Weight training and cardio', 1),
(1, 'Walking', 20, 1.5, 100, '2025-12-05 07:15:00', 'Morning walk before work', 0),
(1, 'Running', 40, 6.5, 380, '2025-12-05 17:45:00', 'Afternoon tempo run', 1),
(1, 'Yoga', 45, NULL, 150, '2025-12-06 06:00:00', 'Sunrise yoga session', 1),
(1, 'Hiking', 120, 8.0, 600, '2025-11-30 09:00:00', 'Mountain trail hike', 1),
(1, 'Cycling', 30, 10.0, 250, '2025-11-29 19:30:00', 'City commute bike ride', 0),
(1, 'Swimming', 45, 1.5, 380, '2025-11-28 15:00:00', 'Quick pool workout', 1),
(1, 'Gym', 60, NULL, 350, '2025-11-27 18:00:00', 'Strength training', 1),
(1, 'Running', 25, 4.0, 250, '2025-11-26 08:00:00', 'Easy morning jog', 0),
(1, 'Hiking', 90, 6.0, 500, '2025-11-25 10:30:00', 'Scenic forest hike', 1),
(1, 'Cycling', 60, 18.0, 450, '2025-11-24 17:00:00', 'Long distance ride', 1),
(1, 'Walking', 35, 2.5, 140, '2025-11-23 19:00:00', 'Evening neighborhood walk', 0),
(1, 'Other', 50, NULL, 200, '2025-11-22 16:00:00', 'Rock climbing gym', 1),
(1, 'Walking', 15, 1.0, 80, '2025-12-06 20:00:00', 'Evening stroll', 1),
(1, 'Gym', 120, NULL, 600, '2025-11-19 09:00:00', 'Full body workout', 0),
(1, 'Running', 50, 8.0, 450, '2025-11-18 07:00:00', 'Long distance run', 1),
(1, 'Cycling', 75, 22.0, 550, '2025-11-17 15:30:00', 'Century pace bike', 1),
(1, 'Swimming', 90, 3.0, 650, '2025-11-16 14:00:00', 'Extended pool session', 0),
(1, 'Hiking', 150, 10.0, 750, '2025-11-15 08:00:00', 'All-day mountain adventure', 1),
(1, 'Yoga', 90, NULL, 200, '2025-11-14 07:00:00', 'Extended yoga practice', 1),

-- Insert sample fitness activities - User 2 (testuser) with diverse types, durations, calories
(2, 'Running', 25, 4.0, 250, '2025-12-01 07:00:00', 'Quick jog', 1),
(2, 'Yoga', 60, NULL, 150, '2025-12-02 19:30:00', 'Relaxing yoga session', 1),
(2, 'Swimming', 50, 1.8, 420, '2025-12-03 16:00:00', 'Lap swimming', 0),
(2, 'Gym', 75, NULL, 400, '2025-12-04 17:30:00', 'Cardio and weights', 1),
(2, 'Walking', 40, 2.0, 120, '2025-12-05 08:00:00', 'Morning walk', 0),
(2, 'Cycling', 55, 14.0, 380, '2025-12-05 18:45:00', 'Evening bike ride', 1),
(2, 'Running', 35, 5.5, 320, '2025-11-30 06:30:00', 'Early morning run', 1),
(2, 'Hiking', 100, 7.0, 550, '2025-11-28 10:00:00', 'Full day hike', 0),
(2, 'Yoga', 75, NULL, 180, '2025-11-26 18:00:00', 'Power yoga class', 1),
(2, 'Swimming', 40, 1.2, 350, '2025-11-25 15:30:00', 'Pool workout', 1),
(2, 'Running', 20, 3.2, 200, '2025-11-23 07:00:00', 'Short interval run', 0),
(2, 'Other', 45, NULL, 180, '2025-11-20 19:00:00', 'Tennis match', 1),
(2, 'Cycling', 40, 12.0, 320, '2025-11-19 17:00:00', 'After-work ride', 1),
(2, 'Walking', 50, 3.0, 160, '2025-11-18 09:30:00', 'Long morning walk', 0),
(2, 'Gym', 85, NULL, 420, '2025-11-17 18:00:00', 'Mixed workout', 1),
(2, 'Running', 45, 7.0, 380, '2025-11-16 06:30:00', 'Morning tempo', 1),
(2, 'Hiking', 80, 5.5, 480, '2025-11-14 11:00:00', 'Afternoon hike', 0),
(2, 'Other', 60, NULL, 300, '2025-11-12 19:00:00', 'Badminton game', 1);
