// Internal Routes for Site-Internal AJAX Calls
// These routes require session authentication + CSRF protection
// NOT for external API consumption
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { addActivityFilters } = require('../utils/filter-helper');

/**
 * GET /internal/activities/stats
 * Get aggregated statistics for activities
 * 
 * Query Parameters: Same as /api/activities (filters)
 * 
 * Access:
 * - Session authenticated users only
 * - Requires CSRF token
 */
router.get('/activities/stats', async (req, res) => {
    try {
        const userId = req.session?.user?.id;

        // Session-only, no unauthenticated access
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
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

        // Build WHERE clause for authenticated user (only their own activities)
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

/**
 * GET /internal/activities/export
 * Return all activities for the authenticated user matching current filters (no pagination)
 * This is used by CSV/PDF exports to include all filtered rows, not only the current page.
 */
router.get('/activities/export', async (req, res) => {
    try {
        const userId = req.session?.user?.id;

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
            calories_max,
            sort = 'date_desc'
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

        const validSorts = {
            'date_desc': 'fa.activity_time DESC',
            'date_asc': 'fa.activity_time ASC',
            'calories_desc': 'fa.calories_burned DESC',
            'calories_asc': 'fa.calories_burned ASC',
            'duration_desc': 'fa.duration_minutes DESC',
            'duration_asc': 'fa.duration_minutes ASC'
        };
        const orderBy = validSorts[sort] || 'fa.activity_time DESC';

        const query = `
            SELECT 
                fa.id,
                fa.activity_type,
                fa.duration_minutes,
                fa.distance_km,
                fa.calories_burned,
                fa.activity_time,
                fa.notes,
                fa.is_public
            FROM fitness_activities fa
            ${whereClause}
            ORDER BY ${orderBy}
        `;

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows || []
        });
    } catch (error) {
        console.error('Error exporting activities:', error);
        res.status(500).json({ success: false, error: 'Failed to export activities', message: error.message });
    }
});

/**
 * GET /internal/activities/charts/type-distribution
 * Get activity distribution by type
 * 
 * Query Parameters: Same filter parameters as /my-activities
 * - activity_type, date_from, date_to, duration_min, duration_max, calories_min, calories_max
 * 
 * Access:
 * - Session authenticated users only
 * - Requires CSRF token
 */
router.get('/activities/charts/type-distribution', async (req, res) => {
    try {
        const userId = req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Build WHERE clause with filters
        let whereClause = 'WHERE user_id = ?';
        let params = [userId];

        const { whereClause: filterWhere, params: filterParams } = addActivityFilters(whereClause, params, req.query);
        whereClause = filterWhere;
        params = filterParams;

        const query = `
            SELECT
                activity_type,
                COUNT(*) as count,
                COALESCE(SUM(duration_minutes), 0) as total_duration,
                COALESCE(SUM(calories_burned), 0) as total_calories,
                COALESCE(AVG(calories_burned / NULLIF(duration_minutes, 0)), 0) as avg_intensity
            FROM fitness_activities
            ${whereClause}
            GROUP BY activity_type
            ORDER BY count DESC
        `;

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows || []
        });

    } catch (error) {
        console.error('Error fetching type distribution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch type distribution',
            message: error.message
        });
    }
});

/**
 * GET /internal/activities/charts/daily-trend
 * Get activity trend by date (daily aggregation)
 * 
 * Query Parameters: Same filter parameters as /my-activities
 * - activity_type, date_from, date_to, duration_min, duration_max, calories_min, calories_max
 * 
 * Access:
 * - Session authenticated users only
 * - Requires CSRF token
 */
router.get('/activities/charts/daily-trend', async (req, res) => {
    try {
        const userId = req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Build WHERE clause with filters
        let whereClause = 'WHERE user_id = ?';
        let params = [userId];

        const { whereClause: filterWhere, params: filterParams } = addActivityFilters(whereClause, params, req.query);
        whereClause = filterWhere;
        params = filterParams;

        const query = `
            SELECT
                DATE(activity_time) as date,
                COUNT(*) as count,
                COALESCE(SUM(duration_minutes), 0) as total_duration,
                COALESCE(SUM(calories_burned), 0) as total_calories
            FROM fitness_activities
            ${whereClause}
            GROUP BY DATE(activity_time)
            ORDER BY date ASC
        `;

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows || []
        });

    } catch (error) {
        console.error('Error fetching daily trend:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily trend',
            message: error.message
        });
    }
});

module.exports = router;
