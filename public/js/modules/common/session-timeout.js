/**
 * Session Timeout Client-side Handler
 * Monitors user activity and shows warning when approaching timeout
 */

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in (optional - can add by checking page content)
    const userElement = document.querySelector('[data-user-logged-in]');
    if (!userElement) {
        return; // Not logged in, skip
    }

    // Configuration
    const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    const WARNING_TIME = 25 * 60 * 1000; // Show warning at 25 minutes
    const CHECK_INTERVAL = 1000; // Check every second

    let lastActivityTime = Date.now();
    let warningShown = false;
    let warningTimeout = null;

    /**
     * Update last activity time on user interaction
     */
    function resetActivityTimer() {
        lastActivityTime = Date.now();
        warningShown = false;
        hideSessionWarning();

        // Clear any pending warning timeout
        if (warningTimeout) {
            clearTimeout(warningTimeout);
        }
    }

    /**
     * Show session timeout warning modal
     */
    function showSessionWarning() {
        if (warningShown) return;
        warningShown = true;

        const warning = document.createElement('div');
        warning.id = 'session-timeout-warning';
        warning.className = 'session-warning-modal';
        warning.innerHTML = `
            <div class="session-warning-content">
                <h3>⚠️ Session Timeout Warning</h3>
                <p>Your session will expire due to inactivity in <span id="timeout-countdown">5</span> minutes.</p>
                <p>Click "Stay Logged In" to continue your session.</p>
                <button id="stay-logged-in-btn" class="btn btn-primary">Stay Logged In</button>
                <button id="logout-now-btn" class="btn btn-secondary">Logout Now</button>
            </div>
        `;

        document.body.appendChild(warning);

        // Add event listeners
        document.getElementById('stay-logged-in-btn').addEventListener('click', () => {
            resetActivityTimer();
        });

        document.getElementById('logout-now-btn').addEventListener('click', () => {
            window.location.href = '/auth/logout';
        });

        // Update countdown every second
        let remainingSeconds = 5 * 60; // 5 minutes
        const countdownInterval = setInterval(() => {
            remainingSeconds--;
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            const countdownEl = document.getElementById('timeout-countdown');
            if (countdownEl) {
                countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);

        // Store interval ID for cleanup
        warning.countdownInterval = countdownInterval;
    }

    /**
     * Hide session timeout warning
     */
    function hideSessionWarning() {
        const warning = document.getElementById('session-timeout-warning');
        if (warning) {
            if (warning.countdownInterval) {
                clearInterval(warning.countdownInterval);
            }
            warning.remove();
        }
    }

    /**
     * Monitor user activity
     */
    function monitorActivity() {
        // Track user interactions
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, resetActivityTimer, { passive: true });
        });

        // Check idle time periodically
        setInterval(() => {
            const timeSinceLastActivity = Date.now() - lastActivityTime;

            // If approaching timeout, show warning
            if (timeSinceLastActivity >= WARNING_TIME && timeSinceLastActivity < IDLE_TIMEOUT && !warningShown) {
                showSessionWarning();
            }

            // If timeout exceeded, redirect to login
            if (timeSinceLastActivity >= IDLE_TIMEOUT) {
                hideSessionWarning();
                window.location.href = '/auth/login?timeout=true';
            }
        }, CHECK_INTERVAL);
    }

    // Start monitoring activity
    monitorActivity();

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        hideSessionWarning();
    });
});
