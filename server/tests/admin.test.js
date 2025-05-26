const request = require('supertest');
const app = require('../server');
const { createTestBook, createTestOrder } = require('./setup');

describe('Admin API', () => {
  let testBook;
  let testOrder;

  beforeEach(async () => {
    testBook = await createTestBook();
    testOrder = await createTestOrder(global.testUserToken, testBook.id);
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_users');
      expect(response.body).toHaveProperty('total_books');
      expect(response.body).toHaveProperty('total_orders');
      expect(response.body).toHaveProperty('total_revenue');
      expect(response.body).toHaveProperty('recent_orders');
      expect(response.body).toHaveProperty('popular_books');
      expect(response.body).toHaveProperty('user_growth');
      expect(response.body).toHaveProperty('revenue_by_month');
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/admin/stats')
        .expect(401);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return all users with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).toHaveProperty('role');
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=user')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body.data.every(user => user.role === 'user')).toBe(true);
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=test')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body.data.every(user => 
        user.email.toLowerCase().includes('test')
      )).toBe(true);
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('should update user role', async () => {
      // First get a user ID
      const users = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      const userId = users.body.data[0].id;

      const response = await request(app)
        .put(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body).toHaveProperty('role', 'admin');
    });

    it('should validate role value', async () => {
      // First get a user ID
      const users = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      const userId = users.body.data[0].id;

      await request(app)
        .put(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({ role: 'invalid_role' })
        .expect(400);
    });

    it('should return 403 for non-admin users', async () => {
      // First get a user ID
      const users = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      const userId = users.body.data[0].id;

      await request(app)
        .put(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      // First get a user ID
      const users = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      const userId = users.body.data[0].id;

      await request(app)
        .put(`/api/admin/users/${userId}/role`)
        .send({ role: 'admin' })
        .expect(401);
    });
  });

  describe('GET /api/admin/orders', () => {
    it('should return all orders with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('user_id');
      expect(response.body.data[0]).toHaveProperty('status');
      expect(response.body.data[0]).toHaveProperty('total_amount');
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/admin/orders?status=pending')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body.data.every(order => order.status === 'pending')).toBe(true);
    });

    it('should filter orders by date range', async () => {
      const response = await request(app)
        .get('/api/admin/orders?start_date=2024-01-01&end_date=2024-12-31')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body.data.every(order => {
        const date = new Date(order.created_at);
        return date >= new Date('2024-01-01') && date <= new Date('2024-12-31');
      })).toBe(true);
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/admin/orders')
        .expect(401);
    });
  });

  describe('GET /api/admin/reports', () => {
    it('should return sales report', async () => {
      const response = await request(app)
        .get('/api/admin/reports/sales')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_sales');
      expect(response.body).toHaveProperty('sales_by_month');
      expect(response.body).toHaveProperty('sales_by_category');
      expect(response.body).toHaveProperty('top_selling_books');
    });

    it('should return user activity report', async () => {
      const response = await request(app)
        .get('/api/admin/reports/user-activity')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('active_users');
      expect(response.body).toHaveProperty('new_users');
      expect(response.body).toHaveProperty('user_engagement');
      expect(response.body).toHaveProperty('reading_stats');
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .get('/api/admin/reports/sales')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/admin/reports/sales')
        .expect(401);
    });
  });
}); 