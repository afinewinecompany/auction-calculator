/**
 * Custom application error class for structured error handling.
 * All backend services should use this for known error conditions.
 *
 * @example
 * throw new AppError('SCRAPE_FAILED', 'Failed to fetch Fangraphs data', 502);
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    // Ensure instanceof works correctly in all transpilation targets
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
