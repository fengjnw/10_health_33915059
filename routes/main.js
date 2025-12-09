// Import required modules
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { EventTypes, logDataChange } = require('../utils/audit-logger');
const { sendVerificationEmail } = require('../utils/email-service');
const { generateToken } = require('../middleware/csrf');
const { generateVerificationCode } = require('../utils/code-generator');
const { addActivityFilters } = require('../utils/filter-helper');
const {
    sendValidationError,
    sendAuthError,
    sendSuccess,
    sendServerError
} = require('../utils/response-helper');

// Goodbye page after account deletion
router.get('/goodbye', (req, res) => {
    res.render('goodbye', { title: 'Account Deleted' });
});

// Home page route
router.get('/', (req, res) => {
    res.render('index', { title: 'Home - Health & Fitness Tracker' });
});

// About page route
router.get('/about', (req, res) => {
    res.render('about', { title: 'About - Health & Fitness Tracker' });
});

// Search page route - GET request shows the form and processes search with pagination
router.get('/search', async (req, res) => {
    // Check if this is a search request (form was submitted)
    const searchParams = ['activity_type', 'date_from', 'date_to', 'duration_min', 'duration_max', 'calories_min', 'calories_max'];
    const isSearchRequest = searchParams.some(param => param in req.query);

    if (!isSearchRequest) {
        return res.render('search', {
            title: 'Search Activities - Health & Fitness Tracker',
            activities: null,
            searchPerformed: false,
            error: null,
            searchParams: null
        });
    }

    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 10), 20);
        const offset = (page - 1) * pageSize;

        // Build WHERE clause with filters - only show public activities
        const { whereClause: filterWhere, params: filterParams } = addActivityFilters(
            'WHERE fa.is_public = 1',
            [],
            req.query
        );

        const whereClause = filterWhere;
        const params = filterParams;

        const countQuery = `SELECT COUNT(*) as total FROM fitness_activities fa ${whereClause}`;
        const [countRows] = await db.query(countQuery, params);
        const totalCount = countRows[0]?.total || 0;
        const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

        const dataQuery = `SELECT fa.*, u.username FROM fitness_activities fa 
                           JOIN users u ON fa.user_id = u.id 
                           ${whereClause}
                           ORDER BY fa.activity_time DESC
                           LIMIT ? OFFSET ?`;

        const [activities] = await db.query(dataQuery, [...params, pageSize, offset]);

        res.render('search', {
            title: 'Search Activities - Health & Fitness Tracker',
            activities,
            searchPerformed: true,
            searchParams: req.query,
            error: null,
            pagination: { page, pageSize, totalCount, totalPages }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('search', {
            title: 'Search Activities - Health & Fitness Tracker',
            activities: null,
            searchPerformed: true,
            error: 'An error occurred while searching',
            searchParams: req.query,
            pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
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
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 10), 50);
        const offset = (page - 1) * pageSize;

        // Build WHERE clause with filters
        let whereClause = 'WHERE user_id = ?';
        let params = [req.session.user.id];

        const { whereClause: filterWhere, params: filterParams } = addActivityFilters(whereClause, params, req.query);
        whereClause = filterWhere;
        params = filterParams;

        // Get total count with filters
        const countQuery = `SELECT COUNT(*) as total FROM fitness_activities ${whereClause}`;
        const [countRows] = await db.query(countQuery, params);
        const totalCount = countRows[0]?.total || 0;
        const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

        // Get activities with filters
        const dataQuery = `SELECT * FROM fitness_activities ${whereClause} ORDER BY activity_time DESC LIMIT ? OFFSET ?`;
        const [activities] = await db.query(dataQuery, [...params, pageSize, offset]);

        // Calculate statistics based on all filtered results
        const statsQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(duration_minutes), 0) as total_duration,
                COALESCE(SUM(distance_km), 0) as total_distance,
                COALESCE(SUM(calories_burned), 0) as total_calories,
                COALESCE(AVG(calories_burned / NULLIF(duration_minutes, 0)), 0) AS avg_intensity
            FROM fitness_activities 
            ${whereClause}
        `;
        const [statsRows] = await db.query(statsQuery, params);
        const stats = statsRows[0] || { total_count: 0, total_duration: 0, total_distance: 0, total_calories: 0 };

        res.render('my-activities', {
            title: 'My Activities - Health & Fitness Tracker',
            activities,
            pagination: { page, pageSize, totalCount, totalPages },
            stats: stats,
            filterParams: {
                activity_type: req.query.activity_type || '',
                date_from: req.query.date_from || '',
                date_to: req.query.date_to || '',
                duration_min: req.query.duration_min || '',
                duration_max: req.query.duration_max || '',
                calories_min: req.query.calories_min || '',
                calories_max: req.query.calories_max || ''
            }
        });
    } catch (error) {
        console.error('My activities error:', error);
        res.render('my-activities', {
            title: 'My Activities - Health & Fitness Tracker',
            activities: [],
            pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
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

    try {
        const id = parseInt(req.params.id, 10);

        // Validate id
        if (isNaN(id)) {
            return sendValidationError(res, 'Invalid activity ID', req);
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
            return sendValidationError(res, 'Username must be between 3 and 50 characters', req);
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
                return sendValidationError(res, 'Username is already taken', req);
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
            return sendValidationError(res, 'New email is required', req);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return sendValidationError(res, 'Invalid email format', req);
        }

        // Check if email is already in use
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [newEmail, req.session.user.id]
        );

        if (existingUsers.length > 0) {
            return sendValidationError(res, 'Email is already in use by another user', req);
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
            return sendValidationError(res, 'Verification code and email are required', req);
        }

        // Find verification record
        const [verifications] = await db.query(
            'SELECT * FROM email_verifications WHERE user_id = ? AND verification_code = ? AND new_email = ? AND is_verified = 0',
            [req.session.user.id, verificationCode, newEmail]
        );

        if (verifications.length === 0) {
            return sendValidationError(res, 'Invalid or expired verification code', req);
        }

        const verification = verifications[0];

        // Check if verification has expired
        if (new Date() > new Date(verification.expires_at)) {
            return sendValidationError(res, 'Verification code has expired', req);
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
            const { getLogsByEventType } = require('../utils/audit-logger');
            logs = await getLogsByEventType(eventType, limit);
        } else if (username) {
            const { getLogsByUser } = require('../utils/audit-logger');
            logs = await getLogsByUser(username, limit);
        } else {
            const { getRecentLogs } = require('../utils/audit-logger');
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

// Logs page - view audit logs (requires login)
router.get('/logs', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 10), 200);
        const offset = (page - 1) * limit;

        // Get filter parameters
        const { event_type, user_id } = req.query;

        // Build WHERE clause
        let whereClause = '';
        const params = [];

        if (event_type) {
            whereClause = 'WHERE event_type = ?';
            params.push(event_type);
        }

        if (user_id) {
            whereClause += whereClause ? ' AND user_id = ?' : 'WHERE user_id = ?';
            params.push(parseInt(user_id, 10));
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
        const [countRows] = await db.query(countQuery, params);
        const totalCount = countRows[0]?.total || 0;
        const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

        // Get logs
        const logsQuery = `
            SELECT * FROM audit_logs 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [logs] = await db.query(logsQuery, [...params, limit, offset]);

        res.render('logs', {
            title: 'Audit Logs - Health & Fitness Tracker',
            logs,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages
            },
            filterParams: {
                event_type: event_type || '',
                user_id: user_id || ''
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.render('logs', {
            title: 'Audit Logs - Health & Fitness Tracker',
            logs: [],
            pagination: {
                page: 1,
                limit: 50,
                totalCount: 0,
                totalPages: 1
            },
            filterParams: {
                event_type: '',
                user_id: ''
            },
            error: 'Failed to load audit logs'
        });
    }
});

// Send delete account verification code
router.post('/account/delete/request-code', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const user = req.session.user;
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Delete any existing unused verifications for this user
        await db.query(
            'DELETE FROM email_verifications WHERE user_id = ? AND new_email = ? AND used_at IS NULL',
            [user.id, user.email]
        );

        await db.query(
            'INSERT INTO email_verifications (user_id, new_email, verification_code, expires_at) VALUES (?, ?, ?, ?)',
            [user.id, user.email, verificationCode, expiresAt]
        );

        const emailResult = await sendVerificationEmail(user.email, verificationCode);

        const response = {
            success: true,
            message: 'Verification code sent to your email',
            csrfToken: generateToken(req, res)
        };

        // Add preview URL in development mode
        if (emailResult.previewUrl) {
            response.previewUrl = emailResult.previewUrl;
        }

        res.json(response);
    } catch (error) {
        console.error('Send delete account code error:', error);
        sendServerError(res, error, 'Failed to send verification code');
    }
});

// Verify delete account code
router.post('/account/delete/verify-code', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { verificationCode } = req.body;
    if (!verificationCode) {
        return sendValidationError(res, 'Verification code required', req);
    }

    try {
        const user = req.session.user;

        // Check for valid verification code (allow multiple verification attempts)
        const [records] = await db.query(
            'SELECT * FROM email_verifications WHERE user_id = ? AND new_email = ? AND verification_code = ? AND used_at IS NULL AND expires_at > NOW()',
            [user.id, user.email, verificationCode]
        );

        if (records.length === 0) {
            // Return error with new CSRF token
            return res.status(400).json({
                message: 'Invalid or expired verification code',
                csrfToken: generateToken(req, res)
            });
        }

        // Store verification record ID in session for final deletion
        req.session.deleteAccountVerificationId = records[0].id;

        res.json({
            success: true,
            message: 'Verification code verified. Please confirm account deletion.',
            csrfToken: generateToken(req, res)
        });
    } catch (error) {
        console.error('Verify delete account code error:', error);
        sendServerError(res, error, 'Failed to verify code');
    }
});

// Delete account after verification
router.post('/account/delete', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const user = req.session.user;

        // Check if there's a verified code in session
        if (!req.session.deleteAccountVerificationId) {
            return res.status(400).json({
                message: 'Verification required. Please verify your code first.',
                csrfToken: generateToken(req, res)
            });
        }

        // Verify the verification record still exists and is valid
        const [records] = await db.query(
            'SELECT * FROM email_verifications WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > NOW()',
            [req.session.deleteAccountVerificationId, user.id]
        );

        if (records.length === 0) {
            // Clear invalid session data
            delete req.session.deleteAccountVerificationId;
            return res.status(400).json({
                message: 'Verification expired. Please start the process again.',
                csrfToken: generateToken(req, res)
            });
        }

        // Mark the verification as used
        await db.query('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [records[0].id]);

        // Delete the user
        await db.query('DELETE FROM users WHERE id = ?', [user.id]);

        // Clear session data
        delete req.session.deleteAccountVerificationId;

        req.session.destroy(() => { });
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        sendServerError(res, error, 'Failed to delete account');
    }
});

module.exports = router;
