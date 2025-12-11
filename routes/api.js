// API Routes for Health & Fitness Tracker
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { generateToken } = require('../middleware/csrf');
const bcrypt = require('bcrypt');
const { createToken, verifyToken } = require('../utils/api-token');
const { apiLimiter, apiTokenLimiter } = require('../middleware/rate-limit');

// Apply general API rate limiting to all routes
router.use(apiLimiter);

/**
 * GET /api/activities
 * Get list of activities with pagination, filtering, and sorting
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10, max: 50)
 * - activity_type: Filter by activity type (Running, Cycling, etc.)
 * - date_from: Filter activities from this date
 * - date_to: Filter activities until this date
 * - duration_min: Minimum duration in minutes
 * - duration_max: Maximum duration in minutes
 * - calories_min: Minimum calories burned
 * - calories_max: Maximum calories burned
 * - sort: Sort order (date_desc, date_asc, calories_desc, calories_asc, duration_desc, duration_asc)
 * 
 * Access:
 * - Unauthenticated: Returns only public activities (is_public = 1)
 * - Authenticated: Returns public activities + user's private activities
 */
// Bearer token detection middleware
router.use((req, res, next) => {
    const auth = req.get('authorization');
    const secret = process.env.API_TOKEN_SECRET || process.env.SESSION_SECRET || 'api-token-secret';
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
        const token = auth.slice(7).trim();
        const payload = verifyToken(token, secret);
        if (payload && payload.uid) {
            req.apiUserId = payload.uid;
        }
    }
    next();
});

// Apply stricter rate limiting to token generation endpoint
router.post('/auth/token', apiTokenLimiter, [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 50 }).withMessage('Invalid username'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 1 }).withMessage('Invalid password')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: errors.array().map(e => e.msg).join('; ') });
        }

        const { username, password } = req.body;

        const [rows] = await db.query('SELECT id, username, password FROM users WHERE username = ?', [username]);
        if (!rows || rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const secret = process.env.API_TOKEN_SECRET || process.env.SESSION_SECRET || 'api-token-secret';
        const token = createToken({ uid: user.id, username: user.username }, secret, 3600);

        return res.json({ success: true, token, token_type: 'Bearer', expires_in: 3600 });
    } catch (error) {
        console.error('Error issuing token:', error);
        return res.status(500).json({ success: false, error: 'Failed to issue token' });
    }
});

router.get('/activities', async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 10,
            activity_type,
            date_from,
            date_to,
            duration_min,
            duration_max,
            calories_min,
            calories_max,
            sort = 'date_desc'
        } = req.query;

        // Validate and sanitize query parameters
        const currentPage = Math.max(parseInt(page, 10) || 1, 1);
        const itemsPerPage = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 50);
        const offset = (currentPage - 1) * itemsPerPage;

        // Validate sort parameter
        const validSorts = {
            'date_desc': 'fa.activity_time DESC',
            'date_asc': 'fa.activity_time ASC',
            'calories_desc': 'fa.calories_burned DESC',
            'calories_asc': 'fa.calories_burned ASC',
            'duration_desc': 'fa.duration_minutes DESC',
            'duration_asc': 'fa.duration_minutes ASC'
        };
        const sortValue = validSorts[sort] ? sort : 'date_desc';

        // Validate activity_type
        const validActivityTypes = ['Running', 'Cycling', 'Swimming', 'Gym', 'Yoga', 'Walking', 'Hiking', 'Other', 'all'];
        const activityTypeValue = activity_type && validActivityTypes.includes(activity_type) ? activity_type : null;

        // Validate date parameters (must be ISO8601 if provided)
        let dateFromValue = null;
        let dateToValue = null;
        if (date_from) {
            const dateFromParsed = new Date(date_from);
            if (!Number.isNaN(dateFromParsed.getTime())) {
                dateFromValue = date_from;
            }
        }
        if (date_to) {
            const dateToParsed = new Date(date_to);
            if (!Number.isNaN(dateToParsed.getTime())) {
                dateToValue = date_to;
            }
        }

        // Validate numeric parameters
        const durationMinValue = duration_min ? parseInt(duration_min, 10) : null;
        if (durationMinValue !== null && Number.isNaN(durationMinValue)) {
            return res.status(400).json({ success: false, error: 'Invalid duration_min parameter' });
        }
        const durationMaxValue = duration_max ? parseInt(duration_max, 10) : null;
        if (durationMaxValue !== null && Number.isNaN(durationMaxValue)) {
            return res.status(400).json({ success: false, error: 'Invalid duration_max parameter' });
        }
        const caloriesMinValue = calories_min ? parseInt(calories_min, 10) : null;
        if (caloriesMinValue !== null && Number.isNaN(caloriesMinValue)) {
            return res.status(400).json({ success: false, error: 'Invalid calories_min parameter' });
        }
        const caloriesMaxValue = calories_max ? parseInt(calories_max, 10) : null;
        if (caloriesMaxValue !== null && Number.isNaN(caloriesMaxValue)) {
            return res.status(400).json({ success: false, error: 'Invalid calories_max parameter' });
        }

        // Get userId from session (may be undefined for unauthenticated users)
        const userId = req.apiUserId || req.session?.user?.id;

        // Build WHERE clause based on authentication status
        let whereClause = '';
        const params = [];

        if (userId) {
            // Authenticated: public activities OR user's private activities
            whereClause = 'WHERE (fa.is_public = 1 OR fa.user_id = ?)';
            params.push(userId);
        } else {
            // Unauthenticated: only public activities
            whereClause = 'WHERE fa.is_public = 1';
        }

        // Add filters
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

        // Determine sort order
        let orderBy = 'ORDER BY fa.activity_time DESC'; // default
        if (validSorts[sortValue]) {
            orderBy = `ORDER BY ${validSorts[sortValue]}`;
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM fitness_activities fa ${whereClause}`;
        const [countRows] = await db.query(countQuery, params);
        const totalCount = countRows[0]?.total || 0;
        const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

        // Get data with pagination
        const dataQuery = `
            SELECT 
                fa.id,
                fa.user_id,
                fa.activity_type,
                fa.duration_minutes,
                fa.distance_km,
                fa.calories_burned,
                fa.activity_time,
                fa.notes,
                fa.is_public,
                fa.created_at,
                u.username
            FROM fitness_activities fa
            JOIN users u ON fa.user_id = u.id
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, itemsPerPage, offset];
        const [activities] = await db.query(dataQuery, dataParams);

        // Return successful response
        res.json({
            success: true,
            authenticated: !!userId,
            data: activities,
            pagination: {
                page: currentPage,
                pageSize: itemsPerPage,
                totalItems: totalCount,
                totalPages: totalPages,
                hasNextPage: currentPage < totalPages,
                hasPreviousPage: currentPage > 1
            }
        });

    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activities',
            message: error.message
        });
    }
});

/**
 * GET /api/activities/stats
 * Get aggregated statistics for the authenticated user's activities
 * Requires Bearer token (or session)
 *
 * Query Parameters: Same as /api/activities (filters)
 */
router.get('/activities/stats', async (req, res) => {
    try {
        const userId = req.apiUserId || req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const {
            activity_type,
            date_from,
            date_to,
            duration_min,
            duration_max,
            calories_min,
            calories_max
        } = req.query;

        let whereClause = 'WHERE fa.user_id = ?';
        const params = [userId];

        if (activity_type && activity_type !== 'all') {
            whereClause += ' AND fa.activity_type = ?';
            params.push(activity_type);
        }
        if (date_from) {
            whereClause += ' AND fa.activity_time >= ?';
            params.push(date_from);
        }
        if (date_to) {
            whereClause += ' AND fa.activity_time <= ?';
            params.push(date_to);
        }
        if (duration_min) {
            whereClause += ' AND fa.duration_minutes >= ?';
            params.push(parseInt(duration_min, 10));
        }
        if (duration_max) {
            whereClause += ' AND fa.duration_minutes <= ?';
            params.push(parseInt(duration_max, 10));
        }
        if (calories_min) {
            whereClause += ' AND fa.calories_burned >= ?';
            params.push(parseInt(calories_min, 10));
        }
        if (calories_max) {
            whereClause += ' AND fa.calories_burned <= ?';
            params.push(parseInt(calories_max, 10));
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(fa.duration_minutes), 0) as total_duration,
                COALESCE(SUM(fa.distance_km), 0) as total_distance,
                COALESCE(SUM(fa.calories_burned), 0) as total_calories,
                COALESCE(AVG(fa.calories_burned / NULLIF(fa.duration_minutes, 0)), 0) AS avg_intensity,
                COALESCE(MIN(fa.calories_burned / NULLIF(fa.duration_minutes, 0)), 0) AS min_intensity,
                COALESCE(MAX(fa.calories_burned / NULLIF(fa.duration_minutes, 0)), 0) AS max_intensity
            FROM fitness_activities fa
            ${whereClause}
        `;

        const [rows] = await db.query(statsQuery, params);
        const stats = rows && rows[0] ? rows[0] : {
            total_count: 0,
            total_duration: 0,
            total_distance: 0,
            total_calories: 0,
            avg_intensity: 0,
            min_intensity: 0,
            max_intensity: 0
        };

        return res.json({ success: true, authenticated: true, data: stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch stats', message: error.message });
    }
});

// Stats endpoint moved to /internal/activities/stats for session-based access

/**
 * GET /api/activities/charts/type-distribution
/**
 * GET /api/activities/charts/daily-trend

/**
 * GET /api/activities/:id
 * Get single activity details
 *
 * Access control:
 * - Unauthenticated: only public activities
 * - Authenticated: public activities + own private activities
 */
router.get('/activities/:id', async (req, res) => {
    try {
        const activityId = parseInt(req.params.id, 10);
        if (Number.isNaN(activityId) || activityId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid activity id' });
        }

        const userId = req.apiUserId || req.session?.user?.id;

        let whereClause = 'WHERE fa.id = ? AND fa.is_public = 1';
        const params = [activityId];

        if (userId) {
            // Allow owner to view their private activity
            whereClause = 'WHERE fa.id = ? AND (fa.is_public = 1 OR fa.user_id = ?)';
            params.push(userId);
        }

        const query = `
            SELECT 
                fa.id,
                fa.user_id,
                fa.activity_type,
                fa.duration_minutes,
                fa.distance_km,
                fa.calories_burned,
                fa.activity_time,
                fa.notes,
                fa.is_public,
                fa.created_at,
                u.username
            FROM fitness_activities fa
            JOIN users u ON fa.user_id = u.id
            ${whereClause}
            LIMIT 1
        `;

        const [rows] = await db.query(query, params);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Activity not found or access denied' });
        }

        return res.json({
            success: true,
            authenticated: !!userId,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching activity detail:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch activity detail', message: error.message });
    }
});

/**
 * POST /api/activities
 * Create a new activity (JSON body)
 * Requires authentication
 */
router.post('/activities', [
    body('activity_type')
        .notEmpty().withMessage('Activity type is required')
        .trim()
        .isIn(['Running', 'Cycling', 'Swimming', 'Gym', 'Yoga', 'Walking', 'Hiking', 'Other'])
        .withMessage('Invalid activity type'),
    body('duration_minutes', 'duration')
        .notEmpty().withMessage('Duration is required')
        .isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('distance_km', 'distance')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
    body('calories_burned', 'calories')
        .notEmpty().withMessage('Calories is required')
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
    try {
        const userId = req.apiUserId || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array().map(e => e.msg).join('; ')
            });
        }

        const {
            activity_type,
            duration_minutes,
            duration,
            distance_km,
            distance,
            calories_burned,
            calories,
            activity_time,
            notes,
            is_public
        } = req.body || {};

        // Use long form field names (already validated above)
        const durationValue = duration_minutes || duration;
        const caloriesValue = calories_burned || calories;
        const distanceValue = distance_km !== undefined ? distance_km : distance;

        const durationParsed = parseInt(durationValue, 10);
        const caloriesParsed = parseInt(caloriesValue, 10);
        const distanceParsed = distanceValue !== undefined && distanceValue !== null && distanceValue !== ''
            ? parseFloat(distanceValue)
            : null;
        const isPublicFlag = is_public === 0 || is_public === '0' ? 0 : 1;

        const insertQuery = `
            INSERT INTO fitness_activities
                (user_id, activity_type, duration_minutes, distance_km, calories_burned, activity_time, notes, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            userId,
            activity_type,
            durationParsed,
            distanceParsed,
            caloriesParsed,
            activity_time,
            notes || null,
            isPublicFlag
        ];

        const [result] = await db.query(insertQuery, values);
        const insertedId = result.insertId;

        const selectQuery = `
            SELECT 
                fa.id,
                fa.user_id,
                fa.activity_type,
                fa.duration_minutes,
                fa.distance_km,
                fa.calories_burned,
                fa.activity_time,
                fa.notes,
                fa.is_public,
                fa.created_at,
                u.username
            FROM fitness_activities fa
            JOIN users u ON fa.user_id = u.id
            WHERE fa.id = ?
            LIMIT 1
        `;

        const [rows] = await db.query(selectQuery, [insertedId]);
        const created = rows && rows[0] ? rows[0] : null;

        return res.status(201).json({
            success: true,
            authenticated: true,
            data: created
        });
    } catch (error) {
        console.error('Error creating activity:', error);
        return res.status(500).json({ success: false, error: 'Failed to create activity', message: error.message });
    }
});

/**
 * PATCH /api/activities/:id
 * Update an existing activity (owner only)
 * Requires authentication
 */
router.patch('/activities/:id', [
    body('activity_type')
        .optional({ checkFalsy: true })
        .trim()
        .isIn(['Running', 'Cycling', 'Swimming', 'Gym', 'Yoga', 'Walking', 'Hiking', 'Other'])
        .withMessage('Invalid activity type'),
    body('duration_minutes', 'duration')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('distance_km', 'distance')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
    body('calories_burned', 'calories')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('Calories must be a non-negative number'),
    body('activity_time')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('Invalid activity time format'),
    body('notes')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Notes must be under 1000 characters'),
    body('is_public')
        .optional({ checkFalsy: true })
        .isInt({ min: 0, max: 1 }).withMessage('Public flag must be 0 or 1')
], async (req, res) => {
    try {
        const userId = req.apiUserId || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const activityId = parseInt(req.params.id, 10);
        if (Number.isNaN(activityId) || activityId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid activity ID' });
        }

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array().map(e => e.msg).join('; ')
            });
        }

        // Check if activity exists and belongs to user
        const checkQuery = 'SELECT id, user_id FROM fitness_activities WHERE id = ?';
        const [existing] = await db.query(checkQuery, [activityId]);

        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        if (existing[0].user_id !== userId) {
            return res.status(403).json({ success: false, error: 'You can only update your own activities' });
        }

        // Parse and validate fields (accept both short and database field names)
        const {
            activity_type,
            duration_minutes,
            duration,
            distance_km,
            distance,
            calories_burned,
            calories,
            activity_time,
            notes,
            is_public
        } = req.body || {};

        // Build dynamic UPDATE query based on provided fields
        const updates = [];
        const values = [];

        if (activity_type !== undefined) {
            updates.push('activity_type = ?');
            values.push(activity_type);
        }

        const durationValue = duration_minutes || duration;
        if (durationValue !== undefined) {
            const durationParsed = parseInt(durationValue, 10);
            updates.push('duration_minutes = ?');
            values.push(durationParsed);
        }

        const distanceValue = distance_km !== undefined ? distance_km : distance;
        if (distanceValue !== undefined) {
            if (distanceValue === null || distanceValue === '') {
                updates.push('distance_km = NULL');
            } else {
                const distanceParsed = parseFloat(distanceValue);
                updates.push('distance_km = ?');
                values.push(distanceParsed);
            }
        }

        const caloriesValue = calories_burned || calories;
        if (caloriesValue !== undefined) {
            const caloriesParsed = parseInt(caloriesValue, 10);
            updates.push('calories_burned = ?');
            values.push(caloriesParsed);
        }

        if (activity_time !== undefined) {
            updates.push('activity_time = ?');
            values.push(activity_time);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes || null);
        }

        if (is_public !== undefined) {
            const isPublicFlag = is_public === 0 || is_public === '0' ? 0 : 1;
            updates.push('is_public = ?');
            values.push(isPublicFlag);
        }

        // If no fields to update, return error
        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        // Execute update
        const updateQuery = `UPDATE fitness_activities SET ${updates.join(', ')} WHERE id = ?`;
        values.push(activityId);
        await db.query(updateQuery, values);

        // Fetch and return updated activity
        const selectQuery = `
            SELECT 
                fa.id,
                fa.user_id,
                fa.activity_type,
                fa.duration_minutes,
                fa.distance_km,
                fa.calories_burned,
                fa.activity_time,
                fa.notes,
                fa.is_public,
                fa.created_at,
                u.username
            FROM fitness_activities fa
            JOIN users u ON fa.user_id = u.id
            WHERE fa.id = ?
            LIMIT 1
        `;

        const [rows] = await db.query(selectQuery, [activityId]);
        const updated = rows && rows[0] ? rows[0] : null;

        return res.json({
            success: true,
            authenticated: true,
            data: updated
        });
    } catch (error) {
        console.error('Error updating activity:', error);
        return res.status(500).json({ success: false, error: 'Failed to update activity', message: error.message });
    }
});

/**
 * DELETE /api/activities/:id
 * Delete an activity (owner only)
 * Requires authentication
 */
router.delete('/activities/:id', async (req, res) => {
    try {
        const userId = req.apiUserId || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const activityId = parseInt(req.params.id, 10);
        if (Number.isNaN(activityId) || activityId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid activity ID' });
        }

        // Check if activity exists and belongs to user
        const checkQuery = 'SELECT id, user_id FROM fitness_activities WHERE id = ?';
        const [existing] = await db.query(checkQuery, [activityId]);

        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        if (existing[0].user_id !== userId) {
            return res.status(403).json({ success: false, error: 'You can only delete your own activities' });
        }

        // Delete the activity
        const deleteQuery = 'DELETE FROM fitness_activities WHERE id = ?';
        await db.query(deleteQuery, [activityId]);

        return res.json({
            success: true,
            authenticated: true,
            message: 'Activity deleted successfully',
            deletedId: activityId
        });
    } catch (error) {
        console.error('Error deleting activity:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete activity', message: error.message });
    }
});

/**
 * GET /api/activities/search/export
 * Public endpoint for exporting search results (public activities only)
 * No authentication required
 * Query Parameters: same as search route (activity_type, date_from, date_to, duration_min, duration_max, calories_min, calories_max, sort)
 */
router.get('/activities/search/export', async (req, res) => {
    try {
        const {
            activity_type,
            date_from,
            date_to,
            duration_min,
            duration_max,
            calories_min,
            calories_max,
            sort = 'date_desc'
        } = req.query;

        // Validate and sanitize parameters (same as /search route)
        const validActivityTypes = ['Running', 'Cycling', 'Swimming', 'Gym', 'Yoga', 'Walking', 'Hiking', 'Other', 'all'];
        const activityTypeValue = activity_type && validActivityTypes.includes(activity_type) ? activity_type : null;

        let dateFromValue = null;
        let dateToValue = null;
        if (date_from) {
            const dateFromParsed = new Date(date_from);
            if (!Number.isNaN(dateFromParsed.getTime())) {
                dateFromValue = date_from;
            }
        }
        if (date_to) {
            const dateToParsed = new Date(date_to);
            if (!Number.isNaN(dateToParsed.getTime())) {
                dateToValue = date_to;
            }
        }

        const durationMinValue = duration_min ? parseInt(duration_min, 10) : null;
        const durationMaxValue = duration_max ? parseInt(duration_max, 10) : null;
        const caloriesMinValue = calories_min ? parseInt(calories_min, 10) : null;
        const caloriesMaxValue = calories_max ? parseInt(calories_max, 10) : null;

        // Build WHERE clause - only public activities
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
        if (durationMinValue !== null && !Number.isNaN(durationMinValue)) {
            whereClause += ' AND fa.duration_minutes >= ?';
            params.push(durationMinValue);
        }
        if (durationMaxValue !== null && !Number.isNaN(durationMaxValue)) {
            whereClause += ' AND fa.duration_minutes <= ?';
            params.push(durationMaxValue);
        }
        if (caloriesMinValue !== null && !Number.isNaN(caloriesMinValue)) {
            whereClause += ' AND fa.calories_burned >= ?';
            params.push(caloriesMinValue);
        }
        if (caloriesMaxValue !== null && !Number.isNaN(caloriesMaxValue)) {
            whereClause += ' AND fa.calories_burned <= ?';
            params.push(caloriesMaxValue);
        }

        // Build ORDER BY clause
        let orderBy = 'fa.activity_time DESC';
        if (sort === 'date_asc') orderBy = 'fa.activity_time ASC';
        else if (sort === 'calories_desc') orderBy = 'fa.calories_burned DESC';
        else if (sort === 'calories_asc') orderBy = 'fa.calories_burned ASC';
        else if (sort === 'duration_desc') orderBy = 'fa.duration_minutes DESC';
        else if (sort === 'duration_asc') orderBy = 'fa.duration_minutes ASC';

        const query = `
            SELECT fa.id, fa.activity_type, fa.duration_minutes, fa.distance_km, fa.calories_burned, fa.activity_time, fa.notes, u.username
            FROM fitness_activities fa
            JOIN users u ON fa.user_id = u.id
            ${whereClause}
            ORDER BY ${orderBy}
        `;

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows || []
        });
    } catch (error) {
        console.error('Error exporting search results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export search results',
            message: error.message
        });
    }
});

module.exports = router;
