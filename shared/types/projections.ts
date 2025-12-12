/**
 * TypeScript types for database projection operations.
 * Uses Drizzle's type inference for insert and select operations.
 */
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  scrapeMetadata,
  batterProjections,
  pitcherProjections,
} from '../schema';

// ============================================================================
// Scrape Metadata Types
// ============================================================================

/** Type for inserting a new scrape metadata record (excludes auto-generated fields) */
export type NewScrapeMetadata = InferInsertModel<typeof scrapeMetadata>;

/** Type for a scrape metadata row returned from the database */
export type ScrapeMetadataRow = InferSelectModel<typeof scrapeMetadata>;

/** Valid scrape type values */
export type ScrapeType = 'batters' | 'pitchers';

/** Valid scrape status values */
export type ScrapeStatus = 'in_progress' | 'success' | 'failed';

/** Valid projection source values */
export type ProjectionSource = 'fangraphs' | 'ja_projections';

// ============================================================================
// Batter Projection Types
// ============================================================================

/** Type for inserting a new batter projection record */
export type NewBatterProjection = InferInsertModel<typeof batterProjections>;

/** Type for a batter projection row returned from the database */
export type BatterProjectionRow = InferSelectModel<typeof batterProjections>;

// ============================================================================
// Pitcher Projection Types
// ============================================================================

/** Type for inserting a new pitcher projection record */
export type NewPitcherProjection = InferInsertModel<typeof pitcherProjections>;

/** Type for a pitcher projection row returned from the database */
export type PitcherProjectionRow = InferSelectModel<typeof pitcherProjections>;

// ============================================================================
// API Response Types (for future use in Story 3.1)
// ============================================================================

/** Batter projection data as returned by API (excludes internal fields) */
export interface ApiBatterProjection {
  name: string;
  team: string | null;
  positions: string;
  pa: number;
  ab: number;
  h: number;
  hr: number;
  r: number;
  rbi: number;
  sb: number;
  bb: number;
  so: number;
  avg: string;
  obp: string;
  slg: string;
  woba: string;
  wrcPlus: number;
}

/** Pitcher projection data as returned by API (excludes internal fields) */
export interface ApiPitcherProjection {
  name: string;
  team: string | null;
  ip: string;
  w: number;
  l: number;
  sv: number;
  k: number;
  bb: number;
  hr: number;
  era: string;
  whip: string;
  fip: string;
}

/** API response metadata */
export interface ProjectionMeta {
  lastUpdated: string;
  count: number;
}
