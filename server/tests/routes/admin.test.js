const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Admin Dashboard API', () => {
  let testAdmin;
  let testUser;
  let testBooks;
  let testOrders;

  beforeAll(async () => {
    // Create test admin
    const { data: admin, error: adminError } = await supabase.auth.signUp({
      email: 'admin-test@example.com',
      password: 'testpassword123'
    });
    if (adminError) throw adminError;
    testAdmin = admin;

    // Set admin role
    await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('user_id', admin.id);

    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'user-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test books
    const books = [
      {
        title: 'Admin Test Book 1',
        author: 'Test Author 1',
        description: 'Test Description 1',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000016',
        stock: 100
      },
      {
        title: 'Admin Test Book 2',
        author: 'Test Author 2',
        description: 'Test Description 2',
        genre: 'Non-Fiction',
        price: 19.99,
        isbn: '978-0000000017',
        stock: 50
      }
    ];

    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .insert(books)
      .select();

    if (bookError) throw bookError;
    testBooks = bookData;

    // Create test orders
    const orders = [
      {
        user_id: testUser.id,
        status: 'pending',
        total_amount: 9.99,
        items: [{ book_id: testBooks[0].id, quantity: 1 }]
      },
      {
        user_id: testUser.id,
        status: 'completed',
        total_amount: 19.99,
        items: [{ book_id: testBooks[1].id, quantity: 1 }]
      }
    ];

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(orders)
      .select();

    if (orderError) throw orderError;
    testOrders = orderData;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('orders').delete().in('id', testOrders.map(order => order.id));
    await supabase.from('books').delete().in('id', testBooks.map(book => book.id));
    await supabase.auth.admin.deleteUser(testUser.id);
    await supabase.auth.admin.deleteUser(testAdmin.id);
  });

  describe('GET /api/admin/dashboard', () => {
    it('should get dashboard overview', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_users');
      expect(response.body).toHaveProperty('total_books');
      expect(response.body).toHaveProperty('total_orders');
      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('recent_orders');
      expect(response.body).toHaveProperty('low_stock_books');
    });

    it('should require admin role', async () => {
      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=user')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(user => user.role === 'user')).toBe(true);
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get(`/api/admin/users?search=${testUser.email}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body.data[0].email).toBe(testUser.email);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send({
          role: 'moderator'
        })
        .expect(200);

      expect(response.body.role).toBe('moderator');
    });

    it('should validate role value', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send({
          role: 'invalid-role'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('role');
    });
  });

  describe('GET /api/admin/orders', () => {
    it('should get all orders', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/admin/orders?status=pending')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body.data.every(order => order.status === 'pending')).toBe(true);
    });

    it('should filter orders by date range', async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/orders?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      const dates = response.body.data.map(order => new Date(order.created_at));
      expect(dates.every(date => date >= new Date(startDate) && date <= new Date(endDate))).toBe(true);
    });
  });

  describe('PUT /api/admin/orders/:id', () => {
    it('should update order status', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${testOrders[0].id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send({
          status: 'shipped'
        })
        .expect(200);

      expect(response.body.status).toBe('shipped');
    });

    it('should validate status value', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${testOrders[0].id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send({
          status: 'invalid-status'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('status');
    });
  });

  describe('GET /api/admin/analytics', () => {
    it('should get sales analytics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/sales')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('daily_sales');
      expect(response.body).toHaveProperty('monthly_sales');
      expect(response.body).toHaveProperty('top_books');
      expect(response.body).toHaveProperty('revenue_by_category');
    });

    it('should get user analytics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/users')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('active_users');
      expect(response.body).toHaveProperty('new_users');
      expect(response.body).toHaveProperty('user_retention');
      expect(response.body).toHaveProperty('user_activity');
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk user operations efficiently', async () => {
      const users = Array(50).fill().map((_, i) => ({
        email: `bulk-user-${i}@example.com`,
        password: 'testpassword123'
      }));

      const startTime = Date.now();
      
      const createdUsers = await Promise.all(
        users.map(user => supabase.auth.signUp(user))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Clean up
      await Promise.all(
        createdUsers.map(user => supabase.auth.admin.deleteUser(user.data.id))
      );
    });

    it('should handle concurrent admin requests', async () => {
      const requests = [
        request(app).get('/api/admin/dashboard'),
        request(app).get('/api/admin/users'),
        request(app).get('/api/admin/orders'),
        request(app).get('/api/admin/analytics/sales')
      ].map(req => req.set('Authorization', `Bearer ${testAdmin.session.access_token}`));

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in search', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=1%27%20OR%20%271%27=%271')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should sanitize admin input', async () => {
      const maliciousData = {
        role: '<script>alert("xss")</script>admin'
      };

      const response = await request(app)
        .put(`/api/admin/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('sanitized');
    });

    it('should validate date ranges', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/sales?start_date=invalid&end_date=invalid')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('date');
    });
  });
}); 