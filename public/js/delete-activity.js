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
    console.log('Delete clicked for id:', id);
    if (confirm('Are you sure you want to delete this activity?')) {
        try {
            const csrfTokenElement = document.getElementById('csrf-token');
            console.log('CSRF token element:', csrfTokenElement);
            const csrfToken = csrfTokenElement ? csrfTokenElement.value : '';
            console.log('CSRF token:', csrfToken);

            console.log('Sending DELETE request to /my-activities/' + id);
            fetch(`/my-activities/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                }
            }).then(response => {
                console.log('Response status:', response.status);
                return response.json().then(data => ({ status: response.status, data }));
            }).then(({ status, data }) => {
                console.log('Response data:', data);

                if (status === 200) {
                    alert('Activity deleted successfully');
                    location.reload();
                } else {
                    alert('Error: ' + (data.error || 'Failed to delete activity'));
                }
            }).catch(error => {
                console.error('Delete error:', error);
                alert('An error occurred while deleting the activity: ' + error.message);
            });
        } catch (error) {
            console.error('Delete error:', error);
            alert('An error occurred: ' + error.message);
        }
    }
}
