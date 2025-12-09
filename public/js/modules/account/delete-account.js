document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('deleteAccountModal');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const closeBtn = modal ? modal.querySelector('.close') : null;
    const requestCodeForm = document.getElementById('deleteRequestCodeForm');
    const verifyDeleteForm = document.getElementById('deleteVerifyForm');
    const backBtn = document.getElementById('deleteBackBtn');
    const cancelBtn = document.getElementById('deleteCancelBtn');

    let csrfToken = getCSRFToken();

    // Open modal
    if (deleteAccountBtn && modal) {
        deleteAccountBtn.addEventListener('click', function () {
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

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            modal.style.display = 'none';
        });
    }

    // Step 1: Request verification code
    if (requestCodeForm) {
        requestCodeForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            try {
                const response = await fetch('/account/delete/request-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({})
                });

                const data = await parseJsonResponse(response);
                csrfToken = handleCSRFUpdate(data) || csrfToken;

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to send verification code');
                }

                // Move to verification step
                document.getElementById('deleteStep1').style.display = 'none';
                document.getElementById('deleteStep2').style.display = 'block';
                document.getElementById('deleteVerificationError').style.display = 'none';
            } catch (error) {
                showDeleteError(error.message, 'deleteRequestError');
            }
        });
    }

    // Step 2: Verify code and confirm deletion
    if (verifyDeleteForm) {
        verifyDeleteForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const code = document.getElementById('deleteVerificationCode').value;

            if (!confirm('Are you absolutely sure? This action cannot be undone!')) {
                return;
            }

            try {
                const response = await fetch('/account/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ code })
                });

                const data = await parseJsonResponse(response);

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to delete account');
                }

                // Success - redirect to goodbye page
                window.location.href = '/goodbye';
            } catch (error) {
                showDeleteError(error.message, 'deleteVerificationError');
            }
        });
    }

    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            document.getElementById('deleteStep2').style.display = 'none';
            document.getElementById('deleteStep1').style.display = 'block';
            document.getElementById('deleteVerificationCode').value = '';
        });
    }

    function resetModal() {
        document.getElementById('deleteStep1').style.display = 'block';
        document.getElementById('deleteStep2').style.display = 'none';
        document.getElementById('deleteVerificationCode').value = '';
        document.getElementById('deleteRequestError').style.display = 'none';
        document.getElementById('deleteVerificationError').style.display = 'none';
    }

    function showDeleteError(message, elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    function parseJsonResponse(response) {
        return response.json().catch(() => ({ error: 'Invalid response from server' }));
    }
});
