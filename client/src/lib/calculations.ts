import type {
  PlayerProjection,
  PlayerValue,
  LeagueSettings,
  ScoringFormat,
  ValueCalculationSettings,
  DraftPick,
} from '@shared/schema';

interface CategoryStats {
  mean: number;
  stdDev: number;
  values: number[];
}

const PITCHER_POSITIONS = ['SP', 'RP', 'P'];
const isPitcherPos = (pos: string) => PITCHER_POSITIONS.includes(pos.toUpperCase());

export function calculateRecommendedBudgetSplit(
  projections: PlayerProjection[],
  leagueSettings: LeagueSettings,
  scoringFormat: ScoringFormat
): { hitterPercent: number; reason: string } {
  if (projections.length === 0) {
    return { hitterPercent: 65, reason: 'Default split (no projections loaded)' };
  }

  const hitters = projections.filter(p => 
    p.positions.some(pos => !isPitcherPos(pos))
  );
  const pitchers = projections.filter(p => 
    p.positions.some(pos => isPitcherPos(pos))
  );

  if (hitters.length === 0 || pitchers.length === 0) {
    return { hitterPercent: 65, reason: 'Default split (missing hitter or pitcher data)' };
  }

  const hitterReplacementLevel = calculateReplacementLevel(leagueSettings, 'hitter');
  const pitcherReplacementLevel = calculateReplacementLevel(leagueSettings, 'pitcher');

  const hitterZScores = calculatePlayerZScoreTotals(hitters, scoringFormat, 'hitter');
  const pitcherZScores = calculatePlayerZScoreTotals(pitchers, scoringFormat, 'pitcher');

  const topHitters = hitterZScores
    .sort((a, b) => b.totalZScore - a.totalZScore)
    .slice(0, hitterReplacementLevel);
  
  const topPitchers = pitcherZScores
    .sort((a, b) => b.totalZScore - a.totalZScore)
    .slice(0, pitcherReplacementLevel);

  const totalHitterValue = topHitters.reduce((sum, p) => sum + Math.max(0, p.totalZScore), 0);
  const totalPitcherValue = topPitchers.reduce((sum, p) => sum + Math.max(0, p.totalZScore), 0);
  const totalValue = totalHitterValue + totalPitcherValue;

  if (totalValue === 0) {
    return { hitterPercent: 65, reason: 'Default split (insufficient stat data)' };
  }

  const rawHitterPercent = (totalHitterValue / totalValue) * 100;
  
  const clampedPercent = Math.max(40, Math.min(80, Math.round(rawHitterPercent / 5) * 5));

  const reason = `Based on z-score analysis: ${hitterReplacementLevel} hitters (${totalHitterValue.toFixed(0)} total z-score) vs ${pitcherReplacementLevel} pitchers (${totalPitcherValue.toFixed(0)} total z-score)`;

  return { hitterPercent: clampedPercent, reason };
}

function calculatePlayerZScoreTotals(
  players: PlayerProjection[],
  scoringFormat: ScoringFormat,
  type: 'hitter' | 'pitcher'
): { player: PlayerProjection; totalZScore: number }[] {
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

  const categoryStats: Record<string, CategoryStats> = {};
  
  categories.forEach(category => {
    const values = players
      .map(p => p.stats[category] || 0)
      .filter(v => !isNaN(v));
    
    if (values.length < 2) return;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    categoryStats[category] = { mean, stdDev, values };
  });

  return players.map(player => {
    let totalWeightedZScore = 0;
    let totalWeight = 0;
    
    categories.forEach(category => {
      const stats = categoryStats[category];
      if (!stats || stats.stdDev === 0) return;
      
      const playerValue = player.stats[category] || 0;
      const zScore = (playerValue - stats.mean) / stats.stdDev;
      
      const weight = Math.abs(categoryWeights[category] || 1);
      const isNegativeStat = category.toLowerCase().includes('era') || 
                            category.toLowerCase().includes('whip') ||
                            (category.toLowerCase() === 'k' && type === 'hitter');
      
      const adjustedZScore = isNegativeStat ? -zScore : zScore;
      totalWeightedZScore += adjustedZScore * weight;
      totalWeight += weight;
    });

    const avgZScore = totalWeight > 0 ? totalWeightedZScore / totalWeight : 0;
    
    return { player, totalZScore: avgZScore };
  });
}

function calculateReplacementLevel(
  leagueSettings: LeagueSettings,
  type: 'hitter' | 'pitcher'
): number {
  const { teamCount, positionRequirements } = leagueSettings;
  
  if (type === 'hitter') {
    const hitterPositions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'MI', 'CI', 'UTIL'];
    const hitterSpots = hitterPositions.reduce((sum, pos) => 
      sum + (positionRequirements[pos as keyof typeof positionRequirements] || 0), 0
    );
    return Math.ceil(teamCount * hitterSpots * 1.3);
  } else {
    const pitcherPositions = ['SP', 'RP', 'P'];
    const pitcherSpots = pitcherPositions.reduce((sum, pos) => 
      sum + (positionRequirements[pos as keyof typeof positionRequirements] || 0), 0
    );
    return Math.ceil(teamCount * pitcherSpots * 1.3);
  }
}

export function calculatePlayerValues(
  projections: PlayerProjection[],
  leagueSettings: LeagueSettings,
  scoringFormat: ScoringFormat,
  settings: ValueCalculationSettings
): PlayerValue[] {
  if (projections.length === 0) return [];

  const hitterBudgetPercent = settings.hitterBudgetPercent;
  const pitcherBudgetPercent = 100 - hitterBudgetPercent;

  const totalBudget = leagueSettings.teamCount * leagueSettings.auctionBudget;
  const hitterBudget = totalBudget * (hitterBudgetPercent / 100);
  const pitcherBudget = totalBudget * (pitcherBudgetPercent / 100);

  const hitters = projections.filter(p => 
    p.positions.some(pos => !isPitcherPos(pos))
  );
  const pitchers = projections.filter(p => 
    p.positions.some(pos => isPitcherPos(pos))
  );

  const hitterReplacementLevel = calculateReplacementLevel(leagueSettings, 'hitter');
  const pitcherReplacementLevel = calculateReplacementLevel(leagueSettings, 'pitcher');

  let hitterValues: PlayerValue[] = [];
  let pitcherValues: PlayerValue[] = [];

  if (settings.method === 'z-score') {
    hitterValues = calculateZScoreValues(hitters, hitterBudget, 'hitter', scoringFormat, hitterReplacementLevel);
    pitcherValues = calculateZScoreValues(pitchers, pitcherBudget, 'pitcher', scoringFormat, pitcherReplacementLevel);
  } else {
    hitterValues = calculateSGPValues(hitters, hitterBudget, leagueSettings, 'hitter', scoringFormat, hitterReplacementLevel);
    pitcherValues = calculateSGPValues(pitchers, pitcherBudget, leagueSettings, 'pitcher', scoringFormat, pitcherReplacementLevel);
  }

  const allValues = [...hitterValues, ...pitcherValues]
    .sort((a, b) => b.originalValue - a.originalValue)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
      tier: Math.floor(index / 20) + 1,
    }));

  return allValues;
}

function calculateZScoreValues(
  players: PlayerProjection[],
  budget: number,
  type: 'hitter' | 'pitcher',
  scoringFormat: ScoringFormat,
  replacementLevel: number
): PlayerValue[] {
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

  const categoryStats: Record<string, CategoryStats> = {};
  
  categories.forEach(category => {
    const values = players
      .map(p => p.stats[category] || 0)
      .filter(v => !isNaN(v));
    
    if (values.length < 2) return;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    categoryStats[category] = { mean, stdDev, values };
  });

  const zScores = players.map((player, index) => {
    let totalWeightedZScore = 0;
    let totalWeight = 0;
    
    categories.forEach(category => {
      const stats = categoryStats[category];
      if (!stats || stats.stdDev === 0) return;
      
      const playerValue = player.stats[category] || 0;
      const zScore = (playerValue - stats.mean) / stats.stdDev;
      
      const weight = Math.abs(categoryWeights[category] || 1);
      const isNegativeStat = category.toLowerCase().includes('era') || 
                            category.toLowerCase().includes('whip') ||
                            (category.toLowerCase() === 'k' && type === 'hitter');
      
      const adjustedZScore = isNegativeStat ? -zScore : zScore;
      totalWeightedZScore += adjustedZScore * weight;
      totalWeight += weight;
    });

    const avgZScore = totalWeight > 0 ? totalWeightedZScore / totalWeight : 0;
    
    return {
      player,
      totalZScore: avgZScore,
      index,
    };
  });

  const sortedByZScore = [...zScores].sort((a, b) => b.totalZScore - a.totalZScore);
  
  const topPlayers = sortedByZScore.slice(0, replacementLevel);
  const replacementZScore = topPlayers[topPlayers.length - 1]?.totalZScore || 0;
  
  const aboveReplacementScores = topPlayers.map(z => ({
    ...z,
    aboveReplacement: Math.max(0.01, z.totalZScore - replacementZScore + 1),
  }));

  const totalValue = aboveReplacementScores.reduce((sum, z) => sum + z.aboveReplacement, 0);
  
  if (totalValue === 0) {
    return sortedByZScore.slice(0, replacementLevel).map((z, idx) => ({
      id: `${type}-${z.index}`,
      name: z.player.name,
      team: z.player.team,
      positions: z.player.positions,
      originalValue: 1,
      rank: 0,
      stats: z.player.stats,
      isDrafted: false,
    }));
  }
  
  const valuedPlayers = aboveReplacementScores.map(z => ({
    id: `${type}-${z.index}`,
    name: z.player.name,
    team: z.player.team,
    positions: z.player.positions,
    originalValue: Math.max(1, Math.round((z.aboveReplacement / totalValue) * budget)),
    rank: 0,
    stats: z.player.stats,
    isDrafted: false,
  }));
  
  const belowReplacementPlayers = zScores
    .filter(z => !topPlayers.some(t => t.index === z.index))
    .map(z => ({
      id: `${type}-${z.index}`,
      name: z.player.name,
      team: z.player.team,
      positions: z.player.positions,
      originalValue: 1,
      rank: 0,
      stats: z.player.stats,
      isDrafted: false,
    }));
  
  return [...valuedPlayers, ...belowReplacementPlayers];
}

function calculateSGPValues(
  players: PlayerProjection[],
  budget: number,
  leagueSettings: LeagueSettings,
  type: 'hitter' | 'pitcher',
  scoringFormat: ScoringFormat,
  replacementLevel: number
): PlayerValue[] {
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

  const teamCount = leagueSettings.teamCount;
  
  const categoryRanges: Record<string, { top: number; bottom: number; sgpPerUnit: number }> = {};
  
  categories.forEach(category => {
    const values = players
      .map(p => p.stats[category] || 0)
      .filter(v => !isNaN(v))
      .sort((a, b) => b - a);
    
    if (values.length < 2) return;
    
    const topValue = values[0];
    const bottomValue = values[values.length - 1];
    const standingSpread = Math.abs(topValue - bottomValue);
    const sgpPerUnit = standingSpread > 0 ? teamCount / standingSpread : 0;
    
    categoryRanges[category] = { top: topValue, bottom: bottomValue, sgpPerUnit };
  });
  
  const sgpValues = players.map((player, index) => {
    let totalWeightedSGP = 0;
    let totalWeight = 0;
    
    categories.forEach(category => {
      const range = categoryRanges[category];
      if (!range || range.sgpPerUnit === 0) return;
      
      const playerValue = player.stats[category] || 0;
      const isNegativeStat = category.toLowerCase().includes('era') || 
                            category.toLowerCase().includes('whip') ||
                            (category.toLowerCase() === 'k' && type === 'hitter');
      
      const baseValue = isNegativeStat ? range.bottom : range.top;
      const playerDiff = isNegativeStat ? baseValue - playerValue : playerValue - baseValue;
      const sgp = playerDiff * range.sgpPerUnit;
      
      const weight = Math.abs(categoryWeights[category] || 1);
      totalWeightedSGP += sgp * weight;
      totalWeight += weight;
    });

    const avgSGP = totalWeight > 0 ? totalWeightedSGP / totalWeight : 0;
    
    return { player, sgp: avgSGP, index };
  });

  const sortedBySGP = [...sgpValues].sort((a, b) => b.sgp - a.sgp);
  
  const topPlayers = sortedBySGP.slice(0, replacementLevel);
  const replacementSGP = topPlayers[topPlayers.length - 1]?.sgp || 0;
  
  const aboveReplacementScores = topPlayers.map(s => ({
    ...s,
    aboveReplacement: Math.max(0.01, s.sgp - replacementSGP + 1),
  }));

  const totalSGP = aboveReplacementScores.reduce((sum, s) => sum + s.aboveReplacement, 0);
  
  if (totalSGP === 0) {
    return sortedBySGP.slice(0, replacementLevel).map((s, idx) => ({
      id: `${type}-${s.index}`,
      name: s.player.name,
      team: s.player.team,
      positions: s.player.positions,
      originalValue: 1,
      rank: 0,
      stats: s.player.stats,
      isDrafted: false,
    }));
  }
  
  const valuedPlayers = aboveReplacementScores.map(s => ({
    id: `${type}-${s.index}`,
    name: s.player.name,
    team: s.player.team,
    positions: s.player.positions,
    originalValue: Math.max(1, Math.round((s.aboveReplacement / totalSGP) * budget)),
    rank: 0,
    stats: s.player.stats,
    isDrafted: false,
  }));
  
  const belowReplacementPlayers = sgpValues
    .filter(s => !topPlayers.some(t => t.index === s.index))
    .map(s => ({
      id: `${type}-${s.index}`,
      name: s.player.name,
      team: s.player.team,
      positions: s.player.positions,
      originalValue: 1,
      rank: 0,
      stats: s.player.stats,
      isDrafted: false,
    }));
  
  return [...valuedPlayers, ...belowReplacementPlayers];
}

export function calculateInflation(
  playerValues: PlayerValue[],
  draftPicks: DraftPick[],
  leagueSettings: LeagueSettings
): { inflationRate: number; adjustedValues: PlayerValue[] } {
  const totalBudget = leagueSettings.teamCount * leagueSettings.auctionBudget;
  const totalSpent = draftPicks.reduce((sum, pick) => sum + pick.actualPrice, 0);
  const remainingBudget = totalBudget - totalSpent;

  const draftedPlayerIds = new Set(draftPicks.map(p => p.playerId));
  const undraftedPlayers = playerValues.filter(p => !draftedPlayerIds.has(p.id) && !p.isDrafted);

  const remainingValue = undraftedPlayers.reduce((sum, p) => sum + p.originalValue, 0);

  if (remainingValue === 0 || remainingBudget <= 0) {
    return { 
      inflationRate: 0, 
      adjustedValues: playerValues.map(p => ({
        ...p,
        adjustedValue: draftedPlayerIds.has(p.id) ? p.originalValue : p.originalValue,
      }))
    };
  }

  const inflationRate = (remainingBudget / remainingValue) - 1;

  const adjustedValues = playerValues.map(player => {
    if (draftedPlayerIds.has(player.id) || player.isDrafted) {
      const draftPick = draftPicks.find(p => p.playerId === player.id);
      return {
        ...player,
        isDrafted: true,
        draftPrice: draftPick?.actualPrice || player.draftPrice,
        draftedBy: draftPick?.draftedBy || player.draftedBy,
        adjustedValue: player.originalValue,
      };
    }
    
    return {
      ...player,
      isDrafted: false,
      adjustedValue: Math.max(1, Math.round(player.originalValue * (1 + inflationRate))),
    };
  });

  return { inflationRate, adjustedValues };
}
