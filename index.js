// Import required modules
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { generateToken, doubleCsrfProtection } = require('./middleware/csrf');
const { sessionTimeoutMiddleware } = require('./middleware/sessionTimeout');
const { initializeEmailService } = require('./utils/emailService');

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const port = 8000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Configure Helmet for security headers including CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for inline styles
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    xssFilter: true, // Enable XSS filter
    noSniff: true, // Prevent MIME type sniffing
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Set up session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'health-app-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
        secure: process.env.NODE_ENV === 'production', // Only send cookie over HTTPS in production
        sameSite: 'strict' // Prevent CSRF attacks - only send cookie for same-site requests
    }
}));

// Apply CSRF protection middleware to all routes
app.use(doubleCsrfProtection);

// Apply session timeout middleware to check for inactivity
app.use(sessionTimeoutMiddleware);

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
app.listen(port, async () => {
    console.log(`Health & Fitness app listening on port ${port}`);

    // Initialize email service
    try {
        await initializeEmailService();
    } catch (error) {
        console.error('Failed to initialize email service:', error);
    }
});
