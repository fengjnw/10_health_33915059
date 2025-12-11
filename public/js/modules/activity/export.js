// Export activities to CSV (all filtered data, not only current page)

function getCSRFToken() {
    return document.querySelector('#csrf-token')?.value ||
        document.querySelector('input[name="_csrf"]')?.value ||
        document.querySelector('meta[name="csrf-token"]')?.content ||
        window.csrfToken || '';
}

function getFilters() {
    return {
        activity_type: document.getElementById('activity-type-filter')?.value || 'all',
        date_from: document.getElementById('date-from-filter')?.value || '',
        date_to: document.getElementById('date-to-filter')?.value || '',
        duration_min: document.getElementById('duration-min-filter')?.value || '',
        duration_max: document.getElementById('duration-max-filter')?.value || '',
        calories_min: document.getElementById('calories-min-filter')?.value || '',
        calories_max: document.getElementById('calories-max-filter')?.value || '',
        sort: document.getElementById('sort-by')?.value || 'date_desc'
    };
}

function buildQuery(params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
            searchParams.set(key, value);
        }
    });
    return searchParams.toString();
}

async function fetchAllActivities() {
    const filters = getFilters();
    const qs = buildQuery(filters);
    const csrfToken = getCSRFToken();

    // Use fetch with explicit path relative to /my-activities
    // From /my-activities page, internal/activities/export should resolve correctly
    const res = await fetch(`../internal/activities/export?${qs}`, {
        credentials: 'include',
        headers: {
            'X-CSRF-Token': csrfToken
        }
    });

    if (!res.ok) {
        if (res.status === 401) {
            throw new Error('You must be logged in to export activities.');
        }
        throw new Error(`Failed to fetch activities (${res.status})`);
    }

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch activities');
    }

    return data.data || [];
}

function convertToCSV(rows) {
    if (rows.length === 0) return '';

    const headers = ['Date', 'Activity Type', 'Duration (min)', 'Distance (km)', 'Calories', 'Notes'];
    const headerRow = headers.map(h => `"${h}"`).join(',');

    const dataRows = rows.map(row => {
        return [
            `"${row.date}"`,
            `"${row.type}"`,
            `"${row.duration}"`,
            `"${row.distance}"`,
            `"${row.calories}"`,
            `"${row.notes}"`
        ].join(',');
    });

    return [headerRow, ...dataRows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportActivities(pageType) {
    try {
        const activities = await fetchAllActivities();

        if (!activities || activities.length === 0) {
            alert('No activities to export. Please check your filters.');
            return;
        }

        // Map API rows to CSV rows
        const rows = activities.map(a => ({
            date: a.activity_time ? new Date(a.activity_time).toLocaleString() : (a.date || ''),
            type: a.activity_type ?? a.type ?? '',
            duration: a.duration_minutes ?? a.duration ?? '',
            distance: a.distance_km ?? a.distance ?? '',
            calories: a.calories_burned ?? a.calories ?? '',
            notes: (a.notes ?? '').replace(/\r?\n/g, ' ')
        }));

        const csv = convertToCSV(rows);
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `activities-export-${pageType}-${timestamp}.csv`;

        downloadCSV(csv, filename);
    } catch (err) {
        alert('Failed to export activities: ' + err.message);
    }
}

// Search page export - uses public API endpoint (no auth required)
const searchExportBtn = document.getElementById('export-results');
if (searchExportBtn) {
    searchExportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportActivities('search');
    });
}

// My Activities page export - uses internal endpoint (auth required)
const activitiesExportBtn = document.getElementById('export-activities');
if (activitiesExportBtn) {
    activitiesExportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportActivities('my-activities');
    });
}

// Override fetchAllActivities for search page to use public API
if (document.getElementById('export-results')) {
    const originalFetchAllActivities = window.fetchAllActivities;
    window.fetchAllActivities = async function () {
        const filters = getFilters();
        const qs = buildQuery(filters);

        // Use public API endpoint for search (no auth required)
        // From /search page, navigate to /api/activities/search/export
        // Using proper relative path: go up to root level then into api
        const res = await fetch(`./api/activities/search/export?${qs}`, {
            credentials: 'include'
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch activities (${res.status})`);
        }

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch activities');
        }

        return data.data || [];
    };
}
