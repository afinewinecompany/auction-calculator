import { describe, it, expect } from 'vitest';
import { AppError } from './errors';

describe('AppError', () => {
  it('should create an error with code, message, and default statusCode', () => {
    const error = new AppError('TEST_ERROR', 'Test error message');

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.statusCode).toBe(500);
    expect(error.details).toBeUndefined();
    expect(error.name).toBe('AppError');
  });

  it('should create an error with custom statusCode', () => {
    const error = new AppError('NOT_FOUND', 'Resource not found', 404);

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
    expect(error.statusCode).toBe(404);
  });

  it('should create an error with details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new AppError('VALIDATION_ERROR', 'Validation failed', 400, details);

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Validation failed');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });

  it('should extend Error class', () => {
    const error = new AppError('TEST', 'Test');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should have a stack trace', () => {
    const error = new AppError('TEST', 'Test');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});
