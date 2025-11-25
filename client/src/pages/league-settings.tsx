import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/lib/app-context';
import { LeagueConfigForm } from '@/components/league-config-form';
import { ScoringFormatSelector } from '@/components/scoring-format-selector';
import { ProjectionUploader } from '@/components/projection-uploader';
import { ValueCalculationPanel } from '@/components/value-calculation-panel';
import { PlayerValuesTable } from '@/components/player-values-table';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { LeagueSettings, ScoringFormat, ValueCalculationSettings } from '@shared/schema';

export default function LeagueSettingsPage() {
  const [, navigate] = useLocation();
  const { 
    leagueSettings, 
    scoringFormat, 
    valueCalculationSettings,
    playerProjections,
    playerValues,
  } = useAppContext();

  const [currentStep, setCurrentStep] = useState<'config' | 'scoring' | 'upload' | 'calculate' | 'results'>('config');

  const handleLeagueConfigComplete = () => {
    setCurrentStep('scoring');
  };

  const handleScoringComplete = () => {
    setCurrentStep('upload');
  };

  const handleUploadComplete = () => {
    setCurrentStep('calculate');
  };

  const handleCalculationComplete = () => {
    setCurrentStep('results');
  };

  const handleGoToDraft = () => {
    navigate('/draft');
  };

  const canProceedToScoring = leagueSettings !== null;
  const canProceedToUpload = scoringFormat !== null;
  const canProceedToCalculate = playerProjections.length > 0;
  const canProceedToResults = playerValues.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="font-display text-5xl font-bold text-baseball-leather tracking-tighter" data-testid="text-page-title">
            FANTASY BASEBALL
            <span className="block text-3xl text-baseball-navy mt-1">Auction Value Calculator</span>
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <LeagueConfigForm 
          onComplete={handleLeagueConfigComplete}
          isComplete={canProceedToScoring}
        />

        {canProceedToScoring && (
          <ScoringFormatSelector 
            onComplete={handleScoringComplete}
            isComplete={canProceedToUpload}
          />
        )}

        {canProceedToUpload && (
          <ProjectionUploader 
            onComplete={handleUploadComplete}
            isComplete={canProceedToCalculate}
          />
        )}

        {canProceedToCalculate && (
          <ValueCalculationPanel 
            onComplete={handleCalculationComplete}
            isComplete={canProceedToResults}
          />
        )}

        {canProceedToResults && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl font-bold text-baseball-leather tracking-tight">
                AUCTION VALUES
              </h2>
              <Button 
                onClick={handleGoToDraft}
                size="lg"
                className="bg-baseball-navy hover-elevate active-elevate-2"
                data-testid="button-go-to-draft"
              >
                Go to Draft Room <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <PlayerValuesTable />
          </div>
        )}
      </main>
    </div>
  );
}
