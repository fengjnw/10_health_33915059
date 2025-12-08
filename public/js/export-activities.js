// Export activities to CSV

function collectTableRows() {
    const rows = [];
    const tableBody = document.querySelector('.activities-table tbody');
    if (!tableBody) return rows;

    tableBody.querySelectorAll('tr').forEach(row => {
        if (row.style.display !== 'none') {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                rows.push({
                    date: cells[0]?.textContent?.trim() || '',
                    type: cells[1]?.textContent?.trim() || '',
                    duration: cells[2]?.textContent?.trim() || '',
                    distance: cells[3]?.textContent?.trim() || '',
                    calories: cells[4]?.textContent?.trim() || '',
                    notes: cells[5]?.textContent?.trim() || ''
                });
            }
        }
    });

    return rows;
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

function exportActivities(pageType) {
    const rows = collectTableRows();

    if (rows.length === 0) {
        alert('No activities to export. Please apply filters or ensure activities are visible.');
        return;
    }

    const csv = convertToCSV(rows);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `activities-export-${pageType}-${timestamp}.csv`;

    downloadCSV(csv, filename);
}

// Search page export
const searchExportBtn = document.getElementById('export-results');
if (searchExportBtn) {
    searchExportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportActivities('search');
    });
}

// My Activities page export
const activitiesExportBtn = document.getElementById('export-activities');
if (activitiesExportBtn) {
    activitiesExportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportActivities('my-activities');
    });
}
