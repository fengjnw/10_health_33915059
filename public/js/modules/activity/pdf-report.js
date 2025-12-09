// PDF Report generation for fitness activities
// Requires: html2pdf library

async function generateFitnessPDFReport() {
    try {
        console.log('Generating fitness PDF report...');

        // Collect all necessary data
        const userData = {
            username: document.querySelector('.user-profile-name')?.textContent?.trim() || 'User',
            email: document.querySelector('.user-profile-email')?.textContent?.trim() || 'user@example.com',
            reportDate: new Date().toISOString().split('T')[0]
        };

        // Get statistics from the page
        const stats = collectStatsFromPage();

        // Fetch all filtered activities (not just current page)
        const activities = await fetchAllActivities();

        // Get time range from data
        const timeRange = getTimeRangeFromActivities(activities);

        // Get fitness advice based on stats
        const advice = generateFitnessAdvice(stats);

        // Create HTML content for PDF
        const htmlContent = createPDFContent(userData, stats, activities, timeRange, advice);

        // Generate PDF using html2pdf
        const opt = {
            margin: 10,
            filename: `fitness-report-${userData.reportDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        if (typeof html2pdf !== 'undefined') {
            await html2pdf().set(opt).from(htmlContent).save();
            console.log('PDF report generated successfully');
        } else {
            alert('PDF library not loaded. Please refresh the page and try again.');
        }
    } catch (error) {
        console.error('Error generating PDF report:', error);
        alert('Failed to generate PDF report: ' + error.message);
    }
}

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

    const res = await fetch(`/internal/activities/export?${qs}`, {
        credentials: 'include',
        headers: {
            'X-CSRF-Token': csrfToken
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch activities (${res.status})`);
    }

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch activities');
    }

    // Normalize to structure expected by PDF generator
    return (data.data || []).map(a => ({
        date: a.activity_time ? new Date(a.activity_time).toISOString() : '',
        type: a.activity_type || '',
        duration: a.duration_minutes ?? '',
        distance: a.distance_km ?? '',
        calories: a.calories_burned ?? '',
        notes: a.notes || ''
    }));
}

function collectStatsFromPage() {
    const stats = {};

    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const label = card.querySelector('h3')?.textContent?.trim();
        const value = card.querySelector('.stat-value')?.textContent?.trim();
        if (label && value) {
            stats[label] = value;
        }
    });

    return stats;
}

function getTimeRangeFromActivities(activities) {
    if (activities.length === 0) {
        return { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] };
    }

    const dates = activities.map(a => new Date(a.date));
    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    };
}

function generateFitnessAdvice(stats) {
    const advice = [];

    // Parse stats values
    const totalActivities = parseInt(stats['Activities'] || '0');
    const totalDuration = parseInt(stats['Duration'] || '0');
    const avgIntensity = parseFloat(stats['Avg Intensity'] || '0');

    // Generate personalized advice
    if (totalActivities === 0) {
        advice.push('Start your fitness journey - aim for 3-4 workouts per week');
    } else if (totalActivities < 3) {
        advice.push('Increase workout frequency - try to reach 3-4 sessions per week');
    } else {
        advice.push('Great workout frequency - keep up this consistency');
    }

    if (totalDuration < 150) {
        advice.push('Aerobic activity is below WHO recommendation of 150 min/week');
    } else if (totalDuration >= 150 && totalDuration < 300) {
        advice.push('Good aerobic activity level - consider adding strength training');
    } else {
        advice.push('Excellent aerobic activity - maintain this high level');
    }

    if (avgIntensity < 5) {
        advice.push('Consider increasing workout intensity for better results');
    } else if (avgIntensity >= 5 && avgIntensity < 10) {
        advice.push('Good workout intensity - balanced training level');
    } else {
        advice.push('High workout intensity - ensure adequate recovery');
    }

    return advice;
}

function createPDFContent(userData, stats, activities, timeRange, advice) {
    const reportDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="/css/style.css">
    <style>
        /* Minimal fallbacks so pdf has borders even without site CSS loaded in html2pdf */
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        h1, h2 { margin: 0 0 8px 0; }
        .report-container { padding: 16px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
        .stat-box { border: 1px solid #ddd; padding: 8px; text-align: center; }
        .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 6px; }
        .info-label { font-weight: bold; }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <h1>Fitness Report</h1>
        
        <!-- User Info -->
        <div class="info-section">
            <div class="info-row">
                <div class="info-item">
                    <div class="info-label">Username:</div>
                    <div>${escapeHtml(userData.username)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email:</div>
                    <div>${escapeHtml(userData.email)}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-item">
                    <div class="info-label">Report Period:</div>
                    <div>${timeRange.start} to ${timeRange.end} (${timeRange.days} days)</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Generated:</div>
                    <div>${reportDate}</div>
                </div>
            </div>
        </div>
        
        <!-- Stats Overview -->
        <h2>Statistics Overview</h2>
        <div class="stats-grid">
            ${Object.entries(stats).map(([label, value]) => `
                <div class="stat-box">
                    <div class="stat-label">${escapeHtml(label)}</div>
                    <div class="stat-value">${escapeHtml(value)}</div>
                </div>
            `).join('')}
        </div>
        
        <!-- Activity Details -->
        <h2>Activity Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Duration (min)</th>
                    <th>Distance (km)</th>
                    <th>Calories</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${activities.map(activity => `
                    <tr>
                        <td>${activity.date ? new Date(activity.date).toLocaleString() : ''}</td>
                        <td>${escapeHtml(activity.type)}</td>
                        <td>${activity.duration}</td>
                        <td>${activity.distance}</td>
                        <td>${activity.calories}</td>
                        <td>${escapeHtml(activity.notes)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Fitness Recommendations -->
        <h2>Fitness Recommendations</h2>
        <div class="advice-box">
            ${advice.map(item => `<div class="advice-item">• ${item}</div>`).join('')}
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Generated by Health & Fitness Tracker</p>
        </div>
    </div>
</body>
</html>
    `;

    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Bind to button
document.addEventListener('DOMContentLoaded', () => {
    const pdfButton = document.getElementById('export-pdf-report');
    if (pdfButton) {
        pdfButton.addEventListener('click', generateFitnessPDFReport);
    }
});
