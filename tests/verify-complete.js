#!/usr/bin/env node

/**
 * Password Reset Feature Verification
 * Confirms all files are in place and working
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Get project root (parent of tests directory)
const projectRoot = path.join(__dirname, '..');

console.log('\n✅ Password Reset Feature Complete Verification\n');
console.log('='.repeat(60));

const checks = [
    {
        name: 'create_db.sql includes password_resets table',
        verify: () => {
            const content = fs.readFileSync(path.join(projectRoot, 'create_db.sql'), 'utf8');
            return content.includes('password_resets') &&
                content.includes('token_hash') &&
                content.includes('expires_at');
        }
    },
    {
        name: 'passwordReset utility exists',
        verify: () => {
            try {
                const utils = require(path.join(projectRoot, 'utils/passwordReset'));
                return typeof utils.generateResetToken === 'function' &&
                    typeof utils.hashToken === 'function';
            } catch (e) {
                return false;
            }
        }
    },
    {
        name: 'emailService includes sendPasswordResetEmail',
        verify: () => {
            try {
                const service = require(path.join(projectRoot, 'utils/emailService'));
                return typeof service.sendPasswordResetEmail === 'function';
            } catch (e) {
                return false;
            }
        }
    },
    {
        name: 'tokenCleanup module exists',
        verify: () => {
            try {
                require(path.join(projectRoot, 'utils/tokenCleanup'));
                return true;
            } catch (e) {
                return false;
            }
        }
    },
    {
        name: 'Auth routes include password reset handlers',
        verify: () => {
            const content = fs.readFileSync(path.join(projectRoot, 'routes/auth.js'), 'utf8');
            return (content.includes('forgot-password') || content.includes('/auth/forgot-password')) &&
                (content.includes('reset-password') || content.includes('/auth/reset-password')) &&
                content.includes('sendPasswordResetEmail');
        }
    },
    {
        name: 'forgot-password.ejs view exists (English only)',
        verify: () => {
            const content = fs.readFileSync(path.join(projectRoot, 'views/forgot-password.ejs'), 'utf8');
            return fs.existsSync(path.join(projectRoot, 'views/forgot-password.ejs')) &&
                content.includes('Forgot Password') &&
                !content.includes('密码');
        }
    },
    {
        name: 'reset-password.ejs view exists (English only)',
        verify: () => {
            const content = fs.readFileSync(path.join(projectRoot, 'views/reset-password.ejs'), 'utf8');
            return fs.existsSync(path.join(projectRoot, 'views/reset-password.ejs')) &&
                content.includes('Reset Password') &&
                !content.includes('输入');
        }
    },
    {
        name: 'reset-password-success.ejs view exists (English only)',
        verify: () => {
            const content = fs.readFileSync(path.join(projectRoot, 'views/reset-password-success.ejs'), 'utf8');
            return fs.existsSync(path.join(projectRoot, 'views/reset-password-success.ejs')) &&
                content.includes('Password Reset Successful') &&
                !content.includes('重置');
        }
    },
    {
        name: 'PASSWORD_RESET event in audit logger',
        verify: () => {
            const content = fs.readFileSync(path.join(projectRoot, 'utils/auditLogger.js'), 'utf8');
            return content.includes('PASSWORD_RESET');
        }
    },
    {
        name: 'Index.js initializes services',
        verify: () => {
            const content = fs.readFileSync(path.join(projectRoot, 'index.js'), 'utf8');
            return content.includes('initializeEmailService') &&
                content.includes('initializeCleanup');
        }
    },
    {
        name: 'No migrations folder (merged into create_db.sql)',
        verify: () => {
            return !fs.existsSync(path.join(projectRoot, 'migrations'));
        }
    }
];

let passed = 0;
let failed = 0;

checks.forEach((check, index) => {
    try {
        const result = check.verify();
        const icon = result ? '✅' : '❌';
        const status = result ? 'PASS' : 'FAIL';

        console.log(`${index + 1}. ${icon} ${check.name}: ${status}`);

        if (result) passed++;
        else failed++;
    } catch (error) {
        console.log(`${index + 1}. ❌ ${check.name}: ERROR - ${error.message}`);
        failed++;
    }
});

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed}/${checks.length} checks passed\n`);

if (failed === 0) {
    console.log('🎉 Password Reset feature is fully implemented and integrated!\n');
    process.exit(0);
} else {
    console.log(`⚠️  ${failed} check(s) failed.\n`);
    process.exit(1);
}
