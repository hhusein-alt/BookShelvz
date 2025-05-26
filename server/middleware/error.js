const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      user: req.user?.id || 'anonymous'
    }
  });

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Production error response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Programming or unknown errors
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  });
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler (can still be relevant for request body validation)
const handleValidationError = (err) => {
  // Assuming err.errors structure is from express-validator or similar
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Remove MongoDB-specific error handlers
// const handleCastError = (err) => {
//   const message = `Invalid ${err.path}: ${err.value}`;
//   return new AppError(message, 400);
// };

// const handleDuplicateKeyError = (err) => {
//   const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
//   const message = `Duplicate field value: ${value}. Please use another value!`;
//   return new AppError(message, 400);
// };

// JWT error handlers (still relevant)
const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

// You might need to add specific error handlers for Supabase/PostgreSQL errors
// Example (basic):
// const handleSupabaseError = (err) => {
//   // Inspect the structure of errors from Supabase client
//   console.error('Supabase Error Details:', err.originalError);
//   return new AppError(`Database Error: ${err.message}`, 500); // Adjust status code based on error type
// };

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleValidationError,
  handleJWTError,
  handleJWTExpiredError,
  // Add Supabase-specific error handlers here if needed
  // handleSupabaseError
}; 