const Joi = require('joi');
const { validateSchema, validateUUID } = require('../../utils/validation');

describe('Validation Utilities', () => {
  describe('validateSchema Function', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0).max(120),
      email: Joi.string().email(),
      preferences: Joi.object({
        theme: Joi.string().valid('light', 'dark'),
        notifications: Joi.boolean()
      })
    });

    it('should validate valid data', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        preferences: {
          theme: 'light',
          notifications: true
        }
      };

      const result = validateSchema(data, testSchema);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should reject invalid data', () => {
      const data = {
        name: '', // Invalid: empty name
        age: 150, // Invalid: age > 120
        email: 'invalid-email', // Invalid: not an email
        preferences: {
          theme: 'invalid-theme', // Invalid: not a valid theme
          notifications: 'yes' // Invalid: not a boolean
        }
      };

      const result = validateSchema(data, testSchema);
      expect(result.error).toBeDefined();
      expect(result.error.details).toHaveLength(4);
    });

    it('should handle missing optional fields', () => {
      const data = {
        name: 'John Doe'
      };

      const result = validateSchema(data, testSchema);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should handle null values', () => {
      const data = {
        name: 'John Doe',
        age: null,
        email: null,
        preferences: null
      };

      const result = validateSchema(data, testSchema);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateUUID Function', () => {
    it('should validate valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff'
      ];

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        '123e4567-e89b-12d3-a456-4266141740000', // Too long
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
        '123e4567-e89b-12d3-a456-42661417400-', // Invalid format
        '' // Empty string
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('Book Validation', () => {
    const bookSchema = Joi.object({
      title: Joi.string().required().min(1).max(255),
      author: Joi.string().required().min(1).max(255),
      description: Joi.string().max(1000),
      genre: Joi.string().required(),
      price: Joi.number().min(0).required(),
      isbn: Joi.string().pattern(/^978-\d{10}$/).required(),
      published_date: Joi.date().max('now'),
      stock_quantity: Joi.number().integer().min(0)
    });

    it('should validate valid book data', () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000001',
        published_date: '2023-01-01',
        stock_quantity: 10
      };

      const result = validateSchema(bookData, bookSchema);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(bookData);
    });

    it('should reject invalid book data', () => {
      const bookData = {
        title: '', // Invalid: empty title
        author: '', // Invalid: empty author
        price: -10, // Invalid: negative price
        isbn: 'invalid-isbn', // Invalid: wrong format
        published_date: '2025-01-01' // Invalid: future date
      };

      const result = validateSchema(bookData, bookSchema);
      expect(result.error).toBeDefined();
    });
  });

  describe('Order Validation', () => {
    const orderSchema = Joi.object({
      items: Joi.array().items(
        Joi.object({
          book_id: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required(),
          price: Joi.number().min(0).required()
        })
      ).min(1).required(),
      payment_method: Joi.string().valid('credit_card', 'paypal', 'bank_transfer').required(),
      shipping_address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        country: Joi.string().required(),
        zip_code: Joi.string().required()
      }).required()
    });

    it('should validate valid order data', () => {
      const orderData = {
        items: [{
          book_id: '123e4567-e89b-12d3-a456-426614174000',
          quantity: 2,
          price: 9.99
        }],
        payment_method: 'credit_card',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zip_code: '12345'
        }
      };

      const result = validateSchema(orderData, orderSchema);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(orderData);
    });

    it('should reject invalid order data', () => {
      const orderData = {
        items: [], // Invalid: empty items
        payment_method: 'invalid_method', // Invalid: not a valid payment method
        shipping_address: {
          street: '', // Invalid: empty street
          city: '', // Invalid: empty city
          state: '', // Invalid: empty state
          country: '', // Invalid: empty country
          zip_code: '' // Invalid: empty zip code
        }
      };

      const result = validateSchema(orderData, orderSchema);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Profile Validation', () => {
    const userProfileSchema = Joi.object({
      name: Joi.string().required().min(1).max(255),
      email: Joi.string().email().required(),
      preferences: Joi.object({
        theme: Joi.string().valid('light', 'dark'),
        notifications: Joi.boolean(),
        language: Joi.string().valid('en', 'es', 'fr')
      })
    });

    it('should validate valid user profile data', () => {
      const profileData = {
        name: 'John Doe',
        email: 'john@example.com',
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en'
        }
      };

      const result = validateSchema(profileData, userProfileSchema);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(profileData);
    });

    it('should reject invalid user profile data', () => {
      const profileData = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: not an email
        preferences: {
          theme: 'invalid-theme', // Invalid: not a valid theme
          language: 'invalid-language' // Invalid: not a valid language
        }
      };

      const result = validateSchema(profileData, userProfileSchema);
      expect(result.error).toBeDefined();
    });
  });
}); 