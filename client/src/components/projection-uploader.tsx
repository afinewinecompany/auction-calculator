import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useAppContext } from '@/lib/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PlayerProjection } from '@shared/schema';

interface ProjectionUploaderProps {
  onComplete: () => void;
  isComplete: boolean;
}

export function ProjectionUploader({ onComplete, isComplete }: ProjectionUploaderProps) {
  const { playerProjections, setPlayerProjections } = useAppContext();
  const { toast } = useToast();
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
            if (lower.includes('pos')) autoMapping.positions = index.toString();
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

  const handleImport = () => {
    if (!parsedData || !columnMapping.name || !columnMapping.positions) {
      toast({
        title: 'Missing required columns',
        description: 'Please map Player Name and Position columns',
        variant: 'destructive',
      });
      return;
    }

    const projections: PlayerProjection[] = parsedData
      .filter(row => row && row.length > 0)
      .map(row => {
        const stats: Record<string, number> = {};
        
        Object.entries(columnMapping).forEach(([key, colIndex]) => {
          if (!['name', 'team', 'positions'].includes(key)) {
            const cellValue = row[parseInt(colIndex)]?.trim() || '';
            const value = parseFloat(cellValue);
            if (!isNaN(value)) {
              stats[key] = value;
            }
          }
        });

        const positionsStr = row[parseInt(columnMapping.positions)]?.trim() || '';
        const positions = positionsStr.split(/[,/]/).map(p => p.trim()).filter(Boolean);

        return {
          name: row[parseInt(columnMapping.name)]?.trim() || 'Unknown Player',
          team: columnMapping.team ? row[parseInt(columnMapping.team)]?.trim() : undefined,
          positions: positions.length > 0 ? positions : ['UTIL'],
          stats,
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

  return (
    <Card className="border-card-border shadow-md">
      <CardHeader className="bg-baseball-leather text-baseball-cream pb-6">
        <CardTitle className="font-display text-3xl tracking-tight flex items-center gap-3">
          {isComplete && <Check className="h-7 w-7 text-baseball-green" />}
          PLAYER PROJECTIONS
        </CardTitle>
        <CardDescription className="text-baseball-cream/80 text-base">
          Upload your CSV projection files (Steamer, ZiPS, THE BAT, etc.)
        </CardDescription>
      </CardHeader>
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
                  <Label className="text-sm font-medium mb-2 block">Position(s) *</Label>
                  <Select
                    value={columnMapping.positions}
                    onValueChange={(value) => setColumnMapping(prev => ({ ...prev, positions: value }))}
                  >
                    <SelectTrigger data-testid="select-positions-column">
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
                  <Label className="text-sm font-medium mb-2 block">Team</Label>
                  <Select
                    value={columnMapping.team}
                    onValueChange={(value) => setColumnMapping(prev => ({ ...prev, team: value }))}
                  >
                    <SelectTrigger data-testid="select-team-column">
                      <SelectValue placeholder="Select column (optional)" />
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
              </div>

              <div className="border-t border-border pt-4">
                <Label className="text-sm font-medium mb-3 block">Stat Columns (map as many as needed)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {headers.filter((_, idx) => 
                    idx.toString() !== columnMapping.name &&
                    idx.toString() !== columnMapping.positions &&
                    idx.toString() !== columnMapping.team
                  ).map((header, index) => {
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
                disabled={!columnMapping.name || !columnMapping.positions}
                className="bg-baseball-navy hover-elevate active-elevate-2"
                data-testid="button-import-projections"
              >
                Import Projections
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
