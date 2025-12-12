import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useAppContext } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, TrendingUp, TrendingDown, Star, DollarSign, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
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
    let filtered = players;

    if (hideDrafted) {
      filtered = filtered.filter(p => !p.isDrafted);
    }

    if (showWithCostOnly) {
      filtered = filtered.filter(p => !p.isDrafted && (p.adjustedValue || p.originalValue) > 1);
    }

    if (showPendingBidsOnly && pendingBids) {
      filtered = filtered.filter(p => pendingBids.has(p.id));
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(lowerQuery)
      );
    }

    if (positionFilter !== 'all') {
      filtered = filtered.filter(player =>
        player.positions.includes(positionFilter)
      );
    }

    if (showTargetsOnly) {
      filtered = filtered.filter(player => targetedSet.has(player.id));
    }

    return filtered.sort((a, b) => {
      if (a.isDrafted && !b.isDrafted) return 1;
      if (!a.isDrafted && b.isDrafted) return -1;
      const aTargeted = targetedSet.has(a.id);
      const bTargeted = targetedSet.has(b.id);
      if (aTargeted && !bTargeted) return -1;
      if (!aTargeted && bTargeted) return 1;
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-draft-players"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant={showTargetsOnly ? "default" : "outline"}
            onClick={() => setShowTargetsOnly(!showTargetsOnly)}
            data-testid="button-toggle-draft-targets"
            className={showTargetsOnly ? "" : "hover-elevate"}
          >
            <Star className={`mr-2 h-4 w-4 ${showTargetsOnly ? 'fill-current' : ''}`} />
            Targets ({targetedPlayerIds.length})
          </Button>

          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-32" data-testid="select-draft-position-filter">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {allPositions.map(pos => (
                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={hideDrafted ? "default" : "outline"}
            onClick={() => setHideDrafted(!hideDrafted)}
            data-testid="button-toggle-drafted"
            className={hideDrafted ? "" : "hover-elevate"}
          >
            {hideDrafted ? 'Show Drafted' : 'Hide Drafted'}
          </Button>

          <Button
            variant={showWithCostOnly ? "default" : "outline"}
            onClick={() => setShowWithCostOnly(!showWithCostOnly)}
            data-testid="button-toggle-with-cost"
            className={showWithCostOnly ? "" : "hover-elevate"}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {showWithCostOnly ? 'Show All' : `$2+ (${playersWithCost.length})`}
          </Button>

          {pendingBids && pendingBids.size > 0 && (
            <Button
              variant={showPendingBidsOnly ? "default" : "outline"}
              onClick={() => setShowPendingBidsOnly(!showPendingBidsOnly)}
              data-testid="button-toggle-pending-bids"
              className={showPendingBidsOnly ? "" : "hover-elevate"}
            >
              <Lock className="mr-2 h-4 w-4" />
              {showPendingBidsOnly ? 'Show All' : `Pending (${pendingBids.size})`}
            </Button>
          )}
        </div>
      </div>

      <div className="border border-card-border rounded-lg overflow-hidden shadow-md bg-card">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-baseball-navy/10 backdrop-blur-sm sticky top-0 z-10">
              <TableRow className="hover:bg-baseball-leather">
                <TableHead className="text-baseball-cream font-bold w-10">
                  <Star className="h-4 w-4" />
                </TableHead>
                <TableHead className="text-baseball-cream font-bold">PLAYER</TableHead>
                <TableHead className="text-baseball-cream font-bold">POS</TableHead>
                <TableHead className="text-baseball-cream font-bold">ORIG $</TableHead>
                <TableHead className="text-baseball-cream font-bold">ADJ $</TableHead>
                <TableHead className="text-baseball-cream font-bold">Δ</TableHead>
                {onQuickDraft && <TableHead className="text-baseball-cream font-bold">QUICK DRAFT</TableHead>}
                <TableHead className="text-baseball-cream font-bold">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPlayers.map((player) => {
                const originalValue = player.originalValue;
                const adjustedValue = player.adjustedValue || originalValue;
                const delta = adjustedValue - originalValue;
                const deltaPercent = originalValue > 0 ? (delta / originalValue) * 100 : 0;
                const targeted = isTargeted(player.id);

                return (
                  <TableRow
                    key={player.id}
                    className={`${
                      player.isDrafted
                        ? 'opacity-50 bg-muted/50'
                        : 'hover:bg-accent/30 transition-smooth cursor-pointer border-b border-border/30'
                    } ${targeted && !player.isDrafted ? 'ring-2 ring-yellow-500 ring-inset' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('[data-quick-draft]')) return;
                      if (!player.isDrafted) onPlayerSelect(player);
                    }}
                    data-testid={`row-draft-player-${player.id}`}
                  >
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
                          <Badge key={pos} variant="secondary" className="text-xs">
                            {pos}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      ${originalValue}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-lg">
                      {player.isDrafted ? (
                        <span className="text-muted-foreground">—</span>
                      ) : player.hasPendingBid ? (
                        <div className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-amber-700">${adjustedValue}</span>
                        </div>
                      ) : (
                        <span className="text-baseball-navy">${adjustedValue}</span>
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
