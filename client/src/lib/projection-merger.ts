import type { PlayerProjection } from '@shared/schema';

export interface MergeConflict {
  playerId: string;
  playerName: string;
  conflictType: 'duplicate' | 'stats_mismatch';
  resolution: string;
}

export interface MergeResult {
  mergedProjections: PlayerProjection[];
  conflicts: MergeConflict[];
  hittersCount: number;
  pitchersCount: number;
  dualPlayersCount: number;
}

function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.\-']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bjr\b|\bsr\b|\bii\b|\biii\b|\biv\b/gi, '')
    .trim();
}

function normalizeTeamName(team: string | undefined): string {
  if (!team) return '';
  return team.toLowerCase().trim();
}

function isHitterPosition(positions: string[]): boolean {
  const hitterPositions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH', 'UTIL', 'MI', 'CI'];
  return positions.some(p => hitterPositions.includes(p.toUpperCase()));
}

function isPitcherPosition(positions: string[]): boolean {
  const pitcherPositions = ['SP', 'RP', 'P'];
  return positions.some(p => pitcherPositions.includes(p.toUpperCase()));
}

function mergePositions(pos1: string[], pos2: string[]): string[] {
  const combined = new Set<string>();
  pos1.forEach(p => combined.add(p.toUpperCase()));
  pos2.forEach(p => combined.add(p.toUpperCase()));
  return Array.from(combined);
}

function mergeStats(stats1: Record<string, number>, stats2: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...stats1 };
  for (const [key, value] of Object.entries(stats2)) {
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function createPlayerKey(projection: PlayerProjection): string {
  if (projection.mlbamId) {
    return `mlbam:${projection.mlbamId}`;
  }
  const normalizedName = normalizePlayerName(projection.name);
  const normalizedTeam = normalizeTeamName(projection.team);
  return `name:${normalizedName}:${normalizedTeam}`;
}

export function mergeProjections(
  hitterProjections: PlayerProjection[],
  pitcherProjections: PlayerProjection[]
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const playerMap = new Map<string, PlayerProjection>();
  
  for (const hitter of hitterProjections) {
    const key = createPlayerKey(hitter);
    playerMap.set(key, { ...hitter });
  }
  
  for (const pitcher of pitcherProjections) {
    const key = createPlayerKey(pitcher);
    const existing = playerMap.get(key);
    
    if (existing) {
      const mergedPositions = mergePositions(existing.positions, pitcher.positions);
      const mergedStats = mergeStats(existing.stats, pitcher.stats);
      
      playerMap.set(key, {
        ...existing,
        positions: mergedPositions,
        stats: mergedStats,
        mlbamId: existing.mlbamId || pitcher.mlbamId,
      });
      
      conflicts.push({
        playerId: existing.mlbamId || key,
        playerName: existing.name,
        conflictType: 'duplicate',
        resolution: 'Merged hitter and pitcher stats (two-way player)',
      });
    } else {
      playerMap.set(key, { ...pitcher });
    }
  }
  
  const mergedProjections = Array.from(playerMap.values());
  
  let hittersCount = 0;
  let pitchersCount = 0;
  let dualPlayersCount = 0;
  
  for (const projection of mergedProjections) {
    const isHitter = isHitterPosition(projection.positions);
    const isPitcher = isPitcherPosition(projection.positions);
    
    if (isHitter && isPitcher) {
      dualPlayersCount++;
    } else if (isHitter) {
      hittersCount++;
    } else if (isPitcher) {
      pitchersCount++;
    }
  }
  
  return {
    mergedProjections,
    conflicts,
    hittersCount,
    pitchersCount,
    dualPlayersCount,
  };
}

export function identifyPlayerType(projection: PlayerProjection): 'hitter' | 'pitcher' | 'two-way' {
  const isHitter = isHitterPosition(projection.positions);
  const isPitcher = isPitcherPosition(projection.positions);
  
  if (isHitter && isPitcher) return 'two-way';
  if (isPitcher) return 'pitcher';
  return 'hitter';
}
