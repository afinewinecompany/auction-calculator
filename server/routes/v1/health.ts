/**
 * Health Check API Route
 *
 * Provides health status and scrape metadata for monitoring.
 * Part of Epic 3: Projections API Endpoints.
 *
 * Endpoint:
 * - GET /v1/health - Returns API health status and scrape metadata
 *
 * @module server/routes/v1/health
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getLatestScrapeMetadata } from '../../services/projections';

const router = Router();

/** Staleness threshold in milliseconds (48 hours) */
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Determines health status based on scrape data freshness.
 *
 * @param battersLastSuccess - Last successful batters scrape timestamp
 * @param pitchersLastSuccess - Last successful pitchers scrape timestamp
 * @returns 'healthy' | 'degraded' | 'unhealthy'
 */
function determineStatus(
  battersLastSuccess: Date | null,
  pitchersLastSuccess: Date | null
): 'healthy' | 'degraded' | 'unhealthy' {
  // No data at all = unhealthy
  if (!battersLastSuccess && !pitchersLastSuccess) {
    return 'unhealthy';
  }

  // Either missing = degraded
  if (!battersLastSuccess || !pitchersLastSuccess) {
    return 'degraded';
  }

  const now = Date.now();
  const battersAge = now - battersLastSuccess.getTime();
  const pitchersAge = now - pitchersLastSuccess.getTime();

  // Either stale = degraded
  if (battersAge > STALE_THRESHOLD_MS || pitchersAge > STALE_THRESHOLD_MS) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * GET /v1/health
 *
 * Returns health status and scrape metadata for monitoring.
 *
 * Response format:
 * {
 *   "status": "healthy" | "degraded" | "unhealthy",
 *   "scrape": {
 *     "batters": { "lastSuccess": "ISO date" | null, "playerCount": number },
 *     "pitchers": { "lastSuccess": "ISO date" | null, "playerCount": number }
 *   }
 * }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [battersMetadata, pitchersMetadata] = await Promise.all([
      getLatestScrapeMetadata('batters'),
      getLatestScrapeMetadata('pitchers'),
    ]);

    const battersLastSuccess = battersMetadata?.completedAt ?? null;
    const pitchersLastSuccess = pitchersMetadata?.completedAt ?? null;

    const status = determineStatus(battersLastSuccess, pitchersLastSuccess);

    return res.json({
      status,
      scrape: {
        batters: {
          lastSuccess: battersLastSuccess?.toISOString() ?? null,
          playerCount: battersMetadata?.playerCount ?? 0,
        },
        pitchers: {
          lastSuccess: pitchersLastSuccess?.toISOString() ?? null,
          playerCount: pitchersMetadata?.playerCount ?? 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
