import { createClient } from '@supabase/supabase-js';
import config from './config';
import { toast } from 'react-hot-toast';

// Initialize Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  config.supabase.options
);

// API response handler
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'An error occurred');
  }
  return response.json();
};

// Retry mechanism
const retry = async (fn, retries = config.app.maxRetries) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
    return retry(fn, retries - 1);
  }
};

// Authentication utilities
export const auth = {
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  },

  async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      toast.error(error.message || 'Failed to sign up');
      throw error;
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully signed out');
    } catch (error) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
};

// Book-related API calls
export const books = {
  async getBooks() {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*');
      
      if (error) throw error;
      return data;
    } catch (error) {
      toast.error('Failed to fetch books');
      throw error;
    }
  },

  async getBookById(id) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      toast.error('Failed to fetch book details');
      throw error;
    }
  },

  async getUserShelf(userId) {
    try {
      const { data, error } = await supabase
        .from('user_shelf')
        .select('*, books(*)')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data;
    } catch (error) {
      toast.error('Failed to fetch your shelf');
      throw error;
    }
  }
};

// Statistics API calls
export const stats = {
  async getUserStats(userId) {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      toast.error('Failed to fetch statistics');
      throw error;
    }
  }
};

export default {
  auth,
  books,
  stats
}; 