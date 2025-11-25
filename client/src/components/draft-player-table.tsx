import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import type { PlayerValue } from '@shared/schema';

interface DraftPlayerTableProps {
  players: PlayerValue[];
  onPlayerSelect: (player: PlayerValue) => void;
}

export function DraftPlayerTable({ players, onPlayerSelect }: DraftPlayerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [hideDisabled, setHideDrafted] = useState(false);

  const allPositions = useMemo(() => {
    const positions = new Set<string>();
    players.forEach(player => {
      player.positions.forEach(pos => positions.add(pos));
    });
    return Array.from(positions).sort();
  }, [players]);

  const filteredPlayers = useMemo(() => {
    let filtered = players;

    if (hideDisabled) {
      filtered = filtered.filter(p => !p.isDrafted);
    }

    if (searchQuery) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (positionFilter !== 'all') {
      filtered = filtered.filter(player =>
        player.positions.includes(positionFilter)
      );
    }

    return filtered.sort((a, b) => {
      if (a.isDrafted && !b.isDrafted) return 1;
      if (!a.isDrafted && b.isDrafted) return -1;
      return (b.adjustedValue || b.originalValue) - (a.adjustedValue || a.originalValue);
    });
  }, [players, searchQuery, positionFilter, hideDisabled]);

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

        <div className="flex gap-3">
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
            variant={hideDisabled ? "default" : "outline"}
            onClick={() => setHideDrafted(!hideDisabled)}
            data-testid="button-toggle-drafted"
            className="hover-elevate"
          >
            {hideDisabled ? 'Show All' : 'Hide Drafted'}
          </Button>
        </div>
      </div>

      <div className="border border-card-border rounded-lg overflow-hidden shadow-md bg-card">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-baseball-leather sticky top-0 z-10">
              <TableRow className="hover:bg-baseball-leather">
                <TableHead className="text-baseball-cream font-bold">PLAYER</TableHead>
                <TableHead className="text-baseball-cream font-bold">POS</TableHead>
                <TableHead className="text-baseball-cream font-bold">ORIG $</TableHead>
                <TableHead className="text-baseball-cream font-bold">ADJ $</TableHead>
                <TableHead className="text-baseball-cream font-bold">Δ</TableHead>
                <TableHead className="text-baseball-cream font-bold">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player) => {
                const originalValue = player.originalValue;
                const adjustedValue = player.adjustedValue || originalValue;
                const delta = adjustedValue - originalValue;
                const deltaPercent = originalValue > 0 ? (delta / originalValue) * 100 : 0;

                return (
                  <TableRow
                    key={player.id}
                    className={`${
                      player.isDrafted
                        ? 'opacity-50 bg-muted/50'
                        : 'hover-elevate cursor-pointer active-elevate-2'
                    }`}
                    onClick={() => !player.isDrafted && onPlayerSelect(player)}
                    data-testid={`row-draft-player-${player.id}`}
                  >
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
                    <TableCell className="font-mono font-bold text-baseball-navy text-lg">
                      {player.isDrafted ? '—' : `$${adjustedValue}`}
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
      </div>
    </div>
  );
}
