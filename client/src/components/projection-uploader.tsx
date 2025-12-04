import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useAppContext } from '@/lib/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, FileText, Check, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lookupPlayerPositions } from '@/lib/position-lookup';
import type { PlayerProjection } from '@shared/schema';

interface ProjectionUploaderProps {
  onComplete: () => void;
  isComplete: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function ProjectionUploader({ onComplete, isComplete, isCollapsed = false, onToggle }: ProjectionUploaderProps) {
  const { playerProjections, setPlayerProjections } = useAppContext();
  const { toast } = useToast();
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingPositions, setIsFetchingPositions] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }
    
    setCsvFile(file);
    setIsProcessing(true);
    
    Papa.parse(file, {
      complete: (results) => {
        setIsProcessing(false);
        
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast({
            title: 'CSV parsing warning',
            description: 'Some rows may have formatting issues',
            variant: 'default',
          });
        }
        
        const data = results.data as string[][];
        const filteredData = data.filter(row => row.some(cell => cell && cell.trim()));
        
        if (filteredData.length > 0) {
          setHeaders(filteredData[0]);
          setParsedData(filteredData.slice(1));
          
          const autoMapping: Record<string, string> = {};
          filteredData[0].forEach((header, index) => {
            const lower = header.toLowerCase().trim();
            if (lower.includes('name') || lower === 'player') autoMapping.name = index.toString();
            if (lower.includes('team')) autoMapping.team = index.toString();
            if (lower.includes('pos') && !lower.includes('opp')) autoMapping.positions = index.toString();
            if (lower === 'mlbamid' || lower === 'mlbam_id' || lower === 'playerid' || lower === 'mlb_id' || lower === 'idmlbam') {
              autoMapping.mlbamId = index.toString();
            }
          });
          setColumnMapping(autoMapping);
          
          toast({
            title: 'CSV loaded successfully',
            description: `Found ${filteredData.length - 1} players`,
          });
        } else {
          toast({
            title: 'Empty file',
            description: 'The CSV file appears to be empty',
            variant: 'destructive',
          });
        }
      },
      error: (error) => {
        setIsProcessing(false);
        console.error('CSV parsing error:', error);
        toast({
          title: 'Failed to parse CSV',
          description: error.message || 'Please check the file format',
          variant: 'destructive',
        });
      },
      skipEmptyLines: true,
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    if (!parsedData || !columnMapping.name) {
      toast({
        title: 'Missing required column',
        description: 'Please map the Player Name column',
        variant: 'destructive',
      });
      return;
    }

    const hasPositions = !!columnMapping.positions;
    const hasMlbamId = !!columnMapping.mlbamId;

    if (!hasPositions && !hasMlbamId) {
      toast({
        title: 'Missing position data',
        description: 'Please map either Position column or MLBAM ID column to determine player positions',
        variant: 'destructive',
      });
      return;
    }

    const statColumns = Object.keys(columnMapping).filter(
      key => !['name', 'team', 'positions', 'mlbamId'].includes(key)
    );
    
    if (statColumns.length === 0) {
      toast({
        title: 'No stat columns mapped',
        description: 'Click on stat column buttons below to add them (e.g., HR, R, RBI, ERA, W, etc.)',
        variant: 'destructive',
      });
      return;
    }

    let positionsByMlbamId: Map<string, string[]> | null = null;

    if (!hasPositions && hasMlbamId) {
      setIsFetchingPositions(true);
      setFetchProgress(0);
      
      toast({
        title: 'Looking up positions',
        description: 'Matching player positions from reference data...',
      });

      const mlbamIds = parsedData
        .map(row => row[parseInt(columnMapping.mlbamId)]?.trim())
        .filter(id => id && id.length > 0);

      try {
        positionsByMlbamId = await lookupPlayerPositions(
          mlbamIds,
          (completed, total) => setFetchProgress((completed / total) * 100)
        );
      } catch (error) {
        console.error('Failed to lookup positions:', error);
        toast({
          title: 'Position lookup failed',
          description: 'Could not match positions. Players will be assigned UTIL.',
          variant: 'default',
        });
        positionsByMlbamId = new Map();
      }
      
      setIsFetchingPositions(false);
    }

    const projections: PlayerProjection[] = parsedData
      .filter(row => row && row.length > 0)
      .map(row => {
        const stats: Record<string, number> = {};
        
        Object.entries(columnMapping).forEach(([key, colIndex]) => {
          if (!['name', 'team', 'positions', 'mlbamId'].includes(key)) {
            const cellValue = row[parseInt(colIndex)]?.trim() || '';
            const value = parseFloat(cellValue);
            if (!isNaN(value)) {
              stats[key] = value;
            }
          }
        });

        let positions: string[] = ['UTIL'];
        
        if (hasPositions) {
          const positionsStr = row[parseInt(columnMapping.positions)]?.trim() || '';
          const parsedPositions = positionsStr.split(/[,/]/).map(p => p.trim()).filter(Boolean);
          if (parsedPositions.length > 0) {
            positions = parsedPositions;
          }
        } else if (hasMlbamId && positionsByMlbamId) {
          const mlbamId = row[parseInt(columnMapping.mlbamId)]?.trim();
          if (mlbamId && positionsByMlbamId.has(mlbamId)) {
            positions = positionsByMlbamId.get(mlbamId) || ['UTIL'];
          }
        }

        const mlbamId = hasMlbamId ? row[parseInt(columnMapping.mlbamId)]?.trim() : undefined;

        return {
          name: row[parseInt(columnMapping.name)]?.trim() || 'Unknown Player',
          team: columnMapping.team ? row[parseInt(columnMapping.team)]?.trim() : undefined,
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

    setPlayerProjections(projections);
    toast({
      title: 'Projections imported',
      description: `Successfully imported ${projections.length} players`,
    });
    onComplete();
  };

  const handleAddStatColumn = (statName: string, columnIndex: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [statName]: columnIndex,
    }));
  };

  const hasPositionOrMlbamId = columnMapping.positions || columnMapping.mlbamId;

  const getSummary = () => {
    if (playerProjections.length === 0) return null;
    return `${playerProjections.length} players loaded`;
  };

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
                      Upload your CSV projection files (Steamer, ZiPS, THE BAT, etc.)
                    </CardDescription>
                  )}
                </div>
              </div>
              {isCollapsed ? (
                <ChevronRight className="h-6 w-6 text-baseball-cream/80" />
              ) : (
                <ChevronDown className="h-6 w-6 text-baseball-cream/80" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-8 pb-8 space-y-6">
            {!parsedData ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? 'border-baseball-navy bg-baseball-cream' : 'border-border hover:border-baseball-navy'
                }`}
              >
                <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-display text-xl text-foreground mb-2">
                  {isProcessing ? 'PROCESSING...' : 'DRAG & DROP CSV FILE'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isProcessing ? 'Parsing your projections data' : 'or click to browse'}
                </p>
                {!isProcessing && (
                  <>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                      className="hidden"
                      id="csv-upload"
                      data-testid="input-csv-upload"
                    />
                    <Label htmlFor="csv-upload">
                      <Button variant="outline" className="hover-elevate" asChild>
                        <span>Select CSV File</span>
                      </Button>
                    </Label>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-md border border-border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-baseball-navy" />
                    <div>
                      <p className="font-medium text-sm">{csvFile?.name}</p>
                      <p className="text-xs text-muted-foreground">{parsedData.length} players detected</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCsvFile(null);
                      setParsedData(null);
                      setHeaders([]);
                      setColumnMapping({});
                    }}
                    data-testid="button-remove-csv"
                    className="hover-elevate"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-display text-lg text-baseball-navy tracking-tight">MAP COLUMNS</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Player Name *</Label>
                      <Select
                        value={columnMapping.name}
                        onValueChange={(value) => setColumnMapping(prev => ({ ...prev, name: value }))}
                      >
                        <SelectTrigger data-testid="select-name-column">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Position(s) {!columnMapping.mlbamId && '*'}
                      </Label>
                      <Select
                        value={columnMapping.positions || '__none__'}
                        onValueChange={(value) => {
                          const newMapping = { ...columnMapping };
                          if (value === '__none__') {
                            delete newMapping.positions;
                          } else {
                            newMapping.positions = value;
                          }
                          setColumnMapping(newMapping);
                        }}
                      >
                        <SelectTrigger data-testid="select-positions-column">
                          <SelectValue placeholder={columnMapping.mlbamId ? "Optional (using MLBAM ID)" : "Select column"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- No Position Column --</SelectItem>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {columnMapping.mlbamId && !columnMapping.positions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Positions will be looked up from reference data
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Team</Label>
                      <Select
                        value={columnMapping.team || '__none__'}
                        onValueChange={(value) => {
                          const newMapping = { ...columnMapping };
                          if (value === '__none__') {
                            delete newMapping.team;
                          } else {
                            newMapping.team = value;
                          }
                          setColumnMapping(newMapping);
                        }}
                      >
                        <SelectTrigger data-testid="select-team-column">
                          <SelectValue placeholder="Select column (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- No Team Column --</SelectItem>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        MLBAM ID {!columnMapping.positions && '*'}
                      </Label>
                      <Select
                        value={columnMapping.mlbamId || '__none__'}
                        onValueChange={(value) => {
                          const newMapping = { ...columnMapping };
                          if (value === '__none__') {
                            delete newMapping.mlbamId;
                          } else {
                            newMapping.mlbamId = value;
                          }
                          setColumnMapping(newMapping);
                        }}
                      >
                        <SelectTrigger data-testid="select-mlbamid-column">
                          <SelectValue placeholder={columnMapping.positions ? "Optional" : "Required for position lookup"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- No MLBAM ID Column --</SelectItem>
                          {headers.map((header, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!columnMapping.positions && columnMapping.mlbamId && (
                        <p className="text-xs text-baseball-navy mt-1">
                          Will lookup positions from reference data
                        </p>
                      )}
                    </div>
                  </div>

                  {!hasPositionOrMlbamId && (
                    <div className="p-4 bg-warning/10 border border-warning/30 rounded-md">
                      <p className="text-sm text-warning-foreground">
                        Please map either <strong>Position</strong> or <strong>MLBAM ID</strong> column to determine player positions.
                        If your CSV doesn't have positions, map the MLBAM ID column and positions will be looked up automatically.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Stat Columns (click to add) *</Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {Object.keys(columnMapping).filter(k => !['name', 'team', 'positions', 'mlbamId'].includes(k)).length} mapped
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {headers.filter((_, idx) => 
                        idx.toString() !== columnMapping.name &&
                        idx.toString() !== columnMapping.positions &&
                        idx.toString() !== columnMapping.team &&
                        idx.toString() !== columnMapping.mlbamId
                      ).map((header) => {
                        const actualIndex = headers.findIndex(h => h === header);
                        const isMapped = Object.values(columnMapping).includes(actualIndex.toString());
                        
                        return (
                          <Button
                            key={header}
                            variant={isMapped ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAddStatColumn(header, actualIndex.toString())}
                            className="justify-start hover-elevate"
                            data-testid={`button-stat-${header.toLowerCase()}`}
                          >
                            {isMapped && <Check className="h-3 w-3 mr-2" />}
                            {header}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isFetchingPositions && (
                  <div className="p-4 bg-baseball-cream rounded-md border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-baseball-navy" />
                      <span className="text-sm font-medium">Looking up player positions...</span>
                    </div>
                    <Progress value={fetchProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{Math.round(fetchProgress)}% complete</p>
                  </div>
                )}

                {parsedData.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-baseball-leather text-baseball-cream px-4 py-2">
                      <p className="text-sm font-medium">Preview (first 5 rows)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {headers.map((header, index) => (
                              <TableHead key={index} className="font-semibold whitespace-nowrap">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.slice(0, 5).map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex} className="font-mono text-sm">
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleImport}
                    size="lg"
                    disabled={!columnMapping.name || !hasPositionOrMlbamId || isFetchingPositions}
                    className="bg-baseball-navy hover-elevate active-elevate-2"
                    data-testid="button-import-projections"
                  >
                    {isFetchingPositions ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching Positions...
                      </>
                    ) : (
                      'Import Projections'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
