const logger = require('../utils/logger');

// Performance metrics storage
const metrics = {
  requests: new Map(),
  responseTimes: [],
  errors: new Map(),
  resourceUsage: []
};

// Update metrics every minute
setInterval(() => {
  const usage = process.memoryUsage();
  metrics.resourceUsage.push({
    timestamp: Date.now(),
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss
  });

  // Keep only last hour of metrics
  const oneHourAgo = Date.now() - 3600000;
  metrics.resourceUsage = metrics.resourceUsage.filter(m => m.timestamp > oneHourAgo);
}, 60000);

const performanceMiddleware = () => {
  return (req, res, next) => {
    const start = process.hrtime();
    const requestId = req.id || Math.random().toString(36).substring(7);

    // Track request
    metrics.requests.set(requestId, {
      method: req.method,
      url: req.url,
      timestamp: Date.now()
    });

    // Track response time
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;
      
      metrics.responseTimes.push({
        requestId,
        responseTime,
        statusCode: res.statusCode,
        timestamp: Date.now()
      });

      // Keep only last hour of response times
      const oneHourAgo = Date.now() - 3600000;
      metrics.responseTimes = metrics.responseTimes.filter(m => m.timestamp > oneHourAgo);

      // Log slow requests
      if (responseTime > 1000) { // Log requests taking more than 1 second
        logger.warn(`Slow request detected: ${req.method} ${req.url} - ${responseTime.toFixed(2)}ms`);
      }

      // Track errors
      if (res.statusCode >= 400) {
        metrics.errors.set(requestId, {
          statusCode: res.statusCode,
          url: req.url,
          timestamp: Date.now()
        });
      }

      // Clean up request tracking
      metrics.requests.delete(requestId);
    });

    next();
  };
};

// Get performance metrics
const getPerformanceMetrics = (req, res) => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  // Calculate average response time
  const recentResponseTimes = metrics.responseTimes.filter(m => m.timestamp > oneHourAgo);
  const avgResponseTime = recentResponseTimes.length > 0
    ? recentResponseTimes.reduce((sum, m) => sum + m.responseTime, 0) / recentResponseTimes.length
    : 0;

  // Calculate error rate
  const recentErrors = Array.from(metrics.errors.values())
    .filter(e => e.timestamp > oneHourAgo);
  const errorRate = recentResponseTimes.length > 0
    ? (recentErrors.length / recentResponseTimes.length) * 100
    : 0;

  // Get current resource usage
  const currentUsage = process.memoryUsage();

  res.json({
    timestamp: now,
    metrics: {
      requests: {
        active: metrics.requests.size,
        total: recentResponseTimes.length
      },
      performance: {
        avgResponseTime: avgResponseTime.toFixed(2),
        errorRate: errorRate.toFixed(2),
        slowRequests: recentResponseTimes.filter(m => m.responseTime > 1000).length
      },
      resources: {
        current: {
          heapUsed: currentUsage.heapUsed,
          heapTotal: currentUsage.heapTotal,
          external: currentUsage.external,
          rss: currentUsage.rss
        },
        history: metrics.resourceUsage.slice(-10) // Last 10 minutes
      },
      errors: {
        recent: recentErrors.slice(-10), // Last 10 errors
        total: recentErrors.length
      }
    }
  });
};

// Reset metrics (for testing)
const resetMetrics = () => {
  metrics.requests.clear();
  metrics.responseTimes = [];
  metrics.errors.clear();
  metrics.resourceUsage = [];
};

module.exports = {
  performanceMiddleware,
  getPerformanceMetrics,
  resetMetrics
}; 