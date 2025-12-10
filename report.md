Outline
Health & Fitness Tracker is a full-stack web application enabling authenticated users to log and analyze fitness activities. Built with Node.js/Express/EJS/MySQL, it features comprehensive authentication (signup, login, forgot-password, change-email, delete-account with verification flows), activity CRUD operations (create, read, update, delete with type/duration/distance/calories tracking), advanced filtering/search (by type, date range, duration, calories with URL persistence), data visualization (Chart.js charts synced with filters), CSV export, and a public API documentation page. Security implemented through bcrypt password hashing, session management, CSRF protection on all forms/AJAX, Helmet headers, and audit logging for critical actions. UX emphasizes consistency with standalone page flows rather than modals, server-side filtering with pagination, and real-time chart updates reflecting filtered datasets. Compulsory features satisfied: home page with navigation, about page, database search/filtering, MySQL data storage, data entry forms, default login (gold/smiths), npm install setup, create_db.sql/insert_test_data.sql scripts, and deployment-ready configuration. Application demonstrates mastery of basic techniques (sessions, CRUD, validation), additional techniques (CSRF, Helmet, Chart.js, CSV export), and advanced techniques (filter helper utility, multi-step state management, audit logging, dynamic chart-filter synchronization).

Architecture
Diagram:
```
[Browser] <--HTTPS--> [Express/Node.js]
  |                        |
  | EJS + Chart.js         +-- Session Middleware
  | fetch API              +-- Helmet (Security Headers)
  | CSRF tokens            +-- CSRF Protection
  |                        +-- Static Files
  |                        +-- Routers:
  |                             ├── main.js (auth, CRUD, profile)
  |                             └── internal.js (charts, export APIs)
  |                        |
  |                   [MySQL Driver]
  |                        |
  |                   [MySQL Database]
                      ├── users
                      ├── fitness_activities
                      └── audit_logs
```
Description: Two-tier MVC architecture. Application tier uses Express with layered middleware (sessions, helmet, CSRF) and route modules. EJS templates render server-side; Chart.js handles client visualizations via fetch to internal APIs. Data tier: MySQL stores users, activities, audit logs with parameterized queries preventing SQL injection.

Data Model
Diagram:
```
users(id, name, email, password_hash, created_at)
fitness_activities(id, user_id, activity_type, activity_time, duration_minutes,
									 distance_km, calories_burned, notes, is_public, created_at)
audit_logs(id, user_id, action, ip, user_agent, created_at)
```
Description (<=100 words): users owns many fitness_activities via user_id. audit_logs records security actions (login, account changes, deletes). activity_time stores event timestamp; aggregates use duration_minutes and calories_burned; is_public flags visibility.

User Functionality
**Authentication & Security:**
- Signup/login with bcrypt password hashing (meets requirement: username `gold`, password `smiths`)
- Forgot-password: 3-step flow (email → verification code → new password) with session state tracking
- Change-email: 4-step verification process (request → code → confirm → success/error)
- Delete-account: Multi-step confirmation with warnings, triggers audit logging
- All forms protected with CSRF tokens; session-protected routes redirect to login

**Activity Management (Core CRUD):**
- Add activity form: type, date/time, duration, distance, calories, notes, public/private toggle
- Edit/delete activities with confirmation dialogs
- My Activities page: table view with pagination (10/25/50/100 per page), server-side filtering/sorting
- Activities list card shows totals: count, total duration (hours), distance (km), calories burned

**Search & Filtering (Compulsory Feature):**
- Filter by activity type (dropdown: Running, Cycling, Swimming, Yoga, Gym, Other)
- Date range filters (from/to)
- Duration range (min/max minutes)
- Calorie range (min/max)
- Filters persist in URL query params; apply to both table and charts
- Clear filters button resets to all activities

**Data Visualization:**
- Type Distribution (Chart.js doughnut): shows activity breakdown by type
- Daily Trend (Chart.js line): plots calories burned over time
- Charts fetch data via `/internal/activities/charts/*` APIs respecting current filters (not just paginated data)

**Export & API:**
- Export to CSV button downloads filtered activities as CSV file
- API Builder page (`/api-builder`): public documentation of internal endpoints with request/response examples

**Screenshots:** See `/screenshots/` folder: `my-activities.png` (filters + charts), `add-activity.png` (form), `profile.png` (account management), `change-email.png` (multi-step flow).

Advanced Techniques
1. **Reusable Filter Helper Utility** - Centralized SQL WHERE clause builder (`utils/filter-helper.js`) prevents code duplication across routes and chart APIs. Handles type, date range, duration, and calorie filters with parameterized queries for SQL injection prevention.
```javascript
// utils/filter-helper.js - used by both page routes and chart APIs
function addActivityFilters(baseWhere, baseParams, filters) {
  let where = baseWhere;
  let params = [...baseParams];
  if (filters.activity_type) {
    where += ' AND activity_type = ?';
    params.push(filters.activity_type);
  }
  if (filters.date_from) {
    where += ' AND DATE(activity_time) >= ?';
    params.push(filters.date_from);
  }
  // ... additional filters for date_to, duration, calories
  return { whereClause: where, params };
}
```

2. **Multi-Step State Management** - Forgot-password, change-email, and delete-account pages use client-side step progression with `.modal-step` class toggling and server-side session state tracking. Each step validates previous steps before proceeding (see `views/change-email.ejs`, `public/js/modules/account/change-email.js`).

3. **Dynamic Chart API with Filter Synchronization** - Chart.js visualizations (`public/js/modules/activity/charts.js`) automatically sync with table filters by passing URL query params to `/internal/activities/charts/*` endpoints, ensuring charts reflect filtered data, not just paginated subset.
```javascript
// charts.js - syncs chart data with current filters
const urlParams = new URLSearchParams(window.location.search);
const filterQuery = urlParams.toString();
fetch('/internal/activities/charts/type-distribution' + (filterQuery ? '?' + filterQuery : ''))
  .then(res => res.json())
  .then(data => { /* render Chart.js */ });
```

4. **Audit Logging System** - Security-critical actions (login, email change, account deletion) logged to `audit_logs` table with IP and user-agent tracking (`routes/main.js` lines 45-52, 312-318). Enables forensic analysis and suspicious activity detection.

5. **Public API Documentation Page** - Self-documenting `/api-builder` route lists all internal endpoints with sample requests, demonstrating API-first design beyond typical CRUD apps (originally admin-only, refactored to public access for easier testing).

AI Declaration
AI assistance (GitHub Copilot with Claude Sonnet 4.5) was used throughout development for code generation, debugging, refactoring suggestions, and documentation writing. Specific uses: implementing filter helper utility structure, debugging modal CSS class issues, refactoring modals to standalone pages, adding chart-filter synchronization logic, writing SQL query optimizations, and drafting this report.md documentation. All AI-generated code was reviewed, tested, modified, and integrated by the student developer. The architectural decisions, feature planning, security implementation choices, and overall application design were human-directed. AI served as a coding assistant and pair programmer, not an autonomous developer.
