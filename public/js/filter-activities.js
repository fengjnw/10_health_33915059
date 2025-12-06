// Filter activities by multiple criteria
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

    // Apply filters button
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }

    // Clear filters button
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            document.getElementById('activity-type-filter').value = 'all';
            document.getElementById('date-from-filter').value = '';
            document.getElementById('date-to-filter').value = '';
            document.getElementById('duration-min-filter').value = '';
            document.getElementById('duration-max-filter').value = '';
            document.getElementById('calories-min-filter').value = '';
            document.getElementById('calories-max-filter').value = '';
            applyFilters();
        });
    }

    // Sorting
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilters);
    }

    // Sync stats/counts on initial load
    applyFilters();
});

function applyFilters() {
    const sortBy = document.getElementById('sort-by')?.value || 'date-desc';
    const activityType = document.getElementById('activity-type-filter')?.value || 'all';
    const dateFrom = document.getElementById('date-from-filter')?.value || '';
    const dateTo = document.getElementById('date-to-filter')?.value || '';
    const durationMin = parseInt(document.getElementById('duration-min-filter')?.value) || 0;
    const durationMax = parseInt(document.getElementById('duration-max-filter')?.value) || Infinity;
    const caloriesMin = parseInt(document.getElementById('calories-min-filter')?.value) || 0;
    const caloriesMax = parseInt(document.getElementById('calories-max-filter')?.value) || Infinity;

    const rows = document.querySelectorAll('.activities-table tbody tr');
    const totalCount = rows.length;
    let visibleCount = 0;

    rows.forEach(row => {
        let shouldShow = true;

        const rowActivityType = row.getAttribute('data-activity-type');

        // Activity type filter
        if (activityType !== 'all' && rowActivityType !== activityType) {
            shouldShow = false;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            const dateCell = row.querySelector('td:first-child');
            if (dateCell) {
                const activityDateStr = dateCell.textContent.trim();
                const activityDate = new Date(activityDateStr);

                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    if (activityDate < fromDate) {
                        shouldShow = false;
                    }
                }

                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (activityDate > toDate) {
                        shouldShow = false;
                    }
                }
            }
        }

        // Duration filter
        const durationCell = row.querySelector('td:nth-child(3)');
        if (durationCell) {
            const duration = parseInt(durationCell.textContent.trim()) || 0;
            if (duration < durationMin || duration > durationMax) {
                shouldShow = false;
            }
        }

        // Calories filter
        const caloriesCell = row.querySelector('td:nth-child(5)');
        if (caloriesCell) {
            const caloriesText = caloriesCell.textContent.trim();
            if (caloriesText !== 'N/A') {
                const calories = parseInt(caloriesText) || 0;
                if (calories < caloriesMin || calories > caloriesMax) {
                    shouldShow = false;
                }
            }
        }

        // Show/hide row
        if (shouldShow) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Update the count display (table header area)
    const visibleCountSpan = document.getElementById('visible-count');
    const totalCountSpan = document.getElementById('total-count');

    if (visibleCountSpan) {
        visibleCountSpan.textContent = visibleCount;
    }
    if (totalCountSpan) {
        totalCountSpan.textContent = totalCount;
    }

    // Sort and update stats
    sortRows(sortBy);
    updateStats(visibleCount, totalCount);
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

function updateStats(visibleCount, totalCount) {
    const statsContainer = document.querySelector('.stats-grid');
    if (!statsContainer) return;

    const rows = document.querySelectorAll('.activities-table tbody tr');
    let visibleDuration = 0;
    let visibleDistance = 0;
    let visibleCalories = 0;
    let totalDuration = 0;
    let totalDistance = 0;
    let totalCalories = 0;

    rows.forEach(row => {
        const duration = parseFloat(row.dataset.duration || '0') || 0;
        const distance = parseFloat(row.dataset.distance || '0') || 0;
        const calories = parseFloat(row.dataset.calories || '0') || 0;

        totalDuration += duration;
        totalDistance += distance;
        totalCalories += calories;

        if (row.style.display !== 'none') {
            visibleDuration += duration;
            visibleDistance += distance;
            visibleCalories += calories;
        }
    });

    const statCards = statsContainer.querySelectorAll('.stat-card');
    const setCardNumbers = (card, visible, total, formatter = (v) => v) => {
        const visibleEl = card.querySelector('.stat-visible');
        const totalEl = card.querySelector('.stat-total');
        if (visibleEl) visibleEl.textContent = formatter(visible);
        if (totalEl) totalEl.textContent = formatter(total);
    };

    if (statCards.length >= 4) {
        setCardNumbers(statCards[0], visibleCount, totalCount);
        setCardNumbers(statCards[1], visibleDuration, totalDuration);
        setCardNumbers(statCards[2], visibleDistance, totalDistance, (val) => val.toFixed(2));
        setCardNumbers(statCards[3], visibleCalories, totalCalories);
    }
}
