const step1Form = document.getElementById('step1Form');
const step2Form = document.getElementById('step2Form');
const backBtn = document.getElementById('backBtn');
const resendBtn = document.getElementById('resendBtn');

let currentEmail = '';
let currentUsername = '';
let csrfToken = getCSRFToken(); // Store CSRF token

// Step 1: Submit username and email
step1Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const errorDiv = document.getElementById('step1Error');

    errorDiv.textContent = '';

    try {
        const response = await fetch('/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ username, email })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'An error occurred';
            // Update CSRF token from response
            if (data.csrfToken) {
                csrfToken = data.csrfToken;
                updateCSRFMeta(csrfToken);
            }
            return;
        }

        // Update CSRF token from response
        if (data.csrfToken) {
            csrfToken = data.csrfToken;
            updateCSRFMeta(csrfToken);
        }

        // Store for resend functionality
        currentEmail = email;
        currentUsername = username;

        // Show code for development (remove in production)
        if (data.verificationCode) {
            document.getElementById('displayCode').textContent = data.verificationCode;
            document.getElementById('codeDisplay').style.display = 'block';
        }

        // Move to step 2
        showStep2();
    } catch (error) {
        console.error('Error:', error);
        errorDiv.textContent = 'An error occurred. Please try again later.';
    }
});

// Step 2: Submit verification code
step2Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const verificationCode = document.getElementById('verificationCode').value.trim();
    const errorDiv = document.getElementById('step2Error');

    errorDiv.textContent = '';

    try {
        const response = await fetch('/auth/verify-password-reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                email: currentEmail,
                verification_code: verificationCode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'An error occurred';
            // Update CSRF token from response
            if (data.csrfToken) {
                csrfToken = data.csrfToken;
                updateCSRFMeta(csrfToken);
            }
            return;
        }

        // Update CSRF token from response
        if (data.csrfToken) {
            csrfToken = data.csrfToken;
            updateCSRFMeta(csrfToken);
        }

        // Redirect to change password page
        window.location.href = '/auth/change-password?resetMode=true';
    } catch (error) {
        console.error('Error:', error);
        errorDiv.textContent = 'An error occurred. Please try again later.';
    }
});

// Back button
backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showStep1();
});

// Resend button
resendBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
        const response = await fetch('/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                username: currentUsername,
                email: currentEmail
            })
        });

        const data = await response.json();

        // Update CSRF token
        if (data.csrfToken) {
            csrfToken = data.csrfToken;
            updateCSRFMeta(csrfToken);
        }

        if (response.ok && data.verificationCode) {
            // Update code display
            document.getElementById('displayCode').textContent = data.verificationCode;
            document.getElementById('codeDisplay').style.display = 'block';
            document.getElementById('step2Error').textContent = '';
            document.getElementById('verificationCode').value = '';

            // Show feedback
            const errorDiv = document.getElementById('step2Error');
            errorDiv.style.color = '#27ae60';
            errorDiv.textContent = 'New code sent! Check your email.';
            setTimeout(() => {
                errorDiv.textContent = '';
                errorDiv.style.color = '#e74c3c';
            }, 3000);
        }
    } catch (error) {
        console.error('Resend error:', error);
    }
});

function showStep1() {
    step1Form.classList.remove('hidden');
    step2Form.classList.add('hidden');

    document.getElementById('step1Indicator').classList.add('active');
    document.getElementById('step2Indicator').classList.remove('active');
    document.getElementById('step1Separator').classList.add('active');
}

function showStep2() {
    step1Form.classList.add('hidden');
    step2Form.classList.remove('hidden');

    document.getElementById('step1Indicator').classList.add('active');
    document.getElementById('step2Indicator').classList.add('active');
    document.getElementById('step1Separator').classList.add('active');

    document.getElementById('verificationCode').focus();
}

function getCSRFToken() {
    const token = document.querySelector('meta[name="csrf-token"]');
    return token ? token.getAttribute('content') : '';
}

function updateCSRFMeta(token) {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
        meta.setAttribute('content', token);
    }
}

// Auto-format verification code input
document.getElementById('verificationCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
});
