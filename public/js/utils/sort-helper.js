/**
 * Table Sorting Utilities - Shared sorting logic for activities tables
 */

function getNumericValue(row, key) {
    const val = row.dataset[key];
    const num = val ? parseFloat(val) : 0;
    return Number.isNaN(num) ? 0 : num;
}

function getTimeValue(row) {
    const val = row.dataset.activityTime;
    const ts = val ? new Date(val).getTime() : 0;
    return Number.isNaN(ts) ? 0 : ts;
}

function getSortFieldAndDirection(sortBy) {
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
}

function sortTableRows(tbody, sortBy) {
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const [field, direction] = getSortFieldAndDirection(sortBy);

    rows.sort((a, b) => {
        let aVal, bVal;

        if (field === 'time') {
            aVal = getTimeValue(a);
            bVal = getTimeValue(b);
        } else {
            aVal = getNumericValue(a, field);
            bVal = getNumericValue(b, field);
        }

        return direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    rows.forEach(row => tbody.appendChild(row));
}
