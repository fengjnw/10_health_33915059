// Migration script: Change activity_date (DATE) to activity_time (DATETIME)
require('dotenv').config();
const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration: activity_date (DATE) → activity_time (DATETIME)...');

        // Check if activity_time column exists
        const [columns] = await db.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'fitness_activities' 
      AND COLUMN_NAME = 'activity_time'
    `);

        if (columns.length === 0) {
            // Step 1: Add new column
            console.log('Step 1: Adding activity_time column...');
            await db.query(`
        ALTER TABLE fitness_activities 
        ADD COLUMN activity_time DATETIME AFTER activity_date
      `);

            // Step 2: Copy existing data (DATE to DATETIME, sets time to 00:00:00)
            console.log('Step 2: Copying data from activity_date to activity_time...');
            await db.query(`
        UPDATE fitness_activities 
        SET activity_time = CAST(activity_date AS DATETIME)
      `);

            // Step 3: Make activity_time NOT NULL
            console.log('Step 3: Making activity_time NOT NULL...');
            await db.query(`
        ALTER TABLE fitness_activities 
        MODIFY COLUMN activity_time DATETIME NOT NULL
      `);
        } else {
            console.log('✓ activity_time column already exists, skipping creation');
        }

        // Step 4: Drop old index if exists
        console.log('Step 4: Dropping old index (if exists)...');
        try {
            await db.query(`DROP INDEX idx_activity_date ON fitness_activities`);
            console.log('  ✓ Dropped idx_activity_date');
        } catch (e) {
            console.log('  - idx_activity_date does not exist, skipping');
        }

        // Step 5: Drop old column
        console.log('Step 5: Dropping activity_date column...');
        await db.query(`
      ALTER TABLE fitness_activities 
      DROP COLUMN activity_date
    `);

        // Step 6: Create new index if not exists
        console.log('Step 6: Creating index on activity_time (if not exists)...');
        try {
            await db.query(`
        CREATE INDEX idx_activity_time ON fitness_activities(activity_time)
      `);
            console.log('  ✓ Created idx_activity_time');
        } catch (e) {
            console.log('  - idx_activity_time already exists, skipping');
        }

        console.log('✅ Migration completed successfully!');
        console.log('   - activity_date (DATE) removed');
        console.log('   - activity_time (DATETIME) is now the primary time field');
        console.log('   - All existing data preserved');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('You may need to manually rollback changes');
        process.exit(1);
    }
}

migrate();
