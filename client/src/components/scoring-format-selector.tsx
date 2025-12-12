import { useState } from 'react';
import { useAppContext } from '@/lib/app-context';
import {
  DEFAULT_HITTING_CATEGORIES,
  DEFAULT_PITCHING_CATEGORIES,
  DEFAULT_HITTING_POINTS,
  DEFAULT_PITCHING_POINTS,
  COMMON_HITTING_CATEGORIES,
  COMMON_PITCHING_CATEGORIES,
  type ScoringFormat,
} from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { SCORING_PRESETS, getPresetById } from '@/lib/scoring-presets';
import { useToast } from '@/hooks/use-toast';

interface ScoringFormatSelectorProps {
  onComplete: () => void;
  isComplete: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function ScoringFormatSelector({ onComplete, isComplete, isCollapsed = false, onToggle }: ScoringFormatSelectorProps) {
  const { scoringFormat, setScoringFormat } = useAppContext();
  const { toast } = useToast();
  
  const [selectedType, setSelectedType] = useState<'roto' | 'h2h-categories' | 'h2h-points'>(
    scoringFormat?.type || 'roto'
  );
  
  const [hittingCategories, setHittingCategories] = useState<string[]>(
    scoringFormat?.type !== 'h2h-points' ? scoringFormat?.hittingCategories || DEFAULT_HITTING_CATEGORIES : DEFAULT_HITTING_CATEGORIES
  );
  
  const [pitchingCategories, setPitchingCategories] = useState<string[]>(
    scoringFormat?.type !== 'h2h-points' ? scoringFormat?.pitchingCategories || DEFAULT_PITCHING_CATEGORIES : DEFAULT_PITCHING_CATEGORIES
  );
  
  const [hittingPoints, setHittingPoints] = useState<Record<string, number>>(
    scoringFormat?.type === 'h2h-points' ? scoringFormat?.hittingPoints : DEFAULT_HITTING_POINTS
  );
  
  const [pitchingPoints, setPitchingPoints] = useState<Record<string, number>>(
    scoringFormat?.type === 'h2h-points' ? scoringFormat?.pitchingPoints : DEFAULT_PITCHING_POINTS
  );

  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handlePresetLoad = (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    setSelectedType(preset.scoringFormat.type);

    if (preset.scoringFormat.type === 'h2h-points') {
      setHittingPoints(preset.scoringFormat.hittingPoints);
      setPitchingPoints(preset.scoringFormat.pitchingPoints);
    } else {
      setHittingCategories(preset.scoringFormat.hittingCategories);
      setPitchingCategories(preset.scoringFormat.pitchingCategories);
    }

    toast({
      title: 'Preset Loaded',
      description: `${preset.name} scoring format has been applied`,
    });
  };

  const handleCategoryToggle = (category: string, type: 'hitting' | 'pitching') => {
    if (type === 'hitting') {
      setHittingCategories((prev) =>
        prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
      );
    } else {
      setPitchingCategories((prev) =>
        prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
      );
    }
  };

  const handlePointsChange = (category: string, value: number, type: 'hitting' | 'pitching') => {
    if (type === 'hitting') {
      setHittingPoints((prev) => ({ ...prev, [category]: value }));
    } else {
      setPitchingPoints((prev) => ({ ...prev, [category]: value }));
    }
  };

  const handleSave = () => {
    let format: ScoringFormat;
    
    if (selectedType === 'h2h-points') {
      format = {
        type: 'h2h-points',
        hittingPoints,
        pitchingPoints,
      };
    } else {
      format = {
        type: selectedType,
        hittingCategories,
        pitchingCategories,
      };
    }
    
    setScoringFormat(format);
    onComplete();
  };

  const getSummary = () => {
    if (!scoringFormat) return null;
    const typeLabel = scoringFormat.type === 'roto' ? 'Rotisserie' : 
                      scoringFormat.type === 'h2h-categories' ? 'H2H Categories' : 'H2H Points';
    if (scoringFormat.type === 'h2h-points') {
      return `${typeLabel}`;
    }
    return `${typeLabel}: ${scoringFormat.hittingCategories?.length || 0}x${scoringFormat.pitchingCategories?.length || 0}`;
  };

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => onToggle?.()}>
      <Card className="glass-card-strong rounded-xl p-8 shadow-float hover-lift border-card-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-baseball-leather text-baseball-cream pb-6 cursor-pointer hover-elevate">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isComplete && <Check className="h-7 w-7 text-baseball-green" />}
                <div>
                  <CardTitle className="font-display text-3xl tracking-tight">
                    SCORING FORMAT
                  </CardTitle>
                  {isCollapsed && isComplete && (
                    <p className="text-baseball-cream/80 text-sm mt-1 font-mono">{getSummary()}</p>
                  )}
                  {!isCollapsed && (
                    <CardDescription className="text-baseball-cream/80 text-base mt-1">
                      Choose how your league scores fantasy performance
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
          <CardContent className="pt-8 pb-8">
            <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-baseball-gold" />
                  <span className="font-semibold">Quick Start</span>
                </div>
                <Select value={selectedPreset} onValueChange={handlePresetLoad}>
                  <SelectTrigger className="w-64" data-testid="select-scoring-preset">
                    <SelectValue placeholder="Load a preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {['ESPN', 'Yahoo', 'Fantrax', 'Ottoneu'].map(platform => {
                      const platformPresets = SCORING_PRESETS.filter(p => p.platform === platform);
                      if (platformPresets.length === 0) return null;
                      return (
                        <div key={platform}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                            {platform}
                          </div>
                          {platformPresets.map(preset => (
                            <SelectItem 
                              key={preset.id} 
                              value={preset.id}
                              data-testid={`select-preset-${preset.id}`}
                            >
                              {preset.name}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Select a platform preset to auto-fill scoring settings, then customize as needed
              </p>
            </div>

            <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="roto" data-testid="tab-roto">Rotisserie</TabsTrigger>
                <TabsTrigger value="h2h-categories" data-testid="tab-h2h-cat">H2H Categories</TabsTrigger>
                <TabsTrigger value="h2h-points" data-testid="tab-h2h-points">H2H Points</TabsTrigger>
              </TabsList>

              <TabsContent value="roto" className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Accumulate stats all season. Rankings determined by total performance in each category.
                </p>
                <CategorySelector
                  hittingCategories={hittingCategories}
                  pitchingCategories={pitchingCategories}
                  onCategoryToggle={handleCategoryToggle}
                />
              </TabsContent>

              <TabsContent value="h2h-categories" className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Each week you'll face an opponent. Win each category to earn points toward playoff seeding.
                </p>
                <CategorySelector
                  hittingCategories={hittingCategories}
                  pitchingCategories={pitchingCategories}
                  onCategoryToggle={handleCategoryToggle}
                />
              </TabsContent>

              <TabsContent value="h2h-points" className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Players earn points based on their statistical performance. Most points wins each week.
                </p>
                <PointsConfigurator
                  hittingPoints={hittingPoints}
                  pitchingPoints={pitchingPoints}
                  onPointsChange={handlePointsChange}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-8">
              <Button
                onClick={handleSave}
                size="lg"
                className="bg-baseball-navy button-modern shadow-float focus-glow"
                data-testid="button-save-scoring"
              >
                {isComplete ? 'Update Format' : 'Save & Continue'}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function CategorySelector({
  hittingCategories,
  pitchingCategories,
  onCategoryToggle,
}: {
  hittingCategories: string[];
  pitchingCategories: string[];
  onCategoryToggle: (category: string, type: 'hitting' | 'pitching') => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h4 className="font-display text-lg text-baseball-navy tracking-tight">HITTING CATEGORIES</h4>
        <div className="grid grid-cols-2 gap-3">
          {COMMON_HITTING_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`hitting-${category}`}
                checked={hittingCategories.includes(category)}
                onCheckedChange={() => onCategoryToggle(category, 'hitting')}
                data-testid={`checkbox-hitting-${category.toLowerCase()}`}
              />
              <Label htmlFor={`hitting-${category}`} className="text-sm font-medium cursor-pointer">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-display text-lg text-baseball-navy tracking-tight">PITCHING CATEGORIES</h4>
        <div className="grid grid-cols-2 gap-3">
          {COMMON_PITCHING_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`pitching-${category}`}
                checked={pitchingCategories.includes(category)}
                onCheckedChange={() => onCategoryToggle(category, 'pitching')}
                data-testid={`checkbox-pitching-${category.toLowerCase()}`}
              />
              <Label htmlFor={`pitching-${category}`} className="text-sm font-medium cursor-pointer">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PointsConfigurator({
  hittingPoints,
  pitchingPoints,
  onPointsChange,
}: {
  hittingPoints: Record<string, number>;
  pitchingPoints: Record<string, number>;
  onPointsChange: (category: string, value: number, type: 'hitting' | 'pitching') => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h4 className="font-display text-lg text-baseball-navy tracking-tight">HITTING POINTS</h4>
        <div className="space-y-3">
          {Object.entries(hittingPoints).map(([category, value]) => (
            <div key={category} className="flex items-center gap-3">
              <Label htmlFor={`hit-${category}`} className="text-sm w-32 flex-shrink-0">
                {category}
              </Label>
              <Input
                id={`hit-${category}`}
                type="number"
                step="0.5"
                value={value}
                onChange={(e) => onPointsChange(category, parseFloat(e.target.value), 'hitting')}
                data-testid={`input-hitting-${category.toLowerCase().replace(/\s+/g, '-')}`}
                className="font-mono w-20 text-center bg-background border-input"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-display text-lg text-baseball-navy tracking-tight">PITCHING POINTS</h4>
        <div className="space-y-3">
          {Object.entries(pitchingPoints).map(([category, value]) => (
            <div key={category} className="flex items-center gap-3">
              <Label htmlFor={`pitch-${category}`} className="text-sm w-32 flex-shrink-0">
                {category}
              </Label>
              <Input
                id={`pitch-${category}`}
                type="number"
                step="0.5"
                value={value}
                onChange={(e) => onPointsChange(category, parseFloat(e.target.value), 'pitching')}
                data-testid={`input-pitching-${category.toLowerCase().replace(/\s+/g, '-')}`}
                className="font-mono w-20 text-center bg-background border-input"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
