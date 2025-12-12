/**
 * Vitest Setup File
 *
 * Configures global test environment settings.
 * Handles known issues with fake timers and async rejection handling.
 */

// Suppress unhandled rejection warnings that occur when testing async retry logic
// with fake timers. These are false positives - the rejections ARE handled,
// but Node reports them before the handler runs due to timer manipulation.
//
// See: https://github.com/vitest-dev/vitest/issues/3120
// This is a known limitation when combining vi.useFakeTimers() with async code
// that intentionally throws errors.
process.on('unhandledRejection', (reason, promise) => {
  // Check if this is an expected test rejection (AppError with SCRAPE_FAILED)
  if (
    reason &&
    typeof reason === 'object' &&
    'code' in reason &&
    (reason as { code: string }).code === 'SCRAPE_FAILED'
  ) {
    // Silently ignore - this is expected from scraper retry tests
    return;
  }

  // For other unhandled rejections, log them (they may be real issues)
  console.error('Unhandled Rejection:', reason);
});
