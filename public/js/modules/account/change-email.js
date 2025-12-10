document.addEventListener('DOMContentLoaded', function () {
    const changeEmailForm = document.getElementById('changeEmailForm');
    const verifyEmailForm = document.getElementById('verifyEmailForm');
    const resendBtn = document.getElementById('resendBtn');
    const backBtn = document.getElementById('backBtn');
    const verificationInlineError = document.getElementById('verificationInlineError');

    let currentVerificationCode = null;
    let currentNewEmail = null;
    let csrfToken = getCSRFToken();

    // Step 1: Send verification code
    changeEmailForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const newEmail = document.getElementById('newEmail').value;

        try {
            const response = await fetch('/email/request-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({ newEmail })
            });

            const data = await parseJsonResponse(response);
            csrfToken = handleCSRFUpdate(data) || csrfToken;

            if (!response.ok) {
                throw new Error(data.error || 'Failed to request verification');
            }

            currentVerificationCode = data.verificationCode;
            currentNewEmail = newEmail;

            // Show preview URL if in development
            if (data.previewUrl) {
                const previewUrlDiv = document.getElementById('previewUrl');
                const previewLink = document.getElementById('previewLink');
                previewUrlDiv.classList.remove('hidden');
                previewLink.href = data.previewUrl;
                previewLink.textContent = data.previewUrl;
            }

            // Move to verification step
            showStep('verificationStep');
            document.getElementById('verificationEmail').textContent = newEmail;
            if (verificationInlineError) {
                verificationInlineError.style.display = 'none';
                verificationInlineError.textContent = '';
            }
        } catch (error) {
            showError(error.message);
        }
    });

    // Step 2: Verify code
    verifyEmailForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const verificationCode = document.getElementById('verificationCode').value;

        try {
            const response = await fetch('/email/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    verificationCode,
                    newEmail: currentNewEmail
                })
            });

            const data = await parseJsonResponse(response);
            csrfToken = handleCSRFUpdate(data) || csrfToken;

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Success
            showStep('successStep');
            if (verificationInlineError) {
                verificationInlineError.style.display = 'none';
                verificationInlineError.textContent = '';
            }
        } catch (error) {
            if (verificationInlineError) {
                verificationInlineError.textContent = error.message;
                verificationInlineError.style.display = 'block';
            } else {
                showError(error.message);
            }
        }
    });

    // Resend code
    if (resendBtn) {
        resendBtn.addEventListener('click', async function () {
            try {
                const response = await fetch('/email/request-verification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ newEmail: currentNewEmail })
                });

                const data = await parseJsonResponse(response);
                csrfToken = handleCSRFUpdate(data) || csrfToken;

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to resend code');
                }

                currentVerificationCode = data.verificationCode;
                document.getElementById('verificationCode').value = '';
                alert('Verification code resent to ' + currentNewEmail);

                if (data.previewUrl) {
                    const previewLink = document.getElementById('previewLink');
                    previewLink.href = data.previewUrl;
                }

                if (verificationInlineError) {
                    verificationInlineError.style.display = 'none';
                    verificationInlineError.textContent = '';
                }
            } catch (error) {
                showError(error.message);
            }
        });
    }

    // Error back
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            showStep('emailStep');
            document.getElementById('newEmail').value = '';
        });
    }

    function showError(message) {
        document.getElementById('errorMessage').textContent = message;
        showStep('errorStep');
    }

    function showStep(stepId) {
        document.getElementById('emailStep').classList.remove('active');
        document.getElementById('verificationStep').classList.remove('active');
        document.getElementById('successStep').classList.remove('active');
        document.getElementById('errorStep').classList.remove('active');
        document.getElementById(stepId).classList.add('active');
    }
});
