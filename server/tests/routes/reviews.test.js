const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Reviews API', () => {
  let testUser;
  let testBook;
  let testReview;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'reviews-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: 'Review Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000012'
      })
      .select()
      .single();
    if (bookError) throw bookError;
    testBook = book;

    // Create test review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: testUser.id,
        book_id: testBook.id,
        rating: 4,
        comment: 'Test review comment',
        is_verified: true
      })
      .select()
      .single();
    if (reviewError) throw reviewError;
    testReview = review;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('reviews').delete().eq('id', testReview.id);
    await supabase.from('books').delete().eq('id', testBook.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('GET /api/reviews', () => {
    it('should get all reviews', async () => {
      const response = await request(app)
        .get('/api/reviews')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter reviews by book', async () => {
      const response = await request(app)
        .get(`/api/reviews?book_id=${testBook.id}`)
        .expect(200);

      expect(response.body.data.every(review => review.book_id === testBook.id)).toBe(true);
    });

    it('should filter reviews by user', async () => {
      const response = await request(app)
        .get(`/api/reviews?user_id=${testUser.id}`)
        .expect(200);

      expect(response.body.data.every(review => review.user_id === testUser.id)).toBe(true);
    });

    it('should filter reviews by rating', async () => {
      const response = await request(app)
        .get('/api/reviews?min_rating=4')
        .expect(200);

      expect(response.body.data.every(review => review.rating >= 4)).toBe(true);
    });

    it('should sort reviews by date', async () => {
      const response = await request(app)
        .get('/api/reviews?sort=created_at&order=desc')
        .expect(200);

      const dates = response.body.data.map(review => new Date(review.created_at));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should get review by id', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testReview.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testReview.id);
      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('comment');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('book');
    });

    it('should return 404 for non-existent review', async () => {
      await request(app)
        .get('/api/reviews/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /api/reviews', () => {
    it('should create new review', async () => {
      const newReview = {
        book_id: testBook.id,
        rating: 5,
        comment: 'Great book!'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(newReview)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.rating).toBe(newReview.rating);
      expect(response.body.comment).toBe(newReview.comment);
      expect(response.body.user_id).toBe(testUser.id);

      // Clean up
      await supabase.from('reviews').delete().eq('id', response.body.id);
    });

    it('should prevent duplicate reviews for same book', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          book_id: testBook.id,
          rating: 3,
          comment: 'Another review'
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already reviewed');
    });

    it('should validate review data', async () => {
      const invalidReview = {
        book_id: testBook.id,
        rating: 6, // Invalid rating
        comment: '' // Empty comment
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(invalidReview)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rating');
      expect(response.body.error).toContain('comment');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/reviews')
        .send({
          book_id: testBook.id,
          rating: 4,
          comment: 'Test review'
        })
        .expect(401);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should update own review', async () => {
      const updateData = {
        rating: 5,
        comment: 'Updated review comment'
      };

      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.rating).toBe(updateData.rating);
      expect(response.body.comment).toBe(updateData.comment);
    });

    it('should prevent updating others reviews', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other-review@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .send({
          rating: 1,
          comment: 'Malicious update'
        })
        .expect(403);

      // Clean up
      await supabase.auth.admin.deleteUser(otherUser.id);
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        rating: 0, // Invalid rating
        comment: '' // Empty comment
      };

      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rating');
      expect(response.body.error).toContain('comment');
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should delete own review', async () => {
      // Create a review to delete
      const { data: review } = await supabase
        .from('reviews')
        .insert({
          user_id: testUser.id,
          book_id: testBook.id,
          rating: 3,
          comment: 'Review to delete'
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(204);

      // Verify deletion
      const { data: deletedReview } = await supabase
        .from('reviews')
        .select()
        .eq('id', review.id)
        .single();

      expect(deletedReview).toBeNull();
    });

    it('should prevent deleting others reviews', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other-delete@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .expect(403);

      // Clean up
      await supabase.auth.admin.deleteUser(otherUser.id);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk review creation efficiently', async () => {
      // Create multiple test users
      const users = await Promise.all(
        Array(50).fill().map((_, i) => 
          supabase.auth.signUp({
            email: `review-user-${i}@example.com`,
            password: 'testpassword123'
          })
        )
      );

      const reviews = users.map((user, i) => ({
        user_id: user.data.id,
        book_id: testBook.id,
        rating: (i % 5) + 1,
        comment: `Performance test review ${i}`
      }));

      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('reviews')
        .insert(reviews)
        .select();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await supabase
        .from('reviews')
        .delete()
        .in('id', data.map(review => review.id));
      await Promise.all(
        users.map(user => supabase.auth.admin.deleteUser(user.data.id))
      );
    });

    it('should handle concurrent review requests', async () => {
      const requests = Array(20).fill().map(() => 
        request(app)
          .get(`/api/reviews?book_id=${testBook.id}`)
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
        .get('/api/reviews?search=1%27%20OR%20%271%27=%271')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should sanitize review data', async () => {
      const maliciousReview = {
        book_id: testBook.id,
        rating: 4,
        comment: '<script>alert("xss")</script>Test review'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(maliciousReview)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('sanitized');
    });

    it('should validate rating range', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          book_id: testBook.id,
          rating: 10, // Invalid rating
          comment: 'Test review'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rating');
    });
  });
}); 