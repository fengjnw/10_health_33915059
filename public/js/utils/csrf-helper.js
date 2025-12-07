/**
 * CSRF Token Helper Utilities
 * Centralized functions for CSRF token management
 */

/**
 * Get CSRF token from meta tag or hidden input
 * @returns {string} CSRF token value
 */
function getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    const input = document.querySelector('input[name="_csrf"]');
    return meta?.getAttribute('content') || input?.value || '';
}

/**
 * Update CSRF token in meta tag and hidden inputs
 * @param {string} token - New CSRF token value
 */
function updateCSRFToken(token) {
    const meta = document.querySelector('meta[name="csrf-token"]');
    const input = document.querySelector('input[name="_csrf"]');
    if (meta) meta.setAttribute('content', token);
    if (input) input.value = token;
}

/**
 * Parse JSON response from fetch
 * Handles both JSON and text responses gracefully
 * @param {Response} response - Fetch API response object
 * @returns {Promise<Object>} Parsed JSON data
 * @throws {Error} If response is not JSON
 */
async function parseJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    throw new Error(`Unexpected response (${response.status}): ${text.slice(0, 200)}`);
}

/**
 * Handle CSRF token update from API response
 * @param {Object} data - Response data containing optional csrfToken
 * @returns {string|null} Updated token if present
 */
function handleCSRFUpdate(data) {
    if (data && data.csrfToken) {
        updateCSRFToken(data.csrfToken);
        return data.csrfToken;
    }
    return null;
}
