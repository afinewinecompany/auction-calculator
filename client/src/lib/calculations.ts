import type {
  PlayerProjection,
  PlayerValue,
  LeagueSettings,
  ScoringFormat,
  ValueCalculationSettings,
  DraftPick,
  ValueTier,
  ReplacementLevelMethod,
} from '@shared/schema';
import { STANDARD_SPLITS } from '@shared/schema';

interface CategoryStats {
  mean: number;
  stdDev: number;
  values: number[];
}

interface DraftablePlayer {
  player: PlayerProjection;
  index: number;
  assignedPosition: string;
  isHitter: boolean;
  totalZScore: number;
  var: number;
}

interface PositionReplacementLevel {
  position: string;
  replacementZScore: number;
  replacementPlayerName?: string;
  draftableCount: number;
}

interface PositionScarcity {
  position: string;
  depthScore: number;
  scarcityMultiplier: number;
}

const PITCHER_POSITIONS = ['SP', 'RP', 'P'];
const HITTER_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'MI', 'CI', 'UTIL'];
const isPitcherPos = (pos: string) => PITCHER_POSITIONS.includes(pos.toUpperCase());
const isHitterPos = (pos: string) => !isPitcherPos(pos) && pos.toUpperCase() !== 'BENCH';

const RATE_STATS: Record<string, { volumeStat: string; isNegative: boolean }> = {
  'AVG': { volumeStat: 'AB', isNegative: false },
  'OBP': { volumeStat: 'PA', isNegative: false },
  'SLG': { volumeStat: 'AB', isNegative: false },
  'OPS': { volumeStat: 'PA', isNegative: false },
  'ERA': { volumeStat: 'IP', isNegative: true },
  'WHIP': { volumeStat: 'IP', isNegative: true },
  'K/9': { volumeStat: 'IP', isNegative: false },
  'K/BB': { volumeStat: 'IP', isNegative: false },
  'BB/9': { volumeStat: 'IP', isNegative: true },
  'HR/9': { volumeStat: 'IP', isNegative: true },
  'H/9': { volumeStat: 'IP', isNegative: true },
};

function isNegativeStat(category: string, type: 'hitter' | 'pitcher'): boolean {
  const upper = category.toUpperCase();
  if (RATE_STATS[upper]?.isNegative) return true;
  if (type === 'hitter' && ['K', 'SO', 'CS', 'GIDP', 'E'].includes(upper)) return true;
  if (type === 'pitcher' && ['L', 'ER', 'H', 'BB', 'HR'].includes(upper)) return true;
  return false;
}

function calculateWeightedMean(values: { value: number; volume: number }[]): number {
  const totalVolume = values.reduce((sum, v) => sum + v.volume, 0);
  if (totalVolume === 0) return 0;
  return values.reduce((sum, v) => sum + (v.value * v.volume), 0) / totalVolume;
}

function calculateWeightedStdDev(values: { value: number; volume: number }[], mean: number): number {
  const totalVolume = values.reduce((sum, v) => sum + v.volume, 0);
  if (totalVolume === 0) return 1;
  const variance = values.reduce((sum, v) => {
    return sum + (v.volume * Math.pow(v.value - mean, 2));
  }, 0) / totalVolume;
  return Math.sqrt(variance) || 1;
}

function getPositionSpotsPerTeam(pos: string, positionRequirements: LeagueSettings['positionRequirements']): number {
  return positionRequirements[pos as keyof typeof positionRequirements] || 0;
}

function playerEligibleForPosition(player: PlayerProjection, targetPos: string): boolean {
  const playerPositions = player.positions.map(p => p.toUpperCase());
  const target = targetPos.toUpperCase();

  if (playerPositions.includes(target)) return true;

  if (target === 'MI' && (playerPositions.includes('2B') || playerPositions.includes('SS'))) return true;
  if (target === 'CI' && (playerPositions.includes('1B') || playerPositions.includes('3B'))) return true;
  if (target === 'UTIL' && playerPositions.some(p => isHitterPos(p))) return true;
  if (target === 'P' && playerPositions.some(p => isPitcherPos(p))) return true;

  return false;
}

function identifyPlayerType(player: PlayerProjection): 'hitter' | 'pitcher' | 'both' {
  const hasPitcherPos = player.positions.some(p => isPitcherPos(p));
  const hasHitterPos = player.positions.some(p => isHitterPos(p));

  if (hasPitcherPos && hasHitterPos) return 'both';
  if (hasPitcherPos) return 'pitcher';
  return 'hitter';
}

function calculatePlayerZScoreTotals(
  players: PlayerProjection[],
  scoringFormat: ScoringFormat,
  type: 'hitter' | 'pitcher'
): { player: PlayerProjection; totalZScore: number }[] {
  if (players.length === 0) return [];

  let categories: string[];
  let categoryWeights: Record<string, number> = {};

  if (scoringFormat.type === 'h2h-points') {
    const points = type === 'hitter' ? scoringFormat.hittingPoints : scoringFormat.pitchingPoints;
    categories = Object.keys(points);
    categoryWeights = points;
  } else {
    categories = type === 'hitter' ? scoringFormat.hittingCategories : scoringFormat.pitchingCategories;
    categories.forEach(cat => categoryWeights[cat] = 1);
  }

  const categoryStats: Record<string, CategoryStats & { avgVolume?: number }> = {};

  categories.forEach(category => {
    const upper = category.toUpperCase();
    const rateInfo = RATE_STATS[upper];

    if (rateInfo) {
      const rateValues = players
        .map(p => ({
          value: p.stats[category] ?? p.stats[category.toLowerCase()] ?? p.stats[category.toUpperCase()] ?? 0,
          volume: p.stats[rateInfo.volumeStat] ?? p.stats[rateInfo.volumeStat.toLowerCase()] ?? 100,
        }))
        .filter(v => !isNaN(v.value) && v.volume > 0);

      if (rateValues.length < 2) return;

      const weightedMean = calculateWeightedMean(rateValues);
      const weightedStdDev = calculateWeightedStdDev(rateValues, weightedMean);
      const avgVolume = rateValues.reduce((sum, v) => sum + v.volume, 0) / rateValues.length;

      categoryStats[category] = {
        mean: weightedMean,
        stdDev: weightedStdDev,
        values: rateValues.map(v => v.value),
        avgVolume,
      };
    } else {
      const values = players
        .map(p => p.stats[category] ?? p.stats[category.toLowerCase()] ?? p.stats[category.toUpperCase()] ?? 0)
        .filter(v => !isNaN(v));

      if (values.length < 2) return;

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance) || 1;

      categoryStats[category] = { mean, stdDev, values };
    }
  });

  return players.map(player => {
    let totalWeightedZScore = 0;
    let totalWeight = 0;

    categories.forEach(category => {
      const stats = categoryStats[category];
      if (!stats || stats.stdDev === 0) return;

      const playerValue = player.stats[category] ?? player.stats[category.toLowerCase()] ?? player.stats[category.toUpperCase()] ?? 0;
      const upper = category.toUpperCase();
      const rateInfo = RATE_STATS[upper];

      let zScore: number;

      if (rateInfo && stats.avgVolume) {
        const volume = player.stats[rateInfo.volumeStat] ?? player.stats[rateInfo.volumeStat.toLowerCase()] ?? 100;
        const volumeWeight = Math.sqrt(Math.max(0.1, volume / stats.avgVolume));
        zScore = ((playerValue - stats.mean) / stats.stdDev) * volumeWeight;
      } else {
        zScore = (playerValue - stats.mean) / stats.stdDev;
      }

      const weight = Math.abs(categoryWeights[category] || 1);
      const isNeg = isNegativeStat(category, type);

      const adjustedZScore = isNeg ? -zScore : zScore;
      totalWeightedZScore += adjustedZScore * weight;
      totalWeight += weight;
    });

    const avgZScore = totalWeight > 0 ? totalWeightedZScore / totalWeight : 0;

    return { player, totalZScore: avgZScore };
  });
}

function buildDraftablePoolWithPositionAllocation(
  projections: PlayerProjection[],
  leagueSettings: LeagueSettings,
  scoringFormat: ScoringFormat
): {
  draftablePlayers: DraftablePlayer[];
  positionReplacements: Map<string, PositionReplacementLevel>;
  hitterCount: number;
  pitcherCount: number;
  playerIndexMap: Map<PlayerProjection, number>;
  hitterZScoreMap: Map<PlayerProjection, number>;
  pitcherZScoreMap: Map<PlayerProjection, number>;
} {
  const { teamCount, positionRequirements } = leagueSettings;

  const playerIndexMap = new Map<PlayerProjection, number>();
  projections.forEach((p, i) => playerIndexMap.set(p, i));

  const allHitters: PlayerProjection[] = [];
  const allPitchers: PlayerProjection[] = [];

  projections.forEach(player => {
    const type = identifyPlayerType(player);
    if (type === 'hitter' || type === 'both') {
      allHitters.push(player);
    }
    if (type === 'pitcher' || type === 'both') {
      allPitchers.push(player);
    }
  });

  const hitterZScores = calculatePlayerZScoreTotals(allHitters, scoringFormat, 'hitter');
  const pitcherZScores = calculatePlayerZScoreTotals(allPitchers, scoringFormat, 'pitcher');

  const hitterZScoreMap = new Map<PlayerProjection, number>();
  hitterZScores.forEach(hz => hitterZScoreMap.set(hz.player, hz.totalZScore));

  const pitcherZScoreMap = new Map<PlayerProjection, number>();
  pitcherZScores.forEach(pz => pitcherZScoreMap.set(pz.player, pz.totalZScore));

  const draftablePlayers: DraftablePlayer[] = [];
  const assignedPlayerIndices = new Set<number>();
  const positionReplacements = new Map<string, PositionReplacementLevel>();

  const hitterPositionOrder = ['C', '1B', '2B', '3B', 'SS', 'OF', 'MI', 'CI', 'UTIL'];
  const pitcherPositionOrder = ['SP', 'RP', 'P'];

  hitterPositionOrder.forEach(pos => {
    const spotsNeeded = getPositionSpotsPerTeam(pos, positionRequirements) * teamCount;
    if (spotsNeeded === 0) return;

    const eligiblePlayers = allHitters
      .filter(p => {
        const idx = playerIndexMap.get(p)!;
        return playerEligibleForPosition(p, pos) && !assignedPlayerIndices.has(idx);
      })
      .map(p => ({
        player: p,
        index: playerIndexMap.get(p)!,
        zScore: hitterZScoreMap.get(p) || 0,
      }))
      .sort((a, b) => b.zScore - a.zScore);

    const assignedThisPosition: typeof eligiblePlayers = [];

    for (let i = 0; i < Math.min(spotsNeeded, eligiblePlayers.length); i++) {
      const ep = eligiblePlayers[i];
      assignedPlayerIndices.add(ep.index);
      assignedThisPosition.push(ep);

      draftablePlayers.push({
        player: ep.player,
        index: ep.index,
        assignedPosition: pos,
        isHitter: true,
        totalZScore: ep.zScore,
        var: 0,
      });
    }

    if (assignedThisPosition.length > 0) {
      const lastDrafted = assignedThisPosition[assignedThisPosition.length - 1];
      positionReplacements.set(pos, {
        position: pos,
        replacementZScore: lastDrafted.zScore,
        replacementPlayerName: lastDrafted.player.name,
        draftableCount: assignedThisPosition.length,
      });
    }
  });

  pitcherPositionOrder.forEach(pos => {
    const spotsNeeded = getPositionSpotsPerTeam(pos, positionRequirements) * teamCount;
    if (spotsNeeded === 0) return;

    const eligiblePlayers = allPitchers
      .filter(p => {
        const idx = playerIndexMap.get(p)!;
        return playerEligibleForPosition(p, pos) && !assignedPlayerIndices.has(idx);
      })
      .map(p => ({
        player: p,
        index: playerIndexMap.get(p)!,
        zScore: pitcherZScoreMap.get(p) || 0,
      }))
      .sort((a, b) => b.zScore - a.zScore);

    const assignedThisPosition: typeof eligiblePlayers = [];

    for (let i = 0; i < Math.min(spotsNeeded, eligiblePlayers.length); i++) {
      const ep = eligiblePlayers[i];
      assignedPlayerIndices.add(ep.index);
      assignedThisPosition.push(ep);

      draftablePlayers.push({
        player: ep.player,
        index: ep.index,
        assignedPosition: pos,
        isHitter: false,
        totalZScore: ep.zScore,
        var: 0,
      });
    }

    if (assignedThisPosition.length > 0) {
      const lastDrafted = assignedThisPosition[assignedThisPosition.length - 1];
      positionReplacements.set(pos, {
        position: pos,
        replacementZScore: lastDrafted.zScore,
        replacementPlayerName: lastDrafted.player.name,
        draftableCount: assignedThisPosition.length,
      });
    }
  });

  const benchSpots = getPositionSpotsPerTeam('BENCH', positionRequirements) * teamCount;
  if (benchSpots > 0) {
    const benchHitterSpots = Math.ceil(benchSpots * 0.6);
    const benchPitcherSpots = benchSpots - benchHitterSpots;

    const remainingHitters = allHitters
      .filter(p => !assignedPlayerIndices.has(playerIndexMap.get(p)!))
      .map(p => ({
        player: p,
        index: playerIndexMap.get(p)!,
        zScore: hitterZScoreMap.get(p) || 0,
      }))
      .sort((a, b) => b.zScore - a.zScore)
      .slice(0, benchHitterSpots);

    remainingHitters.forEach(ep => {
      assignedPlayerIndices.add(ep.index);
      draftablePlayers.push({
        player: ep.player,
        index: ep.index,
        assignedPosition: 'BENCH',
        isHitter: true,
        totalZScore: ep.zScore,
        var: 0,
      });
    });

    const remainingPitchers = allPitchers
      .filter(p => !assignedPlayerIndices.has(playerIndexMap.get(p)!))
      .map(p => ({
        player: p,
        index: playerIndexMap.get(p)!,
        zScore: pitcherZScoreMap.get(p) || 0,
      }))
      .sort((a, b) => b.zScore - a.zScore)
      .slice(0, benchPitcherSpots);

    remainingPitchers.forEach(ep => {
      assignedPlayerIndices.add(ep.index);
      draftablePlayers.push({
        player: ep.player,
        index: ep.index,
        assignedPosition: 'BENCH',
        isHitter: false,
        totalZScore: ep.zScore,
        var: 0,
      });
    });
  }

  const hitterCount = draftablePlayers.filter(p => p.isHitter).length;
  const pitcherCount = draftablePlayers.filter(p => !p.isHitter).length;

  return { 
    draftablePlayers, 
    positionReplacements, 
    hitterCount, 
    pitcherCount,
    playerIndexMap,
    hitterZScoreMap,
    pitcherZScoreMap
  };
}

function adjustReplacementLevels(
  positionReplacements: Map<string, PositionReplacementLevel>,
  method: ReplacementLevelMethod,
  allHitters: { player: PlayerProjection; totalZScore: number }[],
  allPitchers: { player: PlayerProjection; totalZScore: number }[],
  draftablePlayers: DraftablePlayer[]
): void {
  if (method === 'lastDrafted') {
    return;
  }

  const draftableIndices = new Set(draftablePlayers.map(dp => dp.player));

  positionReplacements.forEach((rep, pos) => {
    const isHitterPos = !isPitcherPos(pos);
    const allPlayers = isHitterPos ? allHitters : allPitchers;

    const eligiblePlayers = allPlayers
      .filter(p => playerEligibleForPosition(p.player, pos))
      .sort((a, b) => b.totalZScore - a.totalZScore);

    const lastDraftedIdx = rep.draftableCount - 1;

    if (method === 'firstUndrafted') {
      const firstUndrafted = eligiblePlayers.find(p => !draftableIndices.has(p.player));
      if (firstUndrafted) {
        rep.replacementZScore = firstUndrafted.totalZScore;
        rep.replacementPlayerName = firstUndrafted.player.name;
      }
    } else if (method === 'blended') {
      const lastTwo = eligiblePlayers.slice(Math.max(0, lastDraftedIdx - 1), lastDraftedIdx + 1);
      const firstTwo = eligiblePlayers.slice(lastDraftedIdx + 1, lastDraftedIdx + 3);
      const blendedPlayers = [...lastTwo, ...firstTwo].filter(Boolean);

      if (blendedPlayers.length > 0) {
        rep.replacementZScore = blendedPlayers.reduce((sum, p) => sum + p.totalZScore, 0) / blendedPlayers.length;
      }
    }
  });
}

/**
 * Minimum z-score threshold for positive value.
 * Players below this absolute z-score will always get $1 value regardless of
 * replacement level, preventing inflated values for extremely low-stat players.
 */
const MIN_ZSCORE_FOR_VALUE = -1.5;

function calculateVARPerPosition(
  draftablePlayers: DraftablePlayer[],
  positionReplacements: Map<string, PositionReplacementLevel>
): void {
  const hitterPositions = Array.from(positionReplacements.keys()).filter(p => !isPitcherPos(p));
  const pitcherPositions = Array.from(positionReplacements.keys()).filter(p => isPitcherPos(p));

  const avgHitterReplacement = hitterPositions.length > 0
    ? hitterPositions.reduce((sum, pos) => sum + (positionReplacements.get(pos)?.replacementZScore || 0), 0) / hitterPositions.length
    : 0;

  const avgPitcherReplacement = pitcherPositions.length > 0
    ? pitcherPositions.reduce((sum, pos) => sum + (positionReplacements.get(pos)?.replacementZScore || 0), 0) / pitcherPositions.length
    : 0;

  draftablePlayers.forEach(dp => {
    // Players with extremely negative z-scores should not get positive VAR
    // even if the replacement level is worse. This prevents inflated values
    // for players projected for minimal playing time.
    if (dp.totalZScore < MIN_ZSCORE_FOR_VALUE) {
      dp.var = 0;
      return;
    }

    const posRep = positionReplacements.get(dp.assignedPosition);
    let replacementZScore: number;

    if (posRep) {
      replacementZScore = posRep.replacementZScore;
    } else {
      replacementZScore = dp.isHitter ? avgHitterReplacement : avgPitcherReplacement;
    }

    dp.var = Math.max(0, dp.totalZScore - replacementZScore);
  });
}

function calculatePositionScarcity(
  draftablePlayers: DraftablePlayer[],
  positionReplacements: Map<string, PositionReplacementLevel>
): Map<string, PositionScarcity> {
  const scarcityMap = new Map<string, PositionScarcity>();
  const dropOffs: number[] = [];

  positionReplacements.forEach((rep, pos) => {
    const playersAtPos = draftablePlayers
      .filter(dp => dp.assignedPosition === pos)
      .sort((a, b) => b.totalZScore - a.totalZScore);

    if (playersAtPos.length < 2) {
      scarcityMap.set(pos, { position: pos, depthScore: 0, scarcityMultiplier: 1 });
      return;
    }

    const topPlayer = playersAtPos[0];
    const replacementPlayer = playersAtPos[playersAtPos.length - 1];
    const dropOff = topPlayer.totalZScore - replacementPlayer.totalZScore;
    dropOffs.push(dropOff);

    scarcityMap.set(pos, { position: pos, depthScore: dropOff, scarcityMultiplier: 1 });
  });

  const avgDropOff = dropOffs.length > 0 ? dropOffs.reduce((a, b) => a + b, 0) / dropOffs.length : 1;

  scarcityMap.forEach((scarcity) => {
    if (avgDropOff > 0 && scarcity.depthScore > 0) {
      scarcity.scarcityMultiplier = 0.85 + (0.3 * (scarcity.depthScore / avgDropOff));
      scarcity.scarcityMultiplier = Math.max(0.85, Math.min(1.4, scarcity.scarcityMultiplier));
    }
  });

  return scarcityMap;
}

function assignValueTier(percentile: number): ValueTier {
  if (percentile >= 95) return 'elite';
  if (percentile >= 85) return 'star';
  if (percentile >= 50) return 'starter';
  if (percentile >= 20) return 'bench';
  return 'replacement';
}

function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  const index = sortedValues.findIndex(v => v <= value);
  if (index === -1) return 0;
  return ((sortedValues.length - index) / sortedValues.length) * 100;
}

export function calculateRecommendedBudgetSplit(
  projections: PlayerProjection[],
  leagueSettings: LeagueSettings,
  scoringFormat: ScoringFormat
): { hitterPercent: number; reason: string } {
  if (projections.length === 0) {
    return { hitterPercent: 65, reason: 'Default split (no projections loaded)' };
  }

  const result = buildDraftablePoolWithPositionAllocation(projections, leagueSettings, scoringFormat);

  const hitterVAR = result.draftablePlayers
    .filter(dp => dp.isHitter)
    .reduce((sum, dp) => sum + Math.max(0, dp.totalZScore), 0);

  const pitcherVAR = result.draftablePlayers
    .filter(dp => !dp.isHitter)
    .reduce((sum, dp) => sum + Math.max(0, dp.totalZScore), 0);

  const totalVAR = hitterVAR + pitcherVAR;

  if (totalVAR === 0) {
    return { hitterPercent: 65, reason: 'Default split (insufficient stat data)' };
  }

  const rawHitterPercent = (hitterVAR / totalVAR) * 100;
  const clampedPercent = Math.max(40, Math.min(80, Math.round(rawHitterPercent / 5) * 5));

  const reason = `Based on z-score analysis: ${result.hitterCount} hitters vs ${result.pitcherCount} pitchers`;

  return { hitterPercent: clampedPercent, reason };
}

export function calculatePlayerValues(
  projections: PlayerProjection[],
  leagueSettings: LeagueSettings,
  scoringFormat: ScoringFormat,
  settings: ValueCalculationSettings
): PlayerValue[] {
  if (projections.length === 0) return [];

  const { 
    draftablePlayers, 
    positionReplacements, 
    hitterCount, 
    pitcherCount,
    hitterZScoreMap,
    pitcherZScoreMap 
  } = buildDraftablePoolWithPositionAllocation(projections, leagueSettings, scoringFormat);

  const allHitters: { player: PlayerProjection; totalZScore: number }[] = [];
  const allPitchers: { player: PlayerProjection; totalZScore: number }[] = [];

  projections.forEach(p => {
    const type = identifyPlayerType(p);
    if (type === 'hitter' || type === 'both') {
      allHitters.push({ player: p, totalZScore: hitterZScoreMap.get(p) || 0 });
    }
    if (type === 'pitcher' || type === 'both') {
      allPitchers.push({ player: p, totalZScore: pitcherZScoreMap.get(p) || 0 });
    }
  });

  const replacementMethod = settings.replacementLevelMethod || 'lastDrafted';
  adjustReplacementLevels(positionReplacements, replacementMethod, allHitters, allPitchers, draftablePlayers);

  calculateVARPerPosition(draftablePlayers, positionReplacements);

  let scarcityMap: Map<string, PositionScarcity> | null = null;
  if (settings.applyPositionScarcity) {
    scarcityMap = calculatePositionScarcity(draftablePlayers, positionReplacements);

    draftablePlayers.forEach(dp => {
      const scarcity = scarcityMap?.get(dp.assignedPosition);
      if (scarcity) {
        dp.var *= scarcity.scarcityMultiplier;
      }
    });
  }

  const totalBudget = leagueSettings.teamCount * leagueSettings.auctionBudget;
  const totalRosterSpots = hitterCount + pitcherCount;
  const reservedDollars = totalRosterSpots * 1;
  const distributableDollars = totalBudget - reservedDollars;

  let hitterPercent = settings.hitterBudgetPercent;
  const splitConfig = settings.hitterPitcherSplit;

  if (splitConfig) {
    if (splitConfig.method === 'manual' && splitConfig.manualSplit) {
      hitterPercent = splitConfig.manualSplit.hitters;
    } else if (splitConfig.method === 'standard' && splitConfig.standardPreset) {
      hitterPercent = STANDARD_SPLITS[splitConfig.standardPreset].hitters;
    } else if (splitConfig.method === 'calculated') {
      const hitterVAR = draftablePlayers
        .filter(dp => dp.isHitter)
        .reduce((sum, dp) => sum + Math.max(0, dp.totalZScore), 0);
      const pitcherVAR = draftablePlayers
        .filter(dp => !dp.isHitter)
        .reduce((sum, dp) => sum + Math.max(0, dp.totalZScore), 0);
      const totalVAR = hitterVAR + pitcherVAR;
      
      if (totalVAR > 0) {
        const rawHitterPercent = (hitterVAR / totalVAR) * 100;
        hitterPercent = Math.max(40, Math.min(80, Math.round(rawHitterPercent / 5) * 5));
      }
    }
  }

  const hitterDollars = distributableDollars * (hitterPercent / 100);
  const pitcherDollars = distributableDollars * ((100 - hitterPercent) / 100);

  const totalHitterVAR = draftablePlayers
    .filter(dp => dp.isHitter && dp.var > 0)
    .reduce((sum, dp) => sum + dp.var, 0);

  const totalPitcherVAR = draftablePlayers
    .filter(dp => !dp.isHitter && dp.var > 0)
    .reduce((sum, dp) => sum + dp.var, 0);

  const hitterDollarPerVAR = totalHitterVAR > 0 ? hitterDollars / totalHitterVAR : 0;
  const pitcherDollarPerVAR = totalPitcherVAR > 0 ? pitcherDollars / totalPitcherVAR : 0;

  const draftableMap = new Map<number, DraftablePlayer>();
  draftablePlayers.forEach(dp => draftableMap.set(dp.index, dp));

  const positiveVARs = draftablePlayers.filter(dp => dp.var > 0).map(dp => dp.var).sort((a, b) => b - a);

  const rawPlayerValues: { index: number; rawValue: number; draftablePlayer: DraftablePlayer | undefined; player: PlayerProjection }[] = [];
  
  projections.forEach((player, index) => {
    const draftablePlayer = draftableMap.get(index);
    let rawValue = 0;
    
    if (draftablePlayer) {
      if (draftablePlayer.var > 0) {
        const dollarPerVAR = draftablePlayer.isHitter ? hitterDollarPerVAR : pitcherDollarPerVAR;
        rawValue = 1 + draftablePlayer.var * dollarPerVAR;
      } else {
        rawValue = 1;
      }
    }
    
    rawPlayerValues.push({ index, rawValue, draftablePlayer, player });
  });

  const totalRawValue = rawPlayerValues.reduce((sum, p) => sum + p.rawValue, 0);
  const scaleFactor = totalRawValue > 0 ? totalBudget / totalRawValue : 1;

  const playerValues: PlayerValue[] = rawPlayerValues.map(({ index, rawValue, draftablePlayer, player }) => {
    const isDraftable = !!draftablePlayer;
    let originalValue = 0;
    let var_value = 0;
    let valueTier: ValueTier = 'replacement';

    if (draftablePlayer) {
      if (draftablePlayer.var > 0) {
        originalValue = Math.max(1, Math.round(rawValue * scaleFactor));
        var_value = draftablePlayer.var;

        if (settings.showTiers) {
          const percentile = calculatePercentile(draftablePlayer.var, positiveVARs);
          valueTier = assignValueTier(percentile);
        }
      } else {
        originalValue = 1;
      }
    }

    return {
      id: `player-${index}`,
      name: player.name,
      team: player.team,
      positions: player.positions,
      originalValue,
      rank: 0,
      stats: player.stats,
      isDrafted: false,
      isDraftable,
      assignedPosition: draftablePlayer?.assignedPosition,
      var: var_value,
      valueTier: settings.showTiers ? valueTier : undefined,
    };
  });

  const draftableValues = playerValues.filter(p => p.isDraftable);
  const nonDraftableValues = playerValues.filter(p => !p.isDraftable);

  const sortedDraftables = draftableValues
    .sort((a, b) => b.originalValue - a.originalValue)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
      tier: Math.floor(index / 20) + 1,
    }));

  const sortedNonDraftables = nonDraftableValues.map(player => ({
    ...player,
    rank: 0,
    tier: 0,
  }));

  const sortedValues = [...sortedDraftables, ...sortedNonDraftables];

  const totalAssignedValue = sortedDraftables.reduce((sum, p) => sum + p.originalValue, 0);
  console.log(`[Calculations] Generated ${sortedValues.length} player values. ` +
    `Draftable: ${draftablePlayers.length} (${hitterCount} hitters, ${pitcherCount} pitchers). ` +
    `Total budget: $${totalBudget}, Assigned: $${totalAssignedValue}. ` +
    `Split: ${hitterPercent}%/${100 - hitterPercent}%`);

  return sortedValues;
}

export interface PendingBid {
  playerId: string;
  price: number;
  isMyBid: boolean;
}

export function calculateInflation(
  playerValues: PlayerValue[],
  draftPicks: DraftPick[],
  leagueSettings: LeagueSettings,
  pendingBids: PendingBid[] = []
): { inflationRate: number; adjustedValues: PlayerValue[] } {
  const totalBudget = leagueSettings.teamCount * leagueSettings.auctionBudget;
  const confirmedSpent = draftPicks.reduce((sum, pick) => sum + pick.actualPrice, 0);
  const pendingSpent = pendingBids.reduce((sum, bid) => sum + bid.price, 0);
  const totalSpent = confirmedSpent + pendingSpent;
  const remainingBudget = totalBudget - totalSpent;

  const draftedPlayerIds = new Set(draftPicks.map(p => p.playerId));
  const pendingBidsMap = new Map(pendingBids.map(b => [b.playerId, b]));
  
  const undraftedPlayers = playerValues.filter(p => 
    !draftedPlayerIds.has(p.id) && 
    !pendingBidsMap.has(p.id) && 
    !p.isDrafted
  );

  const remainingValue = undraftedPlayers.reduce((sum, p) => sum + p.originalValue, 0);

  if (remainingValue === 0 || remainingBudget <= 0) {
    const adjustedValues = playerValues.map(p => {
      const pendingBid = pendingBidsMap.get(p.id);
      if (pendingBid) {
        return {
          ...p,
          adjustedValue: pendingBid.price,
          hasPendingBid: true,
          pendingBidIsMyBid: pendingBid.isMyBid,
        };
      }
      return {
        ...p,
        adjustedValue: p.originalValue,
      };
    });
    return { inflationRate: 0, adjustedValues };
  }

  const inflationRate = (remainingBudget / remainingValue) - 1;

  const adjustedValues = playerValues.map(player => {
    if (draftedPlayerIds.has(player.id)) {
      const draftPick = draftPicks.find(p => p.playerId === player.id);
      return {
        ...player,
        isDrafted: true,
        draftPrice: draftPick?.actualPrice || player.draftPrice,
        draftedBy: draftPick?.draftedBy || player.draftedBy,
        adjustedValue: player.originalValue,
        hasPendingBid: false,
      };
    }

    const pendingBid = pendingBidsMap.get(player.id);
    if (pendingBid) {
      return {
        ...player,
        isDrafted: false,
        adjustedValue: pendingBid.price,
        hasPendingBid: true,
        pendingBidIsMyBid: pendingBid.isMyBid,
      };
    }

    return {
      ...player,
      isDrafted: false,
      adjustedValue: Math.max(1, Math.round(player.originalValue * (1 + inflationRate))),
      hasPendingBid: false,
    };
  });

  return { inflationRate, adjustedValues };
}
