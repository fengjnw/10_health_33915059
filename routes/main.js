// Import required modules
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { EventTypes, logDataChange } = require('../utils/auditLogger');
const { sendVerificationEmail } = require('../utils/emailService');
const { generateToken } = require('../middleware/csrf');

// Home page route
router.get('/', (req, res) => {
    res.render('index', { title: 'Home - Health & Fitness Tracker' });
});

// About page route
router.get('/about', (req, res) => {
    res.render('about', { title: 'About - Health & Fitness Tracker' });
});

// Search page route - GET request shows the form
router.get('/search', (req, res) => {
    res.render('search', {
        title: 'Search Activities - Health & Fitness Tracker',
        activities: null,
        searchPerformed: false,
        error: null,
        searchParams: null
    });
});

// Search page route - POST request processes the search
router.post('/search', async (req, res) => {
    try {
        const { activity_type, date_from, date_to } = req.body;
        const userId = req.session.user ? req.session.user.id : null;

        // Build dynamic SQL query based on search parameters
        // Show own activities OR public activities from other users
        let query = `SELECT fa.*, u.username FROM fitness_activities fa 
                     JOIN users u ON fa.user_id = u.id 
                     WHERE (fa.user_id = ? OR fa.is_public = 1)`;
        let params = [userId || 0]; // 0 if not logged in (won't match any user_id)

        if (activity_type) {
            query += ' AND fa.activity_type LIKE ?';
            params.push(`%${activity_type}%`);
        }

        if (date_from) {
            query += ' AND fa.activity_time >= ?';
            params.push(date_from);
        }

        if (date_to) {
            query += ' AND fa.activity_time <= ?';
            params.push(date_to);
        }

        query += ' ORDER BY fa.activity_time DESC';

        const [activities] = await db.query(query, params);

        res.render('search', {
            title: 'Search Activities - Health & Fitness Tracker',
            activities: activities,
            searchPerformed: true,
            searchParams: req.body,
            error: null
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('search', {
            title: 'Search Activities - Health & Fitness Tracker',
            activities: null,
            searchPerformed: true,
            error: 'An error occurred while searching',
            searchParams: req.body
        });
    }
});

// Add activity page route - GET request shows the form
router.get('/add-activity', (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    res.render('add-activity', {
        title: 'Add Activity - Health & Fitness Tracker',
        errors: null
    });
});

// Add Activity page route - POST request processes the form
router.post('/add-activity', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const { activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes } = req.body;

        // Basic validation
        if (!activity_type || !duration_minutes || !activity_time) {
            return res.render('add-activity', {
                title: 'Add Activity - Health & Fitness Tracker',
                errors: ['Activity type, duration, and time are required'],
                formData: req.body
            });
        }

        // Insert activity into database
        const query = `
            INSERT INTO fitness_activities (user_id, activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            req.session.user.id,
            activity_type,
            duration_minutes,
            distance_km || null,
            calories_burned || null,
            activity_time,
            notes || null
        ]);

        // Log activity creation
        await logDataChange(
            EventTypes.ACTIVITY_CREATE,
            req,
            'fitness_activity',
            result.insertId,
            { activity_type, duration_minutes, activity_time }
        );

        res.redirect('/my-activities');
    } catch (error) {
        console.error('Add activity error:', error);
        res.render('add-activity', {
            title: 'Add Activity - Health & Fitness Tracker',
            errors: ['An error occurred while adding the activity'],
            formData: req.body
        });
    }
});

// My activities page route - shows user's activities
router.get('/my-activities', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const query = `
            SELECT * FROM fitness_activities 
            WHERE user_id = ? 
            ORDER BY activity_time DESC
        `;

        const [activities] = await db.query(query, [req.session.user.id]);

        res.render('my-activities', {
            title: 'My Activities - Health & Fitness Tracker',
            activities: activities
        });
    } catch (error) {
        console.error('My activities error:', error);
        res.render('my-activities', {
            title: 'My Activities - Health & Fitness Tracker',
            activities: [],
            error: 'An error occurred while loading your activities'
        });
    }
});

// Edit activity page route - GET request shows the edit form
router.get('/my-activities/:id/edit', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const { id } = req.params;

        // Get the activity from database
        const query = 'SELECT * FROM fitness_activities WHERE id = ?';
        const [activities] = await db.query(query, [id]);

        if (activities.length === 0) {
            return res.status(404).render('error', {
                message: 'Activity not found'
            });
        }

        const activity = activities[0];

        // Check if the user owns this activity
        if (activity.user_id !== req.session.user.id) {
            return res.status(403).render('error', {
                message: 'You do not have permission to edit this activity'
            });
        }

        res.render('edit-activity', {
            title: 'Edit Activity - Health & Fitness Tracker',
            activity: activity,
            errors: null
        });
    } catch (error) {
        console.error('Edit activity get error:', error);
        res.status(500).render('error', {
            message: 'An error occurred while loading the activity'
        });
    }
});

// Edit activity route - PATCH request processes the form
router.patch('/my-activities/:id/edit', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated', csrfToken: generateToken(req, res) });
    }

    console.log('PATCH /my-activities/:id/edit received');
    console.log('User ID:', req.session.user.id);
    console.log('Activity ID:', req.params.id);
    console.log('Request body:', req.body);

    try {
        const { id } = req.params;
        const { activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes, is_public } = req.body;

        // Validate required fields
        if (!activity_type || !duration_minutes || !activity_time) {
            return res.status(400).json({
                error: 'Activity type, duration, and time are required'
            });
        }

        // Get the activity from database
        const getQuery = 'SELECT * FROM fitness_activities WHERE id = ?';
        const [activities] = await db.query(getQuery, [id]);

        if (activities.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        const activity = activities[0];

        // Check if the user owns this activity
        if (activity.user_id !== req.session.user.id) {
            return res.status(403).json({
                error: 'You do not have permission to edit this activity'
            });
        }

        // Update the activity in database
        const updateQuery = `
            UPDATE fitness_activities 
            SET activity_type = ?, duration_minutes = ?, distance_km = ?, 
                calories_burned = ?, activity_time = ?, notes = ?, is_public = ?
            WHERE id = ?
        `;

        await db.query(updateQuery, [
            activity_type,
            duration_minutes,
            distance_km || null,
            calories_burned || null,
            activity_time,
            notes || null,
            is_public || 0,
            id
        ]);

        // Log activity update
        await logDataChange(
            EventTypes.ACTIVITY_UPDATE,
            req,
            'fitness_activity',
            id,
            {
                old: {
                    activity_type: activity.activity_type,
                    duration_minutes: activity.duration_minutes,
                    activity_time: activity.activity_time
                },
                new: {
                    activity_type,
                    duration_minutes,
                    activity_time
                }
            }
        );

        res.json({ success: true, message: 'Activity updated successfully' });
    } catch (error) {
        console.error('Edit activity patch error:', error);
        res.status(500).json({
            error: 'An error occurred while updating the activity'
        });
    }
});

// DELETE /my-activities/:id - Delete an activity
router.delete('/my-activities/:id', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('DELETE /my-activities/:id received');
    console.log('User ID:', req.session.user.id);
    console.log('Activity ID:', req.params.id);

    try {
        const id = parseInt(req.params.id, 10);

        // Validate id
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid activity ID' });
        }

        // Get the activity to verify ownership
        const [activities] = await db.query(
            'SELECT id, user_id, activity_type, duration_minutes, activity_time FROM fitness_activities WHERE id = ?',
            [id]
        );

        if (activities.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        const activity = activities[0];

        // Check if the user owns this activity
        if (activity.user_id !== req.session.user.id) {
            return res.status(403).json({
                error: 'You do not have permission to delete this activity'
            });
        }

        // Delete the activity from database
        const deleteQuery = 'DELETE FROM fitness_activities WHERE id = ?';
        await db.query(deleteQuery, [id]);

        // Log activity deletion
        await logDataChange(
            EventTypes.ACTIVITY_DELETE,
            req,
            'fitness_activity',
            id,
            {
                deleted: {
                    activity_type: activity.activity_type,
                    duration_minutes: activity.duration_minutes,
                    activity_time: activity.activity_time
                }
            }
        );

        res.json({ success: true, message: 'Activity deleted successfully' });
    } catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({
            error: 'An error occurred while deleting the activity'
        });
    }
});

// GET /profile - Show user profile
router.get('/profile', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

        if (users.length === 0) {
            return res.status(404).render('error', {
                message: 'User not found'
            });
        }

        res.render('profile', {
            title: 'My Profile - Health & Fitness Tracker',
            user: users[0]
        });
    } catch (error) {
        console.error('Profile page error:', error);
        res.status(500).render('error', {
            message: 'An error occurred while loading your profile'
        });
    }
});

// PATCH /profile - Update user profile (username, first_name, last_name)
// Email can only be changed through the email verification process
router.patch('/profile', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('PATCH /profile received');
    console.log('User ID:', req.session.user.id);
    console.log('Request body:', req.body);

    try {
        const { username, first_name, last_name } = req.body;

        // Validate required fields
        if (!username || !first_name || !last_name) {
            return res.status(400).json({
                error: 'Username, first name and last name are required'
            });
        }

        // Validate username length
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
        }

        // Get current user data
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = users[0];

        // Check username uniqueness if changed
        if (username !== currentUser.username) {
            const [existingUsernames] = await db.query(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, req.session.user.id]
            );

            if (existingUsernames.length > 0) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
        }

        // Update user profile (username + names)
        const updateQuery = `
            UPDATE users 
            SET username = ?, first_name = ?, last_name = ?
            WHERE id = ?
        `;

        await db.query(updateQuery, [username, first_name, last_name, req.session.user.id]);

        // Update session data
        req.session.user.username = username;
        req.session.user.first_name = first_name;
        req.session.user.last_name = last_name;

        // Log the update
        await logDataChange(
            EventTypes.ACCOUNT_UPDATE,
            req,
            'user_profile',
            req.session.user.id,
            {
                old: {
                    username: currentUser.username,
                    first_name: currentUser.first_name,
                    last_name: currentUser.last_name
                },
                new: {
                    username,
                    first_name,
                    last_name
                }
            }
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'An error occurred while updating your profile'
        });
    }
});

// Generate a random verification code
function generateVerificationCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Request email verification code
router.post('/email/request-verification', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { newEmail } = req.body;

        // Validate email
        if (!newEmail) {
            return res.status(400).json({ error: 'New email is required', csrfToken: generateToken(req, res) });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ error: 'Invalid email format', csrfToken: generateToken(req, res) });
        }

        // Check if email is already in use
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [newEmail, req.session.user.id]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email is already in use by another user', csrfToken: generateToken(req, res) });
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();

        // Store verification in database
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
        await db.query(
            'INSERT INTO email_verifications (user_id, new_email, verification_code, expires_at) VALUES (?, ?, ?, ?)',
            [req.session.user.id, newEmail, verificationCode, expiresAt]
        );

        // Send verification email
        const emailResult = await sendVerificationEmail(newEmail, verificationCode);

        // Log email verification request
        await logDataChange(
            'EMAIL_VERIFICATION_REQUESTED',
            req,
            'email_verification',
            req.session.user.id,
            {
                event: 'Email verification code sent',
                new_email: newEmail,
                old_email: req.session.user.email
            }
        );

        res.json({
            success: true,
            message: 'Verification code sent to your new email',
            verificationCode: verificationCode, // For development/testing
            previewUrl: emailResult.previewUrl, // Ethereal preview URL
            csrfToken: generateToken(req, res)
        });

    } catch (error) {
        console.error('Email verification request error:', error);
        res.status(500).json({
            error: 'An error occurred while requesting email verification',
            csrfToken: generateToken(req, res)
        });
    }
});

// Verify email code and update email
router.post('/email/verify-code', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated', csrfToken: generateToken(req, res) });
    }

    try {
        const { verificationCode, newEmail } = req.body;

        if (!verificationCode || !newEmail) {
            return res.status(400).json({ error: 'Verification code and email are required', csrfToken: generateToken(req, res) });
        }

        // Find verification record
        const [verifications] = await db.query(
            'SELECT * FROM email_verifications WHERE user_id = ? AND verification_code = ? AND new_email = ? AND is_verified = 0',
            [req.session.user.id, verificationCode, newEmail]
        );

        if (verifications.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code', csrfToken: generateToken(req, res) });
        }

        const verification = verifications[0];

        // Check if verification has expired
        if (new Date() > new Date(verification.expires_at)) {
            return res.status(400).json({ error: 'Verification code has expired', csrfToken: generateToken(req, res) });
        }

        // Mark verification as verified
        await db.query(
            'UPDATE email_verifications SET is_verified = 1 WHERE id = ?',
            [verification.id]
        );

        // Update user email
        const [currentUser] = await db.query(
            'SELECT * FROM users WHERE id = ?',
            [req.session.user.id]
        );

        await db.query(
            'UPDATE users SET email = ? WHERE id = ?',
            [newEmail, req.session.user.id]
        );

        // Update session
        req.session.user.email = newEmail;

        // Log email change
        await logDataChange(
            'ACCOUNT_UPDATE',
            req,
            'email_change',
            req.session.user.id,
            {
                old: { email: currentUser[0].email },
                new: { email: newEmail }
            }
        );

        res.json({
            success: true,
            message: 'Email verified and updated successfully',
            csrfToken: generateToken(req, res)
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            error: 'An error occurred while verifying your email',
            csrfToken: generateToken(req, res)
        });
    }
});

// API: Get recent audit logs (development/debugging only)
router.get('/api/audit-logs', async (req, res) => {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const eventType = req.query.eventType;
        const username = req.query.username;

        let logs;

        if (eventType) {
            const { getLogsByEventType } = require('../utils/auditLogger');
            logs = await getLogsByEventType(eventType, limit);
        } else if (username) {
            const { getLogsByUser } = require('../utils/auditLogger');
            logs = await getLogsByUser(username, limit);
        } else {
            const { getRecentLogs } = require('../utils/auditLogger');
            logs = await getRecentLogs(limit);
        }

        res.json({
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;
