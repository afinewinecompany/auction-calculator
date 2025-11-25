import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/lib/app-context';
import { DraftMetrics } from '@/components/draft-metrics';
import { DraftEntryDialog } from '@/components/draft-entry-dialog';
import { DraftPlayerTable } from '@/components/draft-player-table';
import { DraftLog } from '@/components/draft-log';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { calculateInflation } from '@/lib/calculations';
import type { PlayerValue, DraftPick, DraftState } from '@shared/schema';

export default function DraftRoom() {
  const [, navigate] = useLocation();
  const { 
    leagueSettings,
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

  useEffect(() => {
    if (draftState && leagueSettings && playerValues.length > 0) {
      const { inflationRate, adjustedValues } = calculateInflation(
        playerValues,
        draftState.picks,
        leagueSettings
      );
      
      setDraftState(prev => {
        if (!prev) return prev;
        const newState = {
          ...prev,
          currentInflationRate: inflationRate,
          totalBudgetSpent: prev.picks.reduce((sum, p) => sum + p.actualPrice, 0),
          totalPlayersDrafted: prev.picks.length,
        };
        return JSON.stringify(newState) !== JSON.stringify(prev) ? newState : prev;
      });
      
      setPlayerValues(prev => 
        JSON.stringify(adjustedValues) !== JSON.stringify(prev) ? adjustedValues : prev
      );
    }
  }, [draftState?.picks, leagueSettings]);

  const handlePlayerSelect = (player: PlayerValue) => {
    setSelectedPlayer(player);
    setIsDialogOpen(true);
  };

  const handleDraftConfirm = (playerId: string, actualPrice: number, draftedBy?: string) => {
    if (!draftState) return;

    const player = playerValues.find(p => p.id === playerId);
    if (!player) return;

    const newPick: DraftPick = {
      id: `pick-${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      positions: player.positions,
      projectedValue: player.originalValue,
      actualPrice,
      draftedBy,
      pickNumber: draftState.picks.length + 1,
      timestamp: Date.now(),
    };

    setDraftState({
      ...draftState,
      picks: [...draftState.picks, newPick],
    });

    setIsDialogOpen(false);
    setSelectedPlayer(null);
  };

  const handleUndoLastPick = () => {
    if (!draftState || draftState.picks.length === 0) return;

    setDraftState({
      ...draftState,
      picks: draftState.picks.slice(0, -1),
    });
  };

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
        <div className="flex items-center justify-between mb-8">
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
            />
          </div>

          <div className="lg:col-span-1">
            <DraftLog 
              picks={draftState.picks}
              onUndo={handleUndoLastPick}
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
