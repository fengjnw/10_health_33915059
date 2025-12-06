// Filter activities by type
document.addEventListener('DOMContentLoaded', function () {
    const filterSelect = document.getElementById('activity-type-filter');

    if (!filterSelect) return;

    filterSelect.addEventListener('change', function () {
        const selectedType = this.value;
        const rows = document.querySelectorAll('.activities-table tbody tr');
        const totalCount = rows.length;
        let visibleCount = 0;

        rows.forEach(row => {
            const activityType = row.getAttribute('data-activity-type');

            if (selectedType === 'all' || activityType === selectedType) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Update the count display
        const visibleCountSpan = document.getElementById('visible-count');
        const totalCountSpan = document.getElementById('total-count');

        if (visibleCountSpan) {
            visibleCountSpan.textContent = visibleCount;
        }
        if (totalCountSpan) {
            totalCountSpan.textContent = totalCount;
        }

        // Update stats if they exist
        updateStats(selectedType);
    });
});

function updateStats(filterType) {
    const statsContainer = document.querySelector('.stats-grid');
    if (!statsContainer) return;

    const rows = document.querySelectorAll('.activities-table tbody tr');
    let totalDuration = 0;
    let totalDistance = 0;
    let totalCalories = 0;

    rows.forEach(row => {
        const activityType = row.getAttribute('data-activity-type');

        if (filterType === 'all' || activityType === filterType) {
            const cells = row.querySelectorAll('td');

            // Duration is in column 3 (index 2)
            const duration = parseFloat(cells[2]?.textContent) || 0;
            totalDuration += duration;

            // Distance is in column 4 (index 3)
            const distance = parseFloat(cells[3]?.textContent) || 0;
            totalDistance += distance;

            // Calories is in column 5 (index 4)
            const calories = parseFloat(cells[4]?.textContent) || 0;
            totalCalories += calories;
        }
    });

    // Update stat cards
    const statCards = statsContainer.querySelectorAll('.stat-card');
    if (statCards.length >= 3) {
        statCards[0].querySelector('.stat-value').textContent = `${totalDuration} min`;
        statCards[1].querySelector('.stat-value').textContent = `${totalDistance.toFixed(2)} km`;
        statCards[2].querySelector('.stat-value').textContent = `${totalCalories} cal`;
    }
}
