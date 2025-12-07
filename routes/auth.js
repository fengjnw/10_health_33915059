// Import required modules
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { loginLimiter, registerLimiter, loginStore, registerStore, attachRateLimitHelpers } = require('../middleware/rateLimit');
const { EventTypes, logAuth } = require('../utils/auditLogger');

// Register page route - GET request shows the form
router.get('/register', (req, res) => {
    res.render('register', {
        title: 'Register - Health & Fitness Tracker',
        errors: null
    });
});

// Register page route - POST request processes the form
router.post('/register', registerLimiter, attachRateLimitHelpers(registerStore), [
    // Validation middleware
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character'),
    body('confirm_password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    body('first_name')
        .trim()
        .notEmpty()
        .withMessage('First name is required'),
    body('last_name')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Record failed attempt for rate limiting
        if (req.rateLimit) {
            req.rateLimit.recordIncrement();
        }
        return res.render('register', {
            title: 'Register - Health & Fitness Tracker',
            errors: errors.array().map(err => err.msg),
            formData: req.body
        });
    }

    try {
        const { username, email, password, first_name, last_name } = req.body;

        // Check if username or email already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            // Record failed attempt for rate limiting
            if (req.rateLimit) {
                req.rateLimit.recordIncrement();
            }
            return res.render('register', {
                title: 'Register - Health & Fitness Tracker',
                errors: ['Username or email already exists'],
                formData: req.body
            });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user into database
        const query = `
            INSERT INTO users (username, password, email, first_name, last_name)
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [username, hashedPassword, email, first_name, last_name]);

        // Log the user in automatically
        req.session.user = {
            id: result.insertId,
            username: username,
            email: email,
            first_name: first_name,
            last_name: last_name
        };

        // Log successful registration
        await logAuth(EventTypes.REGISTER, req, result.insertId, username);

        // Clear rate limit record on successful registration
        if (req.rateLimit) {
            req.rateLimit.recordSuccess();
        }

        res.redirect('/');
    } catch (error) {
        // Record failed attempt on error
        if (req.rateLimit) {
            req.rateLimit.recordIncrement();
        }
        console.error('Registration error:', error);
        res.render('register', {
            title: 'Register - Health & Fitness Tracker',
            errors: ['An error occurred during registration'],
            formData: req.body
        });
    }
});

// Login page route - GET request shows the form
router.get('/login', (req, res) => {
    const timeoutMessage = req.query.timeout ? 'Your session has expired due to inactivity. Please log in again.' : null;
    res.render('login', {
        title: 'Login - Health & Fitness Tracker',
        errors: timeoutMessage ? [timeoutMessage] : null,
        info: timeoutMessage ? 'Session Expired' : null
    });
});

// Change password - GET
router.get('/change-password', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    res.render('change-password', {
        title: 'Change Password - Health & Fitness Tracker',
        errors: null,
        success: null
    });
});

// Change password - POST
router.post('/change-password', [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
        .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
        .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('New password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('New password must contain at least one special character'),
    body('confirm_password').custom((value, { req }) => value === req.body.new_password)
        .withMessage('Confirmation password does not match')
], async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('change-password', {
            title: 'Change Password - Health & Fitness Tracker',
            errors: errors.array().map(err => err.msg),
            success: null
        });
    }

    try {
        const { current_password, new_password } = req.body;
        const userId = req.session.user.id;

        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.render('change-password', {
                title: 'Change Password - Health & Fitness Tracker',
                errors: ['User not found'],
                success: null
            });
        }

        const user = users[0];
        const matches = await bcrypt.compare(current_password, user.password);
        if (!matches) {
            return res.render('change-password', {
                title: 'Change Password - Health & Fitness Tracker',
                errors: ['Current password is incorrect'],
                success: null
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(new_password, saltRounds);

        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        await logAuth(EventTypes.PASSWORD_CHANGE, req, userId, user.username);

        res.render('change-password', {
            title: 'Change Password - Health & Fitness Tracker',
            errors: null,
            success: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.render('change-password', {
            title: 'Change Password - Health & Fitness Tracker',
            errors: ['An error occurred while changing password'],
            success: null
        });
    }
});

// Login page route - POST request processes the form
router.post('/login', loginLimiter, attachRateLimitHelpers(loginStore), async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            // Record failed attempt for rate limiting
            if (req.rateLimit) {
                req.rateLimit.recordIncrement();
            }
            return res.render('login', {
                title: 'Login - Health & Fitness Tracker',
                errors: ['Username and password are required'],
                formData: req.body
            });
        }

        // Find user in database
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            // Record failed attempt for rate limiting
            if (req.rateLimit) {
                req.rateLimit.recordIncrement();
            }
            // Log failed login attempt
            await logAuth(EventTypes.LOGIN_FAILURE, req, null, username, 'User not found');

            return res.render('login', {
                title: 'Login - Health & Fitness Tracker',
                errors: ['Invalid username or password'],
                formData: req.body
            });
        }

        const user = users[0];

        // Compare password with hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            // Record failed attempt for rate limiting
            if (req.rateLimit) {
                req.rateLimit.recordIncrement();
            }
            // Log failed login attempt
            await logAuth(EventTypes.LOGIN_FAILURE, req, user.id, username, 'Invalid password');

            return res.render('login', {
                title: 'Login - Health & Fitness Tracker',
                errors: ['Invalid username or password'],
                formData: req.body
            });
        }

        // Set session data
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        };

        // Log successful login
        await logAuth(EventTypes.LOGIN_SUCCESS, req, user.id, username);

        // Clear rate limit record on successful login
        if (req.rateLimit) {
            req.rateLimit.recordSuccess();
        }

        res.redirect('/');
    } catch (error) {
        // Record failed attempt on error
        if (req.rateLimit) {
            req.rateLimit.recordIncrement();
        }
        console.error('Login error:', error);
        res.render('login', {
            title: 'Login - Health & Fitness Tracker',
            errors: ['An error occurred during login'],
            formData: req.body
        });
    }
});

// Logout route
router.get('/logout', async (req, res) => {
    const userId = req.session?.user?.id;
    const username = req.session?.user?.username;

    // Log logout before destroying session
    if (userId && username) {
        await logAuth(EventTypes.LOGOUT, req, userId, username);
    }

    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
