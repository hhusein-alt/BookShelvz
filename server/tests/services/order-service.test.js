const { supabase } = require('../../config/supabase');
const { AppError } = require('../../utils/error');
const { createTestBook, createTestOrder } = require('../setup');

describe('Order Service', () => {
  describe('Order Creation', () => {
    it('should create a new order', async () => {
      const testBook = await createTestBook();
      const orderData = {
        user_id: global.testUserId,
        items: [{
          book_id: testBook.id,
          quantity: 2,
          price: testBook.price
        }],
        total_amount: testBook.price * 2,
        payment_method: 'credit_card',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zip_code: '12345'
        }
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(order).toMatchObject({
        user_id: orderData.user_id,
        total_amount: orderData.total_amount,
        payment_method: orderData.payment_method,
        status: 'pending'
      });

      // Verify order items
      const { data: items } = await supabase
        .from('order_items')
        .select()
        .eq('order_id', order.id);

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        book_id: testBook.id,
        quantity: 2,
        price: testBook.price
      });
    });

    it('should calculate total amount correctly', async () => {
      const testBook1 = await createTestBook();
      const testBook2 = await createTestBook();

      const orderData = {
        user_id: global.testUserId,
        items: [
          {
            book_id: testBook1.id,
            quantity: 2,
            price: testBook1.price
          },
          {
            book_id: testBook2.id,
            quantity: 1,
            price: testBook2.price
          }
        ],
        payment_method: 'credit_card',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zip_code: '12345'
        }
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          total_amount: orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(order.total_amount).toBe(testBook1.price * 2 + testBook2.price);
    });
  });

  describe('Order Status Management', () => {
    it('should update order status', async () => {
      const testOrder = await createTestOrder();

      const { data: order, error } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', testOrder.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(order.status).toBe('processing');
    });

    it('should not allow invalid status transitions', async () => {
      const testOrder = await createTestOrder();

      // First update to completed
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', testOrder.id);

      // Try to update back to pending
      const { error } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', testOrder.id);

      expect(error).not.toBeNull();
    });
  });

  describe('Order Cancellation', () => {
    it('should allow cancellation of pending orders', async () => {
      const testOrder = await createTestOrder();

      const { data: order, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', testOrder.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(order.status).toBe('cancelled');
    });

    it('should not allow cancellation of completed orders', async () => {
      const testOrder = await createTestOrder();

      // First complete the order
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', testOrder.id);

      // Try to cancel
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', testOrder.id);

      expect(error).not.toBeNull();
    });
  });

  describe('Order Retrieval', () => {
    it('should retrieve user orders', async () => {
      const testOrder = await createTestOrder();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', global.testUserId);

      expect(error).toBeNull();
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe(testOrder.id);
      expect(orders[0].order_items).toHaveLength(1);
    });

    it('should retrieve order details with items', async () => {
      const testOrder = await createTestOrder();

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            books(*)
          )
        `)
        .eq('id', testOrder.id)
        .single();

      expect(error).toBeNull();
      expect(order).toHaveProperty('order_items');
      expect(order.order_items[0]).toHaveProperty('books');
    });
  });

  describe('Order Statistics', () => {
    it('should calculate order statistics', async () => {
      const testOrder = await createTestOrder();

      const { data: stats, error } = await supabase
        .rpc('get_order_stats', { user_id: global.testUserId });

      expect(error).toBeNull();
      expect(stats).toHaveProperty('total_orders');
      expect(stats).toHaveProperty('total_spent');
      expect(stats).toHaveProperty('average_order_value');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid book references', async () => {
      const orderData = {
        user_id: global.testUserId,
        items: [{
          book_id: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
          price: 9.99
        }],
        total_amount: 9.99,
        payment_method: 'credit_card',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zip_code: '12345'
        }
      };

      const { error } = await supabase
        .from('orders')
        .insert(orderData);

      expect(error).not.toBeNull();
    });

    it('should handle invalid payment methods', async () => {
      const testBook = await createTestBook();
      const orderData = {
        user_id: global.testUserId,
        items: [{
          book_id: testBook.id,
          quantity: 1,
          price: testBook.price
        }],
        total_amount: testBook.price,
        payment_method: 'invalid_method',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zip_code: '12345'
        }
      };

      const { error } = await supabase
        .from('orders')
        .insert(orderData);

      expect(error).not.toBeNull();
    });
  });
}); 