import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/lib/app-context';
import { SAMPLE_PROJECTIONS, SAMPLE_LEAGUE_SETTINGS, SAMPLE_SCORING_FORMAT, SAMPLE_VALUE_SETTINGS } from '@/lib/sample-data';
import { calculatePlayerValues } from '@/lib/calculations';
import { Settings, Upload, Calculator, Gavel, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'fantasy-baseball-onboarding-completed';

export function WelcomeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'welcome' | 'features'>('welcome');
  
  const { 
    setLeagueSettings, 
    setScoringFormat, 
    setValueCalculationSettings,
    setPlayerProjections, 
    setPlayerValues,
    setDraftState,
    setTargetedPlayerIds,
    playerValues 
  } = useAppContext();

  useEffect(() => {
    const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY);
    const hasData = playerValues.length > 0;
    
    if (!onboardingCompleted && !hasData) {
      setIsOpen(true);
    }
  }, [playerValues]);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
  };

  const handleLoadSampleData = () => {
    setLeagueSettings(SAMPLE_LEAGUE_SETTINGS);
    setScoringFormat(SAMPLE_SCORING_FORMAT);
    setValueCalculationSettings(SAMPLE_VALUE_SETTINGS);
    setPlayerProjections(SAMPLE_PROJECTIONS);
    
    const calculatedValues = calculatePlayerValues(
      SAMPLE_PROJECTIONS,
      SAMPLE_LEAGUE_SETTINGS,
      SAMPLE_SCORING_FORMAT,
      SAMPLE_VALUE_SETTINGS
    );
    setPlayerValues(calculatedValues);
    
    setDraftState({
      picks: [],
      currentInflationRate: 0,
      totalBudgetSpent: 0,
      totalPlayersAvailable: calculatedValues.length,
      totalPlayersDrafted: 0,
    });
    
    setTargetedPlayerIds([]);
    
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
  };

  const features = [
    {
      icon: Settings,
      title: 'League Configuration',
      description: 'Set up team count, budget, roster requirements, and position slots',
    },
    {
      icon: Upload,
      title: 'CSV Projection Upload',
      description: 'Import player projections from any source with smart column mapping',
    },
    {
      icon: Calculator,
      title: 'Auction Values',
      description: 'Calculate dollar values using SGP or Z-Score methods with positional scarcity',
    },
    {
      icon: Gavel,
      title: 'Live Draft Room',
      description: 'Track picks in real-time with automatic inflation adjustments',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        {step === 'welcome' ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-baseball-gold" />
                Welcome to Auction Values
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Your complete fantasy baseball auction calculator for draft day success
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Calculate accurate auction values based on your league's specific settings,
                track live draft inflation, and export printable cheat sheets.
              </p>
              
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('features')}
                  className="text-sm"
                  data-testid="button-learn-more"
                >
                  Learn about features
                </Button>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleDismiss} data-testid="button-skip-onboarding">
                Skip, I know what I'm doing
              </Button>
              <Button onClick={handleLoadSampleData} data-testid="button-load-sample">
                Load Sample Data
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl tracking-tight">
                Key Features
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <Card key={idx} className="border-card-border hover-elevate">
                    <CardContent className="p-4">
                      <Icon className="h-5 w-5 text-baseball-navy mb-2" />
                      <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep('welcome')} data-testid="button-back">
                Back
              </Button>
              <Button onClick={handleLoadSampleData} data-testid="button-try-sample">
                Try with Sample Data
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
