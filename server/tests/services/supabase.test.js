const { supabase } = require('../setup');
const { createClient } = require('@supabase/supabase-js');
const { authService, shelfService, statsService } = require('../../services');

describe('Supabase Service', () => {
  describe('Database Operations', () => {
    it('should perform CRUD operations on books', async () => {
      // Create
      const newBook = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000001'
      };

      const { data: createdBook, error: createError } = await supabase
        .from('books')
        .insert([newBook])
        .select()
        .single();

      expect(createError).toBeNull();
      expect(createdBook).toHaveProperty('id');
      expect(createdBook.title).toBe(newBook.title);

      // Read
      const { data: readBook, error: readError } = await supabase
        .from('books')
        .select()
        .eq('id', createdBook.id)
        .single();

      expect(readError).toBeNull();
      expect(readBook).toEqual(createdBook);

      // Update
      const updates = {
        title: 'Updated Test Book',
        price: 19.99
      };

      const { data: updatedBook, error: updateError } = await supabase
        .from('books')
        .update(updates)
        .eq('id', createdBook.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedBook.title).toBe(updates.title);
      expect(updatedBook.price).toBe(updates.price);

      // Delete
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', createdBook.id);

      expect(deleteError).toBeNull();

      // Verify deletion
      const { data: deletedBook, error: verifyError } = await supabase
        .from('books')
        .select()
        .eq('id', createdBook.id)
        .single();

      expect(verifyError).not.toBeNull();
      expect(deletedBook).toBeNull();
    });

    it('should handle transactions correctly', async () => {
      // Create a test order with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: global.testUser.id,
          status: 'pending',
          total_amount: 0,
          payment_method: 'credit_card',
          shipping_address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            zip_code: '12345'
          }
        }])
        .select()
        .single();

      expect(orderError).toBeNull();
      expect(order).toHaveProperty('id');

      // Create order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .insert([{
          order_id: order.id,
          book_id: '00000000-0000-0000-0000-000000000000',
          quantity: 2,
          price: 9.99,
          total: 19.98
        }])
        .select();

      expect(itemsError).toBeNull();
      expect(items).toHaveLength(1);

      // Update order total
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ total_amount: 19.98 })
        .eq('id', order.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedOrder.total_amount).toBe(19.98);
    });
  });

  describe('RPC Functions', () => {
    it('should call get_user_stats function', async () => {
      const { data, error } = await supabase.rpc('get_user_stats', {
        user_id: global.testUser.id
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('total_books_read');
      expect(data).toHaveProperty('total_pages_read');
      expect(data).toHaveProperty('total_bookmarks');
      expect(data).toHaveProperty('total_orders');
      expect(data).toHaveProperty('total_spent');
    });

    it('should call get_admin_stats function', async () => {
      const { data, error } = await supabase.rpc('get_admin_stats');

      expect(error).toBeNull();
      expect(data).toHaveProperty('total_users');
      expect(data).toHaveProperty('total_books');
      expect(data).toHaveProperty('total_orders');
      expect(data).toHaveProperty('total_revenue');
      expect(data).toHaveProperty('orders_by_status');
      expect(data).toHaveProperty('recent_orders');
    });
  });

  describe('Row Level Security', () => {
    it('should enforce RLS policies for user data', async () => {
      // Try to access another user's profile
      const { data, error } = await supabase
        .from('user_profiles')
        .select()
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should enforce RLS policies for orders', async () => {
      // Try to access another user's orders
      const { data, error } = await supabase
        .from('orders')
        .select()
        .eq('user_id', '00000000-0000-0000-0000-000000000000');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should allow admin access to all data', async () => {
      // Create admin client
      const adminClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // Try to access all user profiles
      const { data, error } = await adminClient
        .from('user_profiles')
        .select();

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const { data, error } = await supabase
        .from('books')
        .select('invalid_column')
        .eq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should handle constraint violations', async () => {
      // Try to create a book with duplicate ISBN
      const { data, error } = await supabase
        .from('books')
        .insert([{
          title: 'Test Book',
          author: 'Test Author',
          isbn: '978-0000000000' // Assuming this ISBN already exists
        }]);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });
});

describe('Supabase Service Integration', () => {
  let testUser;
  let testBook;

  beforeAll(async () => {
    // Create a test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    if (userError) throw userError;
    testUser = user;

    // Create a test book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000001'
      })
      .select()
      .single();
    if (bookError) throw bookError;
    testBook = book;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('books').delete().eq('id', testBook.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('Auth Service', () => {
    it('should handle user registration', async () => {
      const { data, error } = await authService.register({
        email: 'newuser@example.com',
        password: 'password123'
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe('newuser@example.com');

      // Clean up
      await supabase.auth.admin.deleteUser(data.user.id);
    });

    it('should handle user login', async () => {
      const { data, error } = await authService.login({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('session');
      expect(data.session).toHaveProperty('access_token');
    });

    it('should handle password reset', async () => {
      const { error } = await authService.resetPassword('test@example.com');
      expect(error).toBeNull();
    });
  });

  describe('Shelf Service', () => {
    it('should add book to user shelf', async () => {
      const { data, error } = await shelfService.addToShelf({
        userId: testUser.id,
        bookId: testBook.id,
        status: 'reading'
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('id');
      expect(data.status).toBe('reading');
    });

    it('should update book status', async () => {
      const { data, error } = await shelfService.updateStatus({
        userId: testUser.id,
        bookId: testBook.id,
        status: 'completed'
      });

      expect(error).toBeNull();
      expect(data.status).toBe('completed');
    });

    it('should get user shelf', async () => {
      const { data, error } = await shelfService.getUserShelf(testUser.id);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('book');
      expect(data[0]).toHaveProperty('status');
    });
  });

  describe('Stats Service', () => {
    it('should get user reading stats', async () => {
      const { data, error } = await statsService.getUserStats(testUser.id);

      expect(error).toBeNull();
      expect(data).toHaveProperty('total_books_read');
      expect(data).toHaveProperty('total_pages_read');
      expect(data).toHaveProperty('favorite_genres');
      expect(data).toHaveProperty('reading_streak');
    });

    it('should get genre distribution', async () => {
      const { data, error } = await statsService.getGenreDistribution(testUser.id);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('genre');
      expect(data[0]).toHaveProperty('count');
    });

    it('should get reading progress', async () => {
      const { data, error } = await statsService.getReadingProgress(testUser.id);

      expect(error).toBeNull();
      expect(data).toHaveProperty('current_streak');
      expect(data).toHaveProperty('longest_streak');
      expect(data).toHaveProperty('average_pages_per_day');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user ID', async () => {
      const { data, error } = await shelfService.getUserShelf('invalid-id');
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should handle invalid book ID', async () => {
      const { data, error } = await shelfService.addToShelf({
        userId: testUser.id,
        bookId: 'invalid-id',
        status: 'reading'
      });
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should handle invalid status', async () => {
      const { data, error } = await shelfService.updateStatus({
        userId: testUser.id,
        bookId: testBook.id,
        status: 'invalid-status'
      });
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });
}); 