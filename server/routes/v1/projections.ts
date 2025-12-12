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
 * Query Parameters:
 * - system: 'steamer' | 'ja_projections' (default: 'steamer')
 *
 * @module server/routes/v1/projections
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
  getLatestBatterProjections,
  getLatestPitcherProjections,
} from '../../services/projections';
import { AppError } from '../../lib/errors';
import type { ProjectionSystem } from '../../../shared/types/projections';

const router = Router();

/** Valid projection systems */
const VALID_SYSTEMS: ProjectionSystem[] = ['steamer', 'ja_projections'];

/**
 * Validates and extracts projection system from query params.
 * Defaults to 'steamer' if not provided.
 */
function getProjectionSystem(query: Request['query']): ProjectionSystem {
  const system = query.system as string | undefined;
  if (!system) return 'steamer';
  if (!VALID_SYSTEMS.includes(system as ProjectionSystem)) {
    throw new AppError(
      'INVALID_SYSTEM',
      `Invalid projection system: ${system}. Valid options: ${VALID_SYSTEMS.join(', ')}`,
      400
    );
  }
  return system as ProjectionSystem;
}

/**
 * GET /v1/projections/batters
 *
 * Returns all batter projections from the most recent successful scrape.
 *
 * Query Parameters:
 * - system: 'steamer' | 'ja_projections' (default: 'steamer')
 *
 * Success Response (200):
 * {
 *   "data": [{ name, team, positions, pa, ab, h, hr, ... }],
 *   "meta": { "lastUpdated": "ISO date", "count": number, "system": string }
 * }
 *
 * Error Response (503):
 * { "error": { "code": "NO_PROJECTION_DATA", "message": "..." } }
 */
router.get('/batters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const system = getProjectionSystem(req.query);
    const result = await getLatestBatterProjections(system);

    if (!result) {
      throw new AppError(
        'NO_PROJECTION_DATA',
        `No batter projection data available for system: ${system}`,
        503
      );
    }

    return res.json({
      data: result.data,
      meta: {
        lastUpdated: result.meta.lastUpdated.toISOString(),
        count: result.meta.count,
        system,
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
 * Query Parameters:
 * - system: 'steamer' | 'ja_projections' (default: 'steamer')
 *   Note: JA Projections only has batter data, so querying pitchers
 *   with system=ja_projections will return 503.
 *
 * Success Response (200):
 * {
 *   "data": [{ name, team, ip, w, l, sv, era, ... }],
 *   "meta": { "lastUpdated": "ISO date", "count": number, "system": string }
 * }
 *
 * Error Response (503):
 * { "error": { "code": "NO_PROJECTION_DATA", "message": "..." } }
 */
router.get('/pitchers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const system = getProjectionSystem(req.query);
    const result = await getLatestPitcherProjections(system);

    if (!result) {
      const extraMsg = system === 'ja_projections'
        ? ' (JA Projections only provides batter data)'
        : '';
      throw new AppError(
        'NO_PROJECTION_DATA',
        `No pitcher projection data available for system: ${system}${extraMsg}`,
        503
      );
    }

    return res.json({
      data: result.data,
      meta: {
        lastUpdated: result.meta.lastUpdated.toISOString(),
        count: result.meta.count,
        system,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
