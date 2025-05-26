const request = require('supertest');
const app = require('../server');

describe('Categories API', () => {
  describe('GET /api/categories', () => {
    it('should return all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('icon');
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return category by id', async () => {
      // First get all categories to get a valid ID
      const categories = await request(app)
        .get('/api/categories')
        .expect(200);

      const categoryId = categories.body[0].id;

      const response = await request(app)
        .get(`/api/categories/${categoryId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', categoryId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('icon');
    });

    it('should return 404 for non-existent category', async () => {
      await request(app)
        .get('/api/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category (admin only)', async () => {
      const newCategory = {
        name: 'Test Category',
        description: 'Test category description',
        icon: 'test-icon'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(newCategory)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', newCategory.name);
      expect(response.body).toHaveProperty('description', newCategory.description);
      expect(response.body).toHaveProperty('icon', newCategory.icon);
    });

    it('should return 403 for non-admin users', async () => {
      const newCategory = {
        name: 'Test Category',
        description: 'Test category description',
        icon: 'test-icon'
      };

      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(newCategory)
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/categories')
        .send({
          name: 'Test Category',
          description: 'Test category description',
          icon: 'test-icon'
        })
        .expect(401);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update a category (admin only)', async () => {
      // First get all categories to get a valid ID
      const categories = await request(app)
        .get('/api/categories')
        .expect(200);

      const categoryId = categories.body[0].id;

      const updates = {
        name: 'Updated Test Category',
        description: 'Updated test category description',
        icon: 'updated-test-icon'
      };

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('name', updates.name);
      expect(response.body).toHaveProperty('description', updates.description);
      expect(response.body).toHaveProperty('icon', updates.icon);
    });

    it('should return 403 for non-admin users', async () => {
      // First get all categories to get a valid ID
      const categories = await request(app)
        .get('/api/categories')
        .expect(200);

      const categoryId = categories.body[0].id;

      const updates = {
        name: 'Updated Test Category',
        description: 'Updated test category description',
        icon: 'updated-test-icon'
      };

      await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(updates)
        .expect(403);
    });

    it('should return 404 for non-existent category', async () => {
      const updates = {
        name: 'Updated Test Category',
        description: 'Updated test category description',
        icon: 'updated-test-icon'
      };

      await request(app)
        .put('/api/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(updates)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      // First get all categories to get a valid ID
      const categories = await request(app)
        .get('/api/categories')
        .expect(200);

      const categoryId = categories.body[0].id;

      await request(app)
        .put(`/api/categories/${categoryId}`)
        .send({
          name: 'Updated Test Category',
          description: 'Updated test category description',
          icon: 'updated-test-icon'
        })
        .expect(401);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category (admin only)', async () => {
      // First create a category to delete
      const newCategory = {
        name: 'Category to Delete',
        description: 'This category will be deleted',
        icon: 'delete-icon'
      };

      const createResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send(newCategory)
        .expect(201);

      const categoryId = createResponse.body.id;

      await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(204);

      // Verify category is deleted
      await request(app)
        .get(`/api/categories/${categoryId}`)
        .expect(404);
    });

    it('should return 403 for non-admin users', async () => {
      // First get all categories to get a valid ID
      const categories = await request(app)
        .get('/api/categories')
        .expect(200);

      const categoryId = categories.body[0].id;

      await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent category', async () => {
      await request(app)
        .delete('/api/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      // First get all categories to get a valid ID
      const categories = await request(app)
        .get('/api/categories')
        .expect(200);

      const categoryId = categories.body[0].id;

      await request(app)
        .delete(`/api/categories/${categoryId}`)
        .expect(401);
    });
  });

  describe('GET /api/categories/:id/books', () => {
    it('should return books in a category', async () => {
      // First get all categories to get a valid ID
      const categories = await request(app)
        .get('/api/categories')
        .expect(200);

      const categoryId = categories.body[0].id;

      const response = await request(app)
        .get(`/api/categories/${categoryId}/books`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(book => 
        book.categories.some(cat => cat.id === categoryId)
      )).toBe(true);
    });

    it('should return 404 for non-existent category', async () => {
      await request(app)
        .get('/api/categories/00000000-0000-0000-0000-000000000000/books')
        .expect(404);
    });
  });
}); 