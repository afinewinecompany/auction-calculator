import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useAppContext } from '@/lib/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Check, X, Loader2, ChevronDown, ChevronRight, Users, Activity, Cloud, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lookupPlayerPositions } from '@/lib/position-lookup';
import { mergeProjections, identifyPlayerType } from '@/lib/projection-merger';
import type { PlayerProjection, ProjectionFile, ProjectionFileKind } from '@shared/schema';

interface ProjectionUploaderProps {
  onComplete: () => void;
  isComplete: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

interface FileUploadState {
  file: File | null;
  parsedData: string[][] | null;
  headers: string[];
  columnMapping: Record<string, string>;
  projections: PlayerProjection[];
  isProcessing: boolean;
  isFetchingPositions: boolean;
  fetchProgress: number;
}

const createEmptyFileState = (): FileUploadState => ({
  file: null,
  parsedData: null,
  headers: [],
  columnMapping: {},
  projections: [],
  isProcessing: false,
  isFetchingPositions: false,
  fetchProgress: 0,
});

const COMMON_HITTING_STATS = ['R', 'HR', 'RBI', 'SB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', 'BB', 'SO', 'TB', '2B', '3B', 'CS'];
const COMMON_PITCHING_STATS = ['W', 'L', 'SV', 'K', 'ERA', 'WHIP', 'QS', 'HLD', 'IP', 'SO', 'BB', 'H', 'ER', 'HR', 'K/9', 'BB/9'];

const STAT_ALIASES: Record<string, string[]> = {
  'K': ['SO', 'STRIKEOUTS', 'K'],
  'SO': ['K', 'STRIKEOUTS', 'SO'],
  'AVG': ['BA', 'BAVG', 'AVG'],
  'OBP': ['OB%', 'OBP'],
  'SLG': ['SLUG', 'SLG'],
  'RBI': ['RBI', 'RBIS'],
  'R': ['RUNS', 'R'],
  'HR': ['HOMERS', 'HR'],
  'SB': ['SB', 'STOLENBASES', 'STEALS'],
  'W': ['WINS', 'W'],
  'L': ['LOSSES', 'L'],
  'SV': ['SAVES', 'SV'],
  'ERA': ['ERA'],
  'WHIP': ['WHIP'],
  'IP': ['INN', 'INNINGS', 'IP'],
  'QS': ['QUALITYSTARTS', 'QS'],
  'HLD': ['HOLDS', 'HLD'],
  'BB': ['WALKS', 'BB'],
  'H': ['HITS', 'H'],
};

export function ProjectionUploader({ onComplete, isComplete, isCollapsed = false, onToggle }: ProjectionUploaderProps) {
  const {
    playerProjections,
    setPlayerProjections,
    scoringFormat,
    projectionFiles,
    addProjectionFile,
    setProjectionSource,
    setProjectionsError,
    setProjectionsLastUpdated,
    projectionSource,
    projectionsLastUpdated,
    projectionsLoading,
    refetchProjections,
  } = useAppContext();
  const { toast } = useToast();

  const [hittersState, setHittersState] = useState<FileUploadState>(createEmptyFileState());
  const [pitchersState, setPitchersState] = useState<FileUploadState>(createEmptyFileState());
  const [activeTab, setActiveTab] = useState<'hitters' | 'pitchers'>('hitters');
  const [isDragging, setIsDragging] = useState(false);
  const [showCustomUpload, setShowCustomUpload] = useState(false);
  
  const getRelevantStats = useCallback((kind: 'hitters' | 'pitchers') => {
    if (!scoringFormat) {
      return kind === 'hitters' ? COMMON_HITTING_STATS : COMMON_PITCHING_STATS;
    }
    
    if (scoringFormat.type === 'h2h-points') {
      return kind === 'hitters' 
        ? Object.keys(scoringFormat.hittingPoints || {})
        : Object.keys(scoringFormat.pitchingPoints || {});
    } else {
      return kind === 'hitters'
        ? scoringFormat.hittingCategories || []
        : scoringFormat.pitchingCategories || [];
    }
  }, [scoringFormat]);

  const handleFileSelect = useCallback((file: File | null, kind: 'hitters' | 'pitchers') => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }
    
    const setState = kind === 'hitters' ? setHittersState : setPitchersState;
    setState(prev => ({ ...prev, file, isProcessing: true }));
    
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        const filteredData = data.filter(row => row.some(cell => cell && cell.trim()));
        
        if (filteredData.length > 0) {
          const headers = filteredData[0];
          const parsedData = filteredData.slice(1);
          
          const autoMapping: Record<string, string> = {};
          const relevantStats = getRelevantStats(kind);
          
          headers.forEach((header, index) => {
            const lower = header.toLowerCase().trim();
            const headerUpper = header.toUpperCase().trim();
            
            if (lower.includes('name') || lower === 'player') autoMapping.name = index.toString();
            if (lower.includes('team')) autoMapping.team = index.toString();
            if (lower.includes('pos') && !lower.includes('opp')) autoMapping.positions = index.toString();
            if (lower === 'mlbamid' || lower === 'mlbam_id' || lower === 'playerid' || lower === 'mlb_id' || lower === 'idmlbam') {
              autoMapping.mlbamId = index.toString();
            }
            
            relevantStats.forEach(stat => {
              const statLower = stat.toLowerCase();
              const statUpper = stat.toUpperCase();
              
              const aliases = STAT_ALIASES[statUpper] || [stat];
              const headerMatches = aliases.some(alias => 
                lower === alias.toLowerCase() || headerUpper === alias
              );
              
              if (lower === statLower || headerUpper === statUpper || header === stat || headerMatches) {
                autoMapping[stat] = index.toString();
              }
            });
          });
          
          setState(prev => ({
            ...prev,
            headers,
            parsedData,
            columnMapping: autoMapping,
            isProcessing: false,
          }));
          
          const autoMappedStats = Object.keys(autoMapping).filter(
            k => !['name', 'team', 'positions', 'mlbamId'].includes(k)
          );
          
          toast({
            title: `${kind === 'hitters' ? 'Hitters' : 'Pitchers'} CSV loaded`,
            description: autoMappedStats.length > 0 
              ? `Found ${parsedData.length} players, auto-mapped ${autoMappedStats.length} stat columns`
              : `Found ${parsedData.length} players`,
          });
        } else {
          setState(prev => ({ ...prev, isProcessing: false }));
          toast({
            title: 'Empty file',
            description: 'The CSV file appears to be empty',
            variant: 'destructive',
          });
        }
      },
      error: (error) => {
        setState(prev => ({ ...prev, isProcessing: false }));
        toast({
          title: 'Failed to parse CSV',
          description: error.message || 'Please check the file format',
          variant: 'destructive',
        });
      },
      skipEmptyLines: true,
    });
  }, [getRelevantStats, toast]);

  const handleDrop = useCallback((e: React.DragEvent, kind: 'hitters' | 'pitchers') => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file, kind);
    }
  }, [handleFileSelect]);

  const handleImport = async (kind: 'hitters' | 'pitchers') => {
    const state = kind === 'hitters' ? hittersState : pitchersState;
    const setState = kind === 'hitters' ? setHittersState : setPitchersState;
    
    if (!state.parsedData || !state.columnMapping.name) {
      toast({
        title: 'Missing required column',
        description: 'Please map the Player Name column',
        variant: 'destructive',
      });
      return;
    }

    const hasPositions = !!state.columnMapping.positions;
    const hasMlbamId = !!state.columnMapping.mlbamId;

    if (!hasPositions && !hasMlbamId) {
      toast({
        title: 'Missing position data',
        description: 'Please map either Position column or MLBAM ID column',
        variant: 'destructive',
      });
      return;
    }

    const statColumns = Object.keys(state.columnMapping).filter(
      key => !['name', 'team', 'positions', 'mlbamId'].includes(key)
    );
    
    if (statColumns.length === 0) {
      toast({
        title: 'No stat columns mapped',
        description: 'Click on stat column buttons to add them',
        variant: 'destructive',
      });
      return;
    }

    let positionsByMlbamId: Map<string, string[]> | null = null;

    if (!hasPositions && hasMlbamId) {
      setState(prev => ({ ...prev, isFetchingPositions: true, fetchProgress: 0 }));
      
      const mlbamIds = state.parsedData
        .map(row => row[parseInt(state.columnMapping.mlbamId)]?.trim())
        .filter(id => id && id.length > 0);

      try {
        positionsByMlbamId = await lookupPlayerPositions(
          mlbamIds,
          (completed, total) => setState(prev => ({ ...prev, fetchProgress: (completed / total) * 100 }))
        );
      } catch {
        // Position lookup failed - fall back to empty map (will use default positions)
        positionsByMlbamId = new Map();
      }
      
      setState(prev => ({ ...prev, isFetchingPositions: false }));
    }

    const projections: PlayerProjection[] = state.parsedData
      .filter(row => row && row.length > 0)
      .map(row => {
        const stats: Record<string, number> = {};
        
        Object.entries(state.columnMapping).forEach(([key, colIndex]) => {
          if (!['name', 'team', 'positions', 'mlbamId'].includes(key)) {
            const cellValue = row[parseInt(colIndex)]?.trim() || '';
            const value = parseFloat(cellValue);
            if (!isNaN(value)) {
              stats[key] = value;
            }
          }
        });

        const defaultPositions: string[] = kind === 'hitters' ? ['UTIL'] : ['P'];
        let positions: string[] = defaultPositions;
        
        if (hasPositions) {
          const positionsStr = row[parseInt(state.columnMapping.positions)]?.trim() || '';
          const parsedPositions = positionsStr.split(/[,/]/).map(p => p.trim().toUpperCase()).filter(Boolean);
          if (parsedPositions.length > 0) {
            positions = parsedPositions;
          }
        } 
        
        if (positions.length === 0 || (positions.length === 1 && positions[0] === (kind === 'hitters' ? 'UTIL' : 'P'))) {
          if (hasMlbamId && positionsByMlbamId) {
            const mlbamId = row[parseInt(state.columnMapping.mlbamId)]?.trim();
            if (mlbamId && positionsByMlbamId.has(mlbamId)) {
              const lookedUpPositions = positionsByMlbamId.get(mlbamId);
              if (lookedUpPositions && lookedUpPositions.length > 0) {
                positions = lookedUpPositions;
              }
            }
          }
        }
        
        if (positions.length === 0) {
          positions = defaultPositions;
        }

        const mlbamId = hasMlbamId ? row[parseInt(state.columnMapping.mlbamId)]?.trim() : undefined;

        return {
          name: row[parseInt(state.columnMapping.name)]?.trim() || 'Unknown Player',
          team: state.columnMapping.team ? row[parseInt(state.columnMapping.team)]?.trim() : undefined,
          positions,
          stats,
          mlbamId,
        };
      })
      .filter(p => p.name !== 'Unknown Player' && Object.keys(p.stats).length > 0);

    if (projections.length === 0) {
      toast({
        title: 'No valid data',
        description: 'Could not find valid player data in the CSV',
        variant: 'destructive',
      });
      return;
    }

    
    setState(prev => ({ ...prev, projections }));
    
    const fileRecord: ProjectionFile = {
      id: `${kind}-${Date.now()}`,
      kind: kind as ProjectionFileKind,
      fileName: state.file?.name || 'unknown.csv',
      playerCount: projections.length,
      importedAt: Date.now(),
    };
    addProjectionFile(fileRecord);
    
    const existingProjections = playerProjections || [];
    const existingHitters = existingProjections.filter(p => identifyPlayerType(p) !== 'pitcher');
    const existingPitchers = existingProjections.filter(p => identifyPlayerType(p) !== 'hitter');
    
    const otherKind = kind === 'hitters' ? 'pitchers' : 'hitters';
    const otherTypeProjections = kind === 'hitters' ? existingPitchers : existingHitters;

    if (otherTypeProjections.length > 0) {
      const hitterProjs = kind === 'hitters' ? projections : existingHitters;
      const pitcherProjs = kind === 'hitters' ? existingPitchers : projections;
      const { mergedProjections, dualPlayersCount } = mergeProjections(hitterProjs, pitcherProjs);
      
      setPlayerProjections(mergedProjections);
      setProjectionSource('csv');
      setProjectionsError(null);
      setProjectionsLastUpdated(null);

      toast({
        title: 'Projections merged',
        description: `${mergedProjections.length} total players${dualPlayersCount > 0 ? `, including ${dualPlayersCount} two-way players` : ''}`,
      });
      onComplete();
    } else {
      setPlayerProjections(projections);
      setProjectionSource('csv');
      setProjectionsError(null);
      setProjectionsLastUpdated(null);
      toast({
        title: `${kind === 'hitters' ? 'Hitters' : 'Pitchers'} imported`,
        description: `${projections.length} players imported. Upload ${otherKind} to complete.`,
      });
      setActiveTab(otherKind);
    }
  };

  const handleClearFile = (kind: 'hitters' | 'pitchers') => {
    const setState = kind === 'hitters' ? setHittersState : setPitchersState;
    setState(createEmptyFileState());
  };

  const handleAddStatColumn = (kind: 'hitters' | 'pitchers', statName: string, columnIndex: string) => {
    const setState = kind === 'hitters' ? setHittersState : setPitchersState;
    setState(prev => ({
      ...prev,
      columnMapping: { ...prev.columnMapping, [statName]: columnIndex },
    }));
  };

  const renderUploadPanel = (kind: 'hitters' | 'pitchers') => {
    const state = kind === 'hitters' ? hittersState : pitchersState;
    const setState = kind === 'hitters' ? setHittersState : setPitchersState;
    const relevantStats = getRelevantStats(kind);
    const hasPositionOrMlbamId = state.columnMapping.positions || state.columnMapping.mlbamId;
    const Icon = kind === 'hitters' ? Users : Activity;
    
    if (!state.parsedData) {
      return (
        <div
          onDrop={(e) => handleDrop(e, kind)}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-baseball-navy bg-baseball-cream' : 'border-border hover:border-baseball-navy'
          }`}
        >
          <Icon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-display text-lg text-foreground mb-2">
            {state.isProcessing ? 'PROCESSING...' : `UPLOAD ${kind.toUpperCase()} CSV`}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {state.isProcessing ? 'Parsing data...' : 'Drag & drop or click to browse'}
          </p>
          {!state.isProcessing && (
            <>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, kind)}
                className="hidden"
                id={`csv-upload-${kind}`}
                data-testid={`input-csv-upload-${kind}`}
              />
              <Label htmlFor={`csv-upload-${kind}`}>
                <Button variant="outline" className="hover-elevate" asChild>
                  <span>Select {kind === 'hitters' ? 'Hitters' : 'Pitchers'} CSV</span>
                </Button>
              </Label>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-md border border-border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-baseball-navy" />
            <div>
              <p className="font-medium text-sm">{state.file?.name}</p>
              <p className="text-xs text-muted-foreground">{state.parsedData.length} players</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.projections.length > 0 && (
              <Badge variant="default" className="bg-baseball-green">
                <Check className="h-3 w-3 mr-1" />
                Imported
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleClearFile(kind)}
              data-testid={`button-remove-${kind}-csv`}
              className="hover-elevate"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {state.projections.length === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Player Name *</Label>
                <Select
                  value={state.columnMapping.name}
                  onValueChange={(value) => setState(prev => ({ 
                    ...prev, 
                    columnMapping: { ...prev.columnMapping, name: value }
                  }))}
                >
                  <SelectTrigger data-testid={`select-${kind}-name-column`}>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.headers.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Position(s) {!state.columnMapping.mlbamId && '*'}
                </Label>
                <Select
                  value={state.columnMapping.positions || '__none__'}
                  onValueChange={(value) => {
                    setState(prev => {
                      const newMapping = { ...prev.columnMapping };
                      if (value === '__none__') {
                        delete newMapping.positions;
                      } else {
                        newMapping.positions = value;
                      }
                      return { ...prev, columnMapping: newMapping };
                    });
                  }}
                >
                  <SelectTrigger data-testid={`select-${kind}-positions-column`}>
                    <SelectValue placeholder={state.columnMapping.mlbamId ? "Optional" : "Select column"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- No Position Column --</SelectItem>
                    {state.headers.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Team</Label>
                <Select
                  value={state.columnMapping.team || '__none__'}
                  onValueChange={(value) => {
                    setState(prev => {
                      const newMapping = { ...prev.columnMapping };
                      if (value === '__none__') {
                        delete newMapping.team;
                      } else {
                        newMapping.team = value;
                      }
                      return { ...prev, columnMapping: newMapping };
                    });
                  }}
                >
                  <SelectTrigger data-testid={`select-${kind}-team-column`}>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- No Team Column --</SelectItem>
                    {state.headers.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  MLBAM ID {!state.columnMapping.positions && '*'}
                </Label>
                <Select
                  value={state.columnMapping.mlbamId || '__none__'}
                  onValueChange={(value) => {
                    setState(prev => {
                      const newMapping = { ...prev.columnMapping };
                      if (value === '__none__') {
                        delete newMapping.mlbamId;
                      } else {
                        newMapping.mlbamId = value;
                      }
                      return { ...prev, columnMapping: newMapping };
                    });
                  }}
                >
                  <SelectTrigger data-testid={`select-${kind}-mlbamid-column`}>
                    <SelectValue placeholder={state.columnMapping.positions ? "Optional" : "For position lookup"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- No MLBAM ID --</SelectItem>
                    {state.headers.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!hasPositionOrMlbamId && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-md">
                <p className="text-sm text-warning-foreground">
                  Map either <strong>Position</strong> or <strong>MLBAM ID</strong> column.
                </p>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <Label className="text-sm font-medium">
                  {kind === 'hitters' ? 'Hitting' : 'Pitching'} Stats (click to add) *
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {Object.keys(state.columnMapping).filter(k => !['name', 'team', 'positions', 'mlbamId'].includes(k)).length} mapped
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.headers.filter((_, idx) => 
                  idx.toString() !== state.columnMapping.name &&
                  idx.toString() !== state.columnMapping.positions &&
                  idx.toString() !== state.columnMapping.team &&
                  idx.toString() !== state.columnMapping.mlbamId
                ).map((header) => {
                  const actualIndex = state.headers.findIndex(h => h === header);
                  const isMapped = Object.values(state.columnMapping).includes(actualIndex.toString());
                  const matchingStat = relevantStats.find(stat => 
                    stat.toLowerCase() === header.toLowerCase() || 
                    stat.toUpperCase() === header.toUpperCase() ||
                    stat === header
                  );
                  const isRecommended = !!matchingStat;
                  const statKeyToUse = matchingStat || header;
                  
                  return (
                    <Button
                      key={header}
                      variant={isMapped ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAddStatColumn(kind, statKeyToUse, actualIndex.toString())}
                      className={`hover-elevate ${!isMapped && isRecommended ? 'border-baseball-navy border-2' : ''}`}
                      data-testid={`button-${kind}-stat-${header.toLowerCase()}`}
                    >
                      {isMapped && <Check className="h-3 w-3 mr-1" />}
                      {header}
                      {!isMapped && isRecommended && <span className="ml-1 text-xs text-baseball-navy">★</span>}
                    </Button>
                  );
                })}
              </div>
            </div>

            {state.isFetchingPositions && (
              <div className="p-3 bg-baseball-cream rounded-md border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-baseball-navy" />
                  <span className="text-sm font-medium">Looking up positions...</span>
                </div>
                <Progress value={state.fetchProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => handleImport(kind)}
                size="default"
                disabled={!state.columnMapping.name || !hasPositionOrMlbamId || state.isFetchingPositions}
                className="bg-baseball-navy hover-elevate active-elevate-2"
                data-testid={`button-import-${kind}`}
              >
                {state.isFetchingPositions ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  `Import ${kind === 'hitters' ? 'Hitters' : 'Pitchers'}`
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  const formatDate = (isoTimestamp: string): string => {
    const date = new Date(isoTimestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSummary = () => {
    if (playerProjections.length === 0) return null;
    if (projectionSource === 'api' && projectionsLastUpdated) {
      return `Steamer Projections (${formatDate(projectionsLastUpdated)}) - ${playerProjections.length} players`;
    }
    const hittersFile = projectionFiles.find(f => f.kind === 'hitters');
    const pitchersFile = projectionFiles.find(f => f.kind === 'pitchers');
    if (hittersFile && pitchersFile) {
      return `${playerProjections.length} players (${hittersFile.playerCount} hitters, ${pitchersFile.playerCount} pitchers)`;
    }
    return `${playerProjections.length} players loaded`;
  };

  const hittersFile = projectionFiles.find(f => f.kind === 'hitters');
  const pitchersFile = projectionFiles.find(f => f.kind === 'pitchers');
  const hittersComplete = !!hittersFile || hittersState.projections.length > 0;
  const pitchersComplete = !!pitchersFile || pitchersState.projections.length > 0;

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => onToggle?.()}>
      <Card className="border-card-border shadow-md">
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-baseball-leather text-baseball-cream pb-6 cursor-pointer hover-elevate">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isComplete && <Check className="h-7 w-7 text-baseball-green" />}
                <div>
                  <CardTitle className="font-display text-3xl tracking-tight">
                    PLAYER PROJECTIONS
                  </CardTitle>
                  {isCollapsed && isComplete && (
                    <p className="text-baseball-cream/80 text-sm mt-1 font-mono">{getSummary()}</p>
                  )}
                  {!isCollapsed && (
                    <CardDescription className="text-baseball-cream/80 text-base mt-1">
                      {projectionSource === 'api'
                        ? 'Using Steamer projections from FanGraphs'
                        : projectionSource === 'csv'
                          ? 'Using custom uploaded projections'
                          : 'Load projections to calculate auction values'}
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hittersComplete && (
                  <Badge variant="outline" className="border-baseball-green text-baseball-cream bg-baseball-green/20">
                    <Users className="h-3 w-3 mr-1" />
                    {hittersFile?.playerCount || hittersState.projections.length}
                  </Badge>
                )}
                {pitchersComplete && (
                  <Badge variant="outline" className="border-baseball-green text-baseball-cream bg-baseball-green/20">
                    <Activity className="h-3 w-3 mr-1" />
                    {pitchersFile?.playerCount || pitchersState.projections.length}
                  </Badge>
                )}
                {isCollapsed ? (
                  <ChevronRight className="h-6 w-6 text-baseball-cream/80" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-baseball-cream/80" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-6 pb-6 space-y-4">
            {/* Steamer Projections Status */}
            {projectionSource === 'api' && playerProjections.length > 0 && (
              <div className="p-4 bg-baseball-cream-dark rounded-md border border-card-border">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-6 w-6 text-baseball-navy" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg text-baseball-navy">
                          STEAMER PROJECTIONS
                        </span>
                        <Check className="h-5 w-5 text-baseball-green" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {playerProjections.length} players from FanGraphs
                        {projectionsLastUpdated && ` (updated ${formatDate(projectionsLastUpdated)})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refetchProjections}
                      disabled={projectionsLoading}
                      className="hover-elevate"
                      data-testid="button-refresh-api"
                    >
                      {projectionsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Cloud className="h-4 w-4 mr-1" />
                      )}
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {projectionsLoading && !playerProjections.length && (
              <div className="p-4 bg-muted rounded-md border border-border">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-baseball-navy" />
                  <span className="text-sm">Loading Steamer projections...</span>
                </div>
              </div>
            )}

            {/* CSV Upload Section - Optional when API data exists */}
            {projectionSource === 'api' && playerProjections.length > 0 ? (
              <Collapsible open={showCustomUpload} onOpenChange={setShowCustomUpload}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between hover:bg-muted"
                    data-testid="button-toggle-csv-upload"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Custom Projections (Optional)
                    </span>
                    {showCustomUpload ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'hitters' | 'pitchers')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger
                        value="hitters"
                        className="flex items-center gap-2"
                        data-testid="tab-hitters"
                      >
                        <Users className="h-4 w-4" />
                        Hitters
                        {hittersComplete && <Check className="h-4 w-4 text-baseball-green" />}
                      </TabsTrigger>
                      <TabsTrigger
                        value="pitchers"
                        className="flex items-center gap-2"
                        data-testid="tab-pitchers"
                      >
                        <Activity className="h-4 w-4" />
                        Pitchers
                        {pitchersComplete && <Check className="h-4 w-4 text-baseball-green" />}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="hitters">
                      {renderUploadPanel('hitters')}
                    </TabsContent>
                    <TabsContent value="pitchers">
                      {renderUploadPanel('pitchers')}
                    </TabsContent>
                  </Tabs>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              /* Show CSV upload directly when no API data */
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'hitters' | 'pitchers')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger
                    value="hitters"
                    className="flex items-center gap-2"
                    data-testid="tab-hitters"
                  >
                    <Users className="h-4 w-4" />
                    Hitters
                    {hittersComplete && <Check className="h-4 w-4 text-baseball-green" />}
                  </TabsTrigger>
                  <TabsTrigger
                    value="pitchers"
                    className="flex items-center gap-2"
                    data-testid="tab-pitchers"
                  >
                    <Activity className="h-4 w-4" />
                    Pitchers
                    {pitchersComplete && <Check className="h-4 w-4 text-baseball-green" />}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="hitters">
                  {renderUploadPanel('hitters')}
                </TabsContent>
                <TabsContent value="pitchers">
                  {renderUploadPanel('pitchers')}
                </TabsContent>
              </Tabs>
            )}

            {/* CSV Upload Summary - show when CSV is the source */}
            {projectionSource === 'csv' && playerProjections.length > 0 && (
              <div className="p-4 bg-baseball-cream-dark rounded-md border border-card-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-baseball-navy" />
                    <span className="font-display text-lg text-baseball-navy">
                      {playerProjections.length} PLAYERS READY
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hittersComplete && (
                      <Badge variant="secondary">
                        {hittersFile?.playerCount || hittersState.projections.length} hitters
                      </Badge>
                    )}
                    {pitchersComplete && (
                      <Badge variant="secondary">
                        {pitchersFile?.playerCount || pitchersState.projections.length} pitchers
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refetchProjections}
                      disabled={projectionsLoading}
                      className="hover-elevate"
                      data-testid="button-switch-to-api"
                    >
                      {projectionsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Cloud className="h-4 w-4 mr-1" />
                      )}
                      Use Steamer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
