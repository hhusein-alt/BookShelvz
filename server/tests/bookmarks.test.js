const request = require('supertest');
const app = require('../server');
const { createTestBook } = require('./setup');

describe('Bookmarks API', () => {
  let testBook;
  let testBookmark;

  beforeEach(async () => {
    testBook = await createTestBook();
    
    // Create a test bookmark
    const response = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${global.testUserToken}`)
      .send({
        book_id: testBook.id,
        page: 50,
        note: 'Test bookmark note'
      });

    testBookmark = response.body;
  });

  describe('GET /api/bookmarks', () => {
    it('should return all bookmarks with pagination', async () => {
      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter bookmarks by book', async () => {
      const response = await request(app)
        .get(`/api/bookmarks?book_id=${testBook.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body.data.every(bookmark => 
        bookmark.book_id === testBook.id
      )).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/bookmarks')
        .expect(401);
    });
  });

  describe('GET /api/bookmarks/:id', () => {
    it('should return a bookmark by id', async () => {
      const response = await request(app)
        .get(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBookmark.id);
      expect(response.body).toHaveProperty('book_id', testBook.id);
      expect(response.body).toHaveProperty('page', 50);
      expect(response.body).toHaveProperty('note', 'Test bookmark note');
    });

    it('should return 404 for non-existent bookmark', async () => {
      await request(app)
        .get('/api/bookmarks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/bookmarks/${testBookmark.id}`)
        .expect(401);
    });
  });

  describe('POST /api/bookmarks', () => {
    it('should create a new bookmark', async () => {
      const newBookmark = {
        book_id: testBook.id,
        page: 100,
        note: 'New test bookmark'
      };

      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(newBookmark)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('book_id', newBookmark.book_id);
      expect(response.body).toHaveProperty('page', newBookmark.page);
      expect(response.body).toHaveProperty('note', newBookmark.note);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/bookmarks')
        .send({
          book_id: testBook.id,
          page: 100
        })
        .expect(401);
    });
  });

  describe('PUT /api/bookmarks/:id', () => {
    it('should update a bookmark', async () => {
      const updates = {
        page: 75,
        note: 'Updated bookmark note'
      };

      const response = await request(app)
        .put(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('page', updates.page);
      expect(response.body).toHaveProperty('note', updates.note);
    });

    it('should return 404 for non-existent bookmark', async () => {
      await request(app)
        .put('/api/bookmarks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({ page: 75 })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/bookmarks/${testBookmark.id}`)
        .send({ page: 75 })
        .expect(401);
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    it('should delete a bookmark', async () => {
      await request(app)
        .delete(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(204);

      // Verify bookmark is deleted
      await request(app)
        .get(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent bookmark', async () => {
      await request(app)
        .delete('/api/bookmarks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/bookmarks/${testBookmark.id}`)
        .expect(401);
    });
  });

  describe('GET /api/bookmarks/book/:bookId', () => {
    it('should return bookmarks for a specific book', async () => {
      const response = await request(app)
        .get(`/api/bookmarks/book/${testBook.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(bookmark => 
        bookmark.book_id === testBook.id
      )).toBe(true);
    });

    it('should return empty array for book with no bookmarks', async () => {
      const newBook = await createTestBook();
      
      const response = await request(app)
        .get(`/api/bookmarks/book/${newBook.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/bookmarks/book/${testBook.id}`)
        .expect(401);
    });
  });
}); 