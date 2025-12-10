Outline
Built a Health & Fitness Tracker where authenticated users log activities (type, duration, distance, calories, notes), manage profile data, and visualize trends. Key flows include signup/login with hashed passwords, forgot-password, change-email, and delete-account as standalone pages for clarity. Activities can be created, edited, deleted, filtered by type/date/duration/calories, exported to CSV, and viewed with chart visualizations that honor the same filters. An API Builder page (now public) documents internal endpoints. Security layers: session auth, CSRF tokens on forms and AJAX, Helmet headers, and server-side filtering to prevent data leakage. UX choices: consistent page-based modals removal, accessible form layouts, and responsive cards/tables. Stats panels summarize totals for count, duration, distance, and calories.

Architecture
Diagram:
```
[Browser]
	|  (HTTPS, fetch/EJS)
	v
[Express/Node] --(MySQL driver)--> [MySQL]
	| middlewares: sessions, helmet, csrf, routers (main, internal)
	| views: EJS templates + Chart.js
```
Description (<=100 words): Two-tier web app. Application tier: Express routes render EJS views, serve static JS/CSS, enforce sessions, CSRF, and helmet. Data tier: MySQL stores users, activities, and audit/security data. Client uses fetch for charts/export and form submissions for CRUD.

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
- Authentication & account: signup/login, logout, forgot-password flow, change-email, delete-account pages with step-based UX and CSRF on every form.
- Profile & security: change email with verification; delete account with multi-step confirmation; session-protected routes.
- Activities CRUD: add/edit/delete activities with type/duration/distance/calories/notes/is_public; form validation and success/error alerts.
- Filtering & sorting: server-side filters (type, date range, duration, calories) persist via query params; pagination with page size selector; client-side sorting for displayed rows.
- Export & API: export filtered activities to CSV; API Builder page documents internal endpoints for quick testing.
- Visualizations: Chart.js doughnut (type distribution) and line (daily trend) charts fetch `/internal/activities/charts/*` applying the same filters as the table, giving full-data (not just current page) coverage.
Screenshots: Capture from /my-activities (filters, charts) and /account pages; not embedded here to keep repo lean.

Advanced Techniques
- Shared filter helper reused by pages and chart APIs to avoid divergence: `addActivityFilters` in `utils/filter-helper.js` and applied in `/routes/internal.js` chart endpoints.
```javascript
// routes/internal.js
let whereClause = 'WHERE user_id = ?';
let params = [userId];
({ whereClause, params } = addActivityFilters(whereClause, params, req.query));
```
- Charts respect filters and full dataset (not paged subset): `public/js/modules/activity/charts.js` appends current query string to API calls.
```javascript
const urlParams = new URLSearchParams(window.location.search);
const filterQuery = urlParams.toString();
const typeUrl = '/internal/activities/charts/type-distribution' + (filterQuery ? '?' + filterQuery : '');
```
- Security hardening: CSRF token extraction reused for fetch calls (`getCSRFToken` in charts.js), session checks on all internal routes, Helmet headers configured app-wide.

AI Declaration
Used GPT-5.1-Codex-Max (Preview) to draft and refine documentation and to suggest code adjustments (filter-aware charts, page-based security flows). All code and descriptions were reviewed and integrated by the developer.
