// Import required modules
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { EventTypes, logDataChange } = require('../utils/auditLogger');

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

        // Build dynamic SQL query based on search parameters
        let query = 'SELECT fa.*, u.username FROM fitness_activities fa JOIN users u ON fa.user_id = u.id WHERE 1=1';
        let params = [];

        if (activity_type) {
            query += ' AND fa.activity_type LIKE ?';
            params.push(`%${activity_type}%`);
        }

        if (date_from) {
            query += ' AND fa.activity_date >= ?';
            params.push(date_from);
        }

        if (date_to) {
            query += ' AND fa.activity_date <= ?';
            params.push(date_to);
        }

        query += ' ORDER BY fa.activity_date DESC';

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
        const { activity_type, duration_minutes, distance_km, calories_burned, activity_date, notes } = req.body;

        // Basic validation
        if (!activity_type || !duration_minutes || !activity_date) {
            return res.render('add-activity', {
                title: 'Add Activity - Health & Fitness Tracker',
                errors: ['Activity type, duration, and date are required'],
                formData: req.body
            });
        }

        // Insert activity into database
        const query = `
            INSERT INTO fitness_activities (user_id, activity_type, duration_minutes, distance_km, calories_burned, activity_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            req.session.user.id,
            activity_type,
            duration_minutes,
            distance_km || null,
            calories_burned || null,
            activity_date,
            notes || null
        ]);

        // Log activity creation
        await logDataChange(
            EventTypes.ACTIVITY_CREATE,
            req,
            'fitness_activity',
            result.insertId,
            { activity_type, duration_minutes, activity_date }
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
            ORDER BY activity_date DESC
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
        return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('PATCH /my-activities/:id/edit received');
    console.log('User ID:', req.session.user.id);
    console.log('Activity ID:', req.params.id);
    console.log('Request body:', req.body);

    try {
        const { id } = req.params;
        const { activity_type, duration_minutes, distance_km, calories_burned, activity_date, notes } = req.body;

        // Validate required fields
        if (!activity_type || !duration_minutes || !activity_date) {
            return res.status(400).json({
                error: 'Activity type, duration, and date are required'
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
                calories_burned = ?, activity_date = ?, notes = ?
            WHERE id = ?
        `;

        await db.query(updateQuery, [
            activity_type,
            duration_minutes,
            distance_km || null,
            calories_burned || null,
            activity_date,
            notes || null,
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
                    activity_date: activity.activity_date
                },
                new: {
                    activity_type,
                    duration_minutes,
                    activity_date
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
            'SELECT id, user_id, activity_type, duration_minutes, activity_date FROM fitness_activities WHERE id = ?',
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
                    activity_date: activity.activity_date
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

module.exports = router;
