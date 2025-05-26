const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/authenticate');
const { validateRequest, schemas } = require('../middleware/validateRequest');

// Import route handlers
const bookRoutes = require('./books');
const categoryRoutes = require('./categories');
const userRoutes = require('./users');
const bookmarkRoutes = require('./bookmarks');
const orderRoutes = require('./orders');

// Book routes
router.use('/books', bookRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// User routes
router.use('/users', userRoutes);

// Bookmark routes
router.use('/bookmarks', bookmarkRoutes);

// Order routes (admin only)
router.use('/orders', authorize('admin'), orderRoutes);

// Admin routes
router.get('/admin/stats', authorize('admin'), async (req, res) => {
  try {
    const { data: stats, error } = await req.supabase.rpc('get_admin_stats');
    if (error) throw error;
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 