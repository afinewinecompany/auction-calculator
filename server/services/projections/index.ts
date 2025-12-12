/**
 * Projections Database Service
 *
 * Service layer for projection database operations.
 * Provides functions to create, update, and query scrape metadata
 * and projection data for batters and pitchers.
 *
 * @module server/services/projections
 */
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../../db';
import {
  scrapeMetadata,
  batterProjections,
  pitcherProjections,
} from '../../../shared/schema';
import { AppError } from '../../lib/errors';
import { log } from '../../lib/logger';
import type {
  NewBatterProjection,
  NewPitcherProjection,
  BatterProjectionRow,
  PitcherProjectionRow,
  ScrapeMetadataRow,
  ScrapeType,
  ProjectionSystem,
} from '../../../shared/types/projections';

// ============================================================================
// Return Type Definitions
// ============================================================================

/** Result type for projection queries with metadata */
export interface ProjectionResult<T> {
  data: T[];
  meta: {
    lastUpdated: Date;
    count: number;
    scrapeId: number;
  };
}

export type BatterProjectionResult = ProjectionResult<BatterProjectionRow>;
export type PitcherProjectionResult = ProjectionResult<PitcherProjectionRow>;

// ============================================================================
// Scrape Record Management
// ============================================================================

/**
 * Creates a new scrape record to track a scraping job.
 *
 * @param type - Type of scrape ('batters' or 'pitchers')
 * @param sourceUrl - URL being scraped
 * @param projectionSystem - The projection system ('steamer' or 'ja_projections')
 * @returns The created scrape record with id
 * @throws {AppError} If database insert fails
 */
export async function createScrapeRecord(
  type: ScrapeType,
  sourceUrl: string,
  projectionSystem: ProjectionSystem = 'steamer'
): Promise<ScrapeMetadataRow> {
  const db = getDb();

  try {
    const [record] = await db
      .insert(scrapeMetadata)
      .values({
        scrapeType: type,
        sourceUrl,
        projectionSystem,
        status: 'in_progress',
      })
      .returning();

    return record;
  } catch (error) {
    throw new AppError(
      'DB_INSERT_FAILED',
      `Failed to create scrape record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { type, sourceUrl, projectionSystem }
    );
  }
}

/**
 * Deletes old scrape records and their associated projections for a given type and system.
 * Called after a successful scrape to clean up old data.
 *
 * @param type - Type of scrape ('batters' or 'pitchers')
 * @param projectionSystem - The projection system to clean up
 * @param excludeScrapeId - ID of the current scrape to keep
 * @throws {AppError} If database delete fails
 */
export async function deleteOldProjections(
  type: ScrapeType,
  projectionSystem: ProjectionSystem,
  excludeScrapeId: number
): Promise<void> {
  const db = getDb();

  try {
    // Find all old scrape records for this type and system
    const oldScrapes = await db
      .select({ id: scrapeMetadata.id })
      .from(scrapeMetadata)
      .where(
        and(
          eq(scrapeMetadata.scrapeType, type),
          eq(scrapeMetadata.projectionSystem, projectionSystem)
        )
      );

    const oldIds = oldScrapes
      .map((s) => s.id)
      .filter((id) => id !== excludeScrapeId);

    if (oldIds.length === 0) {
      return;
    }

    // Delete old scrape records (projections cascade due to FK)
    for (const oldId of oldIds) {
      await db.delete(scrapeMetadata).where(eq(scrapeMetadata.id, oldId));
    }

    log('info', 'old_projections_deleted', {
      type,
      projectionSystem,
      deletedCount: oldIds.length,
      keptScrapeId: excludeScrapeId,
    });
  } catch (error) {
    throw new AppError(
      'DB_DELETE_FAILED',
      `Failed to delete old projections: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { type, projectionSystem, excludeScrapeId }
    );
  }
}

/**
 * Marks a scrape record as successfully completed and cleans up old data.
 *
 * @param scrapeId - ID of the scrape record to update
 * @param playerCount - Number of players scraped
 * @param cleanup - If true, deletes old projections for the same type/system
 * @throws {AppError} If database update fails
 */
export async function completeScrapeRecord(
  scrapeId: number,
  playerCount: number,
  cleanup: { type: ScrapeType; projectionSystem: ProjectionSystem } | null = null
): Promise<void> {
  const db = getDb();

  try {
    await db
      .update(scrapeMetadata)
      .set({
        status: 'success',
        playerCount,
        completedAt: new Date(),
      })
      .where(eq(scrapeMetadata.id, scrapeId));

    // Clean up old projections if requested
    if (cleanup) {
      await deleteOldProjections(cleanup.type, cleanup.projectionSystem, scrapeId);
    }
  } catch (error) {
    throw new AppError(
      'DB_UPDATE_FAILED',
      `Failed to complete scrape record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { scrapeId, playerCount }
    );
  }
}

/**
 * Marks a scrape record as failed with an error message.
 *
 * @param scrapeId - ID of the scrape record to update
 * @param errorMessage - Description of the failure
 * @throws {AppError} If database update fails
 */
export async function failScrapeRecord(
  scrapeId: number,
  errorMessage: string
): Promise<void> {
  const db = getDb();

  try {
    await db
      .update(scrapeMetadata)
      .set({
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(scrapeMetadata.id, scrapeId));
  } catch (error) {
    throw new AppError(
      'DB_UPDATE_FAILED',
      `Failed to fail scrape record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { scrapeId }
    );
  }
}

// ============================================================================
// Projection Inserts
// ============================================================================

/** Batch size for bulk inserts to avoid PostgreSQL parameter limit */
const INSERT_BATCH_SIZE = 500;

/**
 * Bulk inserts batter projections linked to a scrape.
 * Inserts in batches to avoid PostgreSQL's 65534 parameter limit.
 *
 * @param scrapeId - ID of the scrape record to link projections to
 * @param batters - Array of batter projection data
 * @throws {AppError} If database insert fails
 */
export async function insertBatterProjections(
  scrapeId: number,
  batters: NewBatterProjection[]
): Promise<void> {
  const db = getDb();

  try {
    const rows = batters.map((b) => ({ ...b, scrapeId }));

    // Insert in batches to avoid parameter limit
    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
      await db.insert(batterProjections).values(batch);
    }

    log('info', 'db_write_complete', {
      table: 'batter_projections',
      count: batters.length,
      scrapeId,
    });
  } catch (error) {
    throw new AppError(
      'DB_INSERT_FAILED',
      `Failed to insert batter projections: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { scrapeId, count: batters.length }
    );
  }
}

/**
 * Bulk inserts pitcher projections linked to a scrape.
 * Inserts in batches to avoid PostgreSQL's 65534 parameter limit.
 *
 * @param scrapeId - ID of the scrape record to link projections to
 * @param pitchers - Array of pitcher projection data
 * @throws {AppError} If database insert fails
 */
export async function insertPitcherProjections(
  scrapeId: number,
  pitchers: NewPitcherProjection[]
): Promise<void> {
  const db = getDb();

  try {
    const rows = pitchers.map((p) => ({ ...p, scrapeId }));

    // Insert in batches to avoid parameter limit
    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
      await db.insert(pitcherProjections).values(batch);
    }

    log('info', 'db_write_complete', {
      table: 'pitcher_projections',
      count: pitchers.length,
      scrapeId,
    });
  } catch (error) {
    throw new AppError(
      'DB_INSERT_FAILED',
      `Failed to insert pitcher projections: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { scrapeId, count: pitchers.length }
    );
  }
}

// ============================================================================
// Projection Queries
// ============================================================================

/**
 * Retrieves all batter projections from the most recent successful scrape.
 *
 * @param projectionSystem - The projection system to query (defaults to 'steamer')
 * @returns Batter projections with metadata, or null if no successful scrape exists
 * @throws {AppError} If database query fails
 */
export async function getLatestBatterProjections(
  projectionSystem: ProjectionSystem = 'steamer'
): Promise<BatterProjectionResult | null> {
  const db = getDb();

  try {
    // Get the most recent successful batter scrape for this projection system
    const [latestScrape] = await db
      .select()
      .from(scrapeMetadata)
      .where(
        and(
          eq(scrapeMetadata.scrapeType, 'batters'),
          eq(scrapeMetadata.status, 'success'),
          eq(scrapeMetadata.projectionSystem, projectionSystem)
        )
      )
      .orderBy(desc(scrapeMetadata.completedAt))
      .limit(1);

    if (!latestScrape) {
      return null;
    }

    // Get all batters for that scrape
    const batters = await db
      .select()
      .from(batterProjections)
      .where(eq(batterProjections.scrapeId, latestScrape.id));

    return {
      data: batters,
      meta: {
        lastUpdated: latestScrape.completedAt!,
        count: batters.length,
        scrapeId: latestScrape.id,
      },
    };
  } catch (error) {
    throw new AppError(
      'DB_QUERY_FAILED',
      `Failed to fetch latest batter projections: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Retrieves all pitcher projections from the most recent successful scrape.
 *
 * @param projectionSystem - The projection system to query (defaults to 'steamer')
 * @returns Pitcher projections with metadata, or null if no successful scrape exists
 * @throws {AppError} If database query fails
 */
export async function getLatestPitcherProjections(
  projectionSystem: ProjectionSystem = 'steamer'
): Promise<PitcherProjectionResult | null> {
  const db = getDb();

  try {
    // Get the most recent successful pitcher scrape for this projection system
    const [latestScrape] = await db
      .select()
      .from(scrapeMetadata)
      .where(
        and(
          eq(scrapeMetadata.scrapeType, 'pitchers'),
          eq(scrapeMetadata.status, 'success'),
          eq(scrapeMetadata.projectionSystem, projectionSystem)
        )
      )
      .orderBy(desc(scrapeMetadata.completedAt))
      .limit(1);

    if (!latestScrape) {
      return null;
    }

    // Get all pitchers for that scrape
    const pitchers = await db
      .select()
      .from(pitcherProjections)
      .where(eq(pitcherProjections.scrapeId, latestScrape.id));

    return {
      data: pitchers,
      meta: {
        lastUpdated: latestScrape.completedAt!,
        count: pitchers.length,
        scrapeId: latestScrape.id,
      },
    };
  } catch (error) {
    throw new AppError(
      'DB_QUERY_FAILED',
      `Failed to fetch latest pitcher projections: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Retrieves the most recent successful scrape metadata for a given type.
 *
 * @param type - Type of scrape ('batters' or 'pitchers')
 * @param projectionSystem - The projection system to query (defaults to 'steamer')
 * @returns Scrape metadata, or null if no successful scrape exists
 * @throws {AppError} If database query fails
 */
export async function getLatestScrapeMetadata(
  type: ScrapeType,
  projectionSystem: ProjectionSystem = 'steamer'
): Promise<ScrapeMetadataRow | null> {
  const db = getDb();

  try {
    const [latestScrape] = await db
      .select()
      .from(scrapeMetadata)
      .where(
        and(
          eq(scrapeMetadata.scrapeType, type),
          eq(scrapeMetadata.status, 'success'),
          eq(scrapeMetadata.projectionSystem, projectionSystem)
        )
      )
      .orderBy(desc(scrapeMetadata.completedAt))
      .limit(1);

    return latestScrape ?? null;
  } catch (error) {
    throw new AppError(
      'DB_QUERY_FAILED',
      `Failed to fetch latest scrape metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { type, projectionSystem }
    );
  }
}
