const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');
const { errorHandler } = require('./middleware/errorHandler');
const { validateRequest } = require('./middleware/validateRequest');
const { authenticate } = require('./middleware/authenticate');
const routes = require('./routes');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Enhanced rate limiting with different limits for different endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login attempts per hour
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Enhanced compression
app.use(compression({
  level: 6,
  threshold: 100 * 1024, // Only compress responses larger than 100kb
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Enhanced request parsing with size limits and validation
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Enhanced logging with request ID
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substring(7);
  next();
});

app.use(morgan(':id :method :url :status :response-time ms', { 
  stream: { write: message => logger.info(message.trim()) } 
}));

// Initialize Supabase client with retry logic
const initializeSupabase = async (retries = 3) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase credentials');
    process.exit(1);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Test connection
    await supabase.from('books').select('count').limit(1);
    return supabase;
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Failed to initialize Supabase, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initializeSupabase(retries - 1);
    }
    logger.error('Failed to initialize Supabase after multiple attempts');
    process.exit(1);
  }
};

// Initialize Supabase and make it available in request object
let supabase;
(async () => {
  supabase = await initializeSupabase();
})();

app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    supabase: supabase ? 'connected' : 'disconnected'
  };
  res.json(health);
});

// API routes with enhanced middleware
app.use('/api', authenticate, validateRequest, routes);

// Enhanced error handling
app.use(errorHandler);

// Start server with graceful shutdown
const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Supabase connection
  if (supabase) {
    try {
      await supabase.auth.signOut();
      logger.info('Supabase connection closed');
    } catch (error) {
      logger.error('Error closing Supabase connection:', error);
    }
  }

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app; 