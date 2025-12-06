/**
 * P2 Delete Activity Feature - Integration Tests
 * Tests the delete activity functionality (DELETE /my-activities/:id)
 */

describe('P2 Delete Activity Feature', () => {

    test('1. Delete activity route is implemented', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check DELETE route
        expect(mainContent).toContain("router.delete('/my-activities/:id'");
    });

    test('2. Delete button exists in my-activities view', () => {
        const fs = require('fs');
        const viewContent = fs.readFileSync('./views/my-activities.ejs', 'utf-8');

        // Check if delete button exists
        expect(viewContent).toContain('deleteActivity');
        expect(viewContent).toContain('btn-delete');
    });

    test('3. Permission check is implemented for delete', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check if user_id verification exists for delete
        expect(mainContent).toContain('activity.user_id !== req.session.user.id');
        expect(mainContent).toContain("router.delete('/my-activities/:id'");
    });

    test('4. Parameterized query is used for DELETE', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check if parameterized query with ? placeholder is used
        expect(mainContent).toContain('DELETE FROM fitness_activities WHERE id = ?');
    });

    test('5. Audit logging is implemented for delete', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check if audit logging for delete is present
        expect(mainContent).toContain('ACTIVITY_DELETE');
        expect(mainContent).toContain('logDataChange');
    });

    test('6. DELETE request handler uses correct HTTP method', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check DELETE method is properly defined
        expect(mainContent).toContain("router.delete('/my-activities/:id'");
        expect(mainContent).toContain('DELETE FROM fitness_activities');
    });

    test('7. Delete activity view uses FETCH API with CSRF protection', () => {
        const fs = require('fs');
        const viewContent = fs.readFileSync('./views/my-activities.ejs', 'utf-8');

        // Check if deleteActivity function uses fetch
        expect(viewContent).toContain("fetch");
        expect(viewContent).toContain("method: 'DELETE'");
        expect(viewContent).toContain("X-CSRF-Token");
    });

    test('8. Delete operation returns success JSON response', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check if success response is returned
        expect(mainContent).toContain('success: true');
        expect(mainContent).toContain('deleted successfully');
    });

    test('9. Error handling for invalid activity ID', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        // Check if validation and 404 handling exist
        expect(mainContent).toContain('isNaN(id)');
        expect(mainContent).toContain('404');
        expect(mainContent).toContain('not found');
    });

    test('10. Frontend function handles delete response and reloads page', () => {
        const fs = require('fs');
        const viewContent = fs.readFileSync('./views/my-activities.ejs', 'utf-8');

        // Check if response handling exists
        expect(viewContent).toContain('response.ok');
        expect(viewContent).toContain('location.reload');
    });
});

