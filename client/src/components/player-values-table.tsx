import { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown, Star, FileText } from 'lucide-react';
import { PDFExportDialog } from '@/components/pdf-export-dialog';
import type { PlayerValue } from '@shared/schema';

export function PlayerValuesTable() {
  const { playerValues, toggleTargetPlayer, isPlayerTargeted, targetedPlayerIds, leagueSettings } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [showTargetsOnly, setShowTargetsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rank' | 'value' | 'name'>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isPDFDialogOpen, setIsPDFDialogOpen] = useState(false);

  const allPositions = useMemo(() => {
    const positions = new Set<string>();
    playerValues.forEach(player => {
      player.positions.forEach(pos => positions.add(pos));
    });
    return Array.from(positions).sort();
  }, [playerValues]);

  const filteredAndSorted = useMemo(() => {
    let filtered = playerValues;

    if (searchQuery) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (positionFilter !== 'all') {
      filtered = filtered.filter(player =>
        player.positions.includes(positionFilter)
      );
    }

    if (showTargetsOnly) {
      filtered = filtered.filter(player => isPlayerTargeted(player.id));
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'rank') {
        comparison = a.rank - b.rank;
      } else if (sortBy === 'value') {
        comparison = (a.adjustedValue || a.originalValue) - (b.adjustedValue || b.originalValue);
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [playerValues, searchQuery, positionFilter, showTargetsOnly, sortBy, sortDirection, isPlayerTargeted]);

  const handleSort = (column: 'rank' | 'value' | 'name') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Rank', 'Player', 'Team', 'Positions', 'Value', 'Tier'];
    const rows = filteredAndSorted.map(player => [
      player.rank,
      player.name,
      player.team || '',
      player.positions.join('/'),
      player.adjustedValue || player.originalValue,
      player.tier || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auction-values.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTierColor = (tier: number | undefined) => {
    if (!tier) return 'bg-card';
    if (tier === 1) return 'bg-yellow-50 dark:bg-yellow-900/20';
    if (tier === 2) return 'bg-orange-50 dark:bg-orange-900/20';
    if (tier === 3) return 'bg-blue-50 dark:bg-blue-900/20';
    return 'bg-card';
  };

  const SortIcon = ({ column }: { column: 'rank' | 'value' | 'name' }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-players"
          />
        </div>

        <div className="flex gap-3 items-center">
          <Button
            variant={showTargetsOnly ? "default" : "outline"}
            onClick={() => setShowTargetsOnly(!showTargetsOnly)}
            data-testid="button-toggle-targets"
            className={showTargetsOnly ? "" : "hover-elevate"}
          >
            <Star className={`mr-2 h-4 w-4 ${showTargetsOnly ? 'fill-current' : ''}`} />
            My Targets ({targetedPlayerIds.length})
          </Button>

          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-32" data-testid="select-position-filter">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {allPositions.map(pos => (
                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            data-testid="button-export-csv"
            className="hover-elevate"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsPDFDialogOpen(true)}
            data-testid="button-export-pdf"
            className="hover-elevate"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="border border-card-border rounded-lg overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-baseball-leather">
              <TableRow className="hover:bg-baseball-leather">
                <TableHead className="text-baseball-cream font-bold w-10">
                  <Star className="h-4 w-4" />
                </TableHead>
                <TableHead 
                  className="text-baseball-cream font-bold cursor-pointer hover-elevate"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center gap-2">
                    RANK <SortIcon column="rank" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-baseball-cream font-bold cursor-pointer hover-elevate"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    PLAYER <SortIcon column="name" />
                  </div>
                </TableHead>
                <TableHead className="text-baseball-cream font-bold">TEAM</TableHead>
                <TableHead className="text-baseball-cream font-bold">POS</TableHead>
                <TableHead 
                  className="text-baseball-cream font-bold cursor-pointer hover-elevate"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center gap-2">
                    $ VALUE <SortIcon column="value" />
                  </div>
                </TableHead>
                <TableHead className="text-baseball-cream font-bold">TIER</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((player) => {
                const targeted = isPlayerTargeted(player.id);
                return (
                  <TableRow 
                    key={player.id}
                    className={`${getTierColor(player.tier)} ${targeted ? 'ring-2 ring-yellow-500 ring-inset' : ''} hover-elevate cursor-pointer`}
                    data-testid={`row-player-${player.id}`}
                  >
                    <TableCell className="w-10">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTargetPlayer(player.id);
                        }}
                        data-testid={`button-target-${player.id}`}
                        className={targeted ? 'text-yellow-500' : 'text-muted-foreground'}
                      >
                        <Star className={`h-4 w-4 ${targeted ? 'fill-current' : ''}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-muted-foreground">
                      #{player.rank}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {player.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {player.team || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {player.positions.map(pos => (
                          <Badge key={pos} variant="secondary" className="text-xs font-semibold">
                            {pos}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-baseball-navy text-lg">
                      ${player.adjustedValue || player.originalValue}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {player.tier ? `Tier ${player.tier}` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredAndSorted.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p>No players found matching your criteria</p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredAndSorted.length} of {playerValues.length} players
      </p>

      <PDFExportDialog
        isOpen={isPDFDialogOpen}
        onClose={() => setIsPDFDialogOpen(false)}
        players={playerValues}
        leagueSettings={leagueSettings}
        targetedPlayerIds={targetedPlayerIds}
      />
    </div>
  );
}
