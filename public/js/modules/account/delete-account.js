document.addEventListener('DOMContentLoaded', function () {
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

    if (deleteBackBtn) {
        deleteBackBtn.addEventListener('click', function () {
            showStep('step1');
            if (deleteVerifyForm) deleteVerifyForm.reset();
            const errorDiv = document.getElementById('deleteVerificationError');
            const previewDiv = document.getElementById('deletePreviewUrl');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.add('hidden');
            }
            if (previewDiv) previewDiv.classList.add('hidden');
        });
    }

    if (deleteStep3BackBtn) {
        deleteStep3BackBtn.addEventListener('click', function () {
            showStep('step2');
        });
    }

    if (deleteErrorBackBtn) {
        deleteErrorBackBtn.addEventListener('click', function () {
            showStep('step1');
        });
    }

    // Step 1: Request verification code
    if (deleteRequestCodeForm) {
        deleteRequestCodeForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            try {
                const response = await fetch('../account/delete/request-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': getCSRFToken()
                    },
                    body: JSON.stringify({})
                });

                const data = await response.json();

                if (data.csrfToken) {
                    updateCSRFToken(data.csrfToken);
                }

                if (response.ok) {
                    showStep('step2');

                    if (data.previewUrl) {
                        const previewDiv = document.getElementById('deletePreviewUrl');
                        const previewLink = document.getElementById('deletePreviewLink');
                        if (previewLink) {
                            previewLink.href = data.previewUrl;
                            previewLink.textContent = data.previewUrl;
                        }
                        if (previewDiv) previewDiv.classList.remove('hidden');
                    }
                } else {
                    const errorMsg = document.getElementById('deleteErrorMessage');
                    if (errorMsg) errorMsg.textContent = data.message || 'Failed to send verification code';
                    showStep('error');
                }
            } catch (error) {
                const errorMsg = document.getElementById('deleteErrorMessage');
                if (errorMsg) errorMsg.textContent = 'An error occurred. Please try again.';
                showStep('error');
            }
        });
    }

    // Step 2: Verify code
    if (deleteVerifyForm) {
        deleteVerifyForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const codeInput = document.getElementById('deleteVerificationCode');
            const code = codeInput ? codeInput.value : '';
            const errorDiv = document.getElementById('deleteVerificationError');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.add('hidden');
            }

            try {
                const response = await fetch('../account/delete/verify-code', {
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
                    throw new Error('Expected JSON response, got: ' + text.substring(0, 100));
                }

                if (data.csrfToken) {
                    updateCSRFToken(data.csrfToken);
                }

                if (response.ok) {
                    showStep('step3');
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = data.message || data.error || 'Verification failed';
                        errorDiv.classList.remove('hidden');
                    }
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = 'An error occurred. Please try again.';
                    errorDiv.classList.remove('hidden');
                }
            }
        });
    }

    // Step 3: Final confirmation and delete account
    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', async function () {
            try {
                const response = await fetch('../account/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': getCSRFToken()
                    },
                    body: JSON.stringify({})
                });

                const data = await response.json();

                if (response.ok) {
                    showStep('success');
                    setTimeout(function () {
                        window.location.href = '../../';
                    }, 3000);
                } else {
                    const errorMsg = document.getElementById('deleteErrorMessage');
                    if (errorMsg) errorMsg.textContent = data.message || data.error || 'Failed to delete account';
                    showStep('error');
                }
            } catch (error) {
                const errorMsg = document.getElementById('deleteErrorMessage');
                if (errorMsg) errorMsg.textContent = 'An error occurred. Please try again.';
                showStep('error');
            }
        });
    }
});
