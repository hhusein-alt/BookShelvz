const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Books API', () => {
  let testUser;
  let testAdmin;
  let testBooks;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'books-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test admin
    const { data: admin, error: adminError } = await supabase.auth.signUp({
      email: 'admin-books@example.com',
      password: 'testpassword123'
    });
    if (adminError) throw adminError;
    testAdmin = admin;

    // Set admin role
    await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('user_id', admin.id);

    // Create test books
    const books = [
      {
        title: 'Test Book 1',
        author: 'Test Author 1',
        description: 'Test Description 1',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000007',
        tags: ['test', 'fiction']
      },
      {
        title: 'Test Book 2',
        author: 'Test Author 2',
        description: 'Test Description 2',
        genre: 'Non-Fiction',
        price: 19.99,
        isbn: '978-0000000008',
        tags: ['test', 'non-fiction']
      }
    ];

    const { data, error } = await supabase
      .from('books')
      .insert(books)
      .select();

    if (error) throw error;
    testBooks = data;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('books').delete().in('id', testBooks.map(book => book.id));
    await supabase.auth.admin.deleteUser(testUser.id);
    await supabase.auth.admin.deleteUser(testAdmin.id);
  });

  describe('GET /api/books', () => {
    it('should get all books', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter books by genre', async () => {
      const response = await request(app)
        .get('/api/books?genre=Fiction')
        .expect(200);

      expect(response.body.data.every(book => book.genre === 'Fiction')).toBe(true);
    });

    it('should filter books by price range', async () => {
      const response = await request(app)
        .get('/api/books?min_price=10&max_price=20')
        .expect(200);

      expect(response.body.data.every(book => 
        book.price >= 10 && book.price <= 20
      )).toBe(true);
    });

    it('should search books by title or author', async () => {
      const response = await request(app)
        .get('/api/books?search=Test Book 1')
        .expect(200);

      expect(response.body.data[0].title).toBe('Test Book 1');
    });

    it('should sort books by price', async () => {
      const response = await request(app)
        .get('/api/books?sort=price&order=asc')
        .expect(200);

      const prices = response.body.data.map(book => book.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });
  });

  describe('GET /api/books/:id', () => {
    it('should get book by id', async () => {
      const response = await request(app)
        .get(`/api/books/${testBooks[0].id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBooks[0].id);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('description');
    });

    it('should return 404 for non-existent book', async () => {
      await request(app)
        .get('/api/books/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /api/books', () => {
    it('should create new book (admin only)', async () => {
      const newBook = {
        title: 'New Test Book',
        author: 'New Test Author',
        description: 'New Test Description',
        genre: 'Fiction',
        price: 14.99,
        isbn: '978-0000000009',
        tags: ['test', 'new']
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(newBook)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newBook.title);
      expect(response.body.author).toBe(newBook.author);

      // Clean up
      await supabase.from('books').delete().eq('id', response.body.id);
    });

    it('should prevent non-admin from creating books', async () => {
      const newBook = {
        title: 'Unauthorized Book',
        author: 'Test Author',
        price: 9.99
      };

      await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(newBook)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const invalidBook = {
        title: '', // Empty title
        price: -10 // Invalid price
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(invalidBook)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('title');
      expect(response.body.error).toContain('price');
    });
  });

  describe('PUT /api/books/:id', () => {
    it('should update book (admin only)', async () => {
      const updateData = {
        title: 'Updated Test Book',
        price: 24.99
      };

      const response = await request(app)
        .put(`/api/books/${testBooks[0].id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.price).toBe(updateData.price);
    });

    it('should prevent non-admin from updating books', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      await request(app)
        .put(`/api/books/${testBooks[0].id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(updateData)
        .expect(403);
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        price: 'invalid' // Invalid price format
      };

      const response = await request(app)
        .put(`/api/books/${testBooks[0].id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('price');
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should delete book (admin only)', async () => {
      // Create a book to delete
      const { data: book } = await supabase
        .from('books')
        .insert({
          title: 'Book to Delete',
          author: 'Test Author',
          price: 9.99,
          isbn: '978-0000000010'
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/books/${book.id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(204);

      // Verify deletion
      const { data: deletedBook } = await supabase
        .from('books')
        .select()
        .eq('id', book.id)
        .single();

      expect(deletedBook).toBeNull();
    });

    it('should prevent non-admin from deleting books', async () => {
      await request(app)
        .delete(`/api/books/${testBooks[0].id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(403);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk book creation efficiently', async () => {
      const books = Array(50).fill().map((_, i) => ({
        title: `Performance Test Book ${i}`,
        author: `Test Author ${i}`,
        description: `Test Description ${i}`,
        genre: 'Test',
        price: 9.99,
        isbn: `978-0000000${i.toString().padStart(3, '0')}`,
        tags: ['test', 'performance']
      }));

      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('books')
        .insert(books)
        .select();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await supabase
        .from('books')
        .delete()
        .in('id', data.map(book => book.id));
    });

    it('should handle concurrent book requests', async () => {
      const requests = Array(20).fill().map(() => 
        request(app).get('/api/books')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in search', async () => {
      const response = await request(app)
        .get('/api/books?search=1%27%20OR%20%271%27=%271')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should sanitize book data', async () => {
      const maliciousBook = {
        title: '<script>alert("xss")</script>Test Book',
        description: '  Extra spaces  ',
        author: 'Test Author<script>'
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(maliciousBook)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('sanitized');
    });

    it('should validate ISBN format', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
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
}); 