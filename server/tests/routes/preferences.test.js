const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('User Preferences API', () => {
  let testUser;
  let testPreferences;

  beforeAll(async () => {
    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'preferences-test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create test preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: testUser.id,
        theme: 'light',
        language: 'en',
        email_notifications: true,
        reading_goals: {
          daily_pages: 50,
          yearly_books: 24
        },
        display_settings: {
          show_progress: true,
          show_reviews: true
        }
      })
      .select()
      .single();
    if (preferencesError) throw preferencesError;
    testPreferences = preferences;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('user_preferences').delete().eq('id', testPreferences.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('GET /api/preferences', () => {
    it('should get user preferences', async () => {
      const response = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('theme', 'light');
      expect(response.body).toHaveProperty('language', 'en');
      expect(response.body).toHaveProperty('email_notifications', true);
      expect(response.body).toHaveProperty('reading_goals');
      expect(response.body).toHaveProperty('display_settings');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/preferences')
        .expect(401);
    });
  });

  describe('PUT /api/preferences', () => {
    it('should update user preferences', async () => {
      const updateData = {
        theme: 'dark',
        language: 'es',
        email_notifications: false,
        reading_goals: {
          daily_pages: 100,
          yearly_books: 36
        },
        display_settings: {
          show_progress: false,
          show_reviews: true
        }
      };

      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.theme).toBe(updateData.theme);
      expect(response.body.language).toBe(updateData.language);
      expect(response.body.email_notifications).toBe(updateData.email_notifications);
      expect(response.body.reading_goals).toEqual(updateData.reading_goals);
      expect(response.body.display_settings).toEqual(updateData.display_settings);
    });

    it('should validate theme value', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          theme: 'invalid-theme'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('theme');
    });

    it('should validate language code', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          language: 'invalid-language'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('language');
    });

    it('should validate reading goals', async () => {
      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send({
          reading_goals: {
            daily_pages: -10,
            yearly_books: 0
          }
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('reading_goals');
    });
  });

  describe('POST /api/preferences/reset', () => {
    it('should reset preferences to defaults', async () => {
      const response = await request(app)
        .post('/api/preferences/reset')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .expect(200);

      expect(response.body.theme).toBe('light');
      expect(response.body.language).toBe('en');
      expect(response.body.email_notifications).toBe(true);
      expect(response.body.reading_goals).toEqual({
        daily_pages: 30,
        yearly_books: 12
      });
      expect(response.body.display_settings).toEqual({
        show_progress: true,
        show_reviews: true
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent preference updates', async () => {
      const requests = Array(10).fill().map(() => 
        request(app)
          .put('/api/preferences')
          .set('Authorization', `Bearer ${testUser.session.access_token}`)
          .send({
            theme: 'dark',
            language: 'en'
          })
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
    it('should prevent unauthorized access to other users preferences', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other-preferences@example.com',
        password: 'testpassword123'
      });

      await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${otherUser.session.access_token}`)
        .expect(404);

      // Clean up
      await supabase.auth.admin.deleteUser(otherUser.id);
    });

    it('should sanitize preference data', async () => {
      const maliciousData = {
        theme: '<script>alert("xss")</script>dark',
        language: 'en<script>'
      };

      const response = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${testUser.session.access_token}`)
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('sanitized');
    });
  });
}); 