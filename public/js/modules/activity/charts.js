// Activity charts visualization module

// Wait for Chart.js to load
function waitForChartJs(callback, maxWait = 5000) {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
        if (typeof Chart !== 'undefined') {
            clearInterval(checkInterval);
            console.log('Chart.js loaded successfully');
            callback();
        } else if (Date.now() - startTime > maxWait) {
            clearInterval(checkInterval);
            console.error('Chart.js failed to load within timeout');
        }
    }, 100);
}

// Initialize charts on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    waitForChartJs(loadAndRenderCharts);
});

async function loadAndRenderCharts() {
    try {
        console.log('Starting chart load...');

        // Fetch type distribution data
        const typeRes = await fetch('/api/activities/charts/type-distribution', {
            credentials: 'include'
        });
        const typeData = await typeRes.json();
        console.log('Type distribution data:', typeData);

        // Fetch daily trend data
        const trendRes = await fetch('/api/activities/charts/daily-trend?days=30', {
            credentials: 'include'
        });
        const trendData = await trendRes.json();
        console.log('Daily trend data:', trendData);

        if (typeData.success && typeData.data && typeData.data.length > 0) {
            console.log('Rendering type distribution chart with', typeData.data.length, 'types');
            renderTypeDistributionChart(typeData.data);
        } else {
            console.warn('No type distribution data available:', typeData);
        }

        if (trendData.success && trendData.data && trendData.data.length > 0) {
            console.log('Rendering daily trend chart with', trendData.data.length, 'days');
            renderDailyTrendChart(trendData.data);
        } else {
            console.warn('No daily trend data available:', trendData);
        }
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

function renderTypeDistributionChart(data) {
    const ctx = document.getElementById('typeDistributionChart');
    if (!ctx) {
        console.error('Canvas element typeDistributionChart not found');
        return;
    }

    console.log('Canvas found, rendering chart');
    const labels = data.map(d => d.activity_type);
    const counts = data.map(d => d.count);
    const colors = generateColors(data.length);

    try {
        new Chart(ctx, {
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
                    legend: {
                        position: 'right',
                        labels: {
                            font: { size: 12 },
                            padding: 15
                        }
                    },
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
        });
        console.log('Type distribution chart rendered successfully');
    } catch (error) {
        console.error('Error rendering type distribution chart:', error);
    }
}

function renderDailyTrendChart(data) {
    const ctx = document.getElementById('dailyTrendChart');
    if (!ctx) {
        console.error('Canvas element dailyTrendChart not found');
        return;
    }

    console.log('Canvas found, rendering trend chart');
    const labels = data.map(d => d.date);
    const durations = data.map(d => d.total_duration);
    const calories = data.map(d => d.total_calories);
    const counts = data.map(d => d.count);

    try {
        new Chart(ctx, {
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
        console.log('Daily trend chart rendered successfully');
    } catch (error) {
        console.error('Error rendering daily trend chart:', error);
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
