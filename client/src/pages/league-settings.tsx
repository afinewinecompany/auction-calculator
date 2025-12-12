import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/lib/app-context';
import { LeagueConfigForm } from '@/components/league-config-form';
import { ScoringFormatSelector } from '@/components/scoring-format-selector';
import { ProjectionUploader } from '@/components/projection-uploader';
import { ValueCalculationPanel } from '@/components/value-calculation-panel';
import { PlayerValuesTable } from '@/components/player-values-table';
import { DataFreshnessIndicator } from '@/components/features/data-freshness-indicator';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertCircle, Upload } from 'lucide-react';

export default function LeagueSettingsPage() {
  const [, navigate] = useLocation();
  const {
    leagueSettings,
    scoringFormat,
    playerProjections,
    playerValues,
    projectionsError,
  } = useAppContext();

  const [showErrorUploader, setShowErrorUploader] = useState(false);

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
      <header className="glass-card border-b border-border/50 shadow-float">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="font-display text-6xl font-bold text-baseball-leather tracking-tighter" data-testid="text-page-title">
            FANTASY BASEBALL
            <span className="block text-4xl text-baseball-navy mt-2 font-semibold">Auction Value Calculator</span>
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

        {canProceedToUpload && projectionsError && !showErrorUploader && (
          <div
            data-testid="projections-error-section"
            className="rounded-lg border-2 border-red-300 bg-red-50 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">Unable to Load Projections</h3>
                <p className="text-sm text-red-600">{projectionsError}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowErrorUploader(true)}
              className="w-full bg-baseball-navy hover-elevate"
              data-testid="button-upload-csv-fallback"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV Projections
            </Button>
          </div>
        )}

        {canProceedToUpload && (showErrorUploader || !projectionsError) && (
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
              <div>
                <h2 className="font-display text-3xl font-bold text-baseball-leather tracking-tight">
                  AUCTION VALUES
                </h2>
                <DataFreshnessIndicator className="mt-1" />
              </div>
              <Button
                onClick={handleGoToDraft}
                size="lg"
                className="bg-baseball-navy button-modern shadow-float focus-glow"
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
