## Outline
Health & Fitness Tracker is a Node.js/Express/EJS/MySQL app for logging and analyzing fitness activities. Users can sign up/login, reset password (multi-step), change email, delete account, and manage activities (type/duration/distance/calories/notes/public-flag). Filtering/search by type, date range, duration, and calories persists in URLs and drives both tables and charts. Visualization uses Chart.js (type distribution, daily trend); export provides CSV of the current filtered set. API Builder documents internal endpoints. Security: bcrypt password hashing, express-session, CSRF tokens on all forms/AJAX, Helmet headers, express-validator validation, express-sanitizer XSS protection, and audit logging of critical actions. Deliverables: home/about, database-backed search/filters, MySQL storage, data entry forms, default login (gold/smiths), npm install readiness, `create_db.sql` / `insert_test_data.sql`, and port 8000 deployment.

## Architecture
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

## Data Model
Diagram:
```
users(id, name, email, password_hash, created_at)
fitness_activities(id, user_id, activity_type, activity_time, duration_minutes,
									 distance_km, calories_burned, notes, is_public, created_at)
audit_logs(id, user_id, action, ip, user_agent, created_at)
```
Description (<=100 words): users owns many fitness_activities via user_id. audit_logs records security actions (login, account changes, deletes). activity_time stores event timestamp; aggregates use duration_minutes and calories_burned; is_public flags visibility.

## User Functionality
**Compulsory pages/features:** home, about, default login (`gold`/`smiths`), database-backed search/filters, MySQL storage, data entry forms, runs on port 8000.

**Authentication & security flows:**
- Signup/login with bcrypt hashing; sessions via express-session
- Forgot-password: 3-step (email → verification code → new password) with session state tracking
- Change-email: 4-step verification flow; Delete-account: multi-step confirmation; both write audit logs
- CSRF tokens on all forms/AJAX; Helmet headers; express-validator and express-sanitizer on inputs

**Activity management (CRUD):**
- Create/edit/delete activities: type, date/time, duration, distance, calories, notes, public flag
- My Activities: table with pagination (10/25/50/100), server-side filtering & sorting, totals (count/duration/distance/calories)

**Search & filtering:**
- Filters: activity type, date range, duration range, calorie range; clear button resets
- Filters persist in URL query params and drive both tables and charts

**Visualization & export:**
- Chart.js doughnut (type distribution) and line (daily trend) fed by `/internal/activities/charts/*` with active filters
- CSV export downloads the currently filtered dataset
- API Builder (`/api-builder`) documents internal endpoints for quick testing

**Screenshots:** `/screenshots/`: `my-activities.png`, `add-activity.png`, `profile.png`, `change-email.png`.

## Advanced Techniques
This section lists capabilities built beyond the baseline coursework.

1. **Reusable Filter Helper Utility (DRY)** – Centralized `utils/filter-helper.js` builds dynamic SQL WHERE clauses reused by page routes and chart APIs; parameterized queries prevent SQL injection.
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

2. **Multi-Step State Management** – 3-4 step workflows (forgot-password, change-email, delete-account) combine client-side step toggling (`.modal-step`) with server-side session tracking of verification codes and pending email changes. Files: `views/change-email.ejs`, `public/js/modules/account/change-email.js`, `routes/main.js` (lines 180-245).

3. **Chart–Filter Synchronization** – Charts automatically append current URL query params to `/internal/activities/charts/*` calls, so visuals always match filtered data (not just the current page of results).
```javascript
// public/js/modules/activity/charts.js
const urlParams = new URLSearchParams(window.location.search);
const filterQuery = urlParams.toString();
fetch('/internal/activities/charts/type-distribution' + (filterQuery ? '?' + filterQuery : ''))
  .then(res => res.json())
  .then(data => { /* render Chart.js with filtered data */ });
```

4. **Integrated Filter–Pagination–Sort–Export** – Filters, pagination, sorting, and CSV export all operate on the same filtered dataset; URL params preserve state; CSV respects active filters; pagination totals reflect filtered results (`routes/main.js`, `routes/internal.js`).

5. **Self-Documenting Public API Builder** – `/api-builder` lists internal endpoints with request/response examples, enabling self-service testing without admin gating.

## AI Declaration
AI assistance (GitHub Copilot with Claude Sonnet 4.5) was used for code suggestions, debugging, refactoring ideas, and drafting this report. Specific uses: filter helper structure, fixing modal-step visibility, refactoring modals to pages, chart-filter sync logic, SQL query tuning, and documentation wording. All AI-generated content was reviewed, tested, and integrated by the developer; architecture and feature decisions remained human-directed.
