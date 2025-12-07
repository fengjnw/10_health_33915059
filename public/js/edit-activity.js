// Handle form submission for edit activity
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('edit-activity-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data, csrfToken } = getFormData(e);
        const activityData = {
            activity_type: data.activity_type,
            duration_minutes: data.duration_minutes,
            distance_km: data.distance_km || null,
            calories_burned: data.calories_burned || null,
            activity_date: data.activity_date,
            notes: data.notes || null,
            is_public: data.is_public === 'on' ? 1 : 0
        };

        try {
            // Get activity ID from URL - pathname is like /my-activities/123/edit
            const urlParts = window.location.pathname.split('/').filter(p => p);
            const activityId = urlParts[1];

            const response = await makeFetchRequest(
                `/my-activities/${activityId}/edit`,
                activityData,
                csrfToken,
                'PATCH'
            );

            const result = await response.json();

            if (response.ok) {
                showMessage('message-container', 'Activity updated successfully! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/my-activities';
                }, 1500);
            } else {
                showMessage('message-container', result.error || 'An error occurred', 'error');
            }
        } catch (error) {
            handleFetchError(error, 'message-container', 'An error occurred while updating the activity');
        }
    });
});
