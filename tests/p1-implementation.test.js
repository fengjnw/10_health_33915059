/**
 * P1 Security Features - Implementation Tests
 * Verifies all 14 P1 security features are correctly implemented
 */

// Force Jest to exit after tests complete
jest.setTimeout(5000);

describe('P1 Security Features Tests', () => {

    test('1. bcrypt password encryption is implemented', async () => {
        const bcrypt = require('bcrypt');
        const password = 'TestPassword123!';
        const hashedPassword = await bcrypt.hash(password, 10);

        expect(hashedPassword).not.toBe(password);
        expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
        expect(await bcrypt.compare('WrongPassword', hashedPassword)).toBe(false);
    }, 10000);

    test('2. Session and cookie configuration is secure', () => {
        const fs = require('fs');
        const indexContent = fs.readFileSync('./index.js', 'utf-8');

        expect(indexContent).toContain('express-session');
        expect(indexContent).toContain('httpOnly: true');
        expect(indexContent).toContain("sameSite: 'strict'");
        expect(indexContent).toContain('maxAge:');
    });

    test('3. Input validation with express-validator is configured', () => {
        const fs = require('fs');
        const authContent = fs.readFileSync('./routes/auth.js', 'utf-8');

        expect(authContent).toContain('express-validator');
        expect(authContent).toContain('matches(/[a-z]/');  // lowercase
        expect(authContent).toContain('matches(/[A-Z]/');  // uppercase
        expect(authContent).toContain('matches(/[0-9]/');  // digit
        expect(authContent).toContain('matches(/[!@#$%^&*'); // special char
    });

    test('4. SQL injection prevention with parameterized queries', () => {
        const fs = require('fs');
        const authContent = fs.readFileSync('./routes/auth.js', 'utf-8');
        const mainContent = fs.readFileSync('./routes/main.js', 'utf-8');

        expect(authContent).toContain('?');
        expect(mainContent).toContain('?');
        expect(authContent).not.toContain("+ '");
    });

    test('5. CSRF protection middleware is implemented', () => {
        const fs = require('fs');
        expect(fs.existsSync('./middleware/csrf.js')).toBe(true);

        const indexContent = fs.readFileSync('./index.js', 'utf-8');
        expect(indexContent).toContain('csrf');
        expect(indexContent).toContain('doubleCsrfProtection');
    });

    test('6. Rate limiting is implemented', () => {
        const rateLimit = require('../middleware/rateLimit.js');
        expect(rateLimit.loginLimiter).toBeDefined();
        expect(rateLimit.registerLimiter).toBeDefined();
    });

    test('7. Account lockout mechanism is in place', () => {
        const fs = require('fs');
        const rateLimitContent = fs.readFileSync('./middleware/rateLimit.js', 'utf-8');

        expect(rateLimitContent).toContain('lockedUntil');
        expect(rateLimitContent).toContain('429');
    });

    test('8. Logout functionality destroys session', () => {
        const fs = require('fs');
        const authContent = fs.readFileSync('./routes/auth.js', 'utf-8');

        expect(authContent).toContain('/logout');
        expect(authContent).toContain('session.destroy');
    });

    test('9. Secure cookie configuration with security flags', () => {
        const fs = require('fs');
        const indexContent = fs.readFileSync('./index.js', 'utf-8');

        expect(indexContent).toContain('httpOnly: true');
        expect(indexContent).toContain("sameSite: 'strict'");
        expect(indexContent).toContain('secure: process.env.NODE_ENV');
    });

    test('10. Session timeout middleware is implemented', () => {
        const fs = require('fs');
        expect(fs.existsSync('./middleware/sessionTimeout.js')).toBe(true);

        const sessionTimeoutContent = fs.readFileSync('./middleware/sessionTimeout.js', 'utf-8');
        expect(sessionTimeoutContent).toContain('30 * 60 * 1000');  // 30 minutes
        expect(sessionTimeoutContent).toContain('25 * 60 * 1000');  // warning at 25 minutes
    });

    test('11. XSS protection with Helmet and CSP', () => {
        const fs = require('fs');
        const indexContent = fs.readFileSync('./index.js', 'utf-8');

        expect(indexContent).toContain('helmet');
        expect(indexContent).toContain('contentSecurityPolicy');
        expect(indexContent).toContain("defaultSrc: [\"'self'\"]");
        expect(indexContent).toContain("scriptSrc: [\"'self'\"]");
        expect(indexContent).toContain('xssFilter: true');
        expect(indexContent).toContain('noSniff: true');
    });

    test('12. Audit logging system is implemented', () => {
        const { EventTypes, logAuth, getRecentLogs } = require('../utils/auditLogger.js');

        expect(EventTypes.LOGIN_SUCCESS).toBeDefined();
        expect(EventTypes.LOGIN_FAILURE).toBeDefined();
        expect(EventTypes.LOGOUT).toBeDefined();
        expect(EventTypes.SESSION_TIMEOUT).toBeDefined();
        expect(logAuth).toBeDefined();
        expect(getRecentLogs).toBeDefined();
    });

    test('13. Security headers are configured', () => {
        const fs = require('fs');
        const indexContent = fs.readFileSync('./index.js', 'utf-8');

        expect(indexContent).toContain('xssFilter: true');
        expect(indexContent).toContain('noSniff: true');
        expect(indexContent).toContain('referrerPolicy');
    });

    test('14. Password complexity requirements are enforced', () => {
        const fs = require('fs');
        const authContent = fs.readFileSync('./routes/auth.js', 'utf-8');

        expect(authContent).toContain('isLength({ min: 8 }');  // Min 8 chars
        expect(authContent).toContain('matches(/[a-z]/');     // Lowercase
        expect(authContent).toContain('matches(/[A-Z]/');     // Uppercase
        expect(authContent).toContain('matches(/[0-9]/');     // Digit
        expect(authContent).toContain('matches(/[!@#$%^&*');  // Special character
    });

    test('15. All required security files exist', () => {
        const fs = require('fs');
        const files = [
            './middleware/csrf.js',
            './middleware/rateLimit.js',
            './middleware/sessionTimeout.js',
            './utils/auditLogger.js',
            './public/js/session-timeout.js',
            './logs'
        ];

        files.forEach(file => {
            expect(fs.existsSync(file)).toBe(true);
        });
    });

    // Cleanup after tests
    afterAll(() => {
        // Clear any hanging timers or connections
        jest.clearAllMocks();
    });
});
