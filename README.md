# Health & Fitness Tracker

A full-stack web application for recording, analyzing, and sharing fitness activities. Log your workouts, filter by type and date, visualize progress with charts, and explore public activities shared by the community.

## Quick Start

### Prerequisites
- Node.js 14+
- MySQL 5.7+
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd health-fitness-tracker
npm install
```

2. Set up the database:
```bash
# Copy the setup template
cp setup_database.sh.example setup_database.sh

# Edit with your credentials
nano setup_database.sh

# Run setup (creates database, tables, and indexes)
chmod +x setup_database.sh
./setup_database.sh
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database and application settings
```

4. Start the server:
```bash
npm start
```

Visit `http://localhost:8000` in your browser.

## Features

**For Everyone**
- Browse public fitness activities shared by the community
- Filter activities by type, date, duration, and calories burned
- Sort results and export to CSV for personal analysis

**For Registered Users**
- Create and manage your fitness activity records
- Track multiple metrics: distance, duration, calories burned, notes
- Control activity visibility (public/private)
- View personal statistics and charts (type distribution, daily progress)
- Manage your account: change password, update email, delete account securely

**For API Consumers**
- Full REST API with Bearer token authentication
- Interactive API documentation at `/api-builder` for testing endpoints
- Get curl commands or URLs for quick integration
- All endpoints support filtering, pagination, and sorting

## Project Structure

```
├── index.js                 # Application entry point
├── routes/
│   ├── auth.js             # Authentication (register, login, password reset)
│   ├── main.js             # Core features (activities, profile, admin)
│   ├── internal.js         # Statistics, charts, CSV export
│   └── api.js              # REST API endpoints with Bearer token
├── middleware/             # CSRF, rate limiting, validation
├── utils/                  # Helper functions (filters, email service)
├── views/                  # EJS templates (20+ pages)
├── public/
│   ├── css/                # Stylesheets
│   ├── js/                 # Client-side logic (charts, API builder)
│   └── images/             # Static assets
├── docs/
│   ├── report.md           # Technical documentation
│   └── report-cn.md        # Chinese documentation
└── package.json            # Dependencies and scripts
```

## Environment Variables

Create a `.env` file with the following variables:

```
# Database
HEALTH_HOST=localhost
HEALTH_USER=health_app
HEALTH_PASSWORD=your_password
HEALTH_DATABASE=health

# Application
HEALTH_BASE_PATH=http://localhost:8000
NODE_ENV=development
SESSION_SECRET=your_session_secret_key

# Email (for password reset)
ETHEREAL_USER=your_ethereal_email@ethereal.email
ETHEREAL_PASS=your_ethereal_password
```

## API Documentation

### Authentication
```
POST /api/auth/token
Body: { username: "user", password: "pass" }
Response: { token: "jwt_token", expiresIn: 86400 }
```

### Activities
```
GET /api/activities              # List all/user activities (requires token for private)
GET /api/activities/:id          # Get activity details
POST /api/activities             # Create activity (requires token)
PATCH /api/activities/:id        # Update activity (requires token)
DELETE /api/activities/:id       # Delete activity (requires token)
GET /api/activities/stats        # Get statistics (requires token)
```

All GET endpoints support query parameters for filtering: `activity_type`, `date_from`, `date_to`, `duration_min`, `duration_max`, `calories_min`, `calories_max`.

See `/api-builder` for interactive testing and full endpoint documentation.

## Development

### Scripts
```bash
npm start          # Start development server
npm test           # Run tests (if available)
npm run lint       # Check code style
```

### Database
- Schema: `create_db.sql`
- Test data setup: `setup_database.sh`
- Migrations: Use `setup_database.sh` for new deployments

### Key Technologies
- **Backend**: Express.js with middleware for sessions, CSRF, rate limiting, and security headers
- **Frontend**: EJS templates with Chart.js for visualizations
- **Database**: MySQL with parameterized queries for SQL injection prevention
- **Authentication**: bcrypt for passwords, JWT for API tokens, sessions for web
- **Validation**: express-validator for input validation and sanitization

## Security

- Passwords hashed with bcrypt (10 rounds)
- CSRF tokens on all state-changing operations
- SQL injection prevention via parameterized queries
- XSS protection via template escaping and input sanitization
- Security headers via Helmet.js
- Rate limiting on login and registration endpoints
- Audit logging for sensitive operations
- Email verification for password resets and account changes

## Testing Accounts

Test accounts are created via `setup_database.sh`. Contact the development team for credentials or set up your own in the database.

## Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use a process manager (pm2, systemd, etc.)
3. Configure reverse proxy (nginx, Apache) with HTTPS
4. Increase rate limits appropriately
5. Use environment-specific `.env` values
6. Set up database backups and monitoring

## Troubleshooting

**Cannot connect to database**: Verify MySQL is running and credentials in `.env` are correct.

**Email not sending**: In development, check Ethereal credentials. For production, configure your email service.

**Port already in use**: Change `HEALTH_BASE_PATH` and the listening port in `index.js`.

## Contributing

For issues, feature requests, or contributions, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see LICENSE file for details.