const { supabase } = require('../../config/supabase');
const { AppError } = require('../../utils/error');
const { createTestUser } = require('../setup');

describe('User Service', () => {
  describe('User Profile Management', () => {
    it('should create a user profile', async () => {
      const profileData = {
        user_id: global.testUserId,
        name: 'Test User',
        email: 'test@example.com',
        preferences: {
          theme: 'light',
          notifications: true
        }
      };

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile).toMatchObject(profileData);
    });

    it('should update user profile', async () => {
      const testUser = await createTestUser();
      const updateData = {
        name: 'Updated Name',
        preferences: {
          theme: 'dark',
          notifications: false
        }
      };

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', testUser.user_id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile).toMatchObject(updateData);
    });

    it('should retrieve user profile', async () => {
      const testUser = await createTestUser();

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select()
        .eq('user_id', testUser.user_id)
        .single();

      expect(error).toBeNull();
      expect(profile).toMatchObject(testUser);
    });
  });

  describe('Reading Progress', () => {
    it('should track reading progress', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      const progressData = {
        user_id: testUser.user_id,
        book_id: testBook.id,
        current_page: 50,
        total_pages: 200,
        status: 'reading'
      };

      const { data: progress, error } = await supabase
        .from('reading_progress')
        .insert(progressData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(progress).toMatchObject(progressData);
    });

    it('should update reading progress', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      // Create initial progress
      await supabase
        .from('reading_progress')
        .insert({
          user_id: testUser.user_id,
          book_id: testBook.id,
          current_page: 50,
          total_pages: 200,
          status: 'reading'
        });

      // Update progress
      const { data: progress, error } = await supabase
        .from('reading_progress')
        .update({
          current_page: 100,
          status: 'completed'
        })
        .eq('user_id', testUser.user_id)
        .eq('book_id', testBook.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(progress.current_page).toBe(100);
      expect(progress.status).toBe('completed');
    });

    it('should retrieve reading history', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      // Create some progress
      await supabase
        .from('reading_progress')
        .insert({
          user_id: testUser.user_id,
          book_id: testBook.id,
          current_page: 100,
          total_pages: 200,
          status: 'completed'
        });

      const { data: history, error } = await supabase
        .from('reading_progress')
        .select('*, books(*)')
        .eq('user_id', testUser.user_id);

      expect(error).toBeNull();
      expect(history).toHaveLength(1);
      expect(history[0]).toHaveProperty('books');
    });
  });

  describe('Bookmarks', () => {
    it('should create a bookmark', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      const bookmarkData = {
        user_id: testUser.user_id,
        book_id: testBook.id,
        page_number: 50,
        note: 'Important chapter'
      };

      const { data: bookmark, error } = await supabase
        .from('bookmarks')
        .insert(bookmarkData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(bookmark).toMatchObject(bookmarkData);
    });

    it('should update a bookmark', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      // Create initial bookmark
      await supabase
        .from('bookmarks')
        .insert({
          user_id: testUser.user_id,
          book_id: testBook.id,
          page_number: 50,
          note: 'Initial note'
        });

      // Update bookmark
      const { data: bookmark, error } = await supabase
        .from('bookmarks')
        .update({
          page_number: 75,
          note: 'Updated note'
        })
        .eq('user_id', testUser.user_id)
        .eq('book_id', testBook.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(bookmark.page_number).toBe(75);
      expect(bookmark.note).toBe('Updated note');
    });

    it('should retrieve bookmarks for a book', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      // Create some bookmarks
      await supabase
        .from('bookmarks')
        .insert([
          {
            user_id: testUser.user_id,
            book_id: testBook.id,
            page_number: 50,
            note: 'First bookmark'
          },
          {
            user_id: testUser.user_id,
            book_id: testBook.id,
            page_number: 100,
            note: 'Second bookmark'
          }
        ]);

      const { data: bookmarks, error } = await supabase
        .from('bookmarks')
        .select()
        .eq('user_id', testUser.user_id)
        .eq('book_id', testBook.id);

      expect(error).toBeNull();
      expect(bookmarks).toHaveLength(2);
    });
  });

  describe('User Statistics', () => {
    it('should calculate user reading statistics', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      // Create some reading progress
      await supabase
        .from('reading_progress')
        .insert({
          user_id: testUser.user_id,
          book_id: testBook.id,
          current_page: 100,
          total_pages: 200,
          status: 'completed'
        });

      const { data: stats, error } = await supabase
        .rpc('get_user_stats', { user_id: testUser.user_id });

      expect(error).toBeNull();
      expect(stats).toHaveProperty('total_books_read');
      expect(stats).toHaveProperty('total_pages_read');
      expect(stats).toHaveProperty('total_bookmarks');
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate user profiles', async () => {
      const testUser = await createTestUser();

      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: testUser.user_id,
          name: 'Another User',
          email: 'another@example.com'
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505'); // Unique violation
    });

    it('should handle invalid reading progress', async () => {
      const testUser = await createTestUser();

      const { error } = await supabase
        .from('reading_progress')
        .insert({
          user_id: testUser.user_id,
          book_id: '00000000-0000-0000-0000-000000000000',
          current_page: 50,
          total_pages: 200,
          status: 'reading'
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23503'); // Foreign key violation
    });
  });
}); 