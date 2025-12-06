/**
 * P2 Edit Activity Feature - Integration Tests
 * Tests the edit activity functionality (PATCH /my-activities/:id/edit)
 */

describe('P2 Edit Activity Feature', () => {

    test('1. Edit activity route is implemented', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check GET route
        expect(mainContent).toContain("router.get('/my-activities/:id/edit'");
        expect(mainContent).toContain("router.patch('/my-activities/:id/edit'");
    });

    test('2. Edit activity view file exists', () => {
        const fs = require('fs');
        expect(fs.existsSync('./views/edit-activity.ejs')).toBe(true);
    });

    test('3. Permission check is implemented', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check if user_id verification exists
        expect(mainContent).toContain('activity.user_id !== req.session.user.id');
        expect(mainContent).toContain('403');
    });

    test('4. Database update query is parameterized', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check for UPDATE statement with parameters
        expect(mainContent).toContain('UPDATE fitness_activities');
        expect(mainContent).toContain('SET activity_type = ?');
    });

    test('5. Audit logging is applied to edit', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check if audit logging is called
        expect(mainContent).toContain('EventTypes.ACTIVITY_UPDATE');
        expect(mainContent).toContain('logDataChange');
    });

    test('6. Edit button added to my-activities view', () => {
        const fs = require('fs');
        const myActivitiesContent = fs.readFileSync('./views/my-activities.ejs', 'utf-8');

        expect(myActivitiesContent).toContain('/my-activities/<%= activity.id %>/edit');
        expect(myActivitiesContent).toContain('btn-edit');
    });

    test('7. PATCH method returns JSON response', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        expect(mainContent).toContain('res.json');
        expect(mainContent).toContain('success: true');
    });

    test('8. Edit form uses PATCH method', () => {
        const fs = require('fs');
        const editActivityContent = fs.readFileSync('./views/edit-activity.ejs', 'utf-8');

        expect(editActivityContent).toContain("method: 'PATCH'");
        expect(editActivityContent).toContain('fetch');
    });
});
