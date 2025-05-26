const request = require('supertest');
const app = require('../server');
const { supabase } = require('./setup');

describe('Users API', () => {
  describe('GET /api/users/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updates = {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('full_name', updates.full_name);
      expect(response.body).toHaveProperty('avatar_url', updates.avatar_url);
    });

    it('should validate profile updates', async () => {
      const updates = {
        full_name: '' // Invalid empty name
      };

      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send(updates)
        .expect(400);
    });
  });

  describe('GET /api/users/preferences', () => {
    it('should return user preferences', async () => {
      const response = await request(app)
        .get('/api/users/preferences')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('preferences');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/users/preferences')
        .expect(401);
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        theme: 'dark',
        notifications: {
          email: true,
          push: false
        },
        language: 'en'
      };

      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({ preferences })
        .expect(200);

      expect(response.body.preferences).toEqual(preferences);
    });

    it('should validate preferences format', async () => {
      const preferences = {
        theme: 'invalid_theme' // Invalid theme value
      };

      await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .send({ preferences })
        .expect(400);
    });
  });

  describe('GET /api/users/history', () => {
    it('should return reading history with pagination', async () => {
      const response = await request(app)
        .get('/api/users/history')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter history by date range', async () => {
      const response = await request(app)
        .get('/api/users/history?start_date=2024-01-01&end_date=2024-12-31')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body.data.every(entry => {
        const date = new Date(entry.created_at);
        return date >= new Date('2024-01-01') && date <= new Date('2024-12-31');
      })).toBe(true);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${global.testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_books_read');
      expect(response.body).toHaveProperty('total_pages_read');
      expect(response.body).toHaveProperty('favorite_genres');
      expect(response.body).toHaveProperty('reading_streak');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/users/stats')
        .expect(401);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should delete user account', async () => {
      // Create a temporary user for deletion test
      const { data: user, error } = await supabase.auth.signUp({
        email: 'temp@example.com',
        password: 'temppassword123'
      });

      if (error) throw error;

      const token = user.session.access_token;

      await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Verify user is deleted
      const { data: deletedUser } = await supabase.auth.getUser(token);
      expect(deletedUser.user).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/users/account')
        .expect(401);
    });
  });
}); 