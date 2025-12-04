import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { LeagueSettings, DraftState, PlayerValue } from '@shared/schema';

interface PositionalNeedsTrackerProps {
  leagueSettings: LeagueSettings;
  draftState: DraftState;
  playerValues: PlayerValue[];
}

interface PositionNeed {
  position: string;
  required: number;
  filled: number;
  remaining: number;
  budgetPerSpot: number;
}

export function PositionalNeedsTracker({
  leagueSettings,
  draftState,
  playerValues,
}: PositionalNeedsTrackerProps) {
  const myTeamBudget = leagueSettings.auctionBudget;
  const myPicks = draftState.picks.filter(p => p.isMyBid === true);
  const myTeamSpent = myPicks.reduce((sum, p) => sum + p.actualPrice, 0);
  const remainingBudget = myTeamBudget - myTeamSpent;
  
  const myDraftedPlayerIds = new Set(myPicks.map(p => p.playerId));
  const draftedPlayers = playerValues.filter(p => myDraftedPlayerIds.has(p.id));
  
  const hitterPositions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'MI', 'CI', 'UTIL'];
  const pitcherPositions = ['SP', 'RP', 'P'];
  const allPositions = [...hitterPositions, ...pitcherPositions];

  const positionSlots: Record<string, number> = {};
  allPositions.forEach(pos => {
    positionSlots[pos] = leagueSettings.positionRequirements[pos as keyof typeof leagueSettings.positionRequirements] || 0;
  });

  const positionFilled: Record<string, number> = {};
  allPositions.forEach(pos => {
    positionFilled[pos] = 0;
  });

  const sortedDraftedPlayers = [...draftedPlayers].sort((a, b) => {
    return a.positions.length - b.positions.length;
  });

  const flexPositions = ['MI', 'CI', 'UTIL', 'P'];
  const primaryPositions = allPositions.filter(p => !flexPositions.includes(p));

  sortedDraftedPlayers.forEach(player => {
    const eligiblePositions = player.positions.filter(pos => allPositions.includes(pos));
    
    const primaryEligible = eligiblePositions.filter(pos => primaryPositions.includes(pos));
    const orderedPositions = [
      ...primaryEligible.sort((a, b) => {
        const aRemaining = positionSlots[a] - positionFilled[a];
        const bRemaining = positionSlots[b] - positionFilled[b];
        return bRemaining - aRemaining;
      }),
      ...flexPositions.filter(fp => {
        if (fp === 'MI' && eligiblePositions.some(p => ['2B', 'SS'].includes(p))) return true;
        if (fp === 'CI' && eligiblePositions.some(p => ['1B', '3B'].includes(p))) return true;
        if (fp === 'UTIL' && !eligiblePositions.some(p => ['SP', 'RP', 'P'].includes(p))) return true;
        if (fp === 'P' && eligiblePositions.some(p => ['SP', 'RP'].includes(p))) return true;
        return false;
      })
    ];

    for (const pos of orderedPositions) {
      if (positionFilled[pos] < positionSlots[pos]) {
        positionFilled[pos]++;
        break;
      }
    }
  });

  const calculatePositionNeeds = (positions: string[]): PositionNeed[] => {
    const needs: PositionNeed[] = [];
    
    positions.forEach(pos => {
      const required = positionSlots[pos] || 0;
      if (required === 0) return;
      
      const filled = positionFilled[pos] || 0;
      const remaining = Math.max(0, required - filled);
      
      needs.push({
        position: pos,
        required,
        filled,
        remaining,
        budgetPerSpot: 0,
      });
    });

    const totalRemaining = needs.reduce((sum, n) => sum + n.remaining, 0);
    if (totalRemaining > 0) {
      needs.forEach(need => {
        need.budgetPerSpot = totalRemaining > 0 
          ? Math.round(remainingBudget / totalRemaining) 
          : 0;
      });
    }

    return needs.filter(n => n.required > 0);
  };

  const hitterNeeds = calculatePositionNeeds(hitterPositions);
  const pitcherNeeds = calculatePositionNeeds(pitcherPositions);
  
  const totalHitterRemaining = hitterNeeds.reduce((sum, n) => sum + n.remaining, 0);
  const totalPitcherRemaining = pitcherNeeds.reduce((sum, n) => sum + n.remaining, 0);
  const totalRemaining = totalHitterRemaining + totalPitcherRemaining;
  const avgBudgetPerSpot = totalRemaining > 0 ? Math.round(remainingBudget / totalRemaining) : 0;

  const PositionRow = ({ need }: { need: PositionNeed }) => {
    const fillPercent = need.required > 0 ? (need.filled / need.required) * 100 : 0;
    const isComplete = need.remaining === 0;
    
    return (
      <div className="flex items-center gap-3 py-2" data-testid={`position-need-${need.position.toLowerCase()}`}>
        <div className="w-10 flex-shrink-0">
          <Badge 
            variant={isComplete ? "secondary" : "outline"} 
            className={`font-mono text-xs w-full justify-center ${isComplete ? 'opacity-50' : ''}`}
          >
            {need.position}
          </Badge>
        </div>
        <div className="flex-1">
          <Progress value={fillPercent} className="h-2" />
        </div>
        <div className="w-16 text-right font-mono text-xs text-muted-foreground">
          {need.filled}/{need.required}
        </div>
        {need.remaining > 0 && (
          <div className="w-14 text-right font-mono text-xs text-baseball-green">
            ${avgBudgetPerSpot}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg tracking-tight flex items-center justify-between">
          ROSTER NEEDS
          <span className="font-mono text-sm text-muted-foreground">
            ${avgBudgetPerSpot}/spot avg
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hitterNeeds.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Hitters ({totalHitterRemaining} remaining)
            </h4>
            <div className="space-y-1">
              {hitterNeeds.map(need => (
                <PositionRow key={need.position} need={need} />
              ))}
            </div>
          </div>
        )}

        {pitcherNeeds.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Pitchers ({totalPitcherRemaining} remaining)
            </h4>
            <div className="space-y-1">
              {pitcherNeeds.map(need => (
                <PositionRow key={need.position} need={need} />
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total Spots Remaining:</span>
            <span className="font-mono font-semibold">{totalRemaining}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-muted-foreground">Budget Remaining:</span>
            <span className="font-mono font-semibold text-baseball-green">${remainingBudget.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
