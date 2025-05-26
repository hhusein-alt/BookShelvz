const Joi = require('joi');
const { AppError } = require('./errorHandler');

const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: source === 'query'
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => {
          const field = detail.path.join('.');
          return `${field}: ${detail.message}`;
        })
        .join(', ');
      return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }

    next();
  };
};

// Common validation schemas
const schemas = {
  book: {
    create: Joi.object({
      title: Joi.string().required().min(1).max(255)
        .messages({
          'string.empty': 'Title cannot be empty',
          'string.min': 'Title must be at least 1 character long',
          'string.max': 'Title cannot exceed 255 characters'
        }),
      author: Joi.string().required().min(1).max(255)
        .messages({
          'string.empty': 'Author name cannot be empty',
          'string.min': 'Author name must be at least 1 character long',
          'string.max': 'Author name cannot exceed 255 characters'
        }),
      description: Joi.string().max(1000)
        .messages({
          'string.max': 'Description cannot exceed 1000 characters'
        }),
      cover_url: Joi.string().uri()
        .messages({
          'string.uri': 'Cover URL must be a valid URL'
        }),
      pdf_url: Joi.string().uri()
        .messages({
          'string.uri': 'PDF URL must be a valid URL'
        }),
      genre: Joi.string().required()
        .messages({
          'string.empty': 'Genre is required'
        }),
      price: Joi.number().min(0)
        .messages({
          'number.min': 'Price cannot be negative'
        }),
      isbn: Joi.string().pattern(/^(?:\d[- ]?){9}[\dX]$/)
        .messages({
          'string.pattern.base': 'ISBN must be in valid format (e.g., 0-7475-3269-9)'
        }),
      published_date: Joi.date().iso()
        .messages({
          'date.base': 'Published date must be a valid date',
          'date.format': 'Published date must be in ISO format'
        })
    }),
    update: Joi.object({
      title: Joi.string().min(1).max(255),
      author: Joi.string().min(1).max(255),
      description: Joi.string().max(1000),
      cover_url: Joi.string().uri(),
      pdf_url: Joi.string().uri(),
      genre: Joi.string(),
      price: Joi.number().min(0),
      isbn: Joi.string().pattern(/^(?:\d[- ]?){9}[\dX]$/),
      published_date: Joi.date().iso()
    }),
    query: Joi.object({
      genre: Joi.string(),
      search: Joi.string().min(1),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('title', 'author', 'published_date', 'price'),
      order: Joi.string().valid('asc', 'desc').default('asc')
    })
  },
  user: {
    update: Joi.object({
      full_name: Joi.string().min(1).max(255),
      avatar_url: Joi.string().uri(),
      preferences: Joi.object({
        theme: Joi.string().valid('light', 'dark', 'system'),
        notifications: Joi.boolean(),
        language: Joi.string().min(2).max(5)
      })
    })
  },
  bookmark: {
    create: Joi.object({
      book_id: Joi.string().required(),
      page_number: Joi.number().integer().min(1).required(),
      note: Joi.string().max(500)
    })
  }
};

module.exports = {
  validateRequest,
  schemas
}; 