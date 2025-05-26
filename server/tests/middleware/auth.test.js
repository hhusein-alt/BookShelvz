const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');
const jwt = require('jsonwebtoken');

describe('Authentication Middleware', () => {
  let testUser;
  let testAdmin;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'auth-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

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
  });

  afterAll(async () => {
    // Clean up test users
    await supabase.auth.admin.deleteUser(testUser.id);
    await supabase.auth.admin.deleteUser(testAdmin.id);
  });

  describe('Token Validation', () => {
    it('should validate JWT token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { sub: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject malformed token', async () => {
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer malformed.token')
        .expect(401);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin access to protected routes', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testAdmin.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_users');
      expect(response.body).toHaveProperty('total_books');
    });

    it('should deny non-admin access to admin routes', async () => {
      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(403);
    });

    it('should handle role changes', async () => {
      // Change user role to admin
      await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('user_id', testUser.id);

      // Should now have admin access
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_users');

      // Change back to user role
      await supabase
        .from('user_profiles')
        .update({ role: 'user' })
        .eq('user_id', testUser.id);

      // Should no longer have admin access
      await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit login attempts', async () => {
      const attempts = Array(6).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'auth-test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(attempts);
      
      // First 5 attempts should fail with 401
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(401);
      });

      // 6th attempt should be rate limited
      expect(responses[5].status).toBe(429);
    });

    it('should limit API requests', async () => {
      const requests = Array(101).fill().map(() => 
        request(app)
          .get('/api/books')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
      );

      const responses = await Promise.all(requests);
      
      // First 100 requests should succeed
      responses.slice(0, 100).forEach(response => {
        expect(response.status).toBe(200);
      });

      // 101st request should be rate limited
      expect(responses[100].status).toBe(429);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });

    it('should handle CORS correctly', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration', async () => {
      // Create a short-lived session
      const { data: session } = await supabase.auth.signIn({
        email: 'auth-test@example.com',
        password: 'testpassword123'
      });

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1000));

      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${session.access_token}`)
        .expect(401);
    });

    it('should handle concurrent sessions', async () => {
      // Create multiple sessions
      const sessions = await Promise.all([
        supabase.auth.signIn({
          email: 'auth-test@example.com',
          password: 'testpassword123'
        }),
        supabase.auth.signIn({
          email: 'auth-test@example.com',
          password: 'testpassword123'
        })
      ]);

      // All sessions should work
      const responses = await Promise.all(
        sessions.map(session =>
          request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${session.data.session.access_token}`)
        )
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Password Security', () => {
    it('should enforce password complexity', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new-user@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should prevent common passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new-user@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('common');
    });
  });
}); 