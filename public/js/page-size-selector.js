// Handle page size changes for search and my-activities pages

function handlePageSizeChange(pageSelector, pageSize) {
    const url = new URL(window.location);
    url.searchParams.set('pageSize', pageSize);
    url.searchParams.set('page', '1'); // Reset to first page
    window.location.href = url.toString();
}

// Search page pageSize handler
const searchPageSizeSelect = document.getElementById('search-pageSize');
if (searchPageSizeSelect) {
    searchPageSizeSelect.addEventListener('change', (e) => {
        handlePageSizeChange('search-pageSize', e.target.value);
    });
}

// My Activities page pageSize handler
const activitiesPageSizeSelect = document.getElementById('activities-pageSize');
if (activitiesPageSizeSelect) {
    activitiesPageSizeSelect.addEventListener('change', (e) => {
        handlePageSizeChange('activities-pageSize', e.target.value);
    });
}
