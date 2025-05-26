const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/authenticate');
const { validateRequest, schemas } = require('../middleware/validateRequest');
const { AppError } = require('../middleware/errorHandler');
const NodeCache = require('node-cache');

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Get all orders (admin only)
router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const cacheKey = `orders:${status}:${page}:${limit}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = req.supabase
      .from('orders')
      .select(`
        *,
        users (
          id,
          email,
          user_profiles (
            full_name
          )
        ),
        order_items (
          *,
          books (
            id,
            title,
            author,
            cover_url,
            price
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(start, end);

    if (error) throw new AppError('Error fetching orders', 500);

    const result = {
      orders: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    };

    // Cache the result
    cache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get user's orders
router.get('/my-orders', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const cacheKey = `orders:user:${userId}:${page}:${limit}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error, count } = await req.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          books (
            id,
            title,
            author,
            cover_url,
            price
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new AppError('Error fetching orders', 500);

    const result = {
      orders: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    };

    // Cache the result
    cache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get order by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const cacheKey = `order:${id}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { data, error } = await req.supabase
      .from('orders')
      .select(`
        *,
        users (
          id,
          email,
          user_profiles (
            full_name
          )
        ),
        order_items (
          *,
          books (
            id,
            title,
            author,
            cover_url,
            price
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new AppError('Order not found', 404);

    // Check if user is authorized to view this order
    if (data.user_id !== userId && req.user.role !== 'admin') {
      throw new AppError('Not authorized to view this order', 403);
    }

    // Cache the result
    cache.set(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Create new order
router.post('/',
  validateRequest(Joi.object({
    items: Joi.array().items(
      Joi.object({
        book_id: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required()
      })
    ).required(),
    payment_method: Joi.string().valid('credit_card', 'paypal').required(),
    shipping_address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zip_code: Joi.string().required()
    }).required()
  })),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { items, payment_method, shipping_address } = req.body;

      // Start a transaction
      const { data: order, error: orderError } = await req.supabase
        .from('orders')
        .insert([{
          user_id: userId,
          status: 'pending',
          payment_method,
          shipping_address,
          total_amount: 0 // Will be updated after calculating items
        }])
        .select()
        .single();

      if (orderError) throw new AppError('Error creating order', 500);

      // Calculate total and create order items
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const { data: book, error: bookError } = await req.supabase
          .from('books')
          .select('price')
          .eq('id', item.book_id)
          .single();

        if (bookError) throw new AppError('Error fetching book details', 500);

        const itemTotal = book.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          order_id: order.id,
          book_id: item.book_id,
          quantity: item.quantity,
          price: book.price,
          total: itemTotal
        });
      }

      // Create order items
      const { error: itemsError } = await req.supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw new AppError('Error creating order items', 500);

      // Update order total
      const { error: updateError } = await req.supabase
        .from('orders')
        .update({ total_amount: totalAmount })
        .eq('id', order.id);

      if (updateError) throw new AppError('Error updating order total', 500);

      // Clear relevant caches
      cache.del(`orders:user:${userId}:*`);
      
      res.status(201).json({
        ...order,
        total_amount: totalAmount,
        items: orderItems
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update order status (admin only)
router.patch('/:id/status',
  authorize('admin'),
  validateRequest(Joi.object({
    status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').required()
  })),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { data, error } = await req.supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError('Error updating order status', 500);

      // Clear relevant caches
      cache.del(`order:${id}`);
      cache.del(`orders:user:${data.user_id}:*`);
      cache.del('orders:*');
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Cancel order
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if order exists and belongs to user
    const { data: order, error: orderError } = await req.supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (orderError) throw new AppError('Order not found', 404);

    // Check if order can be cancelled
    if (order.status !== 'pending') {
      throw new AppError('Order cannot be cancelled in its current state', 400);
    }

    const { data, error } = await req.supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError('Error cancelling order', 500);

    // Clear relevant caches
    cache.del(`order:${id}`);
    cache.del(`orders:user:${userId}:*`);
    cache.del('orders:*');
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 