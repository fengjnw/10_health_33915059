// Handle profile form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profile-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Profile form submitted');

        const formData = new FormData(e.target);
        const data = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name')
            // Note: email cannot be changed through this form - use the Change Email button instead
        };

        console.log('Data to send:', data);
        const messageContainer = document.getElementById('message-container');

        try {
            const csrfToken = formData.get('_csrf');
            console.log('CSRF token:', csrfToken);
            console.log('Sending PATCH to /profile');

            const response = await fetch('/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(data)
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response result:', result);

            if (response.ok) {
                messageContainer.innerHTML = '<div class="alert alert-success">Profile updated successfully!</div>';
                setTimeout(() => {
                    window.location.href = '/profile';
                }, 1500);
            } else {
                messageContainer.innerHTML = `<div class="alert alert-error">${result.error || 'An error occurred'}</div>`;
            }
        } catch (error) {
            console.error('Error:', error);
            messageContainer.innerHTML = '<div class="alert alert-error">An error occurred while updating your profile</div>';
        }
    });
});
