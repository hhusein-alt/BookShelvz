const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AppError extends Error {
  constructor(message, statusCode, error = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.originalError = error;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error types
class ValidationError extends AppError {
  constructor(message, errors) {
    super(message, 400);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class DatabaseError extends AppError {
  constructor(message, error) {
    super(message, 500, error);
  }
}

const errorHandler = (err, req, res, next) => {
  // Generate request ID if not exists
  const requestId = req.id || uuidv4();
  req.id = requestId;

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error with request context
  logger.error({
    requestId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: {
        message: err.message,
        stack: err.stack,
        ...(err.originalError && { originalError: err.originalError })
      },
      requestId
    });
  } else {
    // Production error response
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        ...(err.errors && { errors: err.errors }),
        requestId
      });
    } else {
      // Programming or unknown errors
      logger.error('UNEXPECTED ERROR 💥', {
        requestId,
        error: err
      });
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
        requestId
      });
    }
  }
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  errorHandler
}; 