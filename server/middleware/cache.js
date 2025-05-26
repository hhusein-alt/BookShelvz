const Redis = require('ioredis');
const logger = require('../utils/logger');

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  logger.info('Redis Client Connected');
});

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redis.get(key);
      
      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        return res.json(data);
      }

      // Store original res.json
      const originalJson = res.json;

      // Override res.json method
      res.json = function(body) {
        redis.setex(key, duration, JSON.stringify(body))
          .catch(err => logger.error('Redis Set Error:', err));
        
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Cache Middleware Error:', error);
      next();
    }
  };
};

// Cache invalidation
const invalidateCache = async (pattern) => {
  try {
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info(`Invalidated cache for pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error('Cache Invalidation Error:', error);
  }
};

// Cache statistics
const getCacheStats = async () => {
  try {
    const info = await redis.info();
    const keys = await redis.keys('cache:*');
    
    return {
      totalKeys: keys.length,
      memoryUsage: info.split('\r\n')
        .find(line => line.startsWith('used_memory_human'))
        ?.split(':')[1] || 'N/A',
      hitRate: await calculateHitRate()
    };
  } catch (error) {
    logger.error('Cache Stats Error:', error);
    return null;
  }
};

// Calculate cache hit rate
const calculateHitRate = async () => {
  try {
    const info = await redis.info();
    const hits = parseInt(info.split('\r\n')
      .find(line => line.startsWith('keyspace_hits'))
      ?.split(':')[1] || '0');
    const misses = parseInt(info.split('\r\n')
      .find(line => line.startsWith('keyspace_misses'))
      ?.split(':')[1] || '0');
    
    const total = hits + misses;
    return total > 0 ? (hits / total * 100).toFixed(2) + '%' : '0%';
  } catch (error) {
    logger.error('Hit Rate Calculation Error:', error);
    return 'N/A';
  }
};

module.exports = {
  cache,
  invalidateCache,
  getCacheStats,
  redis
}; 