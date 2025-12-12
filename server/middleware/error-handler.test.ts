import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from './error-handler';
import { AppError } from '../lib/errors';

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: ReturnType<typeof vi.fn>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockReq = {};
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };
    mockNext = vi.fn();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('handling AppError', () => {
    it('should return structured error response for AppError', () => {
      const error = new AppError('TEST_ERROR', 'Test error message', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
      });
    });

    it('should include details when present in AppError', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new AppError('VALIDATION_ERROR', 'Validation failed', 422, details);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(422);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email', reason: 'invalid' },
        },
      });
    });

    it('should use statusCode from AppError', () => {
      const error = new AppError('NOT_FOUND', 'Resource not found', 404);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
    });

    it('should use default 500 statusCode when not specified', () => {
      const error = new AppError('DB_ERROR', 'Database connection failed');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
    });
  });

  describe('handling unknown errors', () => {
    it('should return generic error response for standard Error', () => {
      const error = new Error('Some internal error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should return generic error response for TypeError', () => {
      const error = new TypeError('Cannot read property of undefined');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should not expose internal error details', () => {
      const error = new Error('Database password: secret123');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonSpy.mock.calls[0][0];
      expect(response.error.message).toBe('An unexpected error occurred');
      expect(response.error.message).not.toContain('secret123');
    });
  });

  describe('response format', () => {
    it('should return error object with correct structure', () => {
      const error = new AppError('TEST', 'Test', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonSpy.mock.calls[0][0];
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
    });

    it('should not include details key when details are undefined', () => {
      const error = new AppError('TEST', 'Test', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonSpy.mock.calls[0][0];
      expect('details' in response.error).toBe(false);
    });
  });

  describe('logging', () => {
    it('should log AppError with warn level', () => {
      const error = new AppError('TEST_ERROR', 'Test message', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('warn');
      expect(logOutput.event).toBe('app_error');
      expect(logOutput.data.code).toBe('TEST_ERROR');
    });

    it('should log unknown errors with error level', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('error');
      expect(logOutput.event).toBe('unhandled_error');
      expect(logOutput.data.message).toBe('Unknown error');
    });
  });
});
