const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Orders API', () => {
  let testUser;
  let testOrder;
  let testBook;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'order-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: 'Order Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 19.99,
        isbn: '978-0000000002'
      })
      .select()
      .single();
    if (bookError) throw bookError;
    testBook = book;

    // Create test order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: testUser.id,
        total_amount: 19.99,
        status: 'pending',
        items: [{ book_id: testBook.id, quantity: 1, price: 19.99 }]
      })
      .select()
      .single();
    if (orderError) throw orderError;
    testOrder = order;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('orders').delete().eq('id', testOrder.id);
    await supabase.from('books').delete().eq('id', testBook.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('GET /api/orders', () => {
    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('total_amount');
      expect(response.body.data[0]).toHaveProperty('status');
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(order => order.status === 'pending')).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/orders')
        .expect(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order details', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testOrder.id);
      expect(response.body).toHaveProperty('total_amount');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(404);
    });

    it('should return 403 for unauthorized access', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .expect(403);

      // Clean up
      await supabase.auth.admin.deleteUser(otherUser.id);
    });
  });

  describe('POST /api/orders', () => {
    it('should create new order', async () => {
      const orderData = {
        items: [
          {
            book_id: testBook.id,
            quantity: 2
          }
        ],
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'Test Country'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('total_amount');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(2);

      // Clean up
      await supabase.from('orders').delete().eq('id', response.body.id);
    });

    it('should validate order data', async () => {
      const invalidOrder = {
        items: [] // Empty items array
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(invalidOrder)
        .expect(400);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({ status: 'processing' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should validate status update', async () => {
      await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('should cancel order', async () => {
      // Create a cancellable order
      const { data: order } = await supabase
        .from('orders')
        .insert({
          user_id: testUser.id,
          total_amount: 19.99,
          status: 'pending',
          items: [{ book_id: testBook.id, quantity: 1, price: 19.99 }]
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      // Verify order is cancelled
      const { data: cancelledOrder } = await supabase
        .from('orders')
        .select()
        .eq('id', order.id)
        .single();

      expect(cancelledOrder.status).toBe('cancelled');
    });

    it('should not allow cancellation of non-pending orders', async () => {
      // Create a non-pending order
      const { data: order } = await supabase
        .from('orders')
        .insert({
          user_id: testUser.id,
          total_amount: 19.99,
          status: 'completed',
          items: [{ book_id: testBook.id, quantity: 1, price: 19.99 }]
        })
        .select()
        .single();

      await request(app)
        .delete(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(400);

      // Clean up
      await supabase.from('orders').delete().eq('id', order.id);
    });
  });
}); 