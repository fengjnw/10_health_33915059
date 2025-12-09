// Filter activities by multiple criteria - server-side filtering
document.addEventListener('DOMContentLoaded', function () {
    // Toggle advanced filters
    const toggleBtn = document.getElementById('toggle-filters');
    const advancedFilters = document.getElementById('advanced-filters');
    const filterIcon = document.getElementById('filter-icon');

    if (toggleBtn && advancedFilters) {
        toggleBtn.addEventListener('click', function () {
            const isHidden = advancedFilters.style.display === 'none';
            advancedFilters.style.display = isHidden ? 'block' : 'none';
            filterIcon.textContent = isHidden ? '▲' : '▼';
        });
    }

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
    }

    // Apply initial sorting if needed
    applySorting();
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
    sortRows(sortBy);
}

function sortRows(sortBy) {
    const tbody = document.querySelector('.activities-table tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));

    const getNumeric = (row, key) => {
        const val = row.dataset[key];
        const num = val ? parseFloat(val) : 0;
        return Number.isNaN(num) ? 0 : num;
    };

    const getTime = (row) => {
        const val = row.dataset.activityTime;
        const ts = val ? new Date(val).getTime() : 0;
        return Number.isNaN(ts) ? 0 : ts;
    };

    const [field, direction] = (() => {
        switch (sortBy) {
            case 'date-asc':
                return ['time', 'asc'];
            case 'calories-desc':
                return ['calories', 'desc'];
            case 'calories-asc':
                return ['calories', 'asc'];
            case 'duration-desc':
                return ['duration', 'desc'];
            case 'duration-asc':
                return ['duration', 'asc'];
            case 'date-desc':
            default:
                return ['time', 'desc'];
        }
    })();

    rows.sort((a, b) => {
        let aVal;
        let bVal;

        if (field === 'time') {
            aVal = getTime(a);
            bVal = getTime(b);
        } else {
            aVal = getNumeric(a, field);
            bVal = getNumeric(b, field);
        }

        if (direction === 'asc') {
            return aVal - bVal;
        }
        return bVal - aVal;
    });

    rows.forEach(row => tbody.appendChild(row));
}
