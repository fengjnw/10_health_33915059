const step1Form = document.getElementById('step1Form');
const step2Form = document.getElementById('step2Form');
const resendBtn = document.getElementById('resendBtn');

let currentEmail = '';
let currentUsername = '';
let csrfToken = getCSRFToken(); // Store CSRF token

// Step 1: Submit username and email
step1Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();

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
            alert(data.error || 'An error occurred');
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

        // Show email address in step 2
        document.getElementById('verificationEmail').textContent = `Email: ${email}`;

        // Show preview URL if available (development mode)
        if (data.previewUrl) {
            document.getElementById('previewLink').href = data.previewUrl;
            document.getElementById('previewUrl').style.display = 'block';
        }

        // Move to step 2
        showStep2();
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again later.');
    }
});

// Step 2: Submit verification code
step2Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const verificationCode = document.getElementById('verificationCode').value.trim();
    const errorDiv = document.getElementById('verificationInlineError');

    errorDiv.style.display = 'none';
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
            errorDiv.style.display = 'block';
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
        errorDiv.style.display = 'block';
    }
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

        if (response.ok) {
            // Update preview URL if available
            if (data.previewUrl) {
                document.getElementById('previewLink').href = data.previewUrl;
                document.getElementById('previewUrl').style.display = 'block';
            }

            document.getElementById('verificationCode').value = '';

            // Show feedback
            const errorDiv = document.getElementById('verificationInlineError');
            errorDiv.style.color = '#27ae60';
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'New code sent! Check your email.';
            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
                errorDiv.style.color = '#e74c3c';
            }, 3000);
        }
    } catch (error) {
        console.error('Resend error:', error);
    }
});

function showStep2() {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
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
