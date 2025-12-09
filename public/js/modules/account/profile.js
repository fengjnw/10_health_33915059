// Handle profile form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profile-form');
    const successModal = document.getElementById('profileSuccessModal');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data, csrfToken } = getFormData(e);
        const profileData = {
            username: data.username,
            first_name: data.first_name,
            last_name: data.last_name
        };

        try {
            const response = await makeFetchRequest('/profile', profileData, csrfToken, 'PATCH');
            const result = await response.json();

            if (response.ok) {
                if (successModal) {
                    successModal.style.display = 'block';
                    setTimeout(() => {
                        successModal.style.display = 'none';
                        window.location.reload();
                    }, 2000);
                } else {
                    showMessage('message-container', 'Profile updated successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = '/profile';
                    }, 1500);
                }
            } else {
                showMessage('message-container', result.error || 'An error occurred', 'error');
            }
        } catch (error) {
            handleFetchError(error, 'message-container', 'An error occurred while updating your profile');
        }
    });
});
