// Filter activities by multiple criteria - server-side filtering
// Import sort helper at the top (in actual HTML, include the script tag before this one)

document.addEventListener('DOMContentLoaded', function () {
    // Apply filters button - redirect to server with query params
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyServerFilters);
    }

    // Clear filters button - redirect to page without filters
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            window.location.href = '/my-activities';
        });
    }

    // Sorting - client-side only (doesn't need server reload)
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', applySorting);
        applySorting();
    }
});

function applyServerFilters() {
    const activityType = document.getElementById('activity-type-filter')?.value || '';
    const dateFrom = document.getElementById('date-from-filter')?.value || '';
    const dateTo = document.getElementById('date-to-filter')?.value || '';
    const durationMin = document.getElementById('duration-min-filter')?.value || '';
    const durationMax = document.getElementById('duration-max-filter')?.value || '';
    const caloriesMin = document.getElementById('calories-min-filter')?.value || '';
    const caloriesMax = document.getElementById('calories-max-filter')?.value || '';

    // Build query params
    const params = new URLSearchParams();

    if (activityType && activityType !== 'all') params.set('activity_type', activityType);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (durationMin) params.set('duration_min', durationMin);
    if (durationMax) params.set('duration_max', durationMax);
    if (caloriesMin) params.set('calories_min', caloriesMin);
    if (caloriesMax) params.set('calories_max', caloriesMax);

    // Keep current pageSize if exists
    const url = new URL(window.location);
    const currentPageSize = url.searchParams.get('pageSize');
    if (currentPageSize) {
        params.set('pageSize', currentPageSize);
    }

    // Redirect to filtered page
    window.location.href = '/my-activities?' + params.toString();
}

function applySorting() {
    const sortBy = document.getElementById('sort-by')?.value || 'date-desc';
    const tbody = document.querySelector('.activities-table tbody');
    sortTableRows(tbody, sortBy);
}
