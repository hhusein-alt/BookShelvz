const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Bookmarks API', () => {
  let testUser;
  let testBook;
  let testBookmark;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'bookmark-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: 'Bookmark Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000003'
      })
      .select()
      .single();
    if (bookError) throw bookError;
    testBook = book;

    // Create test bookmark
    const { data: bookmark, error: bookmarkError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: testUser.id,
        book_id: testBook.id,
        page_number: 42,
        note: 'Test bookmark note',
        color: '#FF0000'
      })
      .select()
      .single();
    if (bookmarkError) throw bookmarkError;
    testBookmark = bookmark;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('bookmarks').delete().eq('id', testBookmark.id);
    await supabase.from('books').delete().eq('id', testBook.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('GET /api/bookmarks', () => {
    it('should get user bookmarks', async () => {
      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('page_number');
      expect(response.body.data[0]).toHaveProperty('note');
    });

    it('should filter bookmarks by book', async () => {
      const response = await request(app)
        .get(`/api/bookmarks?book_id=${testBook.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(bm => bm.book_id === testBook.id)).toBe(true);
    });

    it('should paginate bookmarks', async () => {
      // Create multiple bookmarks
      const bookmarks = await Promise.all(
        Array(15).fill().map((_, i) => 
          supabase
            .from('bookmarks')
            .insert({
              user_id: testUser.id,
              book_id: testBook.id,
              page_number: i + 1,
              note: `Test bookmark ${i + 1}`
            })
            .select()
            .single()
        )
      );

      // Test pagination
      const response = await request(app)
        .get('/api/bookmarks?page=1&limit=10')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');

      // Clean up
      await supabase
        .from('bookmarks')
        .delete()
        .in('id', bookmarks.map(b => b.data.id));
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/bookmarks')
        .expect(401);
    });
  });

  describe('GET /api/bookmarks/:id', () => {
    it('should get bookmark details', async () => {
      const response = await request(app)
        .get(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBookmark.id);
      expect(response.body).toHaveProperty('page_number');
      expect(response.body).toHaveProperty('note');
      expect(response.body).toHaveProperty('color');
      expect(response.body).toHaveProperty('book');
    });

    it('should return 404 for non-existent bookmark', async () => {
      await request(app)
        .get('/api/bookmarks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(404);
    });

    it('should return 403 for unauthorized access', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other-bookmark@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .get(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .expect(403);

      // Clean up
      await supabase.auth.admin.deleteUser(otherUser.id);
    });
  });

  describe('POST /api/bookmarks', () => {
    it('should create new bookmark', async () => {
      const bookmarkData = {
        book_id: testBook.id,
        page_number: 100,
        note: 'New test bookmark',
        color: '#00FF00'
      };

      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(bookmarkData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.page_number).toBe(bookmarkData.page_number);
      expect(response.body.note).toBe(bookmarkData.note);
      expect(response.body.color).toBe(bookmarkData.color);

      // Clean up
      await supabase.from('bookmarks').delete().eq('id', response.body.id);
    });

    it('should validate bookmark data', async () => {
      const invalidBookmark = {
        book_id: testBook.id,
        page_number: -1, // Invalid page number
        note: 'Test'
      };

      await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(invalidBookmark)
        .expect(400);
    });

    it('should prevent duplicate bookmarks on same page', async () => {
      const bookmarkData = {
        book_id: testBook.id,
        page_number: 42, // Same page as testBookmark
        note: 'Duplicate bookmark'
      };

      await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(bookmarkData)
        .expect(409);
    });
  });

  describe('PUT /api/bookmarks/:id', () => {
    it('should update bookmark', async () => {
      const updateData = {
        page_number: 50,
        note: 'Updated bookmark note',
        color: '#0000FF'
      };

      const response = await request(app)
        .put(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.page_number).toBe(updateData.page_number);
      expect(response.body.note).toBe(updateData.note);
      expect(response.body.color).toBe(updateData.color);
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        page_number: 0 // Invalid page number
      };

      await request(app)
        .put(`/api/bookmarks/${testBookmark.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(invalidUpdate)
        .expect(400);
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    it('should delete bookmark', async () => {
      // Create a bookmark to delete
      const { data: bookmark } = await supabase
        .from('bookmarks')
        .insert({
          user_id: testUser.id,
          book_id: testBook.id,
          page_number: 200,
          note: 'Bookmark to delete'
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(204);

      // Verify deletion
      const { data: deletedBookmark } = await supabase
        .from('bookmarks')
        .select()
        .eq('id', bookmark.id)
        .single();

      expect(deletedBookmark).toBeNull();
    });

    it('should return 404 for non-existent bookmark', async () => {
      await request(app)
        .delete('/api/bookmarks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(404);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk bookmark creation efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 bookmarks
      const bookmarks = await Promise.all(
        Array(100).fill().map((_, i) => 
          supabase
            .from('bookmarks')
            .insert({
              user_id: testUser.id,
              book_id: testBook.id,
              page_number: i + 1,
              note: `Performance test bookmark ${i + 1}`
            })
            .select()
            .single()
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      // Clean up
      await supabase
        .from('bookmarks')
        .delete()
        .in('id', bookmarks.map(b => b.data.id));
    });

    it('should handle concurrent bookmark requests', async () => {
      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
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
}); 