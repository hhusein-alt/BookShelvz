const request = require('supertest');
const app = require('../server');
const { createTestBook, createTestOrder } = require('./setup');

describe('Orders API', () => {
  let testBook;
  let testOrder;

  beforeEach(async () => {
    testBook = await createTestBook();
    testOrder = await createTestOrder(global.testUserToken, testBook.id);
  });

  describe('GET /api/orders', () => {
    it('should return all orders (admin only)', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/orders')
        .expect(401);
    });
  });

  describe('GET /api/orders/my-orders', () => {
    it('should return user orders', async () => {
      const userResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${global.testUserToken}`);
      
      const userId = userResponse.body.id;

      const response = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every(order => order.user_id === userId)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/orders/my-orders')
        .expect(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order by id', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testOrder.id);
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('total_amount', 9.99);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .expect(401);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const newOrder = {
        items: [{
          book_id: testBook.id,
          quantity: 2
        }],
        payment_method: 'credit_card',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zip_code: '12345'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(newOrder)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('total_amount', 19.98); // 9.99 * 2
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toHaveProperty('quantity', 2);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/orders')
        .send({
          items: [{ book_id: testBook.id, quantity: 1 }]
        })
        .expect(401);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status (admin only)', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({ status: 'processing' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should validate status value', async () => {
      await request(app)
        .patch(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .patch(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({ status: 'processing' })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .patch(`/api/orders/${testOrder.id}/status`)
        .send({ status: 'processing' })
        .expect(401);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel an order', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'cancelled');
    });

    it('should not allow cancelling non-pending orders', async () => {
      // First update status to processing
      await request(app)
        .patch(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${global.testAdminToken}`)
        .send({ status: 'processing' });

      // Try to cancel
      await request(app)
        .post(`/api/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/orders/${testOrder.id}/cancel`)
        .expect(401);
    });
  });
}); 