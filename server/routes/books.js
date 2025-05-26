const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/authenticate');
const { validateRequest, schemas } = require('../middleware/validateRequest');
const { AppError, NotFoundError, DatabaseError } = require('../middleware/errorHandler');
const NodeCache = require('node-cache');
const Joi = require('joi');

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

// Cache key generator
const generateCacheKey = (prefix, params) => {
  return `${prefix}:${JSON.stringify(params)}`;
};

// Get all books with filtering and pagination
router.get('/', 
  validateRequest(schemas.book.query, 'query'),
  async (req, res, next) => {
    try {
      const { genre, search, page = 1, limit = 10, sort = 'title', order = 'asc' } = req.query;
      const cacheKey = generateCacheKey('books', { genre, search, page, limit, sort, order });
      const supabase = req.supabase;

      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Build query
      let query = supabase
        .from('books')
        .select(`
          *,
          book_categories (
            categories (
              id,
              name,
              icon
            )
          ),
          reading_progress (
            progress,
            last_read
          )
        `, { count: 'exact' });

      // Apply filters
      if (genre) {
        query = query.eq('genre', genre);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) {
        throw new DatabaseError('Error fetching books', error);
      }

      const result = {
        books: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };

      // Cache the result
      cache.set(cacheKey, result);
      
      // Set cache control headers
      res.set('Cache-Control', 'public, max-age=300');
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get book by ID
router.get('/:id', 
  validateRequest(schemas.book.id, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const cacheKey = generateCacheKey('book', { id });
      const supabase = req.supabase;

      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          book_categories (
            categories (
              id,
              name,
              icon
            )
          ),
          reading_progress (
            progress,
            last_read
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new DatabaseError('Error fetching book', error);
      }

      if (!data) {
        throw new NotFoundError('Book not found');
      }

      // Cache the result
      cache.set(cacheKey, data);
      
      // Set cache control headers
      res.set('Cache-Control', 'public, max-age=300');
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Create new book (admin only)
router.post('/', 
  authorize('admin'),
  validateRequest(schemas.book.create),
  async (req, res, next) => {
    try {
      const { title, author, description, cover_url, pdf_url, genre, price, isbn, published_date } = req.body;
      const supabase = req.supabase;
      
      const { data, error } = await supabase
        .from('books')
        .insert([{ 
          title, 
          author, 
          description, 
          cover_url, 
          pdf_url, 
          genre, 
          price, 
          isbn, 
          published_date 
        }])
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Error creating book', error);
      }

      // Clear relevant caches
      cache.del('books:*');
      
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Update book (admin only)
router.put('/:id',
  authorize('admin'),
  validateRequest(schemas.book.id, 'params'),
  validateRequest(schemas.book.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, author, description, cover_url, pdf_url, genre, price, isbn, published_date } = req.body;
      const supabase = req.supabase;
      
      const { data, error } = await supabase
        .from('books')
        .update({ 
          title, 
          author, 
          description, 
          cover_url, 
          pdf_url, 
          genre, 
          price, 
          isbn, 
          published_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Error updating book', error);
      }

      if (!data) {
        throw new NotFoundError('Book not found');
      }

      // Clear relevant caches
      cache.del(`book:${id}`);
      cache.del('books:*');
      
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Delete book (admin only)
router.delete('/:id',
  authorize('admin'),
  validateRequest(schemas.book.id, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = req.supabase;
      
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseError('Error deleting book', error);
      }

      // Clear relevant caches
      cache.del(`book:${id}`);
      cache.del('books:*');
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Get book reading progress
router.get('/:id/progress', validateRequest(schemas.book.id, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const supabase = req.supabase; // Use supabase from request object

    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('book_id', id)
      .eq('user_id', userId)
      .single();

    if (error) return next(new AppError('Error fetching reading progress', 500, error));

    res.json(data || { progress: 0, last_read: null });
  } catch (error) {
    next(error);
  }
});

// Update book reading progress
router.post('/:id/progress',
  validateRequest(schemas.book.id, 'params'), // Validate ID parameter
  validateRequest(Joi.object({
    progress: Joi.number().min(0).max(100).required()
  })),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { progress } = req.body;
      const supabase = req.supabase; // Use supabase from request object

      const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
          book_id: id,
          user_id: userId,
          progress,
          last_read: new Date().toISOString()
        })
        .select()
        .single();

      if (error) return next(new AppError('Error updating reading progress', 500, error));

      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 