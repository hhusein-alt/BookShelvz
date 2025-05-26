const { supabase } = require('../../config/supabase');
const { AppError } = require('../../utils/error');
const { createTestUser, createTestBook, createTestOrder } = require('../setup');

describe('Admin Service', () => {
  describe('User Management', () => {
    it('should retrieve all users', async () => {
      const testUser1 = await createTestUser();
      const testUser2 = await createTestUser();

      const { data: users, error } = await supabase
        .from('user_profiles')
        .select();

      expect(error).toBeNull();
      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users.map(u => u.user_id)).toContain(testUser1.user_id);
      expect(users.map(u => u.user_id)).toContain(testUser2.user_id);
    });

    it('should update user role', async () => {
      const testUser = await createTestUser();

      const { data: user, error } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('user_id', testUser.user_id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(user.role).toBe('admin');
    });

    it('should deactivate user', async () => {
      const testUser = await createTestUser();

      const { data: user, error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('user_id', testUser.user_id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(user.is_active).toBe(false);
    });
  });

  describe('Book Management', () => {
    it('should retrieve all books with details', async () => {
      const testBook1 = await createTestBook();
      const testBook2 = await createTestBook();

      const { data: books, error } = await supabase
        .from('books')
        .select(`
          *,
          book_categories(
            categories(*)
          )
        `);

      expect(error).toBeNull();
      expect(books.length).toBeGreaterThanOrEqual(2);
      expect(books.map(b => b.id)).toContain(testBook1.id);
      expect(books.map(b => b.id)).toContain(testBook2.id);
    });

    it('should update book status', async () => {
      const testBook = await createTestBook();

      const { data: book, error } = await supabase
        .from('books')
        .update({ status: 'unavailable' })
        .eq('id', testBook.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(book.status).toBe('unavailable');
    });

    it('should manage book inventory', async () => {
      const testBook = await createTestBook();

      const { data: book, error } = await supabase
        .from('books')
        .update({ stock_quantity: 10 })
        .eq('id', testBook.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(book.stock_quantity).toBe(10);
    });
  });

  describe('Order Management', () => {
    it('should retrieve all orders', async () => {
      const testOrder1 = await createTestOrder();
      const testOrder2 = await createTestOrder();

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            books(*)
          )
        `);

      expect(error).toBeNull();
      expect(orders.length).toBeGreaterThanOrEqual(2);
      expect(orders.map(o => o.id)).toContain(testOrder1.id);
      expect(orders.map(o => o.id)).toContain(testOrder2.id);
    });

    it('should update order status', async () => {
      const testOrder = await createTestOrder();

      const { data: order, error } = await supabase
        .from('orders')
        .update({ status: 'shipped' })
        .eq('id', testOrder.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(order.status).toBe('shipped');
    });

    it('should process refunds', async () => {
      const testOrder = await createTestOrder();

      // First complete the order
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', testOrder.id);

      // Process refund
      const { data: order, error } = await supabase
        .from('orders')
        .update({ 
          status: 'refunded',
          refund_amount: testOrder.total_amount
        })
        .eq('id', testOrder.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(order.status).toBe('refunded');
      expect(order.refund_amount).toBe(testOrder.total_amount);
    });
  });

  describe('Statistics and Reports', () => {
    it('should generate sales reports', async () => {
      const testOrder = await createTestOrder();

      const { data: stats, error } = await supabase
        .rpc('get_admin_stats');

      expect(error).toBeNull();
      expect(stats).toHaveProperty('total_sales');
      expect(stats).toHaveProperty('total_orders');
      expect(stats).toHaveProperty('average_order_value');
    });

    it('should generate user activity reports', async () => {
      const testUser = await createTestUser();
      const testBook = await createTestBook();

      // Create some activity
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
        .rpc('get_user_activity_stats');

      expect(error).toBeNull();
      expect(stats).toHaveProperty('active_users');
      expect(stats).toHaveProperty('total_reads');
      expect(stats).toHaveProperty('average_reading_time');
    });

    it('should generate inventory reports', async () => {
      const testBook = await createTestBook();

      // Update inventory
      await supabase
        .from('books')
        .update({ stock_quantity: 10 })
        .eq('id', testBook.id);

      const { data: stats, error } = await supabase
        .rpc('get_inventory_stats');

      expect(error).toBeNull();
      expect(stats).toHaveProperty('total_books');
      expect(stats).toHaveProperty('low_stock_items');
      expect(stats).toHaveProperty('out_of_stock_items');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid role updates', async () => {
      const testUser = await createTestUser();

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'invalid_role' })
        .eq('user_id', testUser.user_id);

      expect(error).not.toBeNull();
    });

    it('should handle invalid order status transitions', async () => {
      const testOrder = await createTestOrder();

      // First complete the order
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', testOrder.id);

      // Try to update to pending
      const { error } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', testOrder.id);

      expect(error).not.toBeNull();
    });

    it('should handle invalid inventory updates', async () => {
      const testBook = await createTestBook();

      const { error } = await supabase
        .from('books')
        .update({ stock_quantity: -1 })
        .eq('id', testBook.id);

      expect(error).not.toBeNull();
    });
  });
}); 