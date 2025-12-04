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

export default function LeagueSettingsPage() {
  const [, navigate] = useLocation();
  const { 
    leagueSettings, 
    scoringFormat, 
    playerProjections,
    playerValues,
  } = useAppContext();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    config: !!leagueSettings,
    scoring: !!scoringFormat,
    upload: playerProjections.length > 0,
    calculate: playerValues.length > 0,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleLeagueConfigComplete = () => {
    setCollapsedSections(prev => ({ ...prev, config: true }));
  };

  const handleScoringComplete = () => {
    setCollapsedSections(prev => ({ ...prev, scoring: true }));
  };

  const handleUploadComplete = () => {
    setCollapsedSections(prev => ({ ...prev, upload: true }));
  };

  const handleCalculationComplete = () => {
    setCollapsedSections(prev => ({ ...prev, calculate: true }));
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

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-6">
        <LeagueConfigForm 
          onComplete={handleLeagueConfigComplete}
          isComplete={canProceedToScoring}
          isCollapsed={collapsedSections.config}
          onToggle={() => toggleSection('config')}
        />

        {canProceedToScoring && (
          <ScoringFormatSelector 
            onComplete={handleScoringComplete}
            isComplete={canProceedToUpload}
            isCollapsed={collapsedSections.scoring}
            onToggle={() => toggleSection('scoring')}
          />
        )}

        {canProceedToUpload && (
          <ProjectionUploader 
            onComplete={handleUploadComplete}
            isComplete={canProceedToCalculate}
            isCollapsed={collapsedSections.upload}
            onToggle={() => toggleSection('upload')}
          />
        )}

        {canProceedToCalculate && (
          <ValueCalculationPanel 
            onComplete={handleCalculationComplete}
            isComplete={canProceedToResults}
            isCollapsed={collapsedSections.calculate}
            onToggle={() => toggleSection('calculate')}
          />
        )}

        {canProceedToResults && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
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
