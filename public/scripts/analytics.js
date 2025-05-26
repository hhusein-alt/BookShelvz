class Analytics {
    constructor() {
        this.events = [];
        this.performanceMetrics = {};
        this.isEnabled = true;
        this.init();
    }

    init() {
        // Initialize performance monitoring
        this.initPerformanceMonitoring();
        
        // Initialize error tracking
        this.initErrorTracking();
        
        // Initialize user behavior tracking
        this.initUserBehaviorTracking();
    }

    initPerformanceMonitoring() {
        // Track page load performance
        window.addEventListener('load', () => {
            const timing = window.performance.timing;
            this.performanceMetrics = {
                pageLoad: timing.loadEventEnd - timing.navigationStart,
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: performance.getEntriesByType('paint')
                    .find(entry => entry.name === 'first-paint')?.startTime,
                firstContentfulPaint: performance.getEntriesByType('paint')
                    .find(entry => entry.name === 'first-contentful-paint')?.startTime
            };
            this.trackEvent('performance', this.performanceMetrics);
        });

        // Track resource loading performance
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.trackEvent('resource', {
                    name: entry.name,
                    duration: entry.duration,
                    type: entry.initiatorType
                });
            }
        });
        observer.observe({ entryTypes: ['resource'] });
    }

    initErrorTracking() {
        // Track JavaScript errors
        window.addEventListener('error', (event) => {
            this.trackEvent('error', {
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack
            });
        });

        // Track unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackEvent('error', {
                type: 'unhandledrejection',
                message: event.reason?.message || 'Unknown error',
                stack: event.reason?.stack
            });
        });
    }

    initUserBehaviorTracking() {
        // Track page views
        this.trackEvent('pageview', {
            path: window.location.pathname,
            referrer: document.referrer
        });

        // Track user interactions
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('button, a, [role="button"]')) {
                this.trackEvent('interaction', {
                    type: 'click',
                    element: target.tagName.toLowerCase(),
                    text: target.textContent?.trim(),
                    href: target.href,
                    id: target.id,
                    class: target.className
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            this.trackEvent('form', {
                action: form.action,
                method: form.method,
                id: form.id,
                class: form.className
            });
        });

        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
                    this.trackEvent('scroll', { depth: maxScroll });
                }
            }
        });
    }

    trackEvent(category, data) {
        if (!this.isEnabled) return;

        const event = {
            category,
            data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        this.events.push(event);
        this.sendToAnalytics(event);
    }

    async sendToAnalytics(event) {
        try {
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });

            if (!response.ok) {
                console.error('Failed to send analytics:', response.statusText);
            }
        } catch (error) {
            console.error('Error sending analytics:', error);
        }
    }

    getEvents() {
        return this.events;
    }

    getPerformanceMetrics() {
        return this.performanceMetrics;
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }

    clear() {
        this.events = [];
        this.performanceMetrics = {};
    }
}

// Initialize analytics
const analytics = new Analytics();

// Export for use in other scripts
window.analytics = analytics; 