/**
 * API Client for projection data.
 *
 * Fetches projection data from the backend API and transforms it
 * to the PlayerProjection format used by the application.
 *
 * @module client/src/lib/api-client
 */

import type { PlayerProjection } from '@shared/schema';
import type {
  ApiBatterProjection,
  ApiPitcherProjection,
  ProjectionMeta,
} from '@shared/types/projections';

/** API response wrapper for projections */
interface ProjectionResponse<T> {
  data: T[];
  meta: ProjectionMeta;
}

/** Result returned by fetch functions */
export interface ProjectionResult {
  projections: PlayerProjection[];
  lastUpdated: string;
  count: number;
}

/**
 * Transform API batter projection to PlayerProjection format.
 */
function transformBatterToProjection(batter: ApiBatterProjection): PlayerProjection {
  return {
    name: batter.name,
    team: batter.team || undefined,
    positions: batter.positions
      .split(/[,/]/)
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean),
    stats: {
      PA: batter.pa,
      AB: batter.ab,
      H: batter.h,
      HR: batter.hr,
      R: batter.r,
      RBI: batter.rbi,
      SB: batter.sb,
      BB: batter.bb,
      SO: batter.so,
      AVG: parseFloat(batter.avg),
      OBP: parseFloat(batter.obp),
      SLG: parseFloat(batter.slg),
      wOBA: parseFloat(batter.woba),
      'wRC+': batter.wrcPlus,
    },
  };
}

/**
 * Transform API pitcher projection to PlayerProjection format.
 */
function transformPitcherToProjection(pitcher: ApiPitcherProjection): PlayerProjection {
  return {
    name: pitcher.name,
    team: pitcher.team || undefined,
    positions: ['P'],
    stats: {
      IP: parseFloat(pitcher.ip),
      W: pitcher.w,
      L: pitcher.l,
      SV: pitcher.sv,
      K: pitcher.k,
      BB: pitcher.bb,
      HR: pitcher.hr,
      ERA: parseFloat(pitcher.era),
      WHIP: parseFloat(pitcher.whip),
      FIP: parseFloat(pitcher.fip),
    },
  };
}

/**
 * Fetch batter projections from API and transform to PlayerProjection format.
 * @throws Error with descriptive message on network or API failure
 */
export async function fetchBatterProjections(): Promise<ProjectionResult> {
  const response = await fetch('/api/v1/projections/batters');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message || `Failed to fetch batter projections (${response.status})`;
    throw new Error(message);
  }

  const data: ProjectionResponse<ApiBatterProjection> = await response.json();

  return {
    projections: data.data.map(transformBatterToProjection),
    lastUpdated: data.meta.lastUpdated,
    count: data.meta.count,
  };
}

/**
 * Fetch pitcher projections from API and transform to PlayerProjection format.
 * @throws Error with descriptive message on network or API failure
 */
export async function fetchPitcherProjections(): Promise<ProjectionResult> {
  const response = await fetch('/api/v1/projections/pitchers');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message || `Failed to fetch pitcher projections (${response.status})`;
    throw new Error(message);
  }

  const data: ProjectionResponse<ApiPitcherProjection> = await response.json();

  return {
    projections: data.data.map(transformPitcherToProjection),
    lastUpdated: data.meta.lastUpdated,
    count: data.meta.count,
  };
}
