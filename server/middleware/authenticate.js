const { AppError, AuthenticationError, AuthorizationError } = require('./errorHandler');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

// Rate limiter for authentication attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for token refresh
const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 refreshes per hour
  message: 'Too many token refresh attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error } = await req.supabase.auth.getUser(token);

    if (error || !user) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Check if token is about to expire (within 5 minutes)
    const { data: session } = await req.supabase.auth.getSession();
    if (session?.session?.expires_at) {
      const expiresAt = new Date(session.session.expires_at * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt - now;
      
      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 5 * 60 * 1000) {
        const { data: refreshData, error: refreshError } = await req.supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          // Set new token in response header
          res.set('X-New-Token', refreshData.session.access_token);
        }
      }
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await req.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      throw new AppError('Error fetching user profile', 500);
    }

    // Attach user and profile to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user',
      ...profile
    };

    // Add security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    });

    next();
  } catch (error) {
    next(error);
  }
};

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('You do not have permission to perform this action'));
    }
    next();
  };
};

// Session management middleware
const manageSession = async (req, res, next) => {
  try {
    const { data: { session }, error } = await req.supabase.auth.getSession();
    
    if (error) {
      throw new AuthenticationError('Error checking session');
    }

    if (!session) {
      throw new AuthenticationError('No active session');
    }

    // Check session expiry
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    
    if (now >= expiresAt) {
      throw new AuthenticationError('Session expired');
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  manageSession,
  authLimiter,
  refreshLimiter
}; 