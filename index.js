// Import required modules
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const { generateToken, doubleCsrfProtection } = require('./middleware/csrf');

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const port = 8000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static('public'));

// Set up session middleware
app.use(session({
    secret: 'health-app-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Apply CSRF protection middleware to all routes
app.use(doubleCsrfProtection);

// Make CSRF token and user session data available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = generateToken(req, res);
    next();
});

// Import route handlers
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');

// Use route handlers (CSRF protection applied to POST/PUT/DELETE routes)
app.use('/', mainRoutes);
app.use('/auth', authRoutes);

// CSRF error handler - must come after routes
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        // Handle CSRF token errors
        res.status(403);
        return res.render('error', {
            title: 'CSRF Error',
            message: 'Invalid CSRF token. Please refresh the page and try again.',
            error: err,
            user: req.session?.user || null
        });
    }

    // Handle other errors
    res.status(err.status || 500);
    res.render('error', {
        title: 'Error',
        message: err.message || 'An error occurred',
        error: err,
        user: req.session?.user || null
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Health & Fitness app listening on port ${port}`);
});
