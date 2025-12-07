// Form helper utilities for data extraction and error handling

// Extract form data as object
function getFormData(event) {
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    const csrfToken = formData.get('_csrf');

    return { data, csrfToken, formData };
}

// Show message in container
function showMessage(containerId, message, type = 'error') {
    const container = document.getElementById(containerId);
    if (container) {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
        container.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    }
}

// Handle fetch errors with message display
function handleFetchError(error, containerId, defaultMessage = 'An error occurred') {
    console.error('Error:', error);
    showMessage(containerId, defaultMessage, 'error');
}

// Make fetch request with common configuration
async function makeFetchRequest(url, data, csrfToken, method = 'POST') {
    return fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(data)
    });
}

// Handle form submission with common patterns
// Options: onSuccess, onError, transformData, method, messageContainer
async function handleFormSubmit(event, url, options = {}) {
    event.preventDefault();

    const {
        onSuccess,
        onError,
        transformData,
        method = 'POST',
        messageContainer = 'message-container'
    } = options;

    try {
        const { data, csrfToken } = getFormData(event);
        const requestData = transformData ? transformData(data) : data;

        const response = await makeFetchRequest(url, requestData, csrfToken, method);
        const result = await response.json();

        if (response.ok) {
            if (onSuccess) {
                onSuccess(result);
            } else {
                showMessage(messageContainer, result.message || 'Success', 'success');
            }
        } else {
            const errorMsg = result.error || 'An error occurred';
            if (onError) {
                onError(errorMsg);
            } else {
                showMessage(messageContainer, errorMsg, 'error');
            }
        }
    } catch (error) {
        handleFetchError(error, messageContainer);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getFormData,
        showMessage,
        handleFetchError,
        makeFetchRequest,
        handleFormSubmit
    };
}
