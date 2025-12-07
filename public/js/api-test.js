let currentPage = 1;

function renderActivityCard(activity) {
    const date = new Date(activity.activity_time).toLocaleString();
    return `
        <div class="activity-card">
            <h3>${activity.activity_type} - ${activity.username}</h3>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Duration:</strong> ${activity.duration_minutes} min | 
               <strong>Distance:</strong> ${activity.distance_km || 'N/A'} km | 
               <strong>Calories:</strong> ${activity.calories_burned}</p>
            <p><strong>Public:</strong> ${activity.is_public ? 'Yes' : 'No'} | 
               <strong>ID:</strong> ${activity.id}</p>
            ${activity.notes ? `<p><em>${activity.notes}</em></p>` : ''}
        </div>
    `;
}

function buildQuery() {
    const params = new URLSearchParams();

    const fields = [
        'activity_type', 'date_from', 'date_to',
        'duration_min', 'duration_max',
        'calories_min', 'calories_max',
        'sort', 'pageSize'
    ];

    fields.forEach(field => {
        const value = document.getElementById(field).value;
        if (value) {
            params.append(field, value);
        }
    });

    params.append('page', currentPage);

    return params.toString();
}

async function fetchActivities(page) {
    currentPage = page;
    const query = buildQuery();
    const url = `/api/activities?${query}`;
    const fullUrl = `${window.location.origin}${url}`;

    console.log('Fetching:', url);
    showStatus('Loading...', 'success');

    // Display the API URL
    const apiUrlDiv = document.getElementById('apiUrl');
    apiUrlDiv.innerHTML = `
        <strong>API Request:</strong><br>
        <a href="${url}" target="_blank" style="color: #007bff; text-decoration: none;">${fullUrl}</a>
        <button id="copyUrlBtn" style="margin-left: 10px; padding: 5px 10px; cursor: pointer;">Copy</button>
    `;

    // Add copy button functionality
    document.getElementById('copyUrlBtn').addEventListener('click', function () {
        navigator.clipboard.writeText(fullUrl).then(() => {
            this.textContent = 'Copied!';
            setTimeout(() => { this.textContent = 'Copy'; }, 2000);
        });
    });

    try {
        const response = await fetch(url);
        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Data:', data);

        if (data.success) {
            updateAuthStatus(!!data.authenticated);
            displayResults(data);
            displayPagination(data.pagination);
            showStatus(`✓ Found ${data.pagination.totalItems} activities`, 'success');
        } else {
            showStatus(`✗ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showStatus(`✗ Request failed: ${error.message}`, 'error');
    }
}

function displayResults(data) {
    const resultDiv = document.getElementById('result');

    if (data.data.length === 0) {
        resultDiv.innerHTML = '<p>No activities found.</p>';
        return;
    }

    let html = `<p><strong>Authenticated:</strong> ${data.authenticated ? 'Yes' : 'No (public only)'}</p>`;

    data.data.forEach(activity => {
        html += renderActivityCard(activity);
    });

    resultDiv.innerHTML = html;
}

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');

    let html = `<span>Page ${pagination.page} of ${pagination.totalPages} (${pagination.totalItems} total)</span>`;

    if (pagination.hasPreviousPage) {
        html += `<button class="prev-btn" data-page="${pagination.page - 1}">Previous</button>`;
    }

    if (pagination.hasNextPage) {
        html += `<button class="next-btn" data-page="${pagination.page + 1}">Next</button>`;
    }

    paginationDiv.innerHTML = html;

    // Add event listeners to pagination buttons
    paginationDiv.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function () {
            fetchActivities(parseInt(this.dataset.page));
        });
    });
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function updateAuthStatus(isAuthenticated) {
    const authDiv = document.getElementById('authStatus');
    if (!authDiv) return;
    const cls = isAuthenticated ? 'status success' : 'status error';
    authDiv.className = cls;
    authDiv.textContent = isAuthenticated ? 'Auth status: logged in (session cookie present)' : 'Auth status: not logged in (public only)';
}

function clearFilters() {
    document.getElementById('activity_type').value = '';
    document.getElementById('date_from').value = '';
    document.getElementById('date_to').value = '';
    document.getElementById('duration_min').value = '';
    document.getElementById('duration_max').value = '';
    document.getElementById('calories_min').value = '';
    document.getElementById('calories_max').value = '';
    document.getElementById('sort').value = 'date_desc';
    document.getElementById('pageSize').value = '10';
    currentPage = 1;
    document.getElementById('result').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
    document.getElementById('status').innerHTML = '';
}

function clearSingleActivity() {
    const input = document.getElementById('activityIdInput');
    if (input) input.value = '';
    const singleResult = document.getElementById('singleResult');
    if (singleResult) singleResult.innerHTML = '';
    const apiUrlSingle = document.getElementById('apiUrlSingle');
    if (apiUrlSingle) apiUrlSingle.innerHTML = '';
    const singleStatus = document.getElementById('singleStatus');
    if (singleStatus) singleStatus.innerHTML = '';
}

async function fetchActivityById() {
    const input = document.getElementById('activityIdInput');
    const idValue = parseInt(input.value, 10);

    if (Number.isNaN(idValue) || idValue <= 0) {
        showSingleStatus('Please enter a valid activity ID', 'error');
        document.getElementById('singleResult').innerHTML = '';
        document.getElementById('apiUrlSingle').innerHTML = '';
        return;
    }

    const url = `/api/activities/${idValue}`;
    const fullUrl = `${window.location.origin}${url}`;

    console.log('Fetching single activity:', url);

    showSingleStatus('Loading...', 'success');

    const apiUrlDiv = document.getElementById('apiUrlSingle');
    apiUrlDiv.innerHTML = `
        <strong>API Request:</strong><br>
        <a href="${url}" target="_blank" style="color: #007bff; text-decoration: none;">${fullUrl}</a>
        <button id="copyUrlBtnSingle" style="margin-left: 10px; padding: 5px 10px; cursor: pointer;">Copy</button>
    `;

    const copyBtn = document.getElementById('copyUrlBtnSingle');
    copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(fullUrl).then(() => {
            this.textContent = 'Copied!';
            setTimeout(() => { this.textContent = 'Copy'; }, 2000);
        });
    });

    try {
        const response = await fetch(url);
        console.log('Single activity status:', response.status);
        const data = await response.json();
        console.log('Single activity data:', data);

        if (!data.success) {
            showSingleStatus(`✗ Error: ${data.error || 'Not found'}`, 'error');
            document.getElementById('singleResult').innerHTML = '';
            return;
        }

        updateAuthStatus(!!data.authenticated);
        showSingleStatus('✓ Activity loaded', 'success');
        document.getElementById('singleResult').innerHTML = renderActivityCard(data.data);
    } catch (error) {
        console.error('Fetch by ID error:', error);
        showSingleStatus(`✗ Request failed: ${error.message}`, 'error');
        document.getElementById('singleResult').innerHTML = '';
    }
}

function showSingleStatus(message, type) {
    const statusDiv = document.getElementById('singleStatus');
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}

// Add event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('searchBtn').addEventListener('click', function () {
        fetchActivities(1);
    });

    document.getElementById('clearBtn').addEventListener('click', clearFilters);

    document.getElementById('fetchByIdBtn').addEventListener('click', fetchActivityById);
    document.getElementById('clearByIdBtn').addEventListener('click', clearSingleActivity);
});
