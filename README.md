# Health & Fitness Tracker

A web application for tracking fitness activities and monitoring health progress.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
# Create the database user (run in MySQL as root)
CREATE USER 'health_app'@'localhost' IDENTIFIED BY 'qwertyuiop';
GRANT ALL PRIVILEGES ON health.* TO 'health_app'@'localhost';
FLUSH PRIVILEGES;

# Copy and configure the database setup script
cp setup_database.sh.example setup_database.sh
# Edit setup_database.sh with your database credentials

# Run the setup script to create database, tables, and test accounts
chmod +x setup_database.sh
./setup_database.sh
```

**Note**: Test user credentials are created via `setup_database.sh` (not version controlled). 
- Edit `setup_database.sh` (copied from the example) with your test account credentials
- The example template uses placeholder values - replace with actual usernames and password hashes
- For assignment marking: actual test credentials provided separately (not in source code)

3. Configure environment variables:
   - Copy `.env` file and update if needed
   - Default configuration uses localhost MySQL

4. Run the application:
```bash
node index.js
```

The application will be available at: http://localhost:8000

## Test Accounts

Test accounts are created by the `setup_database.sh` script (not included in repository).
See deployment documentation or contact developer for test credentials.

## Features

- User registration and authentication
- Add and track fitness activities
- Search activities by type and date
- View personal activity history and statistics
- Responsive design

## Technology Stack

- **Backend**: Node.js with Express
- **View Engine**: EJS
- **Database**: MySQL
- **Authentication**: bcrypt for password hashing
- **Session Management**: express-session
- **Validation**: express-validator

## Project Structure

```
├── config/          # Database configuration
├── public/          # Static files (CSS, images)
├── routes/          # Route handlers
├── views/           # EJS templates
│   └── partials/    # Reusable view components
├── index.js         # Application entry point
├── create_db.sql    # Database schema
├── insert_test_data.sql  # Test data
└── package.json     # Dependencies
```

## API Routes

- `GET /` - Home page
- `GET /about` - About page
- `GET /search` - Search activities
- `POST /search` - Process search
- `GET /add-activity` - Add activity form (requires login)
- `POST /add-activity` - Process new activity (requires login)
- `GET /my-activities` - View user's activities (requires login)
- `GET /auth/register` - Registration form
- `POST /auth/register` - Process registration
- `GET /auth/login` - Login form
- `POST /auth/login` - Process login
- `GET /auth/logout` - Logout

## Database Schema

### users table
- id (Primary Key)
- username
- password (hashed)
- email
- first_name
- last_name
- created_at

### fitness_activities table
- id (Primary Key)
- user_id (Foreign Key)
- activity_type
- duration_minutes
- distance_km
- calories_burned
- activity_date
- notes
- created_at
