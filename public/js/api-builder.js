// API Request Builder - generates curl commands, no execution

const BASE_URL = 'http://localhost:8000';

// ===== Bearer Token Section =====
document.getElementById('buildTokenBtn').addEventListener('click', () => {
    const username = document.getElementById('token_username').value.trim();
    const password = document.getElementById('token_password').value.trim();

    if (!username || !password) {
        alert('Username and password are required');
        return;
    }

    const payload = JSON.stringify({ username, password });
    const curlCommand = `curl -X POST ${BASE_URL}/api/auth/token \\
  -H "Content-Type: application/json" \\
  -d '${payload}'`;

    displayOutput('tokenOutput', curlCommand, 'POST /api/auth/token');
});

document.getElementById('clearTokenBtn').addEventListener('click', () => {
    document.getElementById('token_username').value = '';
    document.getElementById('token_password').value = '';
    hideOutput('tokenOutput');
});

// ===== List Activities Section =====
document.getElementById('buildListBtn').addEventListener('click', () => {
    const params = new URLSearchParams();

    const activityType = document.getElementById('list_activity_type').value;
    const dateFrom = document.getElementById('list_date_from').value;
    const dateTo = document.getElementById('list_date_to').value;
    const durationMin = document.getElementById('list_duration_min').value;
    const durationMax = document.getElementById('list_duration_max').value;
    const sort = document.getElementById('list_sort').value;
    const page = document.getElementById('list_page').value;
    const pageSize = document.getElementById('list_pageSize').value;
    const token = document.getElementById('list_token').value.trim();

    if (activityType) params.append('activity_type', activityType);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (durationMin) params.append('duration_min', durationMin);
    if (durationMax) params.append('duration_max', durationMax);
    if (sort) params.append('sort', sort);
    if (page) params.append('page', page);
    if (pageSize) params.append('pageSize', pageSize);

    const queryString = params.toString();
    const url = `${BASE_URL}/api/activities${queryString ? '?' + queryString : ''}`;

    let curlCommand = `curl -X GET '${url}'`;
    if (token) {
        curlCommand += ` \\\n  -H "Authorization: Bearer ${token}"`;
    }

    displayOutput('listOutput', curlCommand, 'GET /api/activities');
});

document.getElementById('clearListBtn').addEventListener('click', () => {
    document.getElementById('list_activity_type').value = '';
    document.getElementById('list_date_from').value = '';
    document.getElementById('list_date_to').value = '';
    document.getElementById('list_duration_min').value = '';
    document.getElementById('list_duration_max').value = '';
    document.getElementById('list_sort').value = 'date_desc';
    document.getElementById('list_page').value = '1';
    document.getElementById('list_pageSize').value = '10';
    document.getElementById('list_token').value = '';
    hideOutput('listOutput');
});

// ===== Single Activity Section =====
document.getElementById('buildSingleBtn').addEventListener('click', () => {
    const id = document.getElementById('single_id').value.trim();
    const token = document.getElementById('single_token').value.trim();

    if (!id) {
        alert('Activity ID is required');
        return;
    }

    const url = `${BASE_URL}/api/activities/${id}`;
    let curlCommand = `curl -X GET '${url}'`;
    if (token) {
        curlCommand += ` \\\n  -H "Authorization: Bearer ${token}"`;
    }

    displayOutput('singleOutput', curlCommand, `GET /api/activities/${id}`);
});

document.getElementById('clearSingleBtn').addEventListener('click', () => {
    document.getElementById('single_id').value = '';
    document.getElementById('single_token').value = '';
    hideOutput('singleOutput');
});

// ===== Create Activity Section =====
document.getElementById('buildCreateBtn').addEventListener('click', () => {
    const activityType = document.getElementById('create_activity_type').value;
    const duration = document.getElementById('create_duration').value;
    const distance = document.getElementById('create_distance').value;
    const calories = document.getElementById('create_calories').value;
    const activityTime = document.getElementById('create_activity_time').value;
    const notes = document.getElementById('create_notes').value;
    const isPublic = document.getElementById('create_is_public').value;
    const token = document.getElementById('create_token').value.trim();

    if (!activityType || !duration || !calories || !activityTime) {
        alert('Activity Type, Duration, Calories, and Date & Time are required');
        return;
    }

    if (!token) {
        alert('Bearer Token is required for creating activities');
        return;
    }

    const payload = {
        activity_type: activityType,
        duration: parseInt(duration),
        calories: parseInt(calories),
        activity_time: activityTime,
        is_public: parseInt(isPublic)
    };

    if (distance) {
        payload.distance = parseFloat(distance);
    }

    if (notes) {
        payload.notes = notes;
    }

    const payloadString = JSON.stringify(payload, null, 2);
    const curlCommand = `curl -X POST ${BASE_URL}/api/activities \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '${JSON.stringify(payload)}'`;

    displayOutput('createOutput', curlCommand, 'POST /api/activities', payloadString);
});

document.getElementById('clearCreateBtn').addEventListener('click', () => {
    document.getElementById('create_activity_type').value = 'Running';
    document.getElementById('create_duration').value = '';
    document.getElementById('create_distance').value = '';
    document.getElementById('create_calories').value = '';
    document.getElementById('create_activity_time').value = '';
    document.getElementById('create_notes').value = '';
    document.getElementById('create_is_public').value = '1';
    document.getElementById('create_token').value = '';
    hideOutput('createOutput');
});

// ===== Update Activity Section =====
document.getElementById('buildUpdateBtn').addEventListener('click', () => {
    const id = document.getElementById('update_id').value.trim();
    const activityType = document.getElementById('update_activity_type').value;
    const duration = document.getElementById('update_duration').value;
    const distance = document.getElementById('update_distance').value;
    const calories = document.getElementById('update_calories').value;
    const activityTime = document.getElementById('update_activity_time').value;
    const notes = document.getElementById('update_notes').value;
    const isPublic = document.getElementById('update_is_public').value;
    const token = document.getElementById('update_token').value.trim();

    if (!id) {
        alert('Activity ID is required');
        return;
    }

    if (!token) {
        alert('Bearer Token is required for updating activities');
        return;
    }

    // Build payload with only provided fields
    const payload = {};
    if (activityType) payload.activity_type = activityType;
    if (duration) payload.duration = parseInt(duration);
    if (distance) payload.distance = parseFloat(distance);
    if (calories) payload.calories = parseInt(calories);
    if (activityTime) payload.activity_time = activityTime;
    if (notes) payload.notes = notes;
    if (isPublic !== '') payload.is_public = parseInt(isPublic);

    if (Object.keys(payload).length === 0) {
        alert('At least one field must be provided to update');
        return;
    }

    const payloadString = JSON.stringify(payload, null, 2);
    const curlCommand = `curl -X PATCH ${BASE_URL}/api/activities/${id} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '${JSON.stringify(payload)}'`;

    displayOutput('updateOutput', curlCommand, `PATCH /api/activities/${id}`, payloadString);
});

document.getElementById('clearUpdateBtn').addEventListener('click', () => {
    document.getElementById('update_id').value = '';
    document.getElementById('update_activity_type').value = '';
    document.getElementById('update_duration').value = '';
    document.getElementById('update_distance').value = '';
    document.getElementById('update_calories').value = '';
    document.getElementById('update_activity_time').value = '';
    document.getElementById('update_notes').value = '';
    document.getElementById('update_is_public').value = '';
    document.getElementById('update_token').value = '';
    hideOutput('updateOutput');
});

// ===== Delete Activity Section =====
document.getElementById('buildDeleteBtn').addEventListener('click', () => {
    const id = document.getElementById('delete_id').value.trim();
    const token = document.getElementById('delete_token').value.trim();

    if (!id) {
        alert('Activity ID is required');
        return;
    }

    if (!token) {
        alert('Bearer Token is required for deleting activities');
        return;
    }

    const curlCommand = `curl -X DELETE ${BASE_URL}/api/activities/${id} \\
  -H "Authorization: Bearer ${token}"`;

    displayOutput('deleteOutput', curlCommand, `DELETE /api/activities/${id}`);
});

document.getElementById('clearDeleteBtn').addEventListener('click', () => {
    document.getElementById('delete_id').value = '';
    document.getElementById('delete_token').value = '';
    hideOutput('deleteOutput');
});

// ===== Helper Functions =====
function displayOutput(elementId, curlCommand, endpoint, payload = null) {
    const outputBox = document.getElementById(elementId);
    outputBox.classList.remove('empty');

    let html = `
        <div class="output-header">
            <span class="output-label">${endpoint}</span>
            <button class="copy-btn" data-target="${elementId}_curl">Copy</button>
        </div>
        <div class="code-block" id="${elementId}_curl">${escapeHtml(curlCommand)}</div>
    `;

    if (payload) {
        html += `
            <div class="output-header" style="margin-top: 15px;">
                <span class="output-label">Request Body</span>
            </div>
            <div class="code-block">${escapeHtml(payload)}</div>
        `;
    }

    outputBox.innerHTML = html;

    // Attach event listener to the copy button
    const copyBtn = outputBox.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            copyToClipboard(this.dataset.target, this);
        });
    }
}

function hideOutput(elementId) {
    const outputBox = document.getElementById(elementId);
    outputBox.classList.add('empty');
    outputBox.innerHTML = '';
}

function copyToClipboard(elementId, button) {
    const element = document.getElementById(elementId);
    const text = element.textContent;

    navigator.clipboard.writeText(text).then(() => {
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        alert('Failed to copy to clipboard');
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
