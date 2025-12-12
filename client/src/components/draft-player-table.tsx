import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useAppContext } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, TrendingUp, TrendingDown, Star, DollarSign, ChevronLeft, ChevronRight, Lock, ChevronDown } from 'lucide-react';
import type { PlayerValue, DraftPick } from '@shared/schema';
import type { PendingBid } from '@/lib/calculations';

const ROWS_PER_PAGE = 50;

interface DraftPlayerTableProps {
  players: PlayerValue[];
  onPlayerSelect: (player: PlayerValue) => void;
  onQuickDraft?: (playerId: string, actualPrice: number, isMyBid: boolean) => void;
  onPendingBidChange?: (playerId: string, price: number | null, isMyBid: boolean) => void;
  pendingBids?: Map<string, PendingBid>;
}

// Helper function to get position badge variant
function getPositionBadgeVariant(pos: string): "position-infield" | "position-outfield" | "position-pitcher" | "position-util" {
  if (['C', '1B', '2B', '3B', 'SS', 'MI', 'CI'].includes(pos)) return 'position-infield';
  if (['OF'].includes(pos)) return 'position-outfield';
  if (['SP', 'RP', 'P'].includes(pos)) return 'position-pitcher';
  return 'position-util';
}

export function DraftPlayerTable({ players, onPlayerSelect, onQuickDraft, onPendingBidChange, pendingBids }: DraftPlayerTableProps) {
  const { toggleTargetPlayer, isPlayerTargeted, targetedPlayerIds } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [showTargetsOnly, setShowTargetsOnly] = useState(false);
  const [hideDrafted, setHideDrafted] = useState(true);
  const [showWithCostOnly, setShowWithCostOnly] = useState(false);
  const [showPendingBidsOnly, setShowPendingBidsOnly] = useState(false);
  const [quickDraftPrices, setQuickDraftPrices] = useState<Record<string, string>>({});
  const [quickDraftIsMyBid, setQuickDraftIsMyBid] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const allPositions = useMemo(() => {
    const positions = new Set<string>();
    players.forEach(player => {
      player.positions.forEach(pos => positions.add(pos));
    });
    return Array.from(positions).sort();
  }, [players]);

  const playersWithCost = useMemo(() => {
    return players.filter(p => !p.isDrafted && (p.adjustedValue || p.originalValue) > 1);
  }, [players]);

  const targetedSet = useMemo(() => new Set(targetedPlayerIds), [targetedPlayerIds]);
  
  const isTargeted = useCallback((playerId: string) => targetedSet.has(playerId), [targetedSet]);

  const filteredPlayers = useMemo(() => {
    // Early exit if no players
    if (players.length === 0) return [];

    // Optimize: combine filters into a single pass
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = players.filter(player => {
      // Early exit conditions
      if (hideDrafted && player.isDrafted) return false;
      if (showWithCostOnly && (player.isDrafted || (player.adjustedValue || player.originalValue) <= 1)) return false;
      if (showPendingBidsOnly && pendingBids && !pendingBids.has(player.id)) return false;
      if (showTargetsOnly && !targetedSet.has(player.id)) return false;
      if (searchQuery && !player.name.toLowerCase().includes(lowerQuery)) return false;
      if (positionFilter !== 'all' && !player.positions.includes(positionFilter)) return false;

      return true;
    });

    // Sort with optimized comparisons
    return filtered.sort((a, b) => {
      // Primary sort: drafted status
      if (a.isDrafted !== b.isDrafted) return a.isDrafted ? 1 : -1;

      // Secondary sort: targeted status
      const aTargeted = targetedSet.has(a.id);
      const bTargeted = targetedSet.has(b.id);
      if (aTargeted !== bTargeted) return aTargeted ? -1 : 1;

      // Tertiary sort: value
      return (b.adjustedValue || b.originalValue) - (a.adjustedValue || a.originalValue);
    });
  }, [players, searchQuery, positionFilter, hideDrafted, showWithCostOnly, showPendingBidsOnly, pendingBids, showTargetsOnly, targetedSet]);

  const totalPages = Math.ceil(filteredPlayers.length / ROWS_PER_PAGE);
  const paginatedPlayers = useMemo(() => {
    const start = currentPage * ROWS_PER_PAGE;
    return filteredPlayers.slice(start, start + ROWS_PER_PAGE);
  }, [filteredPlayers, currentPage]);
  
  const handlePageChange = useCallback((delta: number) => {
    setCurrentPage(prev => Math.max(0, Math.min(totalPages - 1, prev + delta)));
  }, [totalPages]);

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (showPendingBidsOnly && (!pendingBids || pendingBids.size === 0)) {
      setShowPendingBidsOnly(false);
    }
  }, [showPendingBidsOnly, pendingBids]);

  useEffect(() => {
    if (!pendingBids) return;
    
    pendingBids.forEach((bid, playerId) => {
      if (quickDraftPrices[playerId] === undefined) {
        setQuickDraftPrices(prev => ({ ...prev, [playerId]: String(bid.price) }));
        setQuickDraftIsMyBid(prev => ({ ...prev, [playerId]: bid.isMyBid }));
      }
    });
  }, [pendingBids]);

  const handleQuickDraftPrice = useCallback((playerId: string, value: string) => {
    setQuickDraftPrices(prev => ({ ...prev, [playerId]: value }));
  }, []);

  const handleQuickDraftPriceBlur = useCallback((playerId: string) => {
    if (onPendingBidChange) {
      const value = quickDraftPrices[playerId] ?? '';
      const price = parseInt(value, 10);
      const isMyBid = quickDraftIsMyBid[playerId] ?? false;
      onPendingBidChange(playerId, isNaN(price) || price < 1 ? null : price, isMyBid);
    }
  }, [onPendingBidChange, quickDraftPrices, quickDraftIsMyBid]);
  
  const handleQuickDraftMyBidChange = useCallback((playerId: string, isMyBid: boolean) => {
    setQuickDraftIsMyBid(prev => ({ ...prev, [playerId]: isMyBid }));
    
    if (onPendingBidChange && pendingBids?.has(playerId)) {
      const priceStr = quickDraftPrices[playerId] ?? '';
      const price = parseInt(priceStr, 10);
      if (!isNaN(price) && price >= 1) {
        onPendingBidChange(playerId, price, isMyBid);
      }
    }
  }, [onPendingBidChange, quickDraftPrices, pendingBids]);

  const handleQuickDraftSubmit = useCallback((player: PlayerValue) => {
    if (!onQuickDraft) return;
    
    const priceStr = quickDraftPrices[player.id];
    const price = parseInt(priceStr, 10);
    
    if (isNaN(price) || price < 1) return;
    
    const isMyBid = quickDraftIsMyBid[player.id] ?? false;
    onQuickDraft(player.id, price, isMyBid);
    
    setQuickDraftPrices(prev => {
      const next = { ...prev };
      delete next[player.id];
      return next;
    });
    setQuickDraftIsMyBid(prev => {
      const next = { ...prev };
      delete next[player.id];
      return next;
    });
  }, [onQuickDraft, quickDraftPrices, quickDraftIsMyBid]);

  return (
    <div className="space-y-4">
      <div className="glass-card-strong rounded-xl shadow-float">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/20 transition-smooth rounded-t-xl"
        >
          <span className="font-display text-sm uppercase tracking-wider">Filters</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
        </button>

        {filtersExpanded && (
          <div className="p-4 space-y-4 border-t border-border/30">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 focus-glow"
                data-testid="input-search-draft-players"
              />
            </div>

            {/* Position chips */}
            <div className="space-y-2">
              <label className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                Positions
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPositionFilter('all')}
                  data-testid="select-draft-position-filter"
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth
                    ${positionFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-glow-primary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }
                  `}
                >
                  All
                </button>
                {allPositions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth
                      ${positionFilter === pos
                        ? 'bg-primary text-primary-foreground shadow-glow-primary'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }
                    `}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter toggles as compact chips */}
            <div className="space-y-2">
              <label className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                Show
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowTargetsOnly(!showTargetsOnly)}
                  data-testid="button-toggle-draft-targets"
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth
                    flex items-center gap-1.5
                    ${showTargetsOnly
                      ? 'bg-baseball-green text-white shadow-glow-success'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Star className={`h-3 w-3 ${showTargetsOnly ? 'fill-current' : ''}`} />
                  Targets Only ({targetedPlayerIds.length})
                </button>
                <button
                  onClick={() => setHideDrafted(!hideDrafted)}
                  data-testid="button-toggle-drafted"
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth
                    flex items-center gap-1.5
                    ${hideDrafted
                      ? 'bg-primary text-primary-foreground shadow-glow-primary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Lock className="h-3 w-3" />
                  Hide Drafted
                </button>
                <button
                  onClick={() => setShowWithCostOnly(!showWithCostOnly)}
                  data-testid="button-toggle-with-cost"
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth
                    flex items-center gap-1.5
                    ${showWithCostOnly
                      ? 'bg-primary text-primary-foreground shadow-glow-primary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }
                  `}
                >
                  <DollarSign className="h-3 w-3" />
                  Valuables Only ({playersWithCost.length})
                </button>
                {pendingBids && pendingBids.size > 0 && (
                  <button
                    onClick={() => setShowPendingBidsOnly(!showPendingBidsOnly)}
                    data-testid="button-toggle-pending-bids"
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth
                      flex items-center gap-1.5
                      ${showPendingBidsOnly
                        ? 'bg-primary text-primary-foreground shadow-glow-primary'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Lock className="h-3 w-3" />
                    Pending ({pendingBids.size})
                  </button>
                )}
              </div>
            </div>

            {/* Active filter count */}
            <div className="text-xs text-muted-foreground font-mono">
              {filteredPlayers.length} players shown
            </div>
          </div>
        )}
      </div>

      <div className="border border-card-border rounded-lg overflow-hidden shadow-md bg-card">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-baseball-navy/10 backdrop-blur-sm sticky top-0 z-40 border-b-2 border-baseball-navy/20">
              <TableRow className="border-none">
                <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4 w-10">
                  <Star className="h-4 w-4" />
                </TableHead>
                <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4">Player</TableHead>
                <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4">Pos</TableHead>
                <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4 text-right">Orig $</TableHead>
                <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4 text-right">Adj $</TableHead>
                <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4">Δ</TableHead>
                {onQuickDraft && <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4">Quick Draft</TableHead>}
                <TableHead className="font-display text-sm uppercase tracking-wider text-foreground/80 py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPlayers.map((player, index) => {
                const originalValue = player.originalValue;
                const adjustedValue = player.adjustedValue || originalValue;
                const delta = adjustedValue - originalValue;
                const deltaPercent = originalValue > 0 ? (delta / originalValue) * 100 : 0;
                const targeted = isTargeted(player.id);

                return (
                  <TableRow
                    key={player.id}
                    className={`
                      relative
                      hover:bg-accent/30 transition-smooth cursor-pointer
                      border-b border-border/30
                      ${index % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'}
                      ${player.isDrafted ? 'opacity-50' : ''}
                    `}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('[data-quick-draft]')) return;
                      if (!player.isDrafted) onPlayerSelect(player);
                    }}
                    data-testid={`row-draft-player-${player.id}`}
                  >
                    {targeted && !player.isDrafted && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-baseball-green shadow-glow-success" />
                    )}
                    <TableCell className="w-10">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTargetPlayer(player.id);
                        }}
                        data-testid={`button-target-draft-${player.id}`}
                        className={targeted ? 'text-yellow-500' : 'text-muted-foreground'}
                        disabled={player.isDrafted}
                      >
                        <Star className={`h-4 w-4 ${targeted ? 'fill-current' : ''}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {player.name}
                      {player.isDrafted && player.draftedBy && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({player.draftedBy})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {player.positions.slice(0, 2).map(pos => (
                          <Badge
                            key={pos}
                            variant={getPositionBadgeVariant(pos)}
                            className="text-xs font-semibold px-2 py-0.5 transition-smooth hover:scale-105"
                          >
                            {pos}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-right">
                      ${originalValue}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.isDrafted ? (
                        <span className="font-mono text-muted-foreground">—</span>
                      ) : player.hasPendingBid ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-amber-600" />
                          <span className="font-mono text-lg font-bold text-amber-700">${adjustedValue}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`
                            font-mono text-lg font-bold
                            ${delta > 0 ? 'text-inflation' : delta < 0 ? 'text-deflation' : 'text-baseball-navy'}
                          `}>
                            ${adjustedValue}
                          </span>
                          {delta !== 0 && (
                            <span className="text-xs text-muted-foreground font-mono">
                              (was ${originalValue})
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {!player.isDrafted && delta !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-mono ${
                          delta > 0 ? 'text-inflation' : 'text-deflation'
                        }`}>
                          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span>${Math.abs(delta).toFixed(0)}</span>
                          <span className="text-xs">({deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(0)}%)</span>
                        </div>
                      )}
                    </TableCell>
                    {onQuickDraft && (
                      <TableCell data-quick-draft onClick={(e) => e.stopPropagation()}>
                        {!player.isDrafted && (
                          <div className="flex items-center gap-2" data-quick-draft>
                            <div className="flex items-center gap-1.5" data-quick-draft>
                              <Checkbox
                                id={`my-bid-${player.id}`}
                                checked={quickDraftIsMyBid[player.id] ?? false}
                                onCheckedChange={(checked) => handleQuickDraftMyBidChange(player.id, !!checked)}
                                data-testid={`checkbox-quick-my-bid-${player.id}`}
                                data-quick-draft
                              />
                              <label 
                                htmlFor={`my-bid-${player.id}`}
                                className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                                data-quick-draft
                              >
                                Mine
                              </label>
                            </div>
                            <div className="flex items-center gap-1" data-quick-draft>
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="1"
                                value={quickDraftPrices[player.id] ?? ''}
                                onChange={(e) => handleQuickDraftPrice(player.id, e.target.value)}
                                onBlur={() => handleQuickDraftPriceBlur(player.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuickDraftSubmit(player);
                                  }
                                }}
                                placeholder={String(adjustedValue)}
                                className="w-16 h-8 font-mono text-center"
                                data-testid={`input-quick-draft-price-${player.id}`}
                                data-quick-draft
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 px-2 bg-baseball-navy"
                              onClick={() => handleQuickDraftSubmit(player)}
                              disabled={!quickDraftPrices[player.id] || parseInt(quickDraftPrices[player.id]) < 1}
                              data-testid={`button-quick-draft-confirm-${player.id}`}
                              data-quick-draft
                            >
                              Draft
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {player.isDrafted ? (
                        <Badge variant="secondary" className="bg-muted">
                          DRAFTED (${player.draftPrice})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-baseball-green border-baseball-green">
                          Available
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-card-border bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Showing {currentPage * ROWS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ROWS_PER_PAGE, filteredPlayers.length)} of {filteredPlayers.length} players
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(-1)}
                disabled={currentPage === 0}
                className="hover-elevate"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm font-mono px-2">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage >= totalPages - 1}
                className="hover-elevate"
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
