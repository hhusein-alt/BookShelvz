const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Categories API', () => {
  let testUser;
  let testAdmin;
  let testCategories;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'categories-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test admin
    const { data: admin, error: adminError } = await supabase.auth.signUp({
      email: 'admin-categories@example.com',
      password: 'testpassword123'
    });
    if (adminError) throw adminError;
    testAdmin = admin;

    // Set admin role
    await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('user_id', admin.id);

    // Create test categories
    const categories = [
      {
        name: 'Test Category 1',
        description: 'Test Description 1',
        slug: 'test-category-1'
      },
      {
        name: 'Test Category 2',
        description: 'Test Description 2',
        slug: 'test-category-2'
      }
    ];

    const { data, error } = await supabase
      .from('categories')
      .insert(categories)
      .select();

    if (error) throw error;
    testCategories = data;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('categories').delete().in('id', testCategories.map(cat => cat.id));
    await supabase.auth.admin.deleteUser(testUser.id);
    await supabase.auth.admin.deleteUser(testAdmin.id);
  });

  describe('GET /api/categories', () => {
    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include book count for each category', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.data[0]).toHaveProperty('book_count');
      expect(typeof response.body.data[0].book_count).toBe('number');
    });

    it('should sort categories by name', async () => {
      const response = await request(app)
        .get('/api/categories?sort=name&order=asc')
        .expect(200);

      const names = response.body.data.map(cat => cat.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should get category by id', async () => {
      const response = await request(app)
        .get(`/api/categories/${testCategories[0].id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testCategories[0].id);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('slug');
    });

    it('should return 404 for non-existent category', async () => {
      await request(app)
        .get('/api/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should include books in category', async () => {
      const response = await request(app)
        .get(`/api/categories/${testCategories[0].id}`)
        .expect(200);

      expect(response.body).toHaveProperty('books');
      expect(Array.isArray(response.body.books)).toBe(true);
    });
  });

  describe('POST /api/categories', () => {
    it('should create new category (admin only)', async () => {
      const newCategory = {
        name: 'New Test Category',
        description: 'New Test Description',
        slug: 'new-test-category'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(newCategory)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newCategory.name);
      expect(response.body.slug).toBe(newCategory.slug);

      // Clean up
      await supabase.from('categories').delete().eq('id', response.body.id);
    });

    it('should prevent non-admin from creating categories', async () => {
      const newCategory = {
        name: 'Unauthorized Category',
        description: 'Test Description',
        slug: 'unauthorized-category'
      };

      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(newCategory)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const invalidCategory = {
        name: '', // Empty name
        slug: 'invalid slug' // Invalid slug format
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(invalidCategory)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name');
      expect(response.body.error).toContain('slug');
    });

    it('should prevent duplicate slugs', async () => {
      const duplicateCategory = {
        name: 'Duplicate Category',
        description: 'Test Description',
        slug: testCategories[0].slug // Use existing slug
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(duplicateCategory)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('slug');
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update category (admin only)', async () => {
      const updateData = {
        name: 'Updated Test Category',
        description: 'Updated Description'
      };

      const response = await request(app)
        .put(`/api/categories/${testCategories[0].id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should prevent non-admin from updating categories', async () => {
      const updateData = {
        name: 'Unauthorized Update'
      };

      await request(app)
        .put(`/api/categories/${testCategories[0].id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(updateData)
        .expect(403);
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        name: '', // Empty name
        slug: 'invalid slug' // Invalid slug format
      };

      const response = await request(app)
        .put(`/api/categories/${testCategories[0].id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name');
      expect(response.body.error).toContain('slug');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete category (admin only)', async () => {
      // Create a category to delete
      const { data: category } = await supabase
        .from('categories')
        .insert({
          name: 'Category to Delete',
          description: 'Test Description',
          slug: 'category-to-delete'
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(204);

      // Verify deletion
      const { data: deletedCategory } = await supabase
        .from('categories')
        .select()
        .eq('id', category.id)
        .single();

      expect(deletedCategory).toBeNull();
    });

    it('should prevent non-admin from deleting categories', async () => {
      await request(app)
        .delete(`/api/categories/${testCategories[0].id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(403);
    });

    it('should prevent deletion of category with books', async () => {
      // Create a category with a book
      const { data: category } = await supabase
        .from('categories')
        .insert({
          name: 'Category with Book',
          description: 'Test Description',
          slug: 'category-with-book'
        })
        .select()
        .single();

      // Add a book to the category
      await supabase
        .from('books')
        .insert({
          title: 'Test Book',
          author: 'Test Author',
          category_id: category.id,
          price: 9.99,
          isbn: '978-0000000011'
        });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('books');

      // Clean up
      await supabase.from('books').delete().eq('category_id', category.id);
      await supabase.from('categories').delete().eq('id', category.id);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk category creation efficiently', async () => {
      const categories = Array(50).fill().map((_, i) => ({
        name: `Performance Test Category ${i}`,
        description: `Test Description ${i}`,
        slug: `performance-test-category-${i}`
      }));

      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('categories')
        .insert(categories)
        .select();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      await supabase
        .from('categories')
        .delete()
        .in('id', data.map(cat => cat.id));
    });

    it('should handle concurrent category requests', async () => {
      const requests = Array(20).fill().map(() => 
        request(app).get('/api/categories')
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
        .get('/api/categories?search=1%27%20OR%20%271%27=%271')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should sanitize category data', async () => {
      const maliciousCategory = {
        name: '<script>alert("xss")</script>Test Category',
        description: '  Extra spaces  ',
        slug: 'test-category<script>'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(maliciousCategory)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('sanitized');
    });

    it('should validate slug format', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send({
          name: 'Test Category',
          description: 'Test Description',
          slug: 'invalid slug with spaces'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('slug');
    });
  });
}); 