## Overview
A fitness activity management application where visitors can search public activities, and registered users can record personal activities with multi-criteria filtering, statistics, charts, and data export. Provides REST API and interactive documentation. Tech stack: Node.js/Express/EJS/MySQL + Chart.js.

## Architecture
```
[Browser] <--HTTPS--> [Express/Node.js]
  |                        |
  | EJS + Chart.js         +-- Session Middleware
  | fetch API              +-- Helmet (Security Headers)
  | CSRF tokens            +-- CSRF Protection
  |                        +-- Rate Limiting
  |                        +-- Static Files
  |                        +-- Route Modules:
  |                             ├── auth.js (register, login, password)
  |                             ├── main.js (activity CRUD, profile, admin)
  |                             ├── internal.js (charts, export, stats API)
  |                             └── api.js (REST API + Bearer Token)
  |                        |
  |                   [MySQL Driver]
  |                        |
  |                   [MySQL Database]
                      ├── users
                      ├── fitness_activities
                      ├── email_verifications
                      └── audit_logs
```

Two-tier MVC architecture. Application tier runs Express with layered middleware (sessions, Helmet, CSRF, Rate Limiting) and 4 route modules. EJS renders server-side; Chart.js handles client visualizations via fetch to internal APIs. Data tier uses MySQL to store users, activities, verification codes, and audit logs with parameterized queries preventing SQL injection.

## Data Model
```
users(id, username, password, email, first_name, last_name, is_admin, created_at)
fitness_activities(id, user_id, activity_type, activity_time, duration_minutes,
                   distance_km, calories_burned, notes, is_public, created_at)
email_verifications(id, user_id, new_email, verification_code, 
                    created_at, expires_at, used_at)
audit_logs(id, user_id, username, event_type, resource_type, resource_id,
           changes, ip_address, user_agent, path, method, created_at)
```
Users have one-to-many relationship with fitness_activities via user_id. email_verifications stores verification codes for email changes and password resets with expires_at controlling expiration. audit_logs records security operations and resource changes with JSON changes field storing detailed modifications, indexed by event_type, user_id, and created_at. Indexes on activity_time, activity_type, and user_id optimize query performance.

## User Functionality
Application includes home, about, search/filter, data entry, and log viewing pages. Default credentials: `gold`/`smiths`. Admin account: `admin`/`qwerty` with access to audit logs and ability to view/delete all users and activities.

Users can register, login, logout, and reset forgotten passwords via email verification codes (using Nodemailer). After login, users can modify profile information, change password, change email, or delete account with critical operations recorded in audit logs.

Search activities page is open to all visitors without login. Supports filtering public activities by activity type, date range, duration range, and calorie range with sorting by date/calories/duration and 10/25/50/100 items per page. Filter conditions persist after page refresh and can be exported directly to CSV.

Users can create, edit, and delete their own activity records including type, time, duration, distance, calories, notes, and public visibility flag.

On My Activities page, users can view personal activity list with same pagination, filtering, and sorting features as search page, with ability to edit or delete existing activities. Page aggregates current filtered data showing activity count, total duration, total distance, total calories, max intensity, and average intensity, accompanied by doughnut chart (type distribution) and line chart (daily calories).

Self-service API documentation page at `/api-builder` lists all available endpoints for quick testing and integration.

## Advanced Techniques

**Login/Session & Security Baseline**: Uses bcrypt hashing for password storage, express-session maintains login state; all forms and AJAX requests carry CSRF tokens with Helmet security headers enabled; input validated via express-validator and sanitized with express-sanitizer; sensitive account operations (email change, account deletion) logged to `audit_logs` for tracking. Login and registration endpoints configured with rate limiting to prevent brute force attacks.

```javascript
// middleware/rate-limit.js - Login rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,  // 5 attempts
    handler: (req, res) => {
        res.status(429).render('error', {
            message: 'Too many failed login attempts. Please try again later.'
        });
    }
});
```

**Email Verification & Multi-Step Security Flows**: Forgot password, email change, and account deletion implement multi-step workflows using Nodemailer to send verification codes to user email (development environment uses Ethereal test accounts). Frontend uses `.modal-step` to control step transitions while backend session stores verification codes or temporary email, only submitting final changes after completing all steps; all critical operations logged to audit trail.

```javascript
// utils/email-service.js - Send verification code via Nodemailer
async function sendPasswordResetEmail(to, verificationCode) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass }
    });
    
    await transporter.sendMail({
        from: '"Health Tracker" <noreply@healthtracker.com>',
        to: to,
        subject: 'Password Reset Verification',
        html: `<p>Your verification code: <code>${verificationCode}</code></p>`
    });
}
```

**Public Search & Filter Engine**: Public search page and logged-in user activity lists share filter builder `utils/filter-helper.js`, dynamically constructing SQL conditions by activity type, date range, duration range, and calorie range with parameterized queries preventing injection; public search enforces `is_public=1` returning only public activities. Pagination, sorting, and CSV export all operate on same filtered results with URL query parameters persisting filter state.

```javascript
// utils/filter-helper.js - Reusable filter builder
function addActivityFilters(baseWhere, baseParams, filters) {
    let whereClause = baseWhere;
    const params = [...baseParams];
    
    if (filters.activity_type && filters.activity_type !== 'all') {
        whereClause += (baseWhere ? ' AND ' : ' ') + 'activity_type = ?';
        params.push(filters.activity_type);
    }
    if (filters.date_from) {
        whereClause += (baseWhere ? ' AND ' : ' ') + 'activity_time >= ?';
        params.push(filters.date_from);
    }
    // Additional filters: date_to, duration_min/max, calories_min/max
    return { whereClause, params };
}
```

**Activity CRUD & Input Validation**: Creating/editing activities validates required fields and numeric ranges (duration, distance, calories), sanitizes notes and text, binds current user on write/update, with `is_public` controlling whether activity is readable by public search.

```javascript
// routes/main.js - Input validation example
router.post('/add-activity', [
    body('activity_type').notEmpty().trim().escape(),
    body('duration_minutes').isInt({ min: 1 }),
    body('calories_burned').isInt({ min: 0 }),
    body('notes').optional().trim().customSanitizer(value => 
        sanitizer.sanitize(value)
    )
], async (req, res) => { /* ... */ });
```

**Personal Activity Table, Stats & Chart Alignment**: My Activities table, bottom aggregated statistics (count, duration, distance, calories, max/average intensity), and Chart.js visualizations share same filtered data. Chart endpoints `/internal/activities/charts/*` read current URL query parameters to generate aggregates, ensuring table, statistics, and charts stay consistent.

```javascript
// public/js/modules/activity/charts.js - Apply filters to charts
const urlParams = new URLSearchParams(window.location.search);
const filterQuery = urlParams.toString();
const typeUrl = '/internal/activities/charts/type-distribution' + 
                (filterQuery ? '?' + filterQuery : '');
fetch(typeUrl).then(res => res.json()).then(renderChart);
```

**REST API & Bearer Token Authentication**: `/api-builder` page provides interactive testing interface including Bearer Token authentication (`POST /api/auth/token`), activity list (`GET /api/activities`, no token returns public activities, with token returns user's all activities), single query (`GET /api/activities/:id`), statistics aggregation (`GET /api/activities/stats`), create (`POST /api/activities`), update (`PATCH /api/activities/:id`), delete (`DELETE /api/activities/:id`). Each endpoint can generate curl commands or execute directly. API routes configured with independent rate limiting to prevent abuse.

```javascript
// routes/api.js - Bearer token authentication
router.post('/auth/token', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '24h' });
        return res.json({ token, expiresIn: 86400 });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});
```

## AI Declaration
GitHub Copilot was used as an assistance tool during development. In requirements analysis phase, AI helped organize feature lists and database design ideas; during coding phase provided code completion and syntax suggestions; in debugging phase assisted with identifying problem causes; during refactoring provided code optimization directions; in documentation writing polished expression. All architectural design, feature implementation, and technology selection completed independently by developer, with AI-generated content reviewed, tested, and modified before integration.
