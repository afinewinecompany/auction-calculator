import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/lib/app-context';
import { calculatePlayerValues, calculateRecommendedBudgetSplit } from '@/lib/calculations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calculator, Check, ChevronDown, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';
import type { ValueCalculationSettings } from '@shared/schema';

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
      autoReplacement: true,
      applyPositionScarcity: false,
      hitterBudgetPercent: 65,
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
  
  const isUsingRecommended = settings.hitterBudgetPercent === recommendedSplit.hitterPercent;

  const handleCalculate = () => {
    if (!leagueSettings || !scoringFormat) return;

    setIsCalculating(true);
    setValueCalculationSettings(settings);

    requestAnimationFrame(() => {
      const values = calculatePlayerValues(
        playerProjections,
        leagueSettings,
        scoringFormat,
        settings
      );
      
      setPlayerValues(values);
      
      requestAnimationFrame(() => {
        setIsCalculating(false);
        onComplete();
      });
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
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="scarcity-toggle" className="text-base font-semibold">Position Scarcity Adjustments</Label>
                  <p className="text-xs text-muted-foreground mt-1">Apply value multipliers based on position availability</p>
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
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <Label className="text-base font-semibold">Hitter/Pitcher Budget Split</Label>
                  <div className="flex items-center gap-3">
                    {playerProjections.length > 0 && (
                      <Button
                        variant={isUsingRecommended ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, hitterBudgetPercent: recommendedSplit.hitterPercent }))}
                        className={isUsingRecommended ? "bg-baseball-green" : "hover-elevate"}
                        data-testid="button-use-recommended-split"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {isUsingRecommended ? 'Using Recommended' : `Use Recommended (${recommendedSplit.hitterPercent}%)`}
                      </Button>
                    )}
                    <span className="text-sm font-mono font-semibold text-baseball-navy">
                      {settings.hitterBudgetPercent}% / {100 - settings.hitterBudgetPercent}%
                    </span>
                  </div>
                </div>
                {playerProjections.length > 0 && recommendedSplit.reason !== 'Default split' && (
                  <p className="text-xs text-muted-foreground mb-3">{recommendedSplit.reason}</p>
                )}
                <Slider
                  value={[settings.hitterBudgetPercent]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, hitterBudgetPercent: value }))}
                  min={40}
                  max={80}
                  step={5}
                  className="mb-3"
                  data-testid="slider-budget-split"
                />
                <div className="flex justify-between text-sm">
                  <div className="bg-baseball-cream-dark px-4 py-2 rounded border border-card-border">
                    <p className="text-xs text-muted-foreground">Hitters</p>
                    <p className="font-mono font-bold text-baseball-navy">${hitterBudget.toLocaleString()}</p>
                  </div>
                  <div className="bg-baseball-cream-dark px-4 py-2 rounded border border-card-border">
                    <p className="text-xs text-muted-foreground">Pitchers</p>
                    <p className="font-mono font-bold text-baseball-navy">${pitcherBudget.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
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
