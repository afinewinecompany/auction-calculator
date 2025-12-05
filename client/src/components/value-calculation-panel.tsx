import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/lib/app-context';
import { calculatePlayerValues, calculateRecommendedBudgetSplit } from '@/lib/calculations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calculator, Check, ChevronDown, ChevronRight, Sparkles, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ValueCalculationSettings, ReplacementLevelMethod } from '@shared/schema';
import { STANDARD_SPLITS } from '@shared/schema';

interface ValueCalculationPanelProps {
  onComplete: () => void;
  isComplete: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function ValueCalculationPanel({ onComplete, isComplete, isCollapsed = false, onToggle }: ValueCalculationPanelProps) {
  const {
    leagueSettings,
    scoringFormat,
    playerProjections,
    valueCalculationSettings,
    setValueCalculationSettings,
    setPlayerValues,
  } = useAppContext();

  const recommendedSplit = useMemo(() => {
    if (!leagueSettings || !scoringFormat || playerProjections.length === 0) {
      return { hitterPercent: 65, reason: 'Default split' };
    }
    return calculateRecommendedBudgetSplit(playerProjections, leagueSettings, scoringFormat);
  }, [playerProjections, leagueSettings, scoringFormat]);

  const [settings, setSettings] = useState<ValueCalculationSettings>(
    valueCalculationSettings || {
      method: 'z-score',
      replacementLevelMethod: 'lastDrafted',
      applyPositionScarcity: false,
      hitterPitcherSplit: { method: 'calculated' },
      hitterBudgetPercent: 65,
      showTiers: true,
    }
  );

  const [lastAppliedRecommendation, setLastAppliedRecommendation] = useState<number | null>(null);

  useEffect(() => {
    if (!valueCalculationSettings &&
      recommendedSplit.hitterPercent !== 65 &&
      lastAppliedRecommendation !== recommendedSplit.hitterPercent) {
      setSettings(prev => ({ ...prev, hitterBudgetPercent: recommendedSplit.hitterPercent }));
      setLastAppliedRecommendation(recommendedSplit.hitterPercent);
    }
  }, [recommendedSplit.hitterPercent, valueCalculationSettings, lastAppliedRecommendation]);

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);

  const isUsingRecommended = settings.hitterBudgetPercent === recommendedSplit.hitterPercent;

  const handleCalculate = async () => {
    if (!leagueSettings || !scoringFormat) return;

    setIsCalculating(true);
    setCalculationProgress(0);
    setValueCalculationSettings(settings);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        setCalculationProgress(25);
        
        setTimeout(() => {
          setCalculationProgress(50);
          
          const values = calculatePlayerValues(
            playerProjections,
            leagueSettings,
            scoringFormat,
            settings
          );

          setCalculationProgress(90);
          
          setTimeout(() => {
            setPlayerValues(values);
            setCalculationProgress(100);
            
            setTimeout(() => {
              setIsCalculating(false);
              onComplete();
              resolve();
            }, 100);
          }, 50);
        }, 50);
      }, 50);
    });
  };

  const hitterBudget = leagueSettings ? (leagueSettings.teamCount * leagueSettings.auctionBudget * settings.hitterBudgetPercent) / 100 : 0;
  const pitcherBudget = leagueSettings ? (leagueSettings.teamCount * leagueSettings.auctionBudget * (100 - settings.hitterBudgetPercent)) / 100 : 0;

  const getSummary = () => {
    if (!valueCalculationSettings) return null;
    const methodLabel = valueCalculationSettings.method === 'z-score' ? 'z-Score' :
      valueCalculationSettings.method === 'sgp' ? 'SGP' : 'PAR';
    return `${methodLabel}, ${valueCalculationSettings.hitterBudgetPercent}/${100 - valueCalculationSettings.hitterBudgetPercent} split`;
  };

  const handleSplitMethodChange = (method: string) => {
    if (method === 'calculated') {
      setSettings(prev => ({
        ...prev,
        hitterPitcherSplit: { method: 'calculated' },
        hitterBudgetPercent: recommendedSplit.hitterPercent,
      }));
    } else if (method === 'standard') {
      setSettings(prev => ({
        ...prev,
        hitterPitcherSplit: { method: 'standard', standardPreset: 'balanced' },
        hitterBudgetPercent: STANDARD_SPLITS.balanced.hitters,
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        hitterPitcherSplit: {
          method: 'manual',
          manualSplit: { hitters: prev.hitterBudgetPercent, pitchers: 100 - prev.hitterBudgetPercent }
        },
      }));
    }
  };

  const handlePresetChange = (preset: 'balanced' | 'hitter_heavy' | 'pitcher_heavy') => {
    setSettings(prev => ({
      ...prev,
      hitterPitcherSplit: { method: 'standard', standardPreset: preset },
      hitterBudgetPercent: STANDARD_SPLITS[preset].hitters,
    }));
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
                    VALUE CALCULATION
                  </CardTitle>
                  {isCollapsed && isComplete && (
                    <p className="text-baseball-cream/80 text-sm mt-1 font-mono">{getSummary()}</p>
                  )}
                  {!isCollapsed && (
                    <CardDescription className="text-baseball-cream/80 text-base mt-1">
                      Configure how auction values are calculated
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
          <CardContent className="pt-8 pb-8 space-y-8">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Calculation Method</Label>
              <RadioGroup
                value={settings.method}
                onValueChange={(value) => setSettings(prev => ({ ...prev, method: value as any }))}
              >
                <div className="flex items-center space-x-3 p-3 rounded-md border border-border hover-elevate">
                  <RadioGroupItem value="z-score" id="z-score" data-testid="radio-z-score" />
                  <Label htmlFor="z-score" className="flex-1 cursor-pointer">
                    <span className="font-medium">z-Score Based</span>
                    <p className="text-xs text-muted-foreground">Standard deviations from mean (works for all formats)</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-md border border-border hover-elevate">
                  <RadioGroupItem value="sgp" id="sgp" data-testid="radio-sgp" />
                  <Label htmlFor="sgp" className="flex-1 cursor-pointer">
                    <span className="font-medium">Standings Gain Points (SGP)</span>
                    <p className="text-xs text-muted-foreground">Recommended for rotisserie leagues</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-md border border-border hover-elevate">
                  <RadioGroupItem value="points-above-replacement" id="par" data-testid="radio-par" />
                  <Label htmlFor="par" className="flex-1 cursor-pointer">
                    <span className="font-medium">Points Above Replacement</span>
                    <p className="text-xs text-muted-foreground">Value relative to replacement level players</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Replacement Level</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Determines the baseline player for calculating value above replacement.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={settings.replacementLevelMethod}
                onValueChange={(value) => setSettings(prev => ({ ...prev, replacementLevelMethod: value as ReplacementLevelMethod }))}
              >
                <SelectTrigger className="w-full" data-testid="select-replacement-level">
                  <SelectValue placeholder="Select replacement level method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastDrafted">Last Drafted (most common)</SelectItem>
                  <SelectItem value="firstUndrafted">First Undrafted</SelectItem>
                  <SelectItem value="blended">Blended (average of boundary players)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.replacementLevelMethod === 'lastDrafted' && 'Uses the last player drafted at each position as the baseline.'}
                {settings.replacementLevelMethod === 'firstUndrafted' && 'Uses the best undrafted player at each position as the baseline.'}
                {settings.replacementLevelMethod === 'blended' && 'Averages the last few drafted and first few undrafted players.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="scarcity-toggle" className="text-base font-semibold">Position Scarcity Adjustments</Label>
                  <p className="text-xs text-muted-foreground mt-1">Apply value multipliers based on position depth drop-off</p>
                </div>
                <Switch
                  id="scarcity-toggle"
                  checked={settings.applyPositionScarcity}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, applyPositionScarcity: checked }))}
                  data-testid="switch-position-scarcity"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="tiers-toggle" className="text-base font-semibold">Show Value Tiers</Label>
                  <p className="text-xs text-muted-foreground mt-1">Display Elite, Star, Starter, Bench, Replacement tier labels</p>
                </div>
                <Switch
                  id="tiers-toggle"
                  checked={settings.showTiers}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showTiers: checked }))}
                  data-testid="switch-show-tiers"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Hitter/Pitcher Budget Split</Label>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={settings.hitterPitcherSplit?.method === 'calculated' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSplitMethodChange('calculated')}
                  className={settings.hitterPitcherSplit?.method === 'calculated' ? 'bg-baseball-navy' : 'hover-elevate'}
                  data-testid="button-split-calculated"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Calculated
                </Button>
                <Button
                  variant={settings.hitterPitcherSplit?.method === 'standard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSplitMethodChange('standard')}
                  className={settings.hitterPitcherSplit?.method === 'standard' ? 'bg-baseball-navy' : 'hover-elevate'}
                  data-testid="button-split-standard"
                >
                  Standard Presets
                </Button>
                <Button
                  variant={settings.hitterPitcherSplit?.method === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSplitMethodChange('manual')}
                  className={settings.hitterPitcherSplit?.method === 'manual' ? 'bg-baseball-navy' : 'hover-elevate'}
                  data-testid="button-split-manual"
                >
                  Manual
                </Button>
              </div>

              {settings.hitterPitcherSplit?.method === 'standard' && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={settings.hitterPitcherSplit.standardPreset === 'balanced' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetChange('balanced')}
                    className={settings.hitterPitcherSplit.standardPreset === 'balanced' ? 'bg-baseball-green' : 'hover-elevate'}
                    data-testid="button-preset-balanced"
                  >
                    Balanced (65/35)
                  </Button>
                  <Button
                    variant={settings.hitterPitcherSplit.standardPreset === 'hitter_heavy' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetChange('hitter_heavy')}
                    className={settings.hitterPitcherSplit.standardPreset === 'hitter_heavy' ? 'bg-baseball-green' : 'hover-elevate'}
                    data-testid="button-preset-hitter-heavy"
                  >
                    Hitter Heavy (70/30)
                  </Button>
                  <Button
                    variant={settings.hitterPitcherSplit.standardPreset === 'pitcher_heavy' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetChange('pitcher_heavy')}
                    className={settings.hitterPitcherSplit.standardPreset === 'pitcher_heavy' ? 'bg-baseball-green' : 'hover-elevate'}
                    data-testid="button-preset-pitcher-heavy"
                  >
                    Pitcher Heavy (60/40)
                  </Button>
                </div>
              )}

              {settings.hitterPitcherSplit?.method === 'manual' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Drag to adjust split</span>
                    <span className="text-sm font-mono font-semibold text-baseball-navy">
                      {settings.hitterBudgetPercent}% / {100 - settings.hitterBudgetPercent}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.hitterBudgetPercent]}
                    onValueChange={([value]) => setSettings(prev => ({
                      ...prev,
                      hitterBudgetPercent: value,
                      hitterPitcherSplit: { method: 'manual', manualSplit: { hitters: value, pitchers: 100 - value } }
                    }))}
                    min={40}
                    max={80}
                    step={1}
                    data-testid="slider-budget-split"
                  />
                </div>
              )}

              {settings.hitterPitcherSplit?.method === 'calculated' && playerProjections.length > 0 && (
                <p className="text-xs text-muted-foreground">{recommendedSplit.reason}</p>
              )}

              <div className="flex justify-between text-sm pt-2">
                <div className="bg-baseball-cream-dark px-4 py-2 rounded border border-card-border">
                  <p className="text-xs text-muted-foreground">Hitters ({settings.hitterBudgetPercent}%)</p>
                  <p className="font-mono font-bold text-baseball-navy">${hitterBudget.toLocaleString()}</p>
                </div>
                <div className="bg-baseball-cream-dark px-4 py-2 rounded border border-card-border">
                  <p className="text-xs text-muted-foreground">Pitchers ({100 - settings.hitterBudgetPercent}%)</p>
                  <p className="font-mono font-bold text-baseball-navy">${pitcherBudget.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 pt-4">
              {isCalculating && (
                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Processing {playerProjections.length.toLocaleString()} players...</span>
                    <span className="font-mono">{calculationProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-baseball-green h-full transition-all duration-150 ease-out"
                      style={{ width: `${calculationProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <Button
                onClick={handleCalculate}
                size="lg"
                disabled={isCalculating}
                className="bg-baseball-green hover-elevate active-elevate-2"
                data-testid="button-calculate-values"
              >
                <Calculator className="mr-2 h-5 w-5" />
                {isCalculating ? 'Calculating...' : isComplete ? 'Recalculate Values' : 'Generate Auction Values'}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
