/**
 * Admin Routes
 *
 * Development-only endpoints for testing and debugging.
 * NOT available in production - returns 404.
 *
 * @module server/routes/admin
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { log } from '../lib/logger';
import { runFullScrape } from '../services/scraper';

const router = Router();

/**
 * Middleware to block admin routes in production.
 * Returns 404 to avoid revealing endpoint existence.
 */
function developmentOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });
    return;
  }
  next();
}

// Apply guard to all admin routes
router.use(developmentOnly);

/**
 * POST /api/admin/scrape
 *
 * Manually triggers a full scrape of all projection sources.
 * Runs asynchronously - returns immediately without waiting for completion.
 *
 * Response: { success: true, message: "Scrape initiated" }
 */
router.post('/scrape', (req: Request, res: Response): void => {
  log('info', 'manual_scrape_triggered', {
    timestamp: new Date().toISOString(),
    ip: req.ip || 'unknown',
  });

  // Run scrape in background (don't await)
  runFullScrape().catch((error: unknown) => {
    log('error', 'manual_scrape_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  res.json({
    success: true,
    message: 'Scrape initiated',
  });
});

export default router;
