const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Error Handling Middleware', () => {
  let testUser;

  beforeAll(async () => {
    // Create test user
    const { data: user, error } = await supabase.auth.signUp({
      email: 'error-test@example.com',
      password: 'testpassword123'
    });
    if (error) throw error;
    testUser = user;
  });

  afterAll(async () => {
    // Clean up test user
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('HTTP Error Handling', () => {
    it('should handle 404 Not Found', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Not Found');
    });

    it('should handle 405 Method Not Allowed', async () => {
      const response = await request(app)
        .patch('/api/books')
        .expect(405);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Method Not Allowed');
    });

    it('should handle 413 Payload Too Large', async () => {
      const largePayload = 'x'.repeat(1024 * 1024); // 1MB
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({ data: largePayload })
        .expect(413);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Payload Too Large');
    });

    it('should handle 429 Too Many Requests', async () => {
      const requests = Array(101).fill().map(() => 
        request(app)
          .get('/api/books')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
      );

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body).toHaveProperty('error');
      expect(lastResponse.body.error).toContain('Too Many Requests');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Simulate database connection error
      jest.spyOn(supabase, 'from').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
        .get('/api/books')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Database error');
    });

    it('should handle unique constraint violations', async () => {
      // Create a book with duplicate ISBN
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          title: 'Test Book',
          author: 'Test Author',
          isbn: '978-0000000000'
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should handle foreign key violations', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          items: [{ book_id: 'nonexistent-id', quantity: 1 }]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('invalid reference');
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle invalid token format', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'InvalidTokenFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token format');
    });

    it('should handle expired token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer expired.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Token expired');
    });

    it('should handle missing token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No token provided');
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle invalid request body', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid request body');
    });

    it('should handle validation errors with multiple fields', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          title: '',
          price: -10,
          isbn: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('title');
      expect(response.body.errors).toHaveProperty('price');
      expect(response.body.errors).toHaveProperty('isbn');
    });
  });

  describe('File Upload Error Handling', () => {
    it('should handle file size limit exceeded', async () => {
      const response = await request(app)
        .post('/api/books/cover')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .attach('cover', 'large-file.jpg')
        .expect(413);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File too large');
    });

    it('should handle invalid file type', async () => {
      const response = await request(app)
        .post('/api/books/cover')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .attach('cover', 'test.txt')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid file type');
    });

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/books/cover')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No file uploaded');
    });
  });

  describe('External Service Error Handling', () => {
    it('should handle payment service errors', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          items: [{ book_id: '123', quantity: 1 }],
          payment: {
            card_number: '4111111111111111',
            expiry: '12/25',
            cvv: '123'
          }
        })
        .expect(502);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Payment service error');
    });

    it('should handle email service errors', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(502);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Email service error');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response format', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include stack trace in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('stack');

      process.env.NODE_ENV = 'test';
    });

    it('should not include stack trace in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).not.toHaveProperty('stack');

      process.env.NODE_ENV = 'test';
    });
  });
}); 