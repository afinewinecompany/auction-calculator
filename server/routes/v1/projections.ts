/**
 * Projections API Routes
 *
 * REST API endpoints for retrieving projection data.
 * Part of Epic 3: Projections API Endpoints.
 *
 * Endpoints:
 * - GET /v1/projections/batters - Returns all batter projections
 * - GET /v1/projections/pitchers - Returns all pitcher projections
 *
 * @module server/routes/v1/projections
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
  getLatestBatterProjections,
  getLatestPitcherProjections,
} from '../../services/projections';
import { AppError } from '../../lib/errors';

const router = Router();

/**
 * GET /v1/projections/batters
 *
 * Returns all batter projections from the most recent successful scrape.
 *
 * Success Response (200):
 * {
 *   "data": [{ name, team, positions, pa, ab, h, hr, ... }],
 *   "meta": { "lastUpdated": "ISO date", "count": number }
 * }
 *
 * Error Response (503):
 * { "error": { "code": "NO_PROJECTION_DATA", "message": "..." } }
 */
router.get('/batters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getLatestBatterProjections();

    if (!result) {
      throw new AppError(
        'NO_PROJECTION_DATA',
        'No batter projection data available',
        503
      );
    }

    return res.json({
      data: result.data,
      meta: {
        lastUpdated: result.meta.lastUpdated.toISOString(),
        count: result.meta.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/projections/pitchers
 *
 * Returns all pitcher projections from the most recent successful scrape.
 *
 * Success Response (200):
 * {
 *   "data": [{ name, team, ip, w, l, sv, era, ... }],
 *   "meta": { "lastUpdated": "ISO date", "count": number }
 * }
 *
 * Error Response (503):
 * { "error": { "code": "NO_PROJECTION_DATA", "message": "..." } }
 */
router.get('/pitchers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getLatestPitcherProjections();

    if (!result) {
      throw new AppError(
        'NO_PROJECTION_DATA',
        'No pitcher projection data available',
        503
      );
    }

    return res.json({
      data: result.data,
      meta: {
        lastUpdated: result.meta.lastUpdated.toISOString(),
        count: result.meta.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
