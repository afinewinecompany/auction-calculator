import type { LeagueSettings, DraftState, PlayerValue } from '@shared/schema';

interface DraftMetricsProps {
  leagueSettings: LeagueSettings;
  draftState: DraftState;
  playerValues: PlayerValue[];
  pendingBidsTotal?: number;
  pendingBidsCount?: number;
}

export function DraftMetrics({ leagueSettings, draftState, playerValues, pendingBidsTotal = 0, pendingBidsCount = 0 }: DraftMetricsProps) {
  const totalBudget = leagueSettings.teamCount * leagueSettings.auctionBudget;
  const totalPlayersToDraft = leagueSettings.teamCount * leagueSettings.totalRosterSpots;
  const budgetRemaining = totalBudget - draftState.totalBudgetSpent - pendingBidsTotal;
  const playersLeftToDraft = totalPlayersToDraft - draftState.totalPlayersDrafted - pendingBidsCount;
  const avgCostPerPlayer = playersLeftToDraft > 0 ? budgetRemaining / playersLeftToDraft : 0;
  
  const undraftedPlayers = playerValues.filter(p => !p.isDrafted);
  const avgAdjustedValue = undraftedPlayers.length > 0
    ? undraftedPlayers.reduce((sum, p) => sum + (p.adjustedValue || p.originalValue), 0) / undraftedPlayers.length
    : 0;

  const inflationRate = draftState.currentInflationRate;
  const inflationDisplay = (inflationRate * 100).toFixed(1);
  const inflationDirection = inflationRate > 0 ? '↑' : inflationRate < 0 ? '↓' : '→';

  return (
    <div className="bg-baseball-navy text-baseball-cream border-b-4 border-baseball-leather shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-baseball-cream/70 font-semibold">BUDGET REMAINING</p>
            <div className="flex items-baseline gap-2">
              <p className="font-mono text-3xl font-bold" data-testid="text-budget-remaining">
                ${budgetRemaining.toLocaleString()}
              </p>
              <p className="text-sm text-baseball-cream/60 font-mono">
                of ${totalBudget.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-baseball-cream/70 font-semibold">ROSTER SPOTS LEFT</p>
            <div className="flex items-baseline gap-2">
              <p className="font-mono text-3xl font-bold" data-testid="text-players-left">
                {playersLeftToDraft}
              </p>
              <p className="text-sm text-baseball-cream/60 font-mono">
                of {totalPlayersToDraft}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-baseball-cream/70 font-semibold">INFLATION RATE</p>
            <div className="flex items-baseline gap-2">
              <p 
                className={`font-mono text-3xl font-bold ${
                  inflationRate > 0 ? 'text-inflation' : inflationRate < 0 ? 'text-deflation' : ''
                }`}
                data-testid="text-inflation-rate"
              >
                {inflationDirection}{inflationDisplay}%
              </p>
              <p className="text-sm text-baseball-cream/60">
                {inflationRate > 0 ? 'premium' : inflationRate < 0 ? 'discount' : 'neutral'}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-baseball-cream/70 font-semibold">AVG $/PLAYER</p>
            <div className="flex items-baseline gap-2">
              <p className="font-mono text-3xl font-bold" data-testid="text-avg-cost">
                ${avgCostPerPlayer.toFixed(2)}
              </p>
              <p className="text-sm text-baseball-cream/60 font-mono">
                (adj: ${avgAdjustedValue.toFixed(2)})
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
