// API Routes for Health & Fitness Tracker
const express = require('express');
const router = express.Router();
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
router.post('/auth/token', apiTokenLimiter, async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }

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

        // Get userId from session (may be undefined for unauthenticated users)
        const userId = req.apiUserId || req.session?.user?.id;

        // Validate and normalize pagination parameters
        const currentPage = Math.max(parseInt(page, 10) || 1, 1);
        const itemsPerPage = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 50);
        const offset = (currentPage - 1) * itemsPerPage;

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

        // Determine sort order
        let orderBy = 'ORDER BY fa.activity_time DESC'; // default
        const validSorts = {
            'date_desc': 'fa.activity_time DESC',
            'date_asc': 'fa.activity_time ASC',
            'calories_desc': 'fa.calories_burned DESC',
            'calories_asc': 'fa.calories_burned ASC',
            'duration_desc': 'fa.duration_minutes DESC',
            'duration_asc': 'fa.duration_minutes ASC'
        };

        if (validSorts[sort]) {
            orderBy = `ORDER BY ${validSorts[sort]}`;
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
 * Get aggregated statistics for activities with optional filtering
 * 
 * Query Parameters: Same as /api/activities (filters)
 * 
 * Access:
 * - Unauthenticated: Returns null (stats private to authenticated users)
 * - Authenticated: Returns stats for user's activities (public + private)
 */
router.get('/activities/stats', async (req, res) => {
    try {
        const {
            activity_type,
            date_from,
            date_to,
            duration_min,
            duration_max,
            calories_min,
            calories_max
        } = req.query;

        // Get userId from session/token
        const userId = req.apiUserId || req.session?.user?.id;

        // Unauthenticated users cannot access stats
        if (!userId) {
            return res.json({
                success: true,
                stats: null,
                message: 'Authentication required for statistics'
            });
        }

        // Build WHERE clause for authenticated user
        let whereClause = 'WHERE (fa.is_public = 1 OR fa.user_id = ?)';
        const params = [userId];

        // Add same filters as activities endpoint
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

        // Calculate comprehensive stats
        const statsQuery = `
            SELECT
                COUNT(*) AS total_count,
                COALESCE(SUM(calories_burned), 0) AS total_calories,
                COALESCE(SUM(duration_minutes), 0) AS total_duration,
                COALESCE(SUM(distance_km), 0) AS total_distance,
                COALESCE(AVG(calories_burned / NULLIF(duration_minutes, 0)), 0) AS avg_intensity,
                COALESCE(MIN(calories_burned / NULLIF(duration_minutes, 0)), 0) AS min_intensity,
                COALESCE(MAX(calories_burned / NULLIF(duration_minutes, 0)), 0) AS max_intensity
            FROM fitness_activities fa
            ${whereClause}
        `;

        const [statsRows] = await db.query(statsQuery, params);
        const stats = statsRows && statsRows[0] ? statsRows[0] : null;

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

// CSRF token endpoint for API testing (GET is allowed without token)
router.get('/csrf-token', (req, res) => {
    const token = generateToken(req, res);
    return res.json({ success: true, csrfToken: token });
});

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
router.post('/activities', async (req, res) => {
    try {
        const userId = req.apiUserId || req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const {
            activity_type,
            duration_minutes,
            duration,  // Accept short form
            distance_km,
            distance,  // Accept short form
            calories_burned,
            calories,  // Accept short form
            activity_time,
            notes,
            is_public
        } = req.body || {};

        // Use short form if provided, otherwise use database field name
        const durationValue = duration_minutes || duration;
        const caloriesValue = calories_burned || calories;
        const distanceValue = distance_km !== undefined ? distance_km : distance;

        if (!activity_type || !durationValue || !caloriesValue || !activity_time) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: activity_type, duration, calories, activity_time'
            });
        }

        const durationParsed = parseInt(durationValue, 10);
        const caloriesParsed = parseInt(caloriesValue, 10);
        const distanceParsed = distanceValue !== undefined && distanceValue !== null && distanceValue !== ''
            ? parseFloat(distanceValue)
            : null;
        const isPublicFlag = is_public === 0 || is_public === '0' ? 0 : 1;

        if (Number.isNaN(durationParsed) || durationParsed <= 0) {
            return res.status(400).json({ success: false, error: 'duration must be a positive integer' });
        }
        if (Number.isNaN(caloriesParsed) || caloriesParsed <= 0) {
            return res.status(400).json({ success: false, error: 'calories must be a positive integer' });
        }
        if (distanceParsed !== null && Number.isNaN(distanceParsed)) {
            return res.status(400).json({ success: false, error: 'distance must be a number' });
        }

        const activityDate = new Date(activity_time);
        if (Number.isNaN(activityDate.getTime())) {
            return res.status(400).json({ success: false, error: 'activity_time must be a valid date' });
        }

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
            activityDate,
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
router.patch('/activities/:id', async (req, res) => {
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
            if (Number.isNaN(durationParsed) || durationParsed <= 0) {
                return res.status(400).json({ success: false, error: 'duration must be a positive integer' });
            }
            updates.push('duration_minutes = ?');
            values.push(durationParsed);
        }

        const distanceValue = distance_km !== undefined ? distance_km : distance;
        if (distanceValue !== undefined) {
            if (distanceValue === null || distanceValue === '') {
                updates.push('distance_km = NULL');
            } else {
                const distanceParsed = parseFloat(distanceValue);
                if (Number.isNaN(distanceParsed)) {
                    return res.status(400).json({ success: false, error: 'distance must be a number' });
                }
                updates.push('distance_km = ?');
                values.push(distanceParsed);
            }
        }

        const caloriesValue = calories_burned || calories;
        if (caloriesValue !== undefined) {
            const caloriesParsed = parseInt(caloriesValue, 10);
            if (Number.isNaN(caloriesParsed) || caloriesParsed <= 0) {
                return res.status(400).json({ success: false, error: 'calories must be a positive integer' });
            }
            updates.push('calories_burned = ?');
            values.push(caloriesParsed);
        }

        if (activity_time !== undefined) {
            const activityDate = new Date(activity_time);
            if (Number.isNaN(activityDate.getTime())) {
                return res.status(400).json({ success: false, error: 'activity_time must be a valid date' });
            }
            updates.push('activity_time = ?');
            values.push(activityDate);
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

module.exports = router;
