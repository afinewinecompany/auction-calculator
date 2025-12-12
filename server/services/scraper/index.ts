/**
 * Scraper Service - Main Orchestration
 *
 * Provides orchestration logic for scraping projection data from Fangraphs.
 * Handles retry logic, consecutive failure tracking, and alerting.
 *
 * @module server/services/scraper
 */
import { AppError } from '../../lib/errors';
import { log } from '../../lib/logger';
import {
  createScrapeRecord,
  completeScrapeRecord,
  failScrapeRecord,
  insertBatterProjections,
  insertPitcherProjections,
} from '../projections';
import {
  fetchBatterProjections,
  fetchJABatterProjections,
  fetchPitcherProjections,
  FANGRAPHS_BATTERS_URL,
  FANGRAPHS_PITCHERS_URL,
  JA_PROJECTIONS_BATTERS_URL,
} from './fangraphs';
import type {
  NewBatterProjection,
  NewPitcherProjection,
  ProjectionSource,
  ScrapeType,
} from '../../../shared/types/projections';

// ============================================================================
// Module State
// ============================================================================

/** Tracks consecutive scrape failures for alerting (FR18) */
let consecutiveFailures = 0;

// ============================================================================
// Helper Functions (for testing)
// ============================================================================

/**
 * Resets the consecutive failure counter.
 * Exported for testing purposes only.
 */
export function resetConsecutiveFailures(): void {
  consecutiveFailures = 0;
}

/**
 * Gets the current consecutive failure count.
 * Exported for testing purposes only.
 */
export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Creates a promise that resolves after the specified milliseconds.
 * @param ms - Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets the appropriate URL for the given type and source.
 */
function getSourceUrl(type: ScrapeType, source: ProjectionSource): string {
  if (source === 'ja_projections') {
    return JA_PROJECTIONS_BATTERS_URL;
  }
  return type === 'batters' ? FANGRAPHS_BATTERS_URL : FANGRAPHS_PITCHERS_URL;
}

/**
 * Fetches projections from the appropriate source.
 */
async function fetchProjections(
  type: ScrapeType,
  source: ProjectionSource
): Promise<NewBatterProjection[] | NewPitcherProjection[]> {
  if (type === 'batters') {
    return source === 'ja_projections'
      ? fetchJABatterProjections()
      : fetchBatterProjections();
  }
  return fetchPitcherProjections();
}

// ============================================================================
// Main Scrape Functions
// ============================================================================

/**
 * Runs a single scrape operation for the specified type and source.
 *
 * Flow:
 * 1. Creates scrape tracking record
 * 2. Attempts to fetch projections
 * 3. On success: inserts projections, marks complete, resets failure counter
 * 4. On failure: retries once after 5s delay, then marks failed
 * 5. Logs alert if consecutive failures reach 2
 *
 * @param type - Type of scrape ('batters' or 'pitchers')
 * @param source - Projection source ('fangraphs' or 'ja_projections'). Defaults to 'fangraphs'.
 *                 Note: 'ja_projections' only supports batters currently.
 * @throws {AppError} SCRAPE_FAILED after retry exhausted
 */
export async function runScrape(
  type: ScrapeType,
  source: ProjectionSource = 'fangraphs'
): Promise<void> {
  // Validate source/type combination
  if (source === 'ja_projections' && type === 'pitchers') {
    throw new AppError(
      'INVALID_SOURCE',
      'JA Projections does not support pitcher data',
      400
    );
  }

  const url = getSourceUrl(type, source);

  log('info', 'scrape_start', { type, source, url });

  // Create tracking record
  const scrapeRecord = await createScrapeRecord(type, url);

  // Attempt scrape with single retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Fetch projections based on type and source
      const projections = await fetchProjections(type, source);

      // Insert projections into database
      if (type === 'batters') {
        await insertBatterProjections(
          scrapeRecord.id,
          projections as NewBatterProjection[]
        );
      } else {
        await insertPitcherProjections(
          scrapeRecord.id,
          projections as NewPitcherProjection[]
        );
      }

      // Mark scrape as successful
      await completeScrapeRecord(scrapeRecord.id, projections.length);

      log('info', 'scrape_complete', {
        type,
        source,
        count: projections.length,
        scrapeId: scrapeRecord.id,
      });

      // Reset failure counter on success
      consecutiveFailures = 0;
      return;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      if (attempt === 1) {
        // Log retry attempt
        log('warn', 'scrape_retry', {
          type,
          source,
          error: errorMsg,
          attempt,
        });

        // Wait 5 seconds before retry
        await delay(5000);
      } else {
        // Final failure after retry
        await failScrapeRecord(scrapeRecord.id, errorMsg);

        log('error', 'scrape_failed', {
          type,
          source,
          error: errorMsg,
          attempt,
          scrapeId: scrapeRecord.id,
        });

        // Increment consecutive failure counter
        consecutiveFailures++;

        // Alert on consecutive failures (FR18)
        if (consecutiveFailures >= 2) {
          log('error', 'scrape_alert', {
            message: 'Multiple consecutive scrape failures detected',
            consecutiveFailures,
            type,
          });
        }

        throw new AppError('SCRAPE_FAILED', errorMsg, 502, {
          type,
          source,
          scrapeId: scrapeRecord.id,
        });
      }
    }
  }
}

/**
 * Runs a full scrape for both batters and pitchers.
 *
 * Attempts to scrape batters first, then pitchers.
 * Continues to pitchers even if batters fail.
 * Each scrape failure is logged but doesn't stop the other.
 */
export async function runFullScrape(): Promise<void> {
  log('info', 'full_scrape_start', {});

  // Attempt batter scrape
  try {
    await runScrape('batters');
  } catch (error) {
    log('warn', 'batter_scrape_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Attempt pitcher scrape
  try {
    await runScrape('pitchers');
  } catch (error) {
    log('warn', 'pitcher_scrape_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  log('info', 'full_scrape_complete', { consecutiveFailures });
}
