const NodeCache = require('node-cache');
const { cacheMiddleware, invalidateCache } = require('../../utils/cache');

describe('Cache Utilities', () => {
  let cache;
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    cache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/books',
      query: { page: 1, limit: 10 }
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('Cache Middleware', () => {
    it('should cache GET requests', async () => {
      const data = { books: ['book1', 'book2'] };
      mockResponse.json.mockImplementation(() => data);

      // First request
      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      // Second request should be cached
      mockResponse.json.mockClear();
      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should not cache non-GET requests', async () => {
      mockRequest.method = 'POST';
      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(cache.get(mockRequest.originalUrl)).toBeUndefined();
    });

    it('should generate unique cache keys for different query parameters', async () => {
      const request1 = { ...mockRequest, query: { page: 1, limit: 10 } };
      const request2 = { ...mockRequest, query: { page: 2, limit: 10 } };

      await cacheMiddleware(cache)(request1, mockResponse, nextFunction);
      await cacheMiddleware(cache)(request2, mockResponse, nextFunction);

      expect(cache.get(request1.originalUrl)).toBeDefined();
      expect(cache.get(request2.originalUrl)).toBeDefined();
      expect(cache.get(request1.originalUrl)).not.toEqual(cache.get(request2.originalUrl));
    });

    it('should respect cache TTL', async () => {
      const shortTTLCache = new NodeCache({ stdTTL: 1 }); // 1 second TTL
      await cacheMiddleware(shortTTLCache)(mockRequest, mockResponse, nextFunction);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should make a new request
      mockResponse.json.mockClear();
      await cacheMiddleware(shortTTLCache)(mockRequest, mockResponse, nextFunction);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle cache misses gracefully', async () => {
      const nonExistentKey = '/api/nonexistent';
      mockRequest.originalUrl = nonExistentKey;

      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(cache.get(nonExistentKey)).toBeUndefined();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache for specific key', async () => {
      const key = '/api/books/123';
      cache.set(key, { data: 'test' });

      invalidateCache(cache, key);
      expect(cache.get(key)).toBeUndefined();
    });

    it('should invalidate cache for pattern', async () => {
      const keys = [
        '/api/books/123',
        '/api/books/456',
        '/api/users/789'
      ];

      keys.forEach(key => cache.set(key, { data: 'test' }));

      invalidateCache(cache, '/api/books/*');
      expect(cache.get('/api/books/123')).toBeUndefined();
      expect(cache.get('/api/books/456')).toBeUndefined();
      expect(cache.get('/api/users/789')).toBeDefined();
    });

    it('should handle non-existent keys', () => {
      const key = '/api/nonexistent';
      expect(() => invalidateCache(cache, key)).not.toThrow();
    });
  });

  describe('Cache Headers', () => {
    it('should set cache control headers', async () => {
      mockResponse.setHeader = jest.fn();
      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=300'
      );
    });

    it('should set ETag header', async () => {
      mockResponse.setHeader = jest.fn();
      const data = { books: ['book1', 'book2'] };
      mockResponse.json.mockImplementation(() => data);

      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'ETag',
        expect.any(String)
      );
    });

    it('should handle If-None-Match header', async () => {
      const etag = 'test-etag';
      mockRequest.headers = { 'if-none-match': etag };
      cache.set(mockRequest.originalUrl, { data: 'test', etag });

      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(304);
    });
  });

  describe('Cache Bypass', () => {
    it('should bypass cache with no-cache header', async () => {
      mockRequest.headers = { 'cache-control': 'no-cache' };
      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(cache.get(mockRequest.originalUrl)).toBeUndefined();
    });

    it('should bypass cache with no-store header', async () => {
      mockRequest.headers = { 'cache-control': 'no-store' };
      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(cache.get(mockRequest.originalUrl)).toBeUndefined();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('ksize');
      expect(stats).toHaveProperty('vsize');
    });

    it('should reset cache statistics', () => {
      cache.set('test-key', 'test-value');
      cache.get('test-key');
      cache.get('non-existent-key');

      const statsBefore = cache.getStats();
      expect(statsBefore.hits).toBeGreaterThan(0);
      expect(statsBefore.misses).toBeGreaterThan(0);

      cache.flushStats();
      const statsAfter = cache.getStats();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      const brokenCache = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Cache error');
        }),
        set: jest.fn()
      };

      await cacheMiddleware(brokenCache)(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle invalid cache keys', async () => {
      mockRequest.originalUrl = null;
      await cacheMiddleware(cache)(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });
}); 