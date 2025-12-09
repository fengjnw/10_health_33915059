document.addEventListener('DOMContentLoaded', function () {
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const deleteCloseBtn = deleteAccountModal.querySelector('.close');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const deleteBackBtn = document.getElementById('deleteBackBtn');
    const deleteErrorBackBtn = document.getElementById('deleteErrorBackBtn');
    const deleteStep3BackBtn = document.getElementById('deleteStep3BackBtn');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');

    const deleteStep1 = document.getElementById('deleteStep1');
    const deleteStep2 = document.getElementById('deleteStep2');
    const deleteStep3 = document.getElementById('deleteStep3');
    const deleteErrorStep = document.getElementById('deleteErrorStep');
    const deleteSuccessStep = document.getElementById('deleteSuccessStep');

    const deleteRequestCodeForm = document.getElementById('deleteRequestCodeForm');
    const deleteVerifyForm = document.getElementById('deleteVerifyForm');

    // Show/hide steps
    function showStep(step) {
        deleteStep1.classList.remove('active');
        deleteStep2.classList.remove('active');
        deleteStep3.classList.remove('active');
        deleteErrorStep.classList.remove('active');
        deleteSuccessStep.classList.remove('active');

        if (step === 'step1') deleteStep1.classList.add('active');
        else if (step === 'step2') deleteStep2.classList.add('active');
        else if (step === 'step3') deleteStep3.classList.add('active');
        else if (step === 'error') deleteErrorStep.classList.add('active');
        else if (step === 'success') deleteSuccessStep.classList.add('active');
    }

    // Open modal
    deleteAccountBtn.addEventListener('click', function () {
        deleteAccountModal.style.display = 'block';
        showStep('step1');
    });

    // Close modal (close button only, not clicking outside)
    function closeModal() {
        deleteAccountModal.style.display = 'none';
        showStep('step1');
        deleteRequestCodeForm.reset();
        deleteVerifyForm.reset();
        document.getElementById('deleteVerificationError').textContent = '';
        document.getElementById('deleteVerificationError').classList.add('hidden');
        document.getElementById('deletePreviewUrl').classList.add('hidden');
    }

    deleteCloseBtn.addEventListener('click', closeModal);
    deleteCancelBtn.addEventListener('click', closeModal);

    deleteBackBtn.addEventListener('click', function () {
        showStep('step1');
        deleteVerifyForm.reset();
        document.getElementById('deleteVerificationError').textContent = '';
        document.getElementById('deleteVerificationError').classList.add('hidden');
        document.getElementById('deletePreviewUrl').classList.add('hidden');
    });

    deleteStep3BackBtn.addEventListener('click', function () {
        showStep('step2');
    });

    deleteErrorBackBtn.addEventListener('click', function () {
        showStep('step1');
    });

    // Step 1: Request verification code
    deleteRequestCodeForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        try {
            const response = await fetch('/account/delete/request-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCSRFToken()
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            // Update CSRF token if provided
            if (data.csrfToken) {
                updateCSRFToken(data.csrfToken);
            }

            if (response.ok) {
                // Show step 2
                showStep('step2');

                // Show preview URL if available (development mode)
                if (data.previewUrl) {
                    const previewDiv = document.getElementById('deletePreviewUrl');
                    const previewLink = document.getElementById('deletePreviewLink');
                    previewLink.href = data.previewUrl;
                    previewLink.textContent = data.previewUrl; // Show full URL text
                    previewDiv.classList.remove('hidden');
                }
            } else {
                document.getElementById('deleteErrorMessage').textContent = data.message || 'Failed to send verification code';
                showStep('error');
            }
        } catch (error) {
            alert('Failed to request verification code.');
            document.getElementById('deleteErrorMessage').textContent = 'An error occurred. Please try again.';
            showStep('error');
        }
    });

    // Step 2: Verify code
    deleteVerifyForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const code = document.getElementById('deleteVerificationCode').value;
        const errorDiv = document.getElementById('deleteVerificationError');
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');

        try {
            const response = await fetch('/account/delete/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCSRFToken()
                },
                body: JSON.stringify({ verificationCode: code })
            });

            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Expected JSON response, got ${response.status}: ${text.substring(0, 100)}`);
            }

            // Update CSRF token if provided
            if (data.csrfToken) {
                updateCSRFToken(data.csrfToken);
            }

            if (response.ok) {
                // Show step 3 (final confirmation)
                showStep('step3');
            } else {
                errorDiv.textContent = data.message || data.error || 'Verification failed';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            alert('Failed to verify code.');
            errorDiv.textContent = 'An error occurred. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    });

    // Step 3: Final confirmation and delete account
    deleteConfirmBtn.addEventListener('click', async function () {
        try {
            const response = await fetch('/account/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCSRFToken()
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            if (response.ok) {
                // Show success step
                showStep('success');

                // Redirect after 3 seconds
                setTimeout(function () {
                    window.location.href = '/';
                }, 3000);
            } else {
                document.getElementById('deleteErrorMessage').textContent = data.message || data.error || 'Failed to delete account';
                showStep('error');
            }
        } catch (error) {
            alert('Failed to delete account.');
            document.getElementById('deleteErrorMessage').textContent = 'An error occurred. Please try again.';
            showStep('error');
        }
    });
});
