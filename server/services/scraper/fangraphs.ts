/**
 * Fangraphs Scraper Module
 *
 * Handles fetching and parsing projection data from Fangraphs (primary)
 * and JA Projections Google Sheets (alternative for batters only).
 *
 * Fangraphs uses Next.js with JSON embedded in __NEXT_DATA__ script tag.
 * JA Projections is a Google Sheets CSV export (batters only - no pitcher support).
 *
 * @module server/services/scraper/fangraphs
 */
import * as cheerio from 'cheerio';
import { AppError } from '../../lib/errors';
import { log } from '../../lib/logger';
import type {
  NewBatterProjection,
  NewPitcherProjection,
} from '../../../shared/types/projections';

// ============================================================================
// URL Constants
// ============================================================================

export const FANGRAPHS_BATTERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=bat&pos=&team=0&players=0&lg=all&pageitems=2000';

export const FANGRAPHS_PITCHERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all&pageitems=2000';

// JA Projections Google Sheets (alternative data source)
export const JA_PROJECTIONS_BATTERS_URL =
  'https://docs.google.com/spreadsheets/d/1c2aCJakeEMLXbxZ5MRPX3IfXFaIAOyntQHjSDzYRh3k/export?format=csv&gid=0';

// ============================================================================
// Configuration
// ============================================================================

const MIN_BATTERS = 500;
const MIN_PITCHERS = 300;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ============================================================================
// Type Definitions for Fangraphs JSON
// ============================================================================

interface FangraphsBatterData {
  PlayerName: string;
  Team: string;
  minpos: string;
  PA: number;
  AB: number;
  H: number;
  HR: number;
  R: number;
  RBI: number;
  SB: number;
  BB: number;
  SO: number;
  AVG: number;
  OBP: number;
  SLG: number;
  wOBA: number;
  'wRC+': number;
}

interface FangraphsPitcherData {
  PlayerName: string;
  Team: string;
  IP: number;
  W: number;
  L: number;
  SV: number;
  K: number;
  BB: number;
  HR: number;
  ERA: number;
  WHIP: number;
  FIP: number;
}

interface FangraphsNextData {
  props: {
    pageProps: {
      dehydratedState: {
        queries: Array<{
          state: {
            data: FangraphsBatterData[] | FangraphsPitcherData[];
          };
        }>;
      };
    };
  };
}

// ============================================================================
// Batter Projections
// ============================================================================

/**
 * Fetches and parses batter projections from Fangraphs.
 * Uses JSON extraction from __NEXT_DATA__ script tag.
 *
 * @returns Array of batter projections
 * @throws {AppError} SCRAPE_FAILED on fetch or parse failure
 */
export async function fetchBatterProjections(): Promise<NewBatterProjection[]> {
  log('info', 'fetch_batters_start', { url: FANGRAPHS_BATTERS_URL, source: 'fangraphs' });

  try {
    const response = await fetch(FANGRAPHS_BATTERS_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      throw new AppError(
        'SCRAPE_FAILED',
        `HTTP ${response.status}: Failed to fetch Fangraphs batters`,
        502
      );
    }

    const html = await response.text();
    const batters = parseFangraphsBatters(html);

    if (batters.length < MIN_BATTERS) {
      throw new AppError(
        'SCRAPE_FAILED',
        `Insufficient batters: ${batters.length} (minimum ${MIN_BATTERS})`,
        502
      );
    }

    log('info', 'fetch_batters_complete', { count: batters.length, source: 'fangraphs' });
    return batters;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'SCRAPE_FAILED',
      `Failed to fetch Fangraphs batters: ${error instanceof Error ? error.message : 'Unknown error'}`,
      502
    );
  }
}

/**
 * Parses batter projections from Fangraphs HTML.
 * Extracts JSON from __NEXT_DATA__ script tag.
 */
function parseFangraphsBatters(html: string): NewBatterProjection[] {
  const playersData = extractFangraphsPlayerData<FangraphsBatterData>(html);

  return playersData.map((player) => ({
    name: player.PlayerName || '',
    team: player.Team || null,
    positions: player.minpos || 'DH',
    pa: Math.round(player.PA || 0),
    ab: Math.round(player.AB || 0),
    h: Math.round(player.H || 0),
    hr: Math.round(player.HR || 0),
    r: Math.round(player.R || 0),
    rbi: Math.round(player.RBI || 0),
    sb: Math.round(player.SB || 0),
    bb: Math.round(player.BB || 0),
    so: Math.round(player.SO || 0),
    avg: formatDecimal(player.AVG),
    obp: formatDecimal(player.OBP),
    slg: formatDecimal(player.SLG),
    woba: formatDecimal(player.wOBA),
    wrcPlus: Math.round(player['wRC+'] || 0),
    scrapeId: 0, // Will be set by caller
  }));
}

// ============================================================================
// JA Projections (Alternative Source)
// ============================================================================

/**
 * Fetches and parses batter projections from JA Projections Google Sheets.
 * Alternative data source when Fangraphs is unavailable.
 * Note: Missing wOBA, wRC+, and H fields will be set to defaults.
 *
 * @returns Array of batter projections
 * @throws {AppError} SCRAPE_FAILED on fetch or parse failure
 */
export async function fetchJABatterProjections(): Promise<NewBatterProjection[]> {
  log('info', 'fetch_batters_start', { url: JA_PROJECTIONS_BATTERS_URL, source: 'ja_projections' });

  try {
    const response = await fetch(JA_PROJECTIONS_BATTERS_URL, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new AppError(
        'SCRAPE_FAILED',
        `HTTP ${response.status}: Failed to fetch JA Projections batters`,
        502
      );
    }

    const csv = await response.text();
    const batters = parseJABattersCsv(csv);

    if (batters.length < MIN_BATTERS) {
      throw new AppError(
        'SCRAPE_FAILED',
        `Insufficient batters: ${batters.length} (minimum ${MIN_BATTERS})`,
        502
      );
    }

    log('info', 'fetch_batters_complete', { count: batters.length, source: 'ja_projections' });
    return batters;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'SCRAPE_FAILED',
      `Failed to fetch JA Projections batters: ${error instanceof Error ? error.message : 'Unknown error'}`,
      502
    );
  }
}

/**
 * Parses JA Projections CSV data into batter projections.
 * CSV columns: Player, Team, MLBID, Pos, $, PA, AB, R, HR, RBI, SB, AVG, OBP, SLG, OPS, K%, BB%, SO, BB, Deep $
 */
function parseJABattersCsv(csv: string): NewBatterProjection[] {
  const lines = csv.split('\n');
  if (lines.length < 2) {
    throw new AppError(
      'SCRAPE_FAILED',
      'Failed to parse CSV: No data rows found',
      502
    );
  }

  // Parse header to get column indices
  const header = parseCSVLine(lines[0]);
  const colIndex: Record<string, number> = {};
  header.forEach((col, idx) => {
    colIndex[col.trim()] = idx;
  });

  // Verify required columns exist
  const requiredCols = ['Player', 'Team', 'Pos', 'PA', 'AB', 'R', 'HR', 'RBI', 'SB', 'AVG', 'OBP', 'SLG', 'SO', 'BB'];
  for (const col of requiredCols) {
    if (colIndex[col] === undefined) {
      throw new AppError(
        'SCRAPE_FAILED',
        `Failed to parse CSV: Missing required column "${col}"`,
        502
      );
    }
  }

  const batters: NewBatterProjection[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVLine(line);
    if (cells.length < header.length) continue;

    const name = cells[colIndex['Player']]?.trim();
    if (!name) continue;

    // JA Projections doesn't have H, wOBA, wRC+ - set to defaults
    // Calculate H from AB and AVG if needed (H = AB * AVG)
    const ab = parseIntSafe(cells[colIndex['AB']]);
    const avg = parseFloat(cells[colIndex['AVG']]) || 0;
    const estimatedHits = Math.round(ab * avg);

    batters.push({
      name,
      team: cells[colIndex['Team']]?.trim() || null,
      positions: normalizePositions(cells[colIndex['Pos']]?.trim() || 'DH'),
      pa: parseIntSafe(cells[colIndex['PA']]),
      ab,
      h: estimatedHits, // Calculated from AB * AVG
      hr: parseIntSafe(cells[colIndex['HR']]),
      r: parseIntSafe(cells[colIndex['R']]),
      rbi: parseIntSafe(cells[colIndex['RBI']]),
      sb: parseIntSafe(cells[colIndex['SB']]),
      bb: parseIntSafe(cells[colIndex['BB']]),
      so: parseIntSafe(cells[colIndex['SO']]),
      avg: formatDecimal(parseFloat(cells[colIndex['AVG']]) || 0),
      obp: formatDecimal(parseFloat(cells[colIndex['OBP']]) || 0),
      slg: formatDecimal(parseFloat(cells[colIndex['SLG']]) || 0),
      woba: '0.000', // Not available in JA Projections
      wrcPlus: 0, // Not available in JA Projections
      scrapeId: 0, // Will be set by caller
    });
  }

  return batters;
}

/**
 * Normalizes position strings from JA Projections format.
 * Converts "UT, P" or "1B, OF" to "UT" or "1B/OF"
 */
function normalizePositions(pos: string): string {
  // Remove P from position list for batters (two-way players)
  const positions = pos
    .split(/[,/]/)
    .map((p) => p.trim())
    .filter((p) => p && p !== 'P');

  return positions.length > 0 ? positions.join('/') : 'DH';
}

// ============================================================================
// Pitcher Projections
// ============================================================================

/**
 * Fetches and parses pitcher projections from Fangraphs.
 * Uses JSON extraction from __NEXT_DATA__ script tag.
 *
 * @returns Array of pitcher projections
 * @throws {AppError} SCRAPE_FAILED on fetch or parse failure
 */
export async function fetchPitcherProjections(): Promise<NewPitcherProjection[]> {
  log('info', 'fetch_pitchers_start', { url: FANGRAPHS_PITCHERS_URL, source: 'fangraphs' });

  try {
    const response = await fetch(FANGRAPHS_PITCHERS_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      throw new AppError(
        'SCRAPE_FAILED',
        `HTTP ${response.status}: Failed to fetch Fangraphs pitchers`,
        502
      );
    }

    const html = await response.text();
    const pitchers = parseFangraphsPitchers(html);

    if (pitchers.length < MIN_PITCHERS) {
      throw new AppError(
        'SCRAPE_FAILED',
        `Insufficient pitchers: ${pitchers.length} (minimum ${MIN_PITCHERS})`,
        502
      );
    }

    log('info', 'fetch_pitchers_complete', { count: pitchers.length, source: 'fangraphs' });
    return pitchers;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'SCRAPE_FAILED',
      `Failed to fetch Fangraphs pitchers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      502
    );
  }
}

/**
 * Parses pitcher projections from Fangraphs HTML.
 * Extracts JSON from __NEXT_DATA__ script tag.
 */
function parseFangraphsPitchers(html: string): NewPitcherProjection[] {
  const playersData = extractFangraphsPlayerData<FangraphsPitcherData>(html);

  return playersData.map((player) => ({
    name: player.PlayerName || '',
    team: player.Team || null,
    ip: formatDecimalIP(player.IP),
    w: Math.round(player.W || 0),
    l: Math.round(player.L || 0),
    sv: Math.round(player.SV || 0),
    k: Math.round(player.K || 0),
    bb: Math.round(player.BB || 0),
    hr: Math.round(player.HR || 0),
    era: formatDecimalRate(player.ERA),
    whip: formatDecimalRate(player.WHIP),
    fip: formatDecimalRate(player.FIP),
    scrapeId: 0, // Will be set by caller
  }));
}

/**
 * Formats innings pitched with 1 decimal place.
 * Returns "0.0" for invalid values.
 */
function formatDecimalIP(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0';
  }
  return value.toFixed(1);
}

/**
 * Formats rate stats (ERA, WHIP, FIP) with 2 decimal places.
 * Returns "0.00" for invalid values.
 */
function formatDecimalRate(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extracts player data array from Fangraphs HTML __NEXT_DATA__ script tag.
 * Shared logic for both batter and pitcher parsing.
 *
 * @param html - Raw HTML from Fangraphs page
 * @returns Array of player data objects
 * @throws {AppError} SCRAPE_FAILED if parsing fails
 */
function extractFangraphsPlayerData<T>(html: string): T[] {
  const $ = cheerio.load(html);
  const scriptTag = $('#__NEXT_DATA__');

  if (!scriptTag.length) {
    throw new AppError(
      'SCRAPE_FAILED',
      'Failed to parse HTML: __NEXT_DATA__ script tag not found',
      502
    );
  }

  let nextData: FangraphsNextData;
  try {
    nextData = JSON.parse(scriptTag.text());
  } catch {
    throw new AppError(
      'SCRAPE_FAILED',
      'Failed to parse HTML: Invalid JSON in __NEXT_DATA__',
      502
    );
  }

  const playersData = nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data;
  if (!Array.isArray(playersData)) {
    throw new AppError(
      'SCRAPE_FAILED',
      'Failed to parse HTML: Player data array not found in expected location',
      502
    );
  }

  return playersData as T[];
}

/**
 * Safely parses an integer from a string.
 * Returns 0 for invalid values.
 */
function parseIntSafe(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats a decimal number as a 3-decimal string.
 * Returns "0.000" for invalid values.
 */
function formatDecimal(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.000';
  }
  return value.toFixed(3);
}

/**
 * Parses a CSV line handling quoted fields with commas.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map((cell) => cell.replace(/^"|"$/g, ''));
}
