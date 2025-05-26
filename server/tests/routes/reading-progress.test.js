const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Reading Progress API', () => {
  let testUser;
  let testBook;
  let testProgress;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'progress-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: 'Progress Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000013',
        total_pages: 300
      })
      .select()
      .single();
    if (bookError) throw bookError;
    testBook = book;

    // Create test progress
    const { data: progress, error: progressError } = await supabase
      .from('reading_progress')
      .insert({
        user_id: testUser.id,
        book_id: testBook.id,
        current_page: 50,
        status: 'reading',
        last_read_at: new Date().toISOString(),
        reading_sessions: [
          {
            start_time: new Date(Date.now() - 3600000).toISOString(),
            end_time: new Date().toISOString(),
            pages_read: 20
          }
        ]
      })
      .select()
      .single();
    if (progressError) throw progressError;
    testProgress = progress;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('reading_progress').delete().eq('id', testProgress.id);
    await supabase.from('books').delete().eq('id', testBook.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('GET /api/reading-progress', () => {
    it('should get all reading progress entries', async () => {
      const response = await request(app)
        .get('/api/reading-progress')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter progress by book', async () => {
      const response = await request(app)
        .get(`/api/reading-progress?book_id=${testBook.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(progress => progress.book_id === testBook.id)).toBe(true);
    });

    it('should filter progress by status', async () => {
      const response = await request(app)
        .get('/api/reading-progress?status=reading')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(progress => progress.status === 'reading')).toBe(true);
    });

    it('should sort progress by last read date', async () => {
      const response = await request(app)
        .get('/api/reading-progress?sort=last_read_at&order=desc')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      const dates = response.body.data.map(progress => new Date(progress.last_read_at));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('GET /api/reading-progress/:id', () => {
    it('should get progress by id', async () => {
      const response = await request(app)
        .get(`/api/reading-progress/${testProgress.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testProgress.id);
      expect(response.body).toHaveProperty('current_page');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('reading_sessions');
      expect(response.body).toHaveProperty('book');
    });

    it('should return 404 for non-existent progress', async () => {
      await request(app)
        .get('/api/reading-progress/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(404);
    });
  });

  describe('POST /api/reading-progress', () => {
    it('should create new reading progress', async () => {
      const newProgress = {
        book_id: testBook.id,
        current_page: 100,
        status: 'reading',
        reading_sessions: [
          {
            start_time: new Date().toISOString(),
            pages_read: 30
          }
        ]
      };

      const response = await request(app)
        .post('/api/reading-progress')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(newProgress)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.current_page).toBe(newProgress.current_page);
      expect(response.body.status).toBe(newProgress.status);
      expect(response.body.reading_sessions).toHaveLength(1);

      // Clean up
      await supabase.from('reading_progress').delete().eq('id', response.body.id);
    });

    it('should validate current page', async () => {
      const response = await request(app)
        .post('/api/reading-progress')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          book_id: testBook.id,
          current_page: 400, // Exceeds total pages
          status: 'reading'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('current_page');
    });

    it('should validate reading session data', async () => {
      const response = await request(app)
        .post('/api/reading-progress')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          book_id: testBook.id,
          current_page: 100,
          status: 'reading',
          reading_sessions: [
            {
              start_time: 'invalid-date',
              pages_read: -10
            }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('reading_sessions');
    });
  });

  describe('PUT /api/reading-progress/:id', () => {
    it('should update reading progress', async () => {
      const updateData = {
        current_page: 150,
        status: 'completed',
        reading_sessions: [
          ...testProgress.reading_sessions,
          {
            start_time: new Date().toISOString(),
            pages_read: 50
          }
        ]
      };

      const response = await request(app)
        .put(`/api/reading-progress/${testProgress.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.current_page).toBe(updateData.current_page);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.reading_sessions).toHaveLength(2);
    });

    it('should prevent updating others progress', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other-progress@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .put(`/api/reading-progress/${testProgress.id}`)
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .send({
          current_page: 200,
          status: 'reading'
        })
        .expect(403);

      // Clean up
      await supabase.auth.admin.deleteUser(otherUser.id);
    });
  });

  describe('DELETE /api/reading-progress/:id', () => {
    it('should delete reading progress', async () => {
      // Create a progress to delete
      const { data: progress } = await supabase
        .from('reading_progress')
        .insert({
          user_id: testUser.id,
          book_id: testBook.id,
          current_page: 200,
          status: 'reading'
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/reading-progress/${progress.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(204);

      // Verify deletion
      const { data: deletedProgress } = await supabase
        .from('reading_progress')
        .select()
        .eq('id', progress.id)
        .single();

      expect(deletedProgress).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk progress creation efficiently', async () => {
      const progressEntries = Array(50).fill().map((_, i) => ({
        user_id: testUser.id,
        book_id: testBook.id,
        current_page: (i + 1) * 10,
        status: 'reading',
        reading_sessions: [
          {
            start_time: new Date().toISOString(),
            pages_read: 10
          }
        ]
      }));

      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('reading_progress')
        .insert(progressEntries)
        .select();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await supabase
        .from('reading_progress')
        .delete()
        .in('id', data.map(progress => progress.id));
    });

    it('should handle concurrent progress updates', async () => {
      const requests = Array(20).fill().map(() => 
        request(app)
          .put(`/api/reading-progress/${testProgress.id}`)
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            current_page: 100,
            status: 'reading'
          })
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
        .get('/api/reading-progress?search=1%27%20OR%20%271%27=%271')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should sanitize progress data', async () => {
      const maliciousData = {
        book_id: testBook.id,
        current_page: 100,
        status: '<script>alert("xss")</script>reading'
      };

      const response = await request(app)
        .post('/api/reading-progress')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('sanitized');
    });
  });
}); 