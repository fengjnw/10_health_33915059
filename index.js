// Import required modules
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');

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

// Make user session data available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Import route handlers
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');

// Use route handlers
app.use('/', mainRoutes);
app.use('/auth', authRoutes);

// Start the server
app.listen(port, () => {
    console.log(`Health & Fitness app listening on port ${port}`);
});
