/**
 * Projections API Routes Tests
 *
 * Tests for GET /v1/projections/batters and GET /v1/projections/pitchers
 * endpoints that serve projection data from the database.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectionsRoutes from './projections';
import { errorHandler } from '../../middleware/error-handler';
import { AppError } from '../../lib/errors';

// Mock projections service
vi.mock('../../services/projections', () => ({
  getLatestBatterProjections: vi.fn(),
  getLatestPitcherProjections: vi.fn(),
}));

import {
  getLatestBatterProjections,
  getLatestPitcherProjections,
} from '../../services/projections';

const mockGetLatestBatterProjections = vi.mocked(getLatestBatterProjections);
const mockGetLatestPitcherProjections = vi.mocked(getLatestPitcherProjections);

/**
 * Creates a test Express app with projections routes and error handler.
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/projections', projectionsRoutes);
  app.use(errorHandler);
  return app;
}

describe('Projections API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /v1/projections/batters', () => {
    it('should return batter projections with correct format', async () => {
      const mockData = {
        data: [
          {
            id: 1,
            name: 'Aaron Judge',
            team: 'NYY',
            positions: 'OF',
            pa: 600,
            ab: 520,
            h: 150,
            hr: 45,
            r: 100,
            rbi: 110,
            sb: 5,
            bb: 75,
            so: 150,
            avg: '0.288',
            obp: '0.380',
            slg: '0.580',
            woba: '0.410',
            wrcPlus: 165,
            scrapeId: 1,
            createdAt: new Date('2024-01-15T04:00:00Z'),
          },
        ],
        meta: {
          lastUpdated: new Date('2024-01-15T04:00:00Z'),
          count: 1,
          scrapeId: 1,
        },
      };

      mockGetLatestBatterProjections.mockResolvedValue(mockData);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/batters');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('lastUpdated');
      expect(response.body.meta).toHaveProperty('count');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Aaron Judge');
    });

    it('should format lastUpdated as ISO string', async () => {
      const testDate = new Date('2024-01-15T04:00:00Z');
      const mockData = {
        data: [],
        meta: {
          lastUpdated: testDate,
          count: 0,
          scrapeId: 1,
        },
      };

      mockGetLatestBatterProjections.mockResolvedValue(mockData);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/batters');

      expect(response.status).toBe(200);
      expect(response.body.meta.lastUpdated).toBe('2024-01-15T04:00:00.000Z');
    });

    it('should return 503 when no data available', async () => {
      mockGetLatestBatterProjections.mockResolvedValue(null);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/batters');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NO_PROJECTION_DATA');
      expect(response.body.error.message).toBe('No batter projection data available');
    });

    it('should return 500 on database error', async () => {
      mockGetLatestBatterProjections.mockRejectedValue(
        new AppError('DB_QUERY_FAILED', 'Database connection failed', 500)
      );

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/batters');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('DB_QUERY_FAILED');
    });

    it('should call getLatestBatterProjections service', async () => {
      mockGetLatestBatterProjections.mockResolvedValue(null);

      const app = createTestApp();
      await request(app).get('/v1/projections/batters');

      expect(mockGetLatestBatterProjections).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /v1/projections/pitchers', () => {
    it('should return pitcher projections with correct format', async () => {
      const mockData = {
        data: [
          {
            id: 1,
            name: 'Gerrit Cole',
            team: 'NYY',
            ip: '200.0',
            w: 15,
            l: 5,
            sv: 0,
            era: '2.85',
            whip: '1.05',
            k: 250,
            bb: 45,
            hr: 20,
            fip: '2.90',
            scrapeId: 1,
            createdAt: new Date('2024-01-15T04:00:00Z'),
          },
        ],
        meta: {
          lastUpdated: new Date('2024-01-15T04:00:00Z'),
          count: 1,
          scrapeId: 1,
        },
      };

      mockGetLatestPitcherProjections.mockResolvedValue(mockData);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/pitchers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('lastUpdated');
      expect(response.body.meta).toHaveProperty('count');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Gerrit Cole');
    });

    it('should format lastUpdated as ISO string', async () => {
      const testDate = new Date('2024-01-15T04:02:00Z');
      const mockData = {
        data: [],
        meta: {
          lastUpdated: testDate,
          count: 0,
          scrapeId: 1,
        },
      };

      mockGetLatestPitcherProjections.mockResolvedValue(mockData);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/pitchers');

      expect(response.status).toBe(200);
      expect(response.body.meta.lastUpdated).toBe('2024-01-15T04:02:00.000Z');
    });

    it('should return 503 when no data available', async () => {
      mockGetLatestPitcherProjections.mockResolvedValue(null);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/pitchers');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NO_PROJECTION_DATA');
      expect(response.body.error.message).toBe('No pitcher projection data available');
    });

    it('should return 500 on database error', async () => {
      mockGetLatestPitcherProjections.mockRejectedValue(
        new AppError('DB_QUERY_FAILED', 'Database connection failed', 500)
      );

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/pitchers');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('DB_QUERY_FAILED');
    });

    it('should call getLatestPitcherProjections service', async () => {
      mockGetLatestPitcherProjections.mockResolvedValue(null);

      const app = createTestApp();
      await request(app).get('/v1/projections/pitchers');

      expect(mockGetLatestPitcherProjections).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response format consistency', () => {
    it('should include count in meta for batters', async () => {
      const mockData = {
        data: [{}, {}, {}],
        meta: {
          lastUpdated: new Date(),
          count: 523,
          scrapeId: 1,
        },
      };

      mockGetLatestBatterProjections.mockResolvedValue(mockData);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/batters');

      expect(response.body.meta.count).toBe(523);
    });

    it('should include count in meta for pitchers', async () => {
      const mockData = {
        data: [{}, {}],
        meta: {
          lastUpdated: new Date(),
          count: 312,
          scrapeId: 1,
        },
      };

      mockGetLatestPitcherProjections.mockResolvedValue(mockData);

      const app = createTestApp();
      const response = await request(app).get('/v1/projections/pitchers');

      expect(response.body.meta.count).toBe(312);
    });
  });
});
