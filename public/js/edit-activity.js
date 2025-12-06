// Handle form submission for edit activity
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('edit-activity-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');

        const formData = new FormData(e.target);
        const data = {
            activity_type: formData.get('activity_type'),
            duration_minutes: formData.get('duration_minutes'),
            distance_km: formData.get('distance_km') || null,
            calories_burned: formData.get('calories_burned') || null,
            activity_date: formData.get('activity_date'),
            notes: formData.get('notes') || null,
            is_public: formData.get('is_public') === 'on' ? 1 : 0
        };

        console.log('Data to send:', data);
        const messageContainer = document.getElementById('message-container');

        try {
            const csrfToken = formData.get('_csrf');
            console.log('CSRF token:', csrfToken);

            // Get activity ID from URL - pathname is like /my-activities/123/edit
            const urlParts = window.location.pathname.split('/').filter(p => p); // Remove empty strings
            // After filter: ['my-activities', '123', 'edit']
            const activityId = urlParts[1];
            console.log('URL parts:', urlParts);
            console.log('Activity ID:', activityId);
            console.log('Sending PATCH to /my-activities/' + activityId + '/edit');

            const response = await fetch(`/my-activities/${activityId}/edit`, {
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
                messageContainer.innerHTML = '<div class="alert alert-success">Activity updated successfully! Redirecting...</div>';
                setTimeout(() => {
                    window.location.href = '/my-activities';
                }, 1500);
            } else {
                messageContainer.innerHTML = `<div class="alert alert-error">${result.error || 'An error occurred'}</div>`;
            }
        } catch (error) {
            console.error('Error:', error);
            messageContainer.innerHTML = '<div class="alert alert-error">An error occurred while updating the activity</div>';
        }
    });
});
