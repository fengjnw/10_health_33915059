/**
 * Test script for password reset flow
 * Run with: node test-password-reset.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:8000';
let csrfToken = '';
let sessionCookie = '';
let verificationCode = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (sessionCookie) {
            options.headers['Cookie'] = sessionCookie;
        }

        const req = http.request(options, (res) => {
            let body = '';

            // Capture Set-Cookie header
            if (res.headers['set-cookie']) {
                sessionCookie = res.headers['set-cookie'][0].split(';')[0];
            }

            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body.trim() ? (res.headers['content-type']?.includes('json') ? JSON.parse(body) : body) : null
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testPasswordReset() {
    console.log('🧪 Testing Password Reset Flow\n');

    try {
        // Step 1: Get CSRF token from forgot-password page
        console.log('📄 Step 1: Loading forgot-password page...');
        const pageRes = await makeRequest('GET', '/auth/forgot-password');

        if (pageRes.statusCode !== 200) {
            console.error(`❌ Failed to load page: ${pageRes.statusCode}`);
            return;
        }

        // Extract CSRF token from HTML
        const tokenMatch = pageRes.body.match(/name="csrf-token"\s+content="([^"]+)"/);
        if (tokenMatch) {
            csrfToken = tokenMatch[1];
            console.log(`✅ CSRF token obtained: ${csrfToken.substring(0, 20)}...`);
        } else {
            console.error('❌ Could not find CSRF token in page');
            return;
        }

        // Step 2: Request verification code
        console.log('\n📧 Step 2: Requesting verification code...');
        const requestCodeRes = await makeRequest('POST', '/auth/forgot-password', {
            username: 'testuser',
            email: 'test@example.com'
        }, {
            'X-CSRF-Token': csrfToken
        });

        if (requestCodeRes.statusCode === 200) {
            console.log('✅ Verification code sent successfully');
            if (requestCodeRes.body.verificationCode) {
                verificationCode = requestCodeRes.body.verificationCode;
                console.log(`   Code: ${verificationCode}`);
            }
        } else {
            console.error(`❌ Failed to send code: ${requestCodeRes.statusCode}`);
            console.error('   Response:', requestCodeRes.body);
            return;
        }

        // Step 3: Verify code
        console.log('\n🔐 Step 3: Verifying code...');
        const verifyRes = await makeRequest('POST', '/auth/verify-password-reset', {
            email: 'test@example.com',
            verification_code: verificationCode
        }, {
            'X-CSRF-Token': csrfToken
        });

        if (verifyRes.statusCode === 200) {
            console.log('✅ Code verified successfully');
        } else {
            console.error(`❌ Failed to verify code: ${verifyRes.statusCode}`);
            console.error('   Response:', verifyRes.body);
            return;
        }

        // Step 4: Reset password
        console.log('\n🔑 Step 4: Resetting password...');
        const resetRes = await makeRequest('POST', '/auth/reset-password', {
            new_password: 'NewPass123!',
            confirm_password: 'NewPass123!'
        }, {
            'X-CSRF-Token': csrfToken
        });

        if (resetRes.statusCode === 200) {
            console.log('✅ Password reset successfully');
        } else {
            console.error(`❌ Failed to reset password: ${resetRes.statusCode}`);
            console.error('   Response:', resetRes.body);
            return;
        }

        console.log('\n✨ All tests passed! Password reset flow is working correctly.\n');

    } catch (error) {
        console.error('\n❌ Error during test:', error.message);
    }
}

// Run the test
testPasswordReset();
