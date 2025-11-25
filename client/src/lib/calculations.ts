import type {
  PlayerProjection,
  PlayerValue,
  LeagueSettings,
  ScoringFormat,
  ValueCalculationSettings,
  DraftPick,
} from '@shared/schema';

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
    p.positions.some(pos => !['SP', 'RP', 'P'].includes(pos))
  );
  const pitchers = projections.filter(p => 
    p.positions.some(pos => ['SP', 'RP', 'P'].includes(pos))
  );

  let hitterValues: PlayerValue[] = [];
  let pitcherValues: PlayerValue[] = [];

  if (settings.method === 'z-score') {
    hitterValues = calculateZScoreValues(hitters, hitterBudget, 'hitter', scoringFormat);
    pitcherValues = calculateZScoreValues(pitchers, pitcherBudget, 'pitcher', scoringFormat);
  } else {
    hitterValues = calculateSGPValues(hitters, hitterBudget, leagueSettings, 'hitter', scoringFormat);
    pitcherValues = calculateSGPValues(pitchers, pitcherBudget, leagueSettings, 'pitcher', scoringFormat);
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
  scoringFormat: ScoringFormat
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

  const zScores = players.map(player => {
    let totalWeightedZScore = 0;
    let totalWeight = 0;
    
    categories.forEach(category => {
      const values = players
        .map(p => p.stats[category] || 0)
        .filter(v => !isNaN(v));
      
      if (values.length < 2) return;
      
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev === 0) return;
      
      const playerValue = player.stats[category] || 0;
      const zScore = (playerValue - mean) / stdDev;
      
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
    };
  });

  const minZScore = Math.min(...zScores.map(z => z.totalZScore));
  const adjustedScores = zScores.map(z => ({
    ...z,
    adjustedScore: Math.max(0, z.totalZScore - minZScore + 0.5),
  }));

  const totalValue = adjustedScores.reduce((sum, z) => sum + z.adjustedScore, 0);
  
  if (totalValue === 0) {
    return players.map((player, index) => ({
      id: `${type}-${index}`,
      name: player.name,
      team: player.team,
      positions: player.positions,
      originalValue: 1,
      rank: 0,
      stats: player.stats,
      isDrafted: false,
    }));
  }
  
  return adjustedScores.map((z, index) => ({
    id: `${type}-${index}`,
    name: z.player.name,
    team: z.player.team,
    positions: z.player.positions,
    originalValue: Math.max(1, Math.round((z.adjustedScore / totalValue) * budget)),
    rank: 0,
    stats: z.player.stats,
    isDrafted: false,
  }));
}

function calculateSGPValues(
  players: PlayerProjection[],
  budget: number,
  leagueSettings: LeagueSettings,
  type: 'hitter' | 'pitcher',
  scoringFormat: ScoringFormat
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
  
  const sgpValues = players.map(player => {
    let totalWeightedSGP = 0;
    let totalWeight = 0;
    
    categories.forEach(category => {
      const values = players
        .map(p => p.stats[category] || 0)
        .filter(v => !isNaN(v))
        .sort((a, b) => b - a);
      
      if (values.length < 2) return;
      
      const playerValue = player.stats[category] || 0;
      const topValue = values[0];
      const bottomValue = values[values.length - 1];
      const standingSpread = Math.abs(topValue - bottomValue);
      const standingsPerCategory = teamCount;
      
      const sgpPerUnit = standingSpread > 0 ? standingsPerCategory / standingSpread : 0;
      
      const isNegativeStat = category.toLowerCase().includes('era') || 
                            category.toLowerCase().includes('whip') ||
                            (category.toLowerCase() === 'k' && type === 'hitter');
      
      const baseValue = isNegativeStat ? bottomValue : topValue;
      const playerDiff = isNegativeStat ? baseValue - playerValue : playerValue - baseValue;
      const sgp = playerDiff * sgpPerUnit;
      
      const weight = Math.abs(categoryWeights[category] || 1);
      totalWeightedSGP += sgp * weight;
      totalWeight += weight;
    });

    const avgSGP = totalWeight > 0 ? totalWeightedSGP / totalWeight : 0;
    
    return { player, sgp: avgSGP };
  });

  const minSGP = Math.min(...sgpValues.map(s => s.sgp));
  const adjustedSGP = sgpValues.map(s => ({
    ...s,
    adjustedSGP: Math.max(0, s.sgp - minSGP + 0.5),
  }));

  const totalSGP = adjustedSGP.reduce((sum, s) => sum + s.adjustedSGP, 0);
  
  if (totalSGP === 0) {
    return players.map((player, index) => ({
      id: `${type}-${index}`,
      name: player.name,
      team: player.team,
      positions: player.positions,
      originalValue: 1,
      rank: 0,
      stats: player.stats,
      isDrafted: false,
    }));
  }
  
  return adjustedSGP.map((s, index) => ({
    id: `${type}-${index}`,
    name: s.player.name,
    team: s.player.team,
    positions: s.player.positions,
    originalValue: Math.max(1, Math.round((s.adjustedSGP / totalSGP) * budget)),
    rank: 0,
    stats: s.player.stats,
    isDrafted: false,
  }));
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
