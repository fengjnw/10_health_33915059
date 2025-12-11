// Activity charts visualization module

// Store chart instances globally for updates
let typeChart = null;
let trendChart = null;

// Wait for Chart.js to load
function waitForChartJs(callback, maxWait = 5000) {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
        if (typeof Chart !== 'undefined') {
            clearInterval(checkInterval);
            callback();
        } else if (Date.now() - startTime > maxWait) {
            clearInterval(checkInterval);
            alert('Charts failed to load. Please refresh the page.');
        }
    }, 100);
}

// Helper function to get CSRF token from DOM
function getCSRFToken() {
    return document.querySelector('input[name="_csrf"]')?.value ||
        document.querySelector('input#csrf-token')?.value ||
        document.querySelector('meta[name="csrf-token"]')?.content ||
        window.csrfToken || '';
}

// Initialize charts on page load
document.addEventListener('DOMContentLoaded', () => {
    waitForChartJs(loadAndRenderCharts);
});

async function loadAndRenderCharts() {
    try {
        const csrfToken = getCSRFToken();

        const fetchOptions = {
            credentials: 'include',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        };

        // Get current filter parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const filterQuery = urlParams.toString();

        // Fetch type distribution data with current filters
        const typeUrl = 'internal/activities/charts/type-distribution' + (filterQuery ? '?' + filterQuery : '');
        const typeRes = await fetch(typeUrl, fetchOptions);

        if (!typeRes.ok) {
            return;
        }

        const typeData = await typeRes.json();

        // Fetch daily trend data with current filters
        const trendUrl = 'internal/activities/charts/daily-trend' + (filterQuery ? '?' + filterQuery : '');
        const trendRes = await fetch(trendUrl, fetchOptions);

        if (!trendRes.ok) {
            return;
        }

        const trendData = await trendRes.json();

        // Check if we have any data at all
        const hasTypeData = typeData.success && typeData.data && typeData.data.length > 0;
        const hasTrendData = trendData.success && trendData.data && trendData.data.length > 0;

        if (!hasTypeData && !hasTrendData) {
            // No data at all - hide chart containers or show a message
            const typeChartContainer = document.getElementById('typeDistributionChart')?.parentElement;
            const trendChartContainer = document.getElementById('dailyTrendChart')?.parentElement;

            if (typeChartContainer) {
                typeChartContainer.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No activity data available for charts. Add some activities to see visualizations!</p>';
            }
            if (trendChartContainer && trendChartContainer !== typeChartContainer) {
                trendChartContainer.style.display = 'none';
            }
            return;
        }

        if (hasTypeData) {
            renderTypeDistributionChart(typeData.data);
        }

        if (hasTrendData) {
            renderDailyTrendChart(trendData.data);
        }
    } catch (error) {
        // Silent fail - charts are optional
    }
}

// Export function to refresh charts (can be called after sorting/filtering)
window.refreshActivityCharts = function () {
    if (typeof Chart !== 'undefined') {
        loadAndRenderCharts();
    } else {
        waitForChartJs(loadAndRenderCharts);
    }
};

function renderTypeDistributionChart(data) {
    const ctx = document.getElementById('typeDistributionChart');
    if (!ctx) {
        return;
    }

    // Destroy existing chart if it exists
    if (typeChart) {
        typeChart.destroy();
        typeChart = null;
    }

    const labels = data.map(d => d.activity_type);
    const counts = data.map(d => d.count);
    const colors = generateColors(data.length);

    // Inline plugin to draw values and percentages on slices (no external dependencies)
    const sliceLabelPlugin = {
        id: 'sliceLabelPlugin',
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            const dataset = data.datasets[0];
            if (!dataset) return;
            const total = dataset.data.reduce((a, b) => a + b, 0);
            const meta = chart.getDatasetMeta(0);
            meta.data.forEach((element, index) => {
                const value = dataset.data[index];
                if (!value) return;
                const position = element.tooltipPosition();
                const percent = total ? ((value / total) * 100).toFixed(1) : '0.0';
                const label = data.labels[index] || '';
                ctx.save();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${label} (${value})`, position.x, position.y - 8);
                ctx.font = '10px Arial';
                ctx.fillText(percent + '%', position.x, position.y + 8);
                ctx.restore();
            });
        }
    };

    try {
        typeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const idx = context.dataIndex;
                                const count = counts[idx];
                                const total = counts.reduce((a, b) => a + b, 0);
                                const percent = ((count / total) * 100).toFixed(1);
                                return `${labels[idx]}: ${count} (${percent}%)`;
                            }
                        }
                    }
                }
            }
            , plugins: [sliceLabelPlugin]
        });
    } catch (error) {
        // Silent fail
    }
}

function renderDailyTrendChart(data) {
    const ctx = document.getElementById('dailyTrendChart');
    if (!ctx) {
        return;
    }

    // Destroy existing chart if it exists
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }

    // Format labels to YYYY-MM-DD
    const labels = data.map(d => {
        const date = new Date(d.date);
        return date.toISOString().split('T')[0];
    });
    const durations = data.map(d => d.total_duration);
    const calories = data.map(d => d.total_calories);
    const counts = data.map(d => d.count);

    try {
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Duration (min)',
                        data: durations,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Calories',
                        data: calories,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: { font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function (context) {
                                const idx = context.dataIndex;
                                return `Activities: ${counts[idx]}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Duration (min)',
                            font: { size: 12 }
                        },
                        ticks: { color: '#3498db' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Calories',
                            font: { size: 12 }
                        },
                        ticks: { color: '#e74c3c' },
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: {
                            font: { size: 11 },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    } catch (error) {
        // Silent fail
    }
}

function generateColors(count) {
    const palette = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#34495e', '#d35400', '#16a085', '#c0392b'
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(palette[i % palette.length]);
    }
    return colors;
}
