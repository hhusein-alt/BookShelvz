const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Validation Middleware', () => {
  let testUser;

  beforeAll(async () => {
    // Create test user
    const { data: user, error } = await supabase.auth.signUp({
      email: 'validate-test@example.com',
      password: 'testpassword123'
    });
    if (error) throw error;
    testUser = user;
  });

  afterAll(async () => {
    // Clean up test user
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('User Input Validation', () => {
    describe('Registration Validation', () => {
      it('should validate email format', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            password: 'validpassword123'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should validate password requirements', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'valid@example.com',
            password: 'short'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('password');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('required');
      });
    });

    describe('Book Validation', () => {
      it('should validate book creation data', async () => {
        const response = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            title: '', // Invalid empty title
            author: 'Test Author',
            price: -10 // Invalid negative price
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('title');
        expect(response.body.error).toContain('price');
      });

      it('should validate book update data', async () => {
        const response = await request(app)
          .put('/api/books/123')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            price: 'invalid' // Invalid price format
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('price');
      });

      it('should validate ISBN format', async () => {
        const response = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            title: 'Test Book',
            author: 'Test Author',
            isbn: 'invalid-isbn'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('ISBN');
      });
    });

    describe('Order Validation', () => {
      it('should validate order creation data', async () => {
        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            items: [], // Invalid empty items
            shipping_address: {
              street: 'Test Street',
              // Missing required fields
            }
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('items');
        expect(response.body.error).toContain('shipping_address');
      });

      it('should validate payment information', async () => {
        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            items: [{ book_id: '123', quantity: 1 }],
            shipping_address: {
              street: 'Test Street',
              city: 'Test City',
              country: 'Test Country',
              postal_code: '12345'
            },
            payment: {
              card_number: '1234' // Invalid card number
            }
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('payment');
      });
    });

    describe('Search Validation', () => {
      it('should validate search parameters', async () => {
        const response = await request(app)
          .get('/api/books/search')
          .query({
            min_price: 'invalid',
            max_price: -10,
            page: 0
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('price');
        expect(response.body.error).toContain('page');
      });

      it('should validate filter parameters', async () => {
        const response = await request(app)
          .get('/api/books/search')
          .query({
            genre: 'invalid-genre',
            sort: 'invalid-sort'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('genre');
        expect(response.body.error).toContain('sort');
      });
    });

    describe('Profile Validation', () => {
      it('should validate profile update data', async () => {
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            name: '', // Invalid empty name
            phone: 'invalid-phone',
            preferences: {
              notifications: 'invalid-value'
            }
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('name');
        expect(response.body.error).toContain('phone');
        expect(response.body.error).toContain('preferences');
      });

      it('should validate email update', async () => {
        const response = await request(app)
          .put('/api/users/email')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            email: 'invalid-email',
            password: 'short'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
        expect(response.body.error).toContain('password');
      });
    });

    describe('Input Sanitization', () => {
      it('should sanitize user input', async () => {
        const response = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            title: '<script>alert("xss")</script>Test Book',
            description: '  Extra spaces  ',
            author: 'Test Author<script>'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('sanitized');
      });

      it('should handle special characters', async () => {
        const response = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            title: 'Book with special chars: !@#$%^&*()',
            author: 'Author with special chars: !@#$%^&*()'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('special characters');
      });
    });

    describe('File Upload Validation', () => {
      it('should validate file types', async () => {
        const response = await request(app)
          .post('/api/books/cover')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .attach('cover', 'test.txt')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('file type');
      });

      it('should validate file size', async () => {
        const response = await request(app)
          .post('/api/books/cover')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .attach('cover', 'large-image.jpg')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('file size');
      });
    });
  });
}); 