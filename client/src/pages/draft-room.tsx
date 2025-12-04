import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/lib/app-context';
import { DraftMetrics } from '@/components/draft-metrics';
import { DraftEntryDialog } from '@/components/draft-entry-dialog';
import { DraftPlayerTable } from '@/components/draft-player-table';
import { DraftLog } from '@/components/draft-log';
import { PositionalNeedsTracker } from '@/components/positional-needs-tracker';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { calculateInflation } from '@/lib/calculations';
import type { PlayerValue, DraftPick } from '@shared/schema';

export default function DraftRoom() {
  const [, navigate] = useLocation();
  const { 
    leagueSettings,
    scoringFormat,
    playerValues,
    setPlayerValues,
    draftState,
    setDraftState,
  } = useAppContext();

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerValue | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!leagueSettings || playerValues.length === 0) {
      navigate('/');
      return;
    }

    if (!draftState) {
      setDraftState({
        picks: [],
        currentInflationRate: 0,
        totalBudgetSpent: 0,
        totalPlayersAvailable: playerValues.length,
        totalPlayersDrafted: 0,
      });
    }
  }, [leagueSettings, playerValues, draftState, setDraftState, navigate]);

  const picksHash = useMemo(() => {
    if (!draftState?.picks?.length) return '';
    return draftState.picks.map(p => `${p.playerId}:${p.actualPrice}:${p.isMyBid}`).join(',');
  }, [draftState?.picks]);

  const playerValuesHash = useMemo(() => {
    if (!playerValues.length) return '';
    return playerValues.map(p => 
      `${p.id}:${p.originalValue}:${p.adjustedValue ?? 0}:${p.isDrafted ? 1 : 0}`
    ).join(',');
  }, [playerValues]);

  const leagueSettingsHash = useMemo(() => {
    if (!leagueSettings) return '';
    const posReqs = Object.entries(leagueSettings.positionRequirements || {})
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${leagueSettings.teamCount}:${leagueSettings.auctionBudget}:${leagueSettings.totalRosterSpots}:${posReqs}`;
  }, [leagueSettings]);

  const scoringFormatHash = useMemo(() => {
    if (!scoringFormat) return '';
    const { type } = scoringFormat;
    
    if (type === 'h2h-points') {
      const hitPts = Object.entries(scoringFormat.hittingPoints).map(([k, v]) => `${k}:${v}`).join(',');
      const pitchPts = Object.entries(scoringFormat.pitchingPoints).map(([k, v]) => `${k}:${v}`).join(',');
      return `${type}::${hitPts}:${pitchPts}`;
    } else {
      const hitCats = scoringFormat.hittingCategories.join(',');
      const pitchCats = scoringFormat.pitchingCategories.join(',');
      return `${type}:${hitCats}:${pitchCats}::`;
    }
  }, [scoringFormat]);

  useEffect(() => {
    if (!draftState || !leagueSettings || playerValues.length === 0) return;
    
    const { inflationRate, adjustedValues } = calculateInflation(
      playerValues,
      draftState.picks,
      leagueSettings
    );
    
    const totalSpent = draftState.picks.reduce((sum, p) => sum + p.actualPrice, 0);
    
    setDraftState(prev => {
      if (!prev) return prev;
      if (
        prev.currentInflationRate === inflationRate &&
        prev.totalBudgetSpent === totalSpent &&
        prev.totalPlayersDrafted === prev.picks.length
      ) {
        return prev;
      }
      return {
        ...prev,
        currentInflationRate: inflationRate,
        totalBudgetSpent: totalSpent,
        totalPlayersDrafted: prev.picks.length,
      };
    });
    
    const hasChanges = adjustedValues.some((newVal, idx) => {
      const oldVal = playerValues[idx];
      return !oldVal || 
             newVal.adjustedValue !== oldVal.adjustedValue ||
             newVal.isDrafted !== oldVal.isDrafted;
    });
    
    if (hasChanges) {
      setPlayerValues(adjustedValues);
    }
  }, [picksHash, playerValuesHash, leagueSettingsHash, scoringFormatHash, setDraftState, setPlayerValues]);

  const handlePlayerSelect = (player: PlayerValue) => {
    setSelectedPlayer(player);
    setIsDialogOpen(true);
  };

  const handleDraftConfirm = useCallback((playerId: string, actualPrice: number, isMyBid: boolean) => {
    const player = playerValues.find(p => p.id === playerId);
    if (!player) return;

    const newPick: DraftPick = {
      id: `pick-${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      positions: player.positions,
      projectedValue: player.originalValue,
      actualPrice,
      isMyBid,
      pickNumber: 0,
      timestamp: Date.now(),
    };

    setDraftState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        picks: [...prev.picks, { ...newPick, pickNumber: prev.picks.length + 1 }],
      };
    });

    setIsDialogOpen(false);
    setSelectedPlayer(null);
  }, [playerValues, setDraftState]);

  const handleUpdatePick = useCallback((pickId: string, newPrice: number, isMyBid: boolean) => {
    setDraftState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        picks: prev.picks.map(pick => 
          pick.id === pickId 
            ? { ...pick, actualPrice: newPrice, isMyBid }
            : pick
        ),
      };
    });
  }, [setDraftState]);

  const handleUndoLastPick = useCallback(() => {
    setDraftState(prev => {
      if (!prev || prev.picks.length === 0) return prev;
      return {
        ...prev,
        picks: prev.picks.slice(0, -1),
      };
    });
  }, [setDraftState]);

  const handleDeletePick = useCallback((pickId: string) => {
    setDraftState(prev => {
      if (!prev) return prev;
      const filteredPicks = prev.picks.filter(p => p.id !== pickId);
      return {
        ...prev,
        picks: filteredPicks.map((pick, idx) => ({
          ...pick,
          pickNumber: idx + 1,
        })),
      };
    });
  }, [setDraftState]);

  if (!leagueSettings || !draftState) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DraftMetrics 
        leagueSettings={leagueSettings}
        draftState={draftState}
        playerValues={playerValues}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            data-testid="button-back-to-settings"
            className="hover-elevate"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>

          <h1 className="font-display text-4xl font-bold text-baseball-leather tracking-tight" data-testid="text-draft-title">
            DRAFT ROOM
          </h1>

          <Button
            variant="secondary"
            onClick={handleUndoLastPick}
            disabled={draftState.picks.length === 0}
            data-testid="button-undo-pick"
            className="hover-elevate"
          >
            Undo Last Pick
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <DraftPlayerTable 
              players={playerValues}
              onPlayerSelect={handlePlayerSelect}
              onQuickDraft={handleDraftConfirm}
            />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <PositionalNeedsTracker
              leagueSettings={leagueSettings}
              draftState={draftState}
              playerValues={playerValues}
            />
            <DraftLog 
              picks={draftState.picks}
              onUndo={handleUndoLastPick}
              onUpdatePick={handleUpdatePick}
              onDeletePick={handleDeletePick}
            />
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <DraftEntryDialog
          player={selectedPlayer}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConfirm={handleDraftConfirm}
        />
      )}
    </div>
  );
}
