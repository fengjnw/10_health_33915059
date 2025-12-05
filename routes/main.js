// Import required modules
const express = require('express');
const router = express.Router();
const db = require('../config/db');

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

// Add activity page route - POST request processes the form
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

        await db.query(query, [
            req.session.user.id,
            activity_type,
            duration_minutes,
            distance_km || null,
            calories_burned || null,
            activity_date,
            notes || null
        ]);

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

module.exports = router;
