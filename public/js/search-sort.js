// Sorting for search results table
// Reorders rows client-side based on selected criterion

document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.getElementById('search-sort');
    const table = document.getElementById('search-results-table');
    const tbody = table ? table.querySelector('tbody') : null;

    if (!sortSelect || !tbody) return;

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

    const sortRows = (sortBy) => {
        const rows = Array.from(tbody.querySelectorAll('tr'));

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
    };

    sortSelect.addEventListener('change', () => sortRows(sortSelect.value));

    // Initial sort
    sortRows(sortSelect.value || 'date-desc');
});
