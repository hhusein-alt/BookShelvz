import { createClient } from '@supabase/supabase-js';

// Validate environment variables
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials. Please check your environment variables.');
}

// Custom error class for Supabase operations
class SupabaseError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'SupabaseError';
    this.code = code;
    this.details = details;
  }
}

// Initialize Supabase client with optimized configuration
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export default supabase;

// Security middleware with role-based access control
export const withAuth = async (callback, requiredRole = null) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new SupabaseError('Authentication error', 'AUTH_ERROR', error);
    if (!user) throw new SupabaseError('Not authenticated', 'NOT_AUTHENTICATED');

    if (requiredRole) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw new SupabaseError('Profile error', 'PROFILE_ERROR', profileError);
      if (profile.role !== requiredRole) {
        throw new SupabaseError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
      }
    }

    return callback(user);
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};

// Rate limiting helper
const rateLimiter = new Map();
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 100 // max requests per window
};

const checkRateLimit = (key) => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, []);
  }
  
  const requests = rateLimiter.get(key).filter(time => time > windowStart);
  rateLimiter.set(key, requests);
  
  if (requests.length >= RATE_LIMIT.maxRequests) {
    throw new SupabaseError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
  }
  
  requests.push(now);
};

// Optimized queries with caching and error handling
export const queries = {
  // Books
  getBooks: async (filters = {}) => {
    const cacheKey = `books:${JSON.stringify(filters)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      checkRateLimit('getBooks');
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
        `);

      if (filters.genre) {
        query = query.eq('genre', filters.genre);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters.id) {
        query = query.eq('id', filters.id).single();
      }

      const { data, error } = await query;
      if (error) throw new SupabaseError('Error fetching books', 'QUERY_ERROR', error);

      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error in getBooks:', error);
      throw error;
    }
  },

  // User shelf with optimized joins
  getUserShelf: async (userId) => {
    try {
      checkRateLimit('getUserShelf');
      const { data, error } = await supabase
        .from('user_shelves')
        .select(`
          *,
          books (
            *,
            reading_progress!inner (
              progress,
              last_read
            ),
            notes!inner (
              content,
              created_at
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new SupabaseError('Error fetching user shelf', 'QUERY_ERROR', error);
      return data;
    } catch (error) {
      console.error('Error in getUserShelf:', error);
      throw error;
    }
  },

  // Reading progress with optimistic updates
  updateReadingProgress: async (userId, bookId, progress) => {
    try {
      checkRateLimit('updateReadingProgress');
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: userId,
          book_id: bookId,
          progress,
          last_read: new Date().toISOString()
        }, {
          onConflict: 'user_id,book_id'
        });

      if (error) throw new SupabaseError('Error updating progress', 'QUERY_ERROR', error);
    } catch (error) {
      console.error('Error in updateReadingProgress:', error);
      throw error;
    }
  },

  // Bookmarks with optimistic updates
  getBookmarks: async (userId, bookId) => {
    try {
      checkRateLimit('getBookmarks');
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .order('page_number');

      if (error) throw new SupabaseError('Error fetching bookmarks', 'QUERY_ERROR', error);
      return data;
    } catch (error) {
      console.error('Error in getBookmarks:', error);
      throw error;
    }
  },

  addBookmark: async (userId, bookId, pageNumber, note = null) => {
    try {
      checkRateLimit('addBookmark');
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          book_id: bookId,
          page_number: pageNumber,
          note,
          created_at: new Date().toISOString()
        });

      if (error) throw new SupabaseError('Error adding bookmark', 'QUERY_ERROR', error);
    } catch (error) {
      console.error('Error in addBookmark:', error);
      throw error;
    }
  },

  removeBookmark: async (bookmarkId) => {
    try {
      checkRateLimit('removeBookmark');
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw new SupabaseError('Error removing bookmark', 'QUERY_ERROR', error);
    } catch (error) {
      console.error('Error in removeBookmark:', error);
      throw error;
    }
  },

  // User preferences with caching
  getUserPreferences: async (userId) => {
    const cacheKey = `preferences:${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      checkRateLimit('getUserPreferences');
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw new SupabaseError('Error fetching preferences', 'QUERY_ERROR', error);
      
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      throw error;
    }
  },

  updateUserPreferences: async (userId, preferences) => {
    try {
      checkRateLimit('updateUserPreferences');
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw new SupabaseError('Error updating preferences', 'QUERY_ERROR', error);
      
      // Update cache
      sessionStorage.setItem(`preferences:${userId}`, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      throw error;
    }
  },

  // Admin functions with role-based access
  getOrders: async () => {
    return withAuth(async (user) => {
      try {
        checkRateLimit('getOrders');
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            users (
              email,
              user_profiles (
                full_name
              )
            ),
            books (
              title,
              author
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw new SupabaseError('Error fetching orders', 'QUERY_ERROR', error);
        return data;
      } catch (error) {
        console.error('Error in getOrders:', error);
        throw error;
      }
    }, 'admin');
  },

  updateOrderStatus: async (orderId, status) => {
    return withAuth(async (user) => {
      try {
        checkRateLimit('updateOrderStatus');
        const { error } = await supabase
          .from('orders')
          .update({ 
            status,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('id', orderId);

        if (error) throw new SupabaseError('Error updating order', 'QUERY_ERROR', error);
      } catch (error) {
        console.error('Error in updateOrderStatus:', error);
        throw error;
      }
    }, 'admin');
  }
};

// Storage helpers with security checks
export const storage = {
  uploadPDF: async (file, orderId) => {
    try {
      // Validate file type
      if (!file.type.includes('pdf')) {
        throw new SupabaseError('Invalid file type', 'INVALID_FILE_TYPE');
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new SupabaseError('File too large', 'FILE_TOO_LARGE');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (error) throw new SupabaseError('Error uploading file', 'STORAGE_ERROR', error);
      return data;
    } catch (error) {
      console.error('Error in uploadPDF:', error);
      throw error;
    }
  },

  getPDFUrl: async (fileName) => {
    try {
      const { data } = supabase.storage
        .from('pdfs')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error in getPDFUrl:', error);
      throw new SupabaseError('Error getting PDF URL', 'STORAGE_ERROR', error);
    }
  }
}; 