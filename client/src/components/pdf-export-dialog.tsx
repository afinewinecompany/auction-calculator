import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, ListOrdered, Layers, Star } from 'lucide-react';
import { exportToPDF, type PDFLayout } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';
import type { PlayerValue, LeagueSettings } from '@shared/schema';

interface PDFExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerValue[];
  leagueSettings?: LeagueSettings | null;
  targetedPlayerIds: string[];
}

const layoutOptions: { value: PDFLayout; label: string; description: string; icon: typeof FileText }[] = [
  {
    value: 'full',
    label: 'Full Rankings',
    description: 'Complete player list sorted by overall rank',
    icon: FileText,
  },
  {
    value: 'positional',
    label: 'By Position',
    description: 'Top players grouped by position (C, 1B, SP, etc.)',
    icon: ListOrdered,
  },
  {
    value: 'tiers',
    label: 'Value Tiers',
    description: 'Players organized into value tiers',
    icon: Layers,
  },
  {
    value: 'targets',
    label: 'My Targets',
    description: 'Only players you\'ve marked as targets',
    icon: Star,
  },
];

export function PDFExportDialog({
  isOpen,
  onClose,
  players,
  leagueSettings,
  targetedPlayerIds,
}: PDFExportDialogProps) {
  const [selectedLayout, setSelectedLayout] = useState<PDFLayout>('full');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (selectedLayout === 'targets' && targetedPlayerIds.length === 0) {
        toast({
          title: 'No targets selected',
          description: 'Please mark some players as targets before exporting this layout.',
          variant: 'destructive',
        });
        return;
      }
      
      exportToPDF({
        players,
        leagueSettings: leagueSettings || undefined,
        layout: selectedLayout,
        targetedPlayerIds,
        title: 'Auction Cheat Sheet',
      });
      
      toast({
        title: 'Export successful',
        description: 'Your cheat sheet has been downloaded.',
      });
      onClose();
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error generating your PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">Export Cheat Sheet</DialogTitle>
          <DialogDescription>
            Choose a layout for your printable auction cheat sheet
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedLayout}
          onValueChange={(value) => setSelectedLayout(value as PDFLayout)}
          className="space-y-3 py-4"
        >
          {layoutOptions.map((option) => {
            const Icon = option.icon;
            const isDisabled = option.value === 'targets' && targetedPlayerIds.length === 0;
            
            return (
              <div
                key={option.value}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${
                  selectedLayout === option.value
                    ? 'border-baseball-navy bg-baseball-navy/5'
                    : 'border-border hover-elevate'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !isDisabled && setSelectedLayout(option.value)}
                data-testid={`radio-layout-${option.value}`}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  disabled={isDisabled}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 font-semibold cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-baseball-leather" />
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                  {option.value === 'targets' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {targetedPlayerIds.length} player{targetedPlayerIds.length !== 1 ? 's' : ''} targeted
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-export">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || players.length === 0}
            data-testid="button-confirm-export"
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
