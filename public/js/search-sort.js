// Sorting for search results table
// Uses shared sort helper utilities

document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.getElementById('search-sort');
    const table = document.getElementById('search-results-table');
    const tbody = table ? table.querySelector('tbody') : null;

    if (!sortSelect || !tbody) return;

    sortSelect.addEventListener('change', () => sortTableRows(tbody, sortSelect.value));
    sortTableRows(tbody, sortSelect.value || 'date-desc');
});
