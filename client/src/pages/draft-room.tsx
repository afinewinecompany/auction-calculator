import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/lib/app-context';
import { DraftMetrics } from '@/components/draft-metrics';
import { DraftEntryDialog } from '@/components/draft-entry-dialog';
import { DraftPlayerTable } from '@/components/draft-player-table';
import { DraftLog } from '@/components/draft-log';
import { PositionalNeedsTracker } from '@/components/positional-needs-tracker';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { calculateInflation, type PendingBid } from '@/lib/calculations';
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
  const [pendingBids, setPendingBids] = useState<Map<string, PendingBid>>(new Map());
  
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
  }, [leagueSettings, playerValues.length, draftState, setDraftState, navigate]);

  const picksData = useMemo(() => {
    if (!draftState?.picks) return { total: 0, myBidCount: 0, length: 0 };
    const total = draftState.picks.reduce((acc, p) => acc + p.actualPrice, 0);
    const myBidCount = draftState.picks.filter(p => p.isMyBid).length;
    return { total, myBidCount, length: draftState.picks.length };
  }, [draftState?.picks]);

  const pendingBidsArray = useMemo(() => Array.from(pendingBids.values()), [pendingBids]);
  const pendingBidsTotal = useMemo(() => pendingBidsArray.reduce((sum, b) => sum + b.price, 0), [pendingBidsArray]);

  useEffect(() => {
    if (!draftState || !leagueSettings || playerValues.length === 0) return;
    
    const { inflationRate, adjustedValues } = calculateInflation(
      playerValues,
      draftState.picks,
      leagueSettings,
      pendingBidsArray
    );
    
    const totalSpent = picksData.total;
    const currentPicksLength = picksData.length;
    
    const needsDraftStateUpdate = 
      draftState.currentInflationRate !== inflationRate ||
      draftState.totalBudgetSpent !== totalSpent ||
      draftState.totalPlayersDrafted !== currentPicksLength;
    
    if (needsDraftStateUpdate) {
      setDraftState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentInflationRate: inflationRate,
          totalBudgetSpent: totalSpent,
          totalPlayersDrafted: currentPicksLength,
        };
      });
    }
    
    let hasChanges = false;
    for (let i = 0; i < adjustedValues.length; i++) {
      const newVal = adjustedValues[i];
      const oldVal = playerValues[i];
      if (!oldVal || 
          newVal.adjustedValue !== oldVal.adjustedValue ||
          newVal.isDrafted !== oldVal.isDrafted) {
        hasChanges = true;
        break;
      }
    }
    
    if (hasChanges) {
      setPlayerValues(adjustedValues);
    }
  }, [picksData, pendingBidsArray, playerValues, leagueSettings, draftState, setDraftState, setPlayerValues]);

  const handlePlayerSelect = (player: PlayerValue) => {
    setSelectedPlayer(player);
    setIsDialogOpen(true);
  };

  const handlePendingBidChange = useCallback((playerId: string, price: number | null, isMyBid: boolean) => {
    setPendingBids(prev => {
      const next = new Map(prev);
      if (price === null || price < 1) {
        next.delete(playerId);
      } else {
        next.set(playerId, { playerId, price, isMyBid });
      }
      return next;
    });
  }, []);

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

    setPendingBids(prev => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });

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
      
      const pickToDelete = prev.picks.find(p => p.id === pickId);
      if (pickToDelete) {
        setPendingBids(currentBids => {
          const newBids = new Map(currentBids);
          newBids.set(pickToDelete.playerId, {
            playerId: pickToDelete.playerId,
            price: pickToDelete.actualPrice,
            isMyBid: pickToDelete.isMyBid ?? false,
          });
          return newBids;
        });
      }
      
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
        pendingBidsTotal={pendingBidsTotal}
        pendingBidsCount={pendingBids.size}
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
              onPendingBidChange={handlePendingBidChange}
              pendingBids={pendingBids}
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
