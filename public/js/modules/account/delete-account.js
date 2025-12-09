document.addEventListener('DOMContentLoaded', function () {
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const deleteCloseBtn = deleteAccountModal.querySelector('.close');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const deleteBackBtn = document.getElementById('deleteBackBtn');
    const deleteErrorBackBtn = document.getElementById('deleteErrorBackBtn');

    const deleteStep1 = document.getElementById('deleteStep1');
    const deleteStep2 = document.getElementById('deleteStep2');
    const deleteErrorStep = document.getElementById('deleteErrorStep');

    const deleteRequestCodeForm = document.getElementById('deleteRequestCodeForm');
    const deleteVerifyForm = document.getElementById('deleteVerifyForm');

    // Show/hide steps
    function showStep(step) {
        deleteStep1.classList.remove('active');
        deleteStep2.classList.remove('active');
        deleteErrorStep.classList.remove('active');

        if (step === 'step1') deleteStep1.classList.add('active');
        else if (step === 'step2') deleteStep2.classList.add('active');
        else if (step === 'error') deleteErrorStep.classList.add('active');
    }

    // Open modal
    deleteAccountBtn.addEventListener('click', function () {
        deleteAccountModal.style.display = 'block';
        showStep('step1');
    });

    // Close modal
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

    deleteErrorBackBtn.addEventListener('click', function () {
        showStep('step1');
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === deleteAccountModal) {
            closeModal();
        }
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

            if (response.ok) {
                // Show step 2
                showStep('step2');

                // Show preview URL if available (development mode)
                if (data.previewUrl) {
                    const previewDiv = document.getElementById('deletePreviewUrl');
                    const previewLink = document.getElementById('deletePreviewLink');
                    previewLink.href = data.previewUrl;
                    previewDiv.classList.remove('hidden');
                }
            } else {
                document.getElementById('deleteErrorMessage').textContent = data.message || 'Failed to send verification code';
                showStep('error');
            }
        } catch (error) {
            console.error('Error requesting verification code:', error);
            document.getElementById('deleteErrorMessage').textContent = 'An error occurred. Please try again.';
            showStep('error');
        }
    });

    // Step 2: Verify code and delete account
    deleteVerifyForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const code = document.getElementById('deleteVerificationCode').value;
        const errorDiv = document.getElementById('deleteVerificationError');
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');

        try {
            const response = await fetch('/account/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCSRFToken()
                },
                body: JSON.stringify({ verificationCode: code })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to goodbye page
                window.location.href = '/goodbye';
            } else {
                errorDiv.textContent = data.message || 'Verification failed';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            errorDiv.textContent = 'An error occurred. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    });
});
