const request = require('supertest');
const app = require('../../server');
const { createTestBook, createTestOrder } = require('../setup');

describe('Route Handlers Integration', () => {
  describe('Middleware Integration', () => {
    it('should apply authentication middleware to protected routes', async () => {
      // Test without token
      await request(app)
        .get('/api/users/profile')
        .expect(401);

      // Test with invalid token
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      // Test with valid token
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });

    it('should apply validation middleware to request bodies', async () => {
      // Test with invalid book data
      await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({
          title: '', // Invalid: empty title
          price: -10 // Invalid: negative price
        })
        .expect(400);

      // Test with valid book data
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          genre: 'Fiction',
          price: 9.99,
          isbn: '978-0000000001'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should apply caching middleware to GET requests', async () => {
      // First request
      const firstResponse = await request(app)
        .get('/api/books')
        .expect(200);

      // Second request should be cached
      const secondResponse = await request(app)
        .get('/api/books')
        .expect(200);

      expect(secondResponse.body).toEqual(firstResponse.body);
    });
  });

  describe('Service Integration', () => {
    it('should handle database operations through services', async () => {
      // Create a test book
      const testBook = await createTestBook();

      // Test book retrieval
      const response = await request(app)
        .get(`/api/books/${testBook.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBook.id);
      expect(response.body).toHaveProperty('title', testBook.title);
    });

    it('should handle RPC calls through services', async () => {
      // Test user stats
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_books_read');
      expect(response.body).toHaveProperty('total_pages_read');
      expect(response.body).toHaveProperty('total_bookmarks');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid UUID
      await request(app)
        .get('/api/books/invalid-uuid')
        .expect(400);
    });

    it('should handle service errors gracefully', async () => {
      // Test with non-existent book
      await request(app)
        .get('/api/books/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should handle validation errors gracefully', async () => {
      // Test with invalid order data
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({
          items: [{
            book_id: 'invalid-uuid',
            quantity: 0
          }]
        })
        .expect(400);
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for successful requests', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Request Processing', () => {
    it('should handle query parameters correctly', async () => {
      const response = await request(app)
        .get('/api/books?genre=Fiction&page=1&limit=10')
        .expect(200);

      expect(response.body.data.every(book => book.genre === 'Fiction')).toBe(true);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should handle request body correctly', async () => {
      const orderData = {
        items: [{
          book_id: '00000000-0000-0000-0000-000000000000',
          quantity: 2
        }],
        payment_method: 'credit_card',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zip_code: '12345'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(2);
    });
  });
}); 