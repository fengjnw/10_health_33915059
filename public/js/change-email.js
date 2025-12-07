document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('changeEmailModal');
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    const closeBtn = document.querySelector('.close');
    const changeEmailForm = document.getElementById('changeEmailForm');
    const verifyEmailForm = document.getElementById('verifyEmailForm');
    const resendBtn = document.getElementById('resendBtn');
    const backBtn = document.getElementById('backBtn');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const verificationInlineError = document.getElementById('verificationInlineError');

    let currentVerificationCode = null;
    let currentNewEmail = null;
    let csrfToken = getCSRFToken();

    // Open modal
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', function () {
            modal.style.display = 'block';
            resetModal();
        });
    }

    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            modal.style.display = 'none';
        });
    }

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
                previewUrlDiv.style.display = 'block';
                previewLink.href = data.previewUrl;
                previewLink.textContent = data.previewUrl;
            }

            // Move to verification step
            document.getElementById('emailStep').style.display = 'none';
            document.getElementById('verificationStep').style.display = 'block';
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
            document.getElementById('verificationStep').style.display = 'none';
            document.getElementById('successStep').style.display = 'block';
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

    // Success close
    closeSuccessBtn.addEventListener('click', function () {
        modal.style.display = 'none';
        location.reload();
    });

    // Error back
    backBtn.addEventListener('click', function () {
        document.getElementById('errorStep').style.display = 'none';
        document.getElementById('emailStep').style.display = 'block';
        document.getElementById('newEmail').value = '';
    });

    function showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('emailStep').style.display = 'none';
        document.getElementById('verificationStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'none';
        document.getElementById('errorStep').style.display = 'block';
    }

    function resetModal() {
        document.getElementById('emailStep').style.display = 'block';
        document.getElementById('verificationStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'none';
        document.getElementById('errorStep').style.display = 'none';
        document.getElementById('newEmail').value = '';
        document.getElementById('verificationCode').value = '';
        document.getElementById('previewUrl').style.display = 'none';
        currentVerificationCode = null;
        currentNewEmail = null;
        if (verificationInlineError) {
            verificationInlineError.style.display = 'none';
            verificationInlineError.textContent = '';
        }
    }
});
