const step1Form = document.getElementById('step1Form');
const step2Form = document.getElementById('step2Form');
const resendBtn = document.getElementById('resendBtn');

let currentEmail = '';
let currentUsername = '';
let csrfToken = getCSRFToken();

// Step 1: Submit username and email
step1Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();

    try {
        const response = await fetch('forgot-password', {
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
            csrfToken = handleCSRFUpdate(data) || csrfToken;
            return;
        }

        csrfToken = handleCSRFUpdate(data) || csrfToken;
        currentEmail = email;
        currentUsername = username;

        // Show email address in step 2
        document.getElementById('verificationEmail').textContent = `Email: ${email}`;

        // Show preview URL if available (development mode)
        if (data.previewUrl) {
            document.getElementById('previewLink').href = data.previewUrl;
            document.getElementById('previewLink').textContent = data.previewUrl;
            document.getElementById('previewUrl').style.display = 'block';
        }

        showStep2();
    } catch (error) {
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
        const response = await fetch('verify-password-reset', {
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
            csrfToken = handleCSRFUpdate(data) || csrfToken;
            return;
        }

        csrfToken = handleCSRFUpdate(data) || csrfToken;
        window.location.href = 'change-password?resetMode=true';
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again later.';
        errorDiv.style.display = 'block';
    }
});

// Resend button
resendBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
        const response = await fetch('forgot-password', {
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
        csrfToken = handleCSRFUpdate(data) || csrfToken;

        if (response.ok) {
            if (data.previewUrl) {
                document.getElementById('previewLink').href = data.previewUrl;
                document.getElementById('previewLink').textContent = data.previewUrl;
                document.getElementById('previewUrl').style.display = 'block';
            }

            document.getElementById('verificationCode').value = '';

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
    }
});

function showStep2() {
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    document.getElementById('verificationCode').focus();
}// Auto-format verification code input
document.getElementById('verificationCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
});
