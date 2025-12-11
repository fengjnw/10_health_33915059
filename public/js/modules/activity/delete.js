// Delete activity using event delegation
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const activityId = e.target.dataset.activityId;
            deleteActivity(activityId);
        }
    });
});

// Delete activity function
function deleteActivity(id) {
    if (confirm('Are you sure you want to delete this activity?')) {
        try {
            const csrfTokenElement = document.getElementById('csrf-token');
            const csrfToken = csrfTokenElement ? csrfTokenElement.value : '';

            // Use relative path to preserve proxy prefix (e.g., /usr/347)
            fetch(`../my-activities/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                }
            }).then(response => {
                return response.json().then(data => ({ status: response.status, data }));
            }).then(({ status, data }) => {

                if (status === 200) {
                    alert('Activity deleted successfully');
                    location.reload();
                } else {
                    if (data && data.csrfToken) {
                        const meta = document.querySelector('meta[name="csrf-token"]');
                        const input = document.querySelector('input[name="_csrf"]');
                        if (meta) meta.setAttribute('content', data.csrfToken);
                        if (input) input.value = data.csrfToken;
                    }
                    alert('Error: ' + (data.error || 'Failed to delete activity'));
                }
            }).catch(error => {
                alert('An error occurred while deleting the activity: ' + error.message);
            });
        } catch (error) {
            alert('An error occurred: ' + error.message);
        }
    }
}
