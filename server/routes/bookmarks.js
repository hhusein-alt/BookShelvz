const express = require('express');
const router = express.Router();
const { validateRequest, schemas } = require('../middleware/validateRequest');
const { AppError } = require('../middleware/errorHandler');
const NodeCache = require('node-cache');

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Get all bookmarks for a user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const cacheKey = `bookmarks:${userId}:${page}:${limit}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error, count } = await req.supabase
      .from('bookmarks')
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
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new AppError('Error fetching bookmarks', 500);

    const result = {
      bookmarks: data,
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

// Get bookmark by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const cacheKey = `bookmark:${id}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { data, error } = await req.supabase
      .from('bookmarks')
      .select(`
        *,
        books (
          id,
          title,
          author,
          cover_url
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw new AppError('Bookmark not found', 404);

    // Cache the result
    cache.set(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Create new bookmark
router.post('/',
  validateRequest(schemas.bookmark.create),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const bookmarkData = {
        ...req.body,
        user_id: userId
      };

      const { data, error } = await req.supabase
        .from('bookmarks')
        .insert([bookmarkData])
        .select(`
          *,
          books (
            id,
            title,
            author,
            cover_url
          )
        `)
        .single();

      if (error) throw new AppError('Error creating bookmark', 500);

      // Clear relevant caches
      cache.del(`bookmarks:${userId}:*`);
      
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Update bookmark
router.put('/:id',
  validateRequest(schemas.bookmark.create),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { data, error } = await req.supabase
        .from('bookmarks')
        .update(req.body)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
          *,
          books (
            id,
            title,
            author,
            cover_url
          )
        `)
        .single();

      if (error) throw new AppError('Error updating bookmark', 500);

      // Clear relevant caches
      cache.del(`bookmark:${id}`);
      cache.del(`bookmarks:${userId}:*`);
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Delete bookmark
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await req.supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new AppError('Error deleting bookmark', 500);

    // Clear relevant caches
    cache.del(`bookmark:${id}`);
    cache.del(`bookmarks:${userId}:*`);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get bookmarks for a specific book
router.get('/book/:bookId', async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const cacheKey = `bookmarks:book:${bookId}:${userId}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { data, error } = await req.supabase
      .from('bookmarks')
      .select('*')
      .eq('book_id', bookId)
      .eq('user_id', userId)
      .order('page_number', { ascending: true });

    if (error) throw new AppError('Error fetching bookmarks', 500);

    // Cache the result
    cache.set(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 