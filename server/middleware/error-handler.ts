import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { log } from '../lib/logger';

/**
 * Express error handling middleware.
 * Formats errors into structured JSON responses and logs all errors.
 *
 * - AppError instances: Returns structured error with code, message, and optional details
 * - Unknown errors: Returns generic INTERNAL_ERROR response
 *
 * Must be registered AFTER all routes in Express app.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    // Log known application errors
    log('warn', 'app_error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
    });

    const errorResponse: { code: string; message: string; details?: unknown } = {
      code: err.code,
      message: err.message,
    };

    if (err.details !== undefined) {
      errorResponse.details = err.details;
    }

    res.status(err.statusCode).json({ error: errorResponse });
    return;
  }

  // Log unknown errors with full stack trace for debugging
  log('error', 'unhandled_error', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // Unknown error - return generic response (don't expose internals)
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
