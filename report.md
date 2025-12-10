Outline
Health & Fitness Tracker is a full-stack web application enabling authenticated users to log and analyze fitness activities. Built with Node.js/Express/EJS/MySQL following course requirements, it implements comprehensive authentication (signup, login, forgot-password with multi-step verification, change-email, delete-account), activity CRUD operations (create, read, update, delete with type/duration/distance/calories/notes tracking), advanced filtering and search (by type, date range, duration, calories with URL persistence), data visualization (Chart.js charts synchronized with filters), CSV export, and public API documentation. Security implemented through bcrypt password hashing, express-session management, CSRF tokens on all forms/AJAX requests, Helmet security headers, express-validator input validation, express-sanitizer XSS protection, and audit logging for critical actions. Application demonstrates mastery of all lab-taught basic techniques (Express routing, EJS, forms, MySQL CRUD, bcrypt, sessions, access control, validation, sanitization, API calls), additional techniques from lectures and lab extensions (dotenv, audit logs, CSRF, Helmet, Chart.js visualization, CSV export, pagination), and advanced techniques beyond coursework (reusable filter helper utility with DRY architecture, multi-step state management system, dynamic chart-filter synchronization, integrated filter-pagination-sort-export ecosystem, self-documenting API builder). Compulsory features satisfied: home page with navigation, about page, database search/filtering, MySQL storage, data entry forms, default login (gold/smiths), npm install setup, create_db.sql/insert_test_data.sql scripts, deployment-ready configuration on port 8000.

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
This section demonstrates techniques beyond the course material to achieve a higher grade (70%+). The course labs covered: Express routing, EJS templates, form handling (GET/POST), MySQL CRUD, bcrypt hashing, sessions, access control, express-validator/sanitizer, external API calls, and basic API creation. Additional techniques taught but not required in labs include: dotenv, audit logging (Lab 7 extension), CSRF protection (Lecture 8.2), Helmet headers (Lecture 8.1), and API filtering (Lab 9b extension). The following go beyond all coursework material:

1. **Reusable Filter Helper Utility with DRY Architecture** - Created centralized `utils/filter-helper.js` module that constructs dynamic SQL WHERE clauses, shared across both page routes AND chart APIs. This prevents code duplication (DRY principle) and ensures filter logic consistency. Supports activity type, date ranges, duration ranges, and calorie ranges with parameterized queries (SQL injection prevention).
```javascript
// utils/filter-helper.js - reused in routes/main.js and routes/internal.js
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
  // ... additional filters for date_to, duration_min/max, calories_min/max
  return { whereClause: where, params };
}
```

2. **Multi-Step State Management System** - Implemented complex 3-4 step workflows (forgot-password, change-email, delete-account) using hybrid client-server state tracking. Client-side manages step visibility via `.modal-step` CSS class toggling; server-side tracks verification codes and email changes in session storage. Each step validates prerequisites before allowing progression. Files: `views/change-email.ejs`, `public/js/modules/account/change-email.js`, `routes/main.js` (lines 180-245).

3. **Dynamic Chart-Filter Synchronization Architecture** - Built real-time data synchronization between table filters and Chart.js visualizations. When users apply filters, both paginated table AND full-dataset charts update simultaneously. Charts fetch from `/internal/activities/charts/*` APIs with URL query parameters automatically appended, ensuring visualizations reflect filtered data (not just current page). Prevents common pitfall where charts show all data while table shows filtered subset.
```javascript
// public/js/modules/activity/charts.js
const urlParams = new URLSearchParams(window.location.search);
const filterQuery = urlParams.toString();
fetch('/internal/activities/charts/type-distribution' + (filterQuery ? '?' + filterQuery : ''))
  .then(res => res.json())
  .then(data => { /* render Chart.js with filtered data */ });
```

4. **Integrated Filter-Pagination-Sort-Export Ecosystem** - Designed comprehensive data access system where filters, pagination, sorting, and CSV export all operate on the same filtered dataset. URL query params preserve state across operations; CSV export respects current filters; pagination shows correct totals for filtered results. Requires careful SQL query construction and state management across multiple routes (`routes/main.js`, `routes/internal.js`).

5. **Self-Documenting Public API Builder** - Created `/api-builder` page that serves as interactive API documentation, listing all internal endpoints with request/response examples. Originally admin-gated, refactored to public access for easier developer testing. Demonstrates API-first design thinking and self-service documentation approach beyond typical CRUD applications.

AI Declaration
AI assistance (GitHub Copilot with Claude Sonnet 4.5) was used throughout development for code generation, debugging, refactoring suggestions, and documentation writing. Specific uses: implementing filter helper utility structure, debugging modal CSS class issues, refactoring modals to standalone pages, adding chart-filter synchronization logic, writing SQL query optimizations, and drafting this report.md documentation. All AI-generated code was reviewed, tested, modified, and integrated by the student developer. The architectural decisions, feature planning, security implementation choices, and overall application design were human-directed. AI served as a coding assistant and pair programmer, not an autonomous developer.
