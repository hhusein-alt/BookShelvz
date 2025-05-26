const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Wishlist API', () => {
  let testUser;
  let testBooks;
  let testWishlist;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'wishlist-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test books
    const books = [
      {
        title: 'Wishlist Test Book 1',
        author: 'Test Author 1',
        description: 'Test Description 1',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000014',
        tags: ['test', 'fiction']
      },
      {
        title: 'Wishlist Test Book 2',
        author: 'Test Author 2',
        description: 'Test Description 2',
        genre: 'Non-Fiction',
        price: 19.99,
        isbn: '978-0000000015',
        tags: ['test', 'non-fiction']
      }
    ];

    const { data, error } = await supabase
      .from('books')
      .insert(books)
      .select();

    if (error) throw error;
    testBooks = data;

    // Create test wishlist
    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .insert({
        user_id: testUser.id,
        name: 'My Wishlist',
        description: 'Test wishlist',
        is_public: true,
        books: [testBooks[0].id]
      })
      .select()
      .single();
    if (wishlistError) throw wishlistError;
    testWishlist = wishlist;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('wishlists').delete().eq('id', testWishlist.id);
    await supabase.from('books').delete().in('id', testBooks.map(book => book.id));
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('GET /api/wishlists', () => {
    it('should get all wishlists', async () => {
      const response = await request(app)
        .get('/api/wishlists')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter wishlists by name', async () => {
      const response = await request(app)
        .get('/api/wishlists?name=My Wishlist')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(wishlist => 
        wishlist.name.includes('My Wishlist')
      )).toBe(true);
    });

    it('should filter wishlists by visibility', async () => {
      const response = await request(app)
        .get('/api/wishlists?is_public=true')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(wishlist => wishlist.is_public)).toBe(true);
    });

    it('should sort wishlists by creation date', async () => {
      const response = await request(app)
        .get('/api/wishlists?sort=created_at&order=desc')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      const dates = response.body.data.map(wishlist => new Date(wishlist.created_at));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('GET /api/wishlists/:id', () => {
    it('should get wishlist by id', async () => {
      const response = await request(app)
        .get(`/api/wishlists/${testWishlist.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testWishlist.id);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('books');
      expect(Array.isArray(response.body.books)).toBe(true);
    });

    it('should return 404 for non-existent wishlist', async () => {
      await request(app)
        .get('/api/wishlists/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(404);
    });

    it('should prevent access to private wishlist', async () => {
      // Create private wishlist
      const { data: privateWishlist } = await supabase
        .from('wishlists')
        .insert({
          user_id: testUser.id,
          name: 'Private Wishlist',
          is_public: false
        })
        .select()
        .single();

      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other-wishlist@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .get(`/api/wishlists/${privateWishlist.id}`)
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .expect(403);

      // Clean up
      await supabase.from('wishlists').delete().eq('id', privateWishlist.id);
      await supabase.auth.admin.deleteUser(otherUser.id);
    });
  });

  describe('POST /api/wishlists', () => {
    it('should create new wishlist', async () => {
      const newWishlist = {
        name: 'New Wishlist',
        description: 'New test wishlist',
        is_public: true,
        books: [testBooks[1].id]
      };

      const response = await request(app)
        .post('/api/wishlists')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(newWishlist)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newWishlist.name);
      expect(response.body.description).toBe(newWishlist.description);
      expect(response.body.is_public).toBe(newWishlist.is_public);
      expect(response.body.books).toEqual(newWishlist.books);

      // Clean up
      await supabase.from('wishlists').delete().eq('id', response.body.id);
    });

    it('should validate wishlist data', async () => {
      const invalidWishlist = {
        name: '', // Empty name
        is_public: 'invalid' // Invalid boolean
      };

      const response = await request(app)
        .post('/api/wishlists')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(invalidWishlist)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name');
      expect(response.body.error).toContain('is_public');
    });
  });

  describe('PUT /api/wishlists/:id', () => {
    it('should update wishlist', async () => {
      const updateData = {
        name: 'Updated Wishlist',
        description: 'Updated description',
        is_public: false,
        books: [...testWishlist.books, testBooks[1].id]
      };

      const response = await request(app)
        .put(`/api/wishlists/${testWishlist.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.is_public).toBe(updateData.is_public);
      expect(response.body.books).toEqual(updateData.books);
    });

    it('should prevent updating others wishlists', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other-update@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .put(`/api/wishlists/${testWishlist.id}`)
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .send({
          name: 'Unauthorized Update'
        })
        .expect(403);

      // Clean up
      await supabase.auth.admin.deleteUser(otherUser.id);
    });
  });

  describe('DELETE /api/wishlists/:id', () => {
    it('should delete wishlist', async () => {
      // Create a wishlist to delete
      const { data: wishlist } = await supabase
        .from('wishlists')
        .insert({
          user_id: testUser.id,
          name: 'Wishlist to Delete',
          is_public: true
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/wishlists/${wishlist.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(204);

      // Verify deletion
      const { data: deletedWishlist } = await supabase
        .from('wishlists')
        .select()
        .eq('id', wishlist.id)
        .single();

      expect(deletedWishlist).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk wishlist creation efficiently', async () => {
      const wishlists = Array(50).fill().map((_, i) => ({
        user_id: testUser.id,
        name: `Performance Test Wishlist ${i}`,
        description: `Test Description ${i}`,
        is_public: true,
        books: [testBooks[0].id]
      }));

      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('wishlists')
        .insert(wishlists)
        .select();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await supabase
        .from('wishlists')
        .delete()
        .in('id', data.map(wishlist => wishlist.id));
    });

    it('should handle concurrent wishlist requests', async () => {
      const requests = Array(20).fill().map(() => 
        request(app)
          .get('/api/wishlists')
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

  describe('Security Tests', () => {
    it('should prevent SQL injection in search', async () => {
      const response = await request(app)
        .get('/api/wishlists?search=1%27%20OR%20%271%27=%271')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should sanitize wishlist data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>Test Wishlist',
        description: '  Extra spaces  '
      };

      const response = await request(app)
        .post('/api/wishlists')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('sanitized');
    });
  });
}); 