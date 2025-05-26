const request = require('supertest');
const app = require('../server');
const { createTestBook } = require('./setup');

describe('Books API', () => {
  let testBook;

  beforeEach(async () => {
    testBook = await createTestBook();
  });

  describe('GET /api/books', () => {
    it('should return all books with pagination', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter books by genre', async () => {
      const response = await request(app)
        .get('/api/books?genre=Fiction')
        .expect(200);

      expect(response.body.data.every(book => book.genre === 'Fiction')).toBe(true);
    });

    it('should search books by title or author', async () => {
      const response = await request(app)
        .get('/api/books?search=Test')
        .expect(200);

      expect(response.body.data.some(book => 
        book.title.includes('Test') || book.author.includes('Test')
      )).toBe(true);
    });
  });

  describe('GET /api/books/:id', () => {
    it('should return a book by id', async () => {
      const response = await request(app)
        .get(`/api/books/${testBook.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBook.id);
      expect(response.body).toHaveProperty('title', testBook.title);
    });

    it('should return 404 for non-existent book', async () => {
      await request(app)
        .get('/api/books/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /api/books', () => {
    it('should create a new book (admin only)', async () => {
      const newBook = {
        title: 'New Test Book',
        author: 'New Test Author',
        description: 'New Test Description',
        genre: 'Fiction',
        price: 19.99,
        isbn: '978-0000000001'
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(newBook)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', newBook.title);
    });

    it('should return 403 for non-admin users', async () => {
      const newBook = {
        title: 'New Test Book',
        author: 'New Test Author',
        description: 'New Test Description',
        genre: 'Fiction',
        price: 19.99,
        isbn: '978-0000000001'
      };

      await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(newBook)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/books/:id', () => {
    it('should update a book (admin only)', async () => {
      const updates = {
        title: 'Updated Test Book',
        price: 29.99
      };

      const response = await request(app)
        .put(`/api/books/${testBook.id}`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('title', updates.title);
      expect(response.body).toHaveProperty('price', updates.price);
    });

    it('should return 403 for non-admin users', async () => {
      const updates = {
        title: 'Updated Test Book',
        price: 29.99
      };

      await request(app)
        .put(`/api/books/${testBook.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(updates)
        .expect(403);
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should delete a book (admin only)', async () => {
      await request(app)
        .delete(`/api/books/${testBook.id}`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(204);

      // Verify book is deleted
      await request(app)
        .get(`/api/books/${testBook.id}`)
        .expect(404);
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .delete(`/api/books/${testBook.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(403);
    });
  });

  describe('POST /api/books/:id/progress', () => {
    it('should update reading progress', async () => {
      const progress = {
        progress: 50
      };

      const response = await request(app)
        .post(`/api/books/${testBook.id}/progress`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(progress)
        .expect(200);

      expect(response.body).toHaveProperty('progress', progress.progress);
    });

    it('should validate progress value', async () => {
      const progress = {
        progress: 150 // Invalid value
      };

      await request(app)
        .post(`/api/books/${testBook.id}/progress`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(progress)
        .expect(400);
    });
  });
}); 