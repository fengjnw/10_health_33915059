// Import required modules
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { EventTypes, logDataChange } = require('../utils/audit-logger');
const { requireAdmin } = require('../middleware/admin');
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

        // Validate and sanitize search parameters
        const validActivityTypes = ['Running', 'Cycling', 'Swimming', 'Gym', 'Yoga', 'Walking', 'Hiking', 'Other', 'all'];
        const activityTypeValue = req.query.activity_type && validActivityTypes.includes(req.query.activity_type) ? req.query.activity_type : null;

        // Validate dates
        let dateFromValue = null;
        let dateToValue = null;
        if (req.query.date_from) {
            const dateFromParsed = new Date(req.query.date_from);
            if (!Number.isNaN(dateFromParsed.getTime())) {
                dateFromValue = req.query.date_from;
            }
        }
        if (req.query.date_to) {
            const dateToParsed = new Date(req.query.date_to);
            if (!Number.isNaN(dateToParsed.getTime())) {
                dateToValue = req.query.date_to;
            }
        }

        // Validate numeric parameters
        const durationMinValue = req.query.duration_min ? parseInt(req.query.duration_min, 10) : null;
        if (durationMinValue !== null && Number.isNaN(durationMinValue)) {
            return res.render('search', {
                title: 'Search Activities - Health & Fitness Tracker',
                activities: null,
                searchPerformed: true,
                error: 'Invalid duration_min parameter',
                searchParams: req.query,
                pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
            });
        }
        const durationMaxValue = req.query.duration_max ? parseInt(req.query.duration_max, 10) : null;
        if (durationMaxValue !== null && Number.isNaN(durationMaxValue)) {
            return res.render('search', {
                title: 'Search Activities - Health & Fitness Tracker',
                activities: null,
                searchPerformed: true,
                error: 'Invalid duration_max parameter',
                searchParams: req.query,
                pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
            });
        }
        const caloriesMinValue = req.query.calories_min ? parseInt(req.query.calories_min, 10) : null;
        if (caloriesMinValue !== null && Number.isNaN(caloriesMinValue)) {
            return res.render('search', {
                title: 'Search Activities - Health & Fitness Tracker',
                activities: null,
                searchPerformed: true,
                error: 'Invalid calories_min parameter',
                searchParams: req.query,
                pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
            });
        }
        const caloriesMaxValue = req.query.calories_max ? parseInt(req.query.calories_max, 10) : null;
        if (caloriesMaxValue !== null && Number.isNaN(caloriesMaxValue)) {
            return res.render('search', {
                title: 'Search Activities - Health & Fitness Tracker',
                activities: null,
                searchPerformed: true,
                error: 'Invalid calories_max parameter',
                searchParams: req.query,
                pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
            });
        }

        // Build WHERE clause with filters - only show public activities
        let whereClause = 'WHERE fa.is_public = 1';
        const params = [];

        if (activityTypeValue && activityTypeValue !== 'all') {
            whereClause += ' AND fa.activity_type = ?';
            params.push(activityTypeValue);
        }
        if (dateFromValue) {
            whereClause += ' AND fa.activity_time >= ?';
            params.push(dateFromValue);
        }
        if (dateToValue) {
            whereClause += ' AND fa.activity_time <= ?';
            params.push(dateToValue);
        }
        if (durationMinValue !== null) {
            whereClause += ' AND fa.duration_minutes >= ?';
            params.push(durationMinValue);
        }
        if (durationMaxValue !== null) {
            whereClause += ' AND fa.duration_minutes <= ?';
            params.push(durationMaxValue);
        }
        if (caloriesMinValue !== null) {
            whereClause += ' AND fa.calories_burned >= ?';
            params.push(caloriesMinValue);
        }
        if (caloriesMaxValue !== null) {
            whereClause += ' AND fa.calories_burned <= ?';
            params.push(caloriesMaxValue);
        }

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
        return res.redirect('auth/login');
    }

    res.render('add-activity', {
        title: 'Add Activity - Health & Fitness Tracker',
        errors: null
    });
});

// Add Activity page route - POST request processes the form
router.post('/add-activity', [
    body('activity_type')
        .notEmpty().withMessage('Activity type is required')
        .trim()
        .isIn(['Running', 'Cycling', 'Swimming', 'Gym', 'Yoga', 'Walking', 'Hiking', 'Other'])
        .withMessage('Invalid activity type'),
    body('duration_minutes')
        .notEmpty().withMessage('Duration is required')
        .isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('distance_km')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
    body('calories_burned')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('Calories must be a non-negative number'),
    body('activity_time')
        .notEmpty().withMessage('Activity time is required')
        .isISO8601().withMessage('Invalid activity time format'),
    body('notes')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Notes must be under 1000 characters')
], async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('auth/login');
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('add-activity', {
            title: 'Add Activity - Health & Fitness Tracker',
            errors: errors.array().map(e => e.msg),
            formData: req.body
        });
    }

    try {
        const { activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes } = req.body;

        // Insert activity into database
        const query = `
            INSERT INTO fitness_activities (user_id, activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            req.session.user.id,
            activity_type,
            parseInt(duration_minutes, 10),
            distance_km ? parseFloat(distance_km) : null,
            calories_burned ? parseInt(calories_burned, 10) : null,
            activity_time,
            notes || null
        ]);

        // Log activity creation
        await logDataChange(
            EventTypes.ACTIVITY_CREATE,
            req,
            'fitness_activity',
            result.insertId,
            {
                activity_type,
                duration_minutes: parseInt(duration_minutes, 10),
                distance_km: distance_km ? parseFloat(distance_km) : null,
                calories_burned: calories_burned ? parseInt(calories_burned, 10) : null,
                activity_time,
                is_public: 0
            }
        );

        res.redirect('my-activities');
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
        return res.redirect('auth/login');
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
                COALESCE(AVG(calories_burned / NULLIF(duration_minutes, 0)), 0) AS avg_intensity,
                COALESCE(MIN(calories_burned / NULLIF(duration_minutes, 0)), 0) AS min_intensity,
                COALESCE(MAX(calories_burned / NULLIF(duration_minutes, 0)), 0) AS max_intensity
            FROM fitness_activities 
            ${whereClause}
        `;
        const [statsRows] = await db.query(statsQuery, params);
        const stats = statsRows[0] || { total_count: 0, total_duration: 0, total_distance: 0, total_calories: 0, avg_intensity: 0, min_intensity: 0, max_intensity: 0 };

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
        return res.redirect('../auth/login');
    }

    try {
        const { id } = req.params;

        // Get the activity from database
        const query = 'SELECT * FROM fitness_activities WHERE id = ?';
        const [activities] = await db.query(query, [id]);

        if (activities.length === 0) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Activity not found',
                user: req.session.user,
                error: null
            });
        }

        const activity = activities[0];

        // Check if the user owns this activity
        if (activity.user_id !== req.session.user.id) {
            return res.status(403).render('error', {
                title: 'Error',
                message: 'You do not have permission to edit this activity',
                user: req.session.user,
                error: null
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
            title: 'Error',
            message: 'An error occurred while loading the activity',
            user: req.session.user,
            error: null
        });
    }
});

// Edit activity route - PATCH request processes the form
router.patch('/my-activities/:id/edit', [
    body('activity_type')
        .notEmpty().withMessage('Activity type is required')
        .trim()
        .isIn(['Running', 'Cycling', 'Swimming', 'Gym', 'Yoga', 'Walking', 'Hiking', 'Other'])
        .withMessage('Invalid activity type'),
    body('duration_minutes')
        .notEmpty().withMessage('Duration is required')
        .isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('distance_km')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
    body('calories_burned')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('Calories must be a non-negative number'),
    body('activity_time')
        .notEmpty().withMessage('Activity time is required')
        .isISO8601().withMessage('Invalid activity time format'),
    body('notes')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Notes must be under 1000 characters'),
    body('is_public')
        .optional({ checkFalsy: true })
        .isInt({ min: 0, max: 1 }).withMessage('Public flag must be 0 or 1')
], async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated', csrfToken: generateToken(req, res) });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array().map(e => e.msg).join('; '),
            csrfToken: generateToken(req, res)
        });
    }

    try {
        const { id } = req.params;
        const { activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes, is_public } = req.body;

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

        const oldData = {
            activity_type: activity.activity_type,
            duration_minutes: activity.duration_minutes,
            distance_km: activity.distance_km,
            calories_burned: activity.calories_burned,
            activity_time: activity.activity_time,
            notes: activity.notes,
            is_public: activity.is_public
        };

        const newData = {
            activity_type,
            duration_minutes: parseInt(duration_minutes, 10),
            distance_km: distance_km ? parseFloat(distance_km) : null,
            calories_burned: calories_burned ? parseInt(calories_burned, 10) : null,
            activity_time,
            notes: notes || null,
            is_public: is_public ? parseInt(is_public, 10) : 0
        };

        await db.query(updateQuery, [
            activity_type,
            parseInt(duration_minutes, 10),
            distance_km ? parseFloat(distance_km) : null,
            calories_burned ? parseInt(calories_burned, 10) : null,
            activity_time,
            notes || null,
            is_public ? parseInt(is_public, 10) : 0,
            id
        ]);

        // Log activity update
        await logDataChange(
            EventTypes.ACTIVITY_UPDATE,
            req,
            'fitness_activity',
            id,
            { old: oldData, new: newData }
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
            'SELECT id, user_id, activity_type, duration_minutes, distance_km, calories_burned, activity_time, is_public FROM fitness_activities WHERE id = ?',
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
                    distance_km: activity.distance_km,
                    calories_burned: activity.calories_burned,
                    activity_time: activity.activity_time,
                    is_public: activity.is_public
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
        return res.redirect('auth/login');
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

        if (users.length === 0) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'User not found',
                user: req.session.user,
                error: null
            });
        }

        res.render('profile', {
            title: 'My Profile - Health & Fitness Tracker',
            user: users[0]
        });
    } catch (error) {
        console.error('Profile page error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while loading your profile',
            user: req.session.user,
            error: null
        });
    }
});

// GET /account/change-email - Show change email page
router.get('/account/change-email', (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('auth/login');
    }

    res.render('change-email', {
        title: 'Change Email - Health & Fitness Tracker'
    });
});

// GET /account/delete - Show delete account page
router.get('/account/delete', (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('auth/login');
    }

    res.render('delete-account', {
        title: 'Delete Account - Health & Fitness Tracker'
    });
});

// PATCH /profile - Update user profile (username, first_name, last_name)
// Email can only be changed through the email verification process
router.patch('/profile', [
    body('username')
        .notEmpty().withMessage('Username is required')
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('first_name')
        .notEmpty().withMessage('First name is required')
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    body('last_name')
        .notEmpty().withMessage('Last name is required')
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
], async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array().map(e => e.msg).join('; ')
        });
    }

    try {
        const { username, first_name, last_name } = req.body;

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
// Request email verification code
router.post('/email/request-verification', [
    body('newEmail')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail()
], async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array().map(e => e.msg).join('; ')
        });
    }

    try {
        const { newEmail } = req.body;

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
router.post('/email/verify-code', [
    body('verificationCode')
        .notEmpty().withMessage('Verification code is required')
        .trim()
        .matches(/^\d{6}$/).withMessage('Verification code must be 6 digits'),
    body('newEmail')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail()
], async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated', csrfToken: generateToken(req, res) });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array().map(e => e.msg).join('; ')
        });
    }

    try {
        const { verificationCode, newEmail } = req.body;

        // Find verification record
        const [verifications] = await db.query(
            'SELECT * FROM email_verifications WHERE user_id = ? AND verification_code = ? AND new_email = ? AND used_at IS NULL',
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
            'UPDATE email_verifications SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
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

// Logs page - view audit logs (requires admin)
router.get('/admin/logs', requireAdmin, async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 10), 200);
        const offset = (page - 1) * limit;

        // Get and validate filter parameters
        const { event_type, user_id } = req.query;

        // Validate event_type - only allow valid event types
        const validEventTypes = [
            'REGISTER', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE',
            'ACTIVITY_CREATE', 'ACTIVITY_UPDATE', 'ACTIVITY_DELETE',
            'PROFILE_UPDATE', 'EMAIL_CHANGE_REQUEST', 'EMAIL_CHANGE_VERIFY',
            'ACCOUNT_DELETE_REQUEST', 'ACCOUNT_DELETE_VERIFY'
        ];
        const eventTypeValue = event_type && validEventTypes.includes(event_type) ? event_type : null;

        // Validate user_id - must be a positive integer if provided
        let userIdValue = null;
        if (user_id) {
            const parsedUserId = parseInt(user_id, 10);
            if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
                userIdValue = parsedUserId;
            } else if (user_id) {
                // Invalid user_id provided, show error
                return res.render('logs', {
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
                    error: 'Invalid user_id parameter'
                });
            }
        }

        // Build WHERE clause
        let whereClause = '';
        const params = [];

        if (eventTypeValue) {
            whereClause = 'WHERE event_type = ?';
            params.push(eventTypeValue);
        }

        if (userIdValue) {
            whereClause += whereClause ? ' AND user_id = ?' : 'WHERE user_id = ?';
            params.push(userIdValue);
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
                event_type: eventTypeValue || '',
                user_id: userIdValue || ''
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
router.post('/account/delete/verify-code', [
    body('verificationCode')
        .notEmpty().withMessage('Verification code is required')
        .trim()
        .matches(/^\d{6}$/).withMessage('Verification code must be 6 digits')
], async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array().map(e => e.msg).join('; ')
        });
    }

    try {
        const user = req.session.user;
        const { verificationCode } = req.body;

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

// API Builder page (public)
router.get('/api-builder', (req, res) => {
    res.render('api-builder', {
        title: 'API Builder - Developer Tools',
        baseUrl: process.env.HEALTH_BASE_PATH || 'http://localhost:8000'
    });
});

// Admin: Manage Users page (requires admin)
router.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, first_name, last_name, is_admin, created_at FROM users ORDER BY created_at DESC'
        );

        res.render('admin-users', {
            title: 'Manage Users - Admin',
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load users list',
            user: req.session.user,
            error: null
        });
    }
});

// Admin: Delete user (requires admin)
router.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);

        // Prevent admin from deleting themselves
        if (userId === req.session.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        // Get user info before deleting
        const [users] = await db.query('SELECT id, username, email FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const deletedUser = users[0];

        // Delete the user
        await db.query('DELETE FROM users WHERE id = ?', [userId]);

        // Log admin action
        await logDataChange(
            EventTypes.ADMIN_DELETE_USER,
            req,
            'user',
            userId,
            {
                deleted_user: {
                    id: deletedUser.id,
                    username: deletedUser.username,
                    email: deletedUser.email
                },
                admin_user: {
                    id: req.session.user.id,
                    username: req.session.user.username
                }
            }
        );

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

// Admin: Manage all activities (requires admin)
router.get('/admin/activities', requireAdmin, async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 10), 100);
        const offset = (page - 1) * limit;

        // Get all activities with user information
        const [activities] = await db.query(`
            SELECT a.*, u.username, u.email
            FROM fitness_activities a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.activity_time DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM fitness_activities');

        res.render('admin-activities', {
            title: 'Manage All Activities - Admin',
            activities,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCount: total,
                limit
            }
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load activities',
            user: req.session.user,
            error: null
        });
    }
});

// Admin: Delete activity (requires admin)
router.post('/admin/activities/:id/delete', requireAdmin, async (req, res) => {
    try {
        const activityId = parseInt(req.params.id, 10);

        if (Number.isNaN(activityId)) {
            return res.status(400).json({ success: false, error: 'Invalid activity id' });
        }

        // Get activity info before deleting
        const [activities] = await db.query(
            `SELECT a.*, u.username, u.email 
             FROM fitness_activities a 
             JOIN users u ON a.user_id = u.id 
             WHERE a.id = ?`,
            [activityId]
        );

        if (activities.length === 0) {
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        const deletedActivity = activities[0];

        // Delete the activity
        await db.query('DELETE FROM fitness_activities WHERE id = ?', [activityId]);

        // Log admin action
        await logDataChange(
            EventTypes.ADMIN_DELETE_ACTIVITY,
            req,
            'fitness_activity',
            activityId,
            {
                deleted_activity: {
                    id: deletedActivity.id,
                    activity_type: deletedActivity.activity_type,
                    duration_minutes: deletedActivity.duration_minutes,
                    activity_time: deletedActivity.activity_time,
                    owner_username: deletedActivity.username,
                    owner_email: deletedActivity.email
                },
                admin_user: {
                    id: req.session.user.id,
                    username: req.session.user.username
                }
            }
        );

        res.json({ success: true, message: 'Activity deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete activity' });
    }
});

module.exports = router;
