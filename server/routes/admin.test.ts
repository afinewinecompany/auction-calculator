/**
 * Tests for Admin Routes
 *
 * Tests POST /api/admin/scrape endpoint including:
 * - Development-only access (404 in production)
 * - Success response format
 * - Triggering runFullScrape
 * - Logging events
 * - Error handling
 * - Route registration verification
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Mock runFullScrape
vi.mock('../services/scraper', () => ({
  runFullScrape: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  log: vi.fn(),
}));

// Import after mocking
import adminRouter from './admin';
import { runFullScrape } from '../services/scraper';
import { log } from '../lib/logger';

describe('admin routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to development mode
    process.env.NODE_ENV = 'development';

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
  });

  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('POST /api/admin/scrape', () => {
    it('should return 404 when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/admin/scrape')
        .expect(404);

      expect(response.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'Not found' },
      });
    });

    it('should return success response in development', async () => {
      const response = await request(app)
        .post('/api/admin/scrape')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Scrape initiated',
      });
    });

    it('should trigger runFullScrape when called', async () => {
      await request(app).post('/api/admin/scrape').expect(200);

      expect(runFullScrape).toHaveBeenCalled();
    });

    it('should log manual_scrape_triggered event', async () => {
      await request(app).post('/api/admin/scrape').expect(200);

      expect(log).toHaveBeenCalledWith('info', 'manual_scrape_triggered', {
        timestamp: expect.any(String),
        ip: expect.any(String),
      });
    });

    it('should return immediately without waiting for scrape to complete', async () => {
      // Make runFullScrape take a long time
      let resolvePromise: () => void;
      const slowPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(runFullScrape).mockReturnValueOnce(slowPromise);

      const startTime = Date.now();
      await request(app).post('/api/admin/scrape').expect(200);
      const elapsed = Date.now() - startTime;

      // Response should be near-instant (< 100ms), not waiting for the slow scrape
      expect(elapsed).toBeLessThan(100);

      // Clean up the pending promise
      resolvePromise!();
    });

    it('should handle runFullScrape errors gracefully', async () => {
      // Mock runFullScrape to reject
      vi.mocked(runFullScrape).mockRejectedValueOnce(new Error('Scrape failed'));

      // Request should still succeed (error is logged, not thrown)
      const response = await request(app)
        .post('/api/admin/scrape')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Scrape initiated',
      });

      // Give the promise time to reject and log
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(log).toHaveBeenCalledWith('error', 'manual_scrape_error', {
        error: 'Scrape failed',
      });
    });

    it('should work when NODE_ENV is undefined (default to development)', async () => {
      delete process.env.NODE_ENV;

      const response = await request(app)
        .post('/api/admin/scrape')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Scrape initiated',
      });
    });

    it('should work when NODE_ENV is staging (non-production)', async () => {
      process.env.NODE_ENV = 'staging';

      const response = await request(app)
        .post('/api/admin/scrape')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Scrape initiated',
      });
    });
  });

  describe('route registration', () => {
    it('should register admin routes under /api/admin prefix via registerRoutes', async () => {
      // This test verifies the integration with server/routes.ts
      // Import registerRoutes to test actual route mounting
      const { registerRoutes } = await import('../routes');

      const testApp = express();
      testApp.use(express.json());

      // registerRoutes mounts admin routes at /api/admin
      await registerRoutes(testApp);

      // Verify the route is accessible at the expected path
      const response = await request(testApp)
        .post('/api/admin/scrape')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Scrape initiated',
      });
    });
  });
});
