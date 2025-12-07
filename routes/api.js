// API Routes for Health & Fitness Tracker
const express = require('express');
const router = express.Router();
const db = require('../config/db');

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
        const userId = req.session?.user?.id;

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

        const userId = req.session?.user?.id;

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

module.exports = router;
