/**
 * Health Check API Route Tests
 *
 * Tests for the health check endpoint that provides
 * API status and scrape metadata for monitoring.
 *
 * @module server/routes/v1/health.test
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRoutes from './health';
import { errorHandler } from '../../middleware/error-handler';

// Mock projections service
vi.mock('../../services/projections', () => ({
  getLatestScrapeMetadata: vi.fn(),
}));

import { getLatestScrapeMetadata } from '../../services/projections';

const mockGetLatestScrapeMetadata = vi.mocked(getLatestScrapeMetadata);

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/health', healthRoutes);
  app.use(errorHandler);
  return app;
}

describe('Health Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /v1/health', () => {
    it('should return healthy status when both scrapes are fresh', async () => {
      const now = new Date();
      const battersScrape = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/batters',
        projectionSystem: 'steamer',
        playerCount: 523,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };
      const pitchersScrape = {
        id: 2,
        scrapeType: 'pitchers',
        sourceUrl: 'https://fangraphs.com/pitchers',
        projectionSystem: 'steamer',
        playerCount: 312,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(battersScrape)
        .mockResolvedValueOnce(pitchersScrape);

      const response = await request(app).get('/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.scrape.batters.playerCount).toBe(523);
      expect(response.body.scrape.pitchers.playerCount).toBe(312);
    });

    it('should return degraded status when batters data is stale (>48h)', async () => {
      const now = new Date();
      const staleTime = new Date(now.getTime() - 49 * 60 * 60 * 1000); // 49 hours ago

      const battersScrape = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/batters',
        projectionSystem: 'steamer',
        playerCount: 523,
        status: 'success',
        errorMessage: null,
        startedAt: staleTime,
        completedAt: staleTime,
      };
      const pitchersScrape = {
        id: 2,
        scrapeType: 'pitchers',
        sourceUrl: 'https://fangraphs.com/pitchers',
        projectionSystem: 'steamer',
        playerCount: 312,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(battersScrape)
        .mockResolvedValueOnce(pitchersScrape);

      const response = await request(app).get('/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
    });

    it('should return degraded status when pitchers data is stale (>48h)', async () => {
      const now = new Date();
      const staleTime = new Date(now.getTime() - 49 * 60 * 60 * 1000); // 49 hours ago

      const battersScrape = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/batters',
        projectionSystem: 'steamer',
        playerCount: 523,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };
      const pitchersScrape = {
        id: 2,
        scrapeType: 'pitchers',
        sourceUrl: 'https://fangraphs.com/pitchers',
        projectionSystem: 'steamer',
        playerCount: 312,
        status: 'success',
        errorMessage: null,
        startedAt: staleTime,
        completedAt: staleTime,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(battersScrape)
        .mockResolvedValueOnce(pitchersScrape);

      const response = await request(app).get('/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
    });

    it('should return degraded status when batters data is missing', async () => {
      const now = new Date();
      const pitchersScrape = {
        id: 2,
        scrapeType: 'pitchers',
        sourceUrl: 'https://fangraphs.com/pitchers',
        projectionSystem: 'steamer',
        playerCount: 312,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pitchersScrape);

      const response = await request(app).get('/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.scrape.batters.lastSuccess).toBeNull();
      expect(response.body.scrape.batters.playerCount).toBe(0);
    });

    it('should return degraded status when pitchers data is missing', async () => {
      const now = new Date();
      const battersScrape = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/batters',
        projectionSystem: 'steamer',
        playerCount: 523,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(battersScrape)
        .mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.scrape.pitchers.lastSuccess).toBeNull();
      expect(response.body.scrape.pitchers.playerCount).toBe(0);
    });

    it('should return unhealthy status when no scrape data exists', async () => {
      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.scrape.batters.lastSuccess).toBeNull();
      expect(response.body.scrape.batters.playerCount).toBe(0);
      expect(response.body.scrape.pitchers.lastSuccess).toBeNull();
      expect(response.body.scrape.pitchers.playerCount).toBe(0);
    });

    it('should format lastSuccess as ISO string', async () => {
      const now = new Date();
      const battersScrape = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/batters',
        projectionSystem: 'steamer',
        playerCount: 523,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };
      const pitchersScrape = {
        id: 2,
        scrapeType: 'pitchers',
        sourceUrl: 'https://fangraphs.com/pitchers',
        projectionSystem: 'steamer',
        playerCount: 312,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(battersScrape)
        .mockResolvedValueOnce(pitchersScrape);

      const response = await request(app).get('/v1/health');

      expect(response.body.scrape.batters.lastSuccess).toBe(now.toISOString());
      expect(response.body.scrape.pitchers.lastSuccess).toBe(now.toISOString());
    });

    it('should include playerCount from scrape metadata', async () => {
      const now = new Date();
      const battersScrape = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/batters',
        projectionSystem: 'steamer',
        playerCount: 523,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };
      const pitchersScrape = {
        id: 2,
        scrapeType: 'pitchers',
        sourceUrl: 'https://fangraphs.com/pitchers',
        projectionSystem: 'steamer',
        playerCount: 312,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(battersScrape)
        .mockResolvedValueOnce(pitchersScrape);

      const response = await request(app).get('/v1/health');

      expect(response.body.scrape.batters.playerCount).toBe(523);
      expect(response.body.scrape.pitchers.playerCount).toBe(312);
    });

    it('should handle database errors gracefully', async () => {
      mockGetLatestScrapeMetadata.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app).get('/v1/health');

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should call getLatestScrapeMetadata for both batters and pitchers', async () => {
      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await request(app).get('/v1/health');

      expect(mockGetLatestScrapeMetadata).toHaveBeenCalledTimes(2);
      expect(mockGetLatestScrapeMetadata).toHaveBeenCalledWith('batters');
      expect(mockGetLatestScrapeMetadata).toHaveBeenCalledWith('pitchers');
    });

    it('should return correct response structure', async () => {
      const now = new Date();
      const battersScrape = {
        id: 1,
        scrapeType: 'batters',
        sourceUrl: 'https://fangraphs.com/batters',
        projectionSystem: 'steamer',
        playerCount: 523,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };
      const pitchersScrape = {
        id: 2,
        scrapeType: 'pitchers',
        sourceUrl: 'https://fangraphs.com/pitchers',
        projectionSystem: 'steamer',
        playerCount: 312,
        status: 'success',
        errorMessage: null,
        startedAt: now,
        completedAt: now,
      };

      mockGetLatestScrapeMetadata
        .mockResolvedValueOnce(battersScrape)
        .mockResolvedValueOnce(pitchersScrape);

      const response = await request(app).get('/v1/health');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('scrape');
      expect(response.body.scrape).toHaveProperty('batters');
      expect(response.body.scrape).toHaveProperty('pitchers');
      expect(response.body.scrape.batters).toHaveProperty('lastSuccess');
      expect(response.body.scrape.batters).toHaveProperty('playerCount');
      expect(response.body.scrape.pitchers).toHaveProperty('lastSuccess');
      expect(response.body.scrape.pitchers).toHaveProperty('playerCount');
    });
  });
});
