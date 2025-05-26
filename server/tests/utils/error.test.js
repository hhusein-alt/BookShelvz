const { AppError, handleError } = require('../../utils/error');

describe('Error Utilities', () => {
  describe('AppError Class', () => {
    it('should create an AppError with default status code', () => {
      const error = new AppError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.status).toBe('error');
    });

    it('should create an AppError with custom status code', () => {
      const error = new AppError('Not found', 404);
      expect(error.statusCode).toBe(404);
      expect(error.status).toBe('error');
    });

    it('should create an AppError with custom status', () => {
      const error = new AppError('Validation failed', 400, 'fail');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new AppError('Test error');
      expect(error.stack).toBeUndefined();
    });
  });

  describe('handleError Function', () => {
    let mockResponse;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400);
      handleError(error, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });

    it('should handle validation errors', () => {
      const error = new AppError('Validation failed', 400, 'fail');
      handleError(error, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Validation failed'
      });
    });

    it('should handle database errors', () => {
      const error = new Error('Database connection failed');
      error.code = '23505'; // Unique violation
      handleError(error, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Duplicate entry'
      });
    });

    it('should handle foreign key violations', () => {
      const error = new Error('Foreign key violation');
      error.code = '23503';
      handleError(error, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid reference'
      });
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      handleError(error, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error'
      });
    });

    it('should include error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      handleError(error, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        error: error.message,
        stack: error.stack
      });
    });

    it('should not include error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      handleError(error, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error'
      });
    });
  });

  describe('Error Types', () => {
    it('should handle not found errors', () => {
      const error = new AppError('Resource not found', 404);
      expect(error.statusCode).toBe(404);
      expect(error.status).toBe('error');
    });

    it('should handle unauthorized errors', () => {
      const error = new AppError('Unauthorized access', 401);
      expect(error.statusCode).toBe(401);
      expect(error.status).toBe('error');
    });

    it('should handle forbidden errors', () => {
      const error = new AppError('Access forbidden', 403);
      expect(error.statusCode).toBe(403);
      expect(error.status).toBe('error');
    });

    it('should handle conflict errors', () => {
      const error = new AppError('Resource conflict', 409);
      expect(error.statusCode).toBe(409);
      expect(error.status).toBe('error');
    });

    it('should handle validation errors', () => {
      const error = new AppError('Invalid input', 400, 'fail');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain error inheritance chain', () => {
      const error = new AppError('Test error');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should preserve error properties', () => {
      const error = new AppError('Test error', 400, 'fail');
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
    });
  });
}); 