const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/authenticate');
const { validateRequest, schemas } = require('../middleware/validateRequest');
const { AppError } = require('../middleware/errorHandler');
const NodeCache = require('node-cache');

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `user:${userId}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { data, error } = await req.supabase
      .from('user_profiles')
      .select(`
        *,
        reading_progress (
          book_id,
          progress,
          last_read
        ),
        bookmarks (
          book_id,
          page_number,
          note,
          created_at
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error) throw new AppError('Error fetching user profile', 500);

    // Cache the result
    cache.set(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile',
  validateRequest(schemas.user.update),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const updates = req.body;

      const { data, error } = await req.supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw new AppError('Error updating profile', 500);

      // Clear cache
      cache.del(`user:${userId}`);
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Get user preferences
router.get('/preferences', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `preferences:${userId}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { data, error } = await req.supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error) throw new AppError('Error fetching preferences', 500);

    // Cache the result
    cache.set(cacheKey, data.preferences);
    
    res.json(data.preferences);
  } catch (error) {
    next(error);
  }
});

// Update user preferences
router.put('/preferences',
  validateRequest(Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system'),
    notifications: Joi.boolean(),
    language: Joi.string().min(2).max(5)
  })),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      const { data, error } = await req.supabase
        .from('user_profiles')
        .update({ preferences })
        .eq('user_id', userId)
        .select('preferences')
        .single();

      if (error) throw new AppError('Error updating preferences', 500);

      // Clear cache
      cache.del(`preferences:${userId}`);
      cache.del(`user:${userId}`);
      
      res.json(data.preferences);
    } catch (error) {
      next(error);
    }
  }
);

// Get user reading history
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const cacheKey = `history:${userId}:${page}:${limit}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error, count } = await req.supabase
      .from('reading_progress')
      .select(`
        *,
        books (
          id,
          title,
          author,
          cover_url
        )
      `)
      .eq('user_id', userId)
      .order('last_read', { ascending: false })
      .range(start, end);

    if (error) throw new AppError('Error fetching reading history', 500);

    const result = {
      history: data,
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

// Get user statistics
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `stats:${userId}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { data, error } = await req.supabase.rpc('get_user_stats', {
      user_id: userId
    });

    if (error) throw new AppError('Error fetching user statistics', 500);

    // Cache the result
    cache.set(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Delete user account
router.delete('/account',
  async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Delete user data
      const { error: profileError } = await req.supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw new AppError('Error deleting user profile', 500);

      // Delete user auth
      const { error: authError } = await req.supabase.auth.admin.deleteUser(userId);

      if (authError) throw new AppError('Error deleting user account', 500);

      // Clear all user-related caches
      cache.del(`user:${userId}`);
      cache.del(`preferences:${userId}`);
      cache.del(`history:${userId}:*`);
      cache.del(`stats:${userId}`);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 