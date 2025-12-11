document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const resetMode = document.getElementById('resetMode').value === 'true';
    const alertContainer = document.getElementById('alert-container');

    // Clear previous alerts
    alertContainer.innerHTML = '';

    // Get form data
    const formData = {
        new_password: document.getElementById('new_password').value,
        confirm_password: document.getElementById('confirm_password').value
    };

    if (!resetMode) {
        formData.current_password = document.getElementById('current_password').value;
    }

    // Determine endpoint
    const endpoint = resetMode ? '/auth/reset-password' : '/auth/change-password';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.getElementById('csrfToken').value
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            // Show error
            alertContainer.innerHTML = `
                <div class="alert alert-error">
                    ${data.error || 'An error occurred'}
                </div>
            `;
            return;
        }

        // Show success and redirect
        alertContainer.innerHTML = `
            <div class="alert alert-success">
                ${data.message || 'Password updated successfully'}
            </div>
        `;

        // Reset form
        form.reset();

        // Redirect after success
        setTimeout(() => {
            if (resetMode) {
                window.location.href = '../../';
            } else {
                window.location.href = 'profile';
            }
        }, 2000);

    } catch (error) {
        alertContainer.innerHTML = `
            <div class="alert alert-error">
                An error occurred. Please try again later.
            </div>
        `;
    }
});
