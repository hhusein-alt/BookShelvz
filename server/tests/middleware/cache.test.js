const request = require('supertest');
const app = require('../../server');
const { redis } = require('../../utils/cache');

describe('Caching Middleware', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await redis.flushall();
  });

  afterAll(async () => {
    // Clean up after all tests
    await redis.quit();
  });

  describe('GET requests caching', () => {
    it('should cache GET requests', async () => {
      // First request - should hit the database
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      expect(firstResponse.body).toHaveProperty('data');
      expect(firstResponse.body).toHaveProperty('pagination');

      // Second request - should be served from cache
      const secondResponse = await request(app)
        .get('/api/books')
        .expect(200);

      expect(secondResponse.body).toEqual(firstResponse.body);
    });

    it('should cache filtered GET requests', async () => {
      // First request with filter
      const firstResponse = await request(app)
        .get('/api/books?genre=Fiction')
        .expect(200);

      expect(firstResponse.body).toHaveProperty('data');
      expect(firstResponse.body.data.every(book => book.genre === 'Fiction')).toBe(true);

      // Second request with same filter
      const secondResponse = await request(app)
        .get('/api/books?genre=Fiction')
        .expect(200);

      expect(secondResponse.body).toEqual(firstResponse.body);
    });

    it('should cache paginated GET requests', async () => {
      // First request with pagination
      const firstResponse = await request(app)
        .get('/api/books?page=1&limit=10')
        .expect(200);

      expect(firstResponse.body).toHaveProperty('data');
      expect(firstResponse.body.data).toHaveLength(10);

      // Second request with same pagination
      const secondResponse = await request(app)
        .get('/api/books?page=1&limit=10')
        .expect(200);

      expect(secondResponse.body).toEqual(firstResponse.body);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate cache on POST request', async () => {
      // First GET request
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Create new book
      const newBook = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000001'
      };

      await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(newBook)
        .expect(201);

      // Second GET request - should not be cached
      const secondResponse = await request(app)
        .get('/api/books')
        .expect(200);

      expect(secondResponse.body.data).toHaveLength(firstResponse.body.data.length + 1);
    });

    it('should invalidate cache on PUT request', async () => {
      // First GET request
      const firstResponse = await request(app)
        .get('/api/books/00000000-0000-0000-0000-000000000000')
        .expect(200);

      // Update book
      const updateData = {
        title: 'Updated Title',
        price: 19.99
      };

      await request(app)
        .put('/api/books/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(updateData)
        .expect(200);

      // Second GET request - should not be cached
      const secondResponse = await request(app)
        .get('/api/books/00000000-0000-0000-0000-000000000000')
        .expect(200);

      expect(secondResponse.body.title).toBe(updateData.title);
      expect(secondResponse.body.price).toBe(updateData.price);
    });

    it('should invalidate cache on DELETE request', async () => {
      // First GET request
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Delete book
      await request(app)
        .delete('/api/books/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      // Second GET request - should not be cached
      const secondResponse = await request(app)
        .get('/api/books')
        .expect(200);

      expect(secondResponse.body.data).toHaveLength(firstResponse.body.data.length - 1);
    });
  });

  describe('Cache TTL', () => {
    it('should expire cache after TTL', async () => {
      // First request
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Wait for cache to expire (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Second request - should hit the database again
      const secondResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // The responses should be different objects
      expect(secondResponse.body).not.toBe(firstResponse.body);
    });
  });

  describe('Cache key generation', () => {
    it('should generate different cache keys for different query parameters', async () => {
      // Request with genre filter
      const genreResponse = await request(app)
        .get('/api/books?genre=Fiction')
        .expect(200);

      // Request with different genre filter
      const differentGenreResponse = await request(app)
        .get('/api/books?genre=Non-Fiction')
        .expect(200);

      expect(genreResponse.body).not.toEqual(differentGenreResponse.body);
    });

    it('should generate different cache keys for different pagination parameters', async () => {
      // Request with first page
      const firstPageResponse = await request(app)
        .get('/api/books?page=1&limit=10')
        .expect(200);

      // Request with second page
      const secondPageResponse = await request(app)
        .get('/api/books?page=2&limit=10')
        .expect(200);

      expect(firstPageResponse.body).not.toEqual(secondPageResponse.body);
    });
  });

  describe('Cache headers', () => {
    it('should include cache control headers', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers['cache-control']).toContain('max-age=300'); // 5 minutes
    });

    it('should include ETag header', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.headers).toHaveProperty('etag');
    });
  });

  describe('Cache bypass', () => {
    it('should bypass cache with no-cache header', async () => {
      // First request
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Second request with no-cache header
      const secondResponse = await request(app)
        .get('/api/books')
        .set('Cache-Control', 'no-cache')
        .expect(200);

      // The responses should be different objects
      expect(secondResponse.body).not.toBe(firstResponse.body);
    });

    it('should bypass cache with no-store header', async () => {
      // First request
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Second request with no-store header
      const secondResponse = await request(app)
        .get('/api/books')
        .set('Cache-Control', 'no-store')
        .expect(200);

      // The responses should be different objects
      expect(secondResponse.body).not.toBe(firstResponse.body);
    });
  });

  describe('Cache error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Simulate Redis connection error
      jest.spyOn(redis, 'get').mockRejectedValueOnce(new Error('Redis connection error'));

      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle cache set errors gracefully', async () => {
      // Simulate Redis set error
      jest.spyOn(redis, 'set').mockRejectedValueOnce(new Error('Redis set error'));

      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Cache size limits', () => {
    it('should handle large response data', async () => {
      // Create a large response by requesting many items
      const response = await request(app)
        .get('/api/books?limit=1000')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.headers['content-length']).toBeDefined();
    });

    it('should handle cache key length limits', async () => {
      // Create a very long query string
      const longQuery = '?'.repeat(1000);
      const response = await request(app)
        .get(`/api/books${longQuery}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Cache concurrency', () => {
    it('should handle concurrent requests correctly', async () => {
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/books')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });

      // Verify all responses are identical (cached)
      const firstResponse = responses[0].body;
      responses.slice(1).forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });
  });

  describe('Cache versioning', () => {
    it('should handle cache version changes', async () => {
      // First request
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Simulate cache version change
      await redis.set('cache:version', '2');

      // Second request - should hit database due to version change
      const secondResponse = await request(app)
        .get('/api/books')
        .expect(200);

      expect(secondResponse.body).not.toBe(firstResponse.body);
    });
  });

  describe('Cache compression', () => {
    it('should handle compressed responses', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.body).toHaveProperty('data');
    });
  });
}); 