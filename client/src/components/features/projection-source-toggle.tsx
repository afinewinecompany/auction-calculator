/**
 * ProjectionSourceToggle - Displays current projection source and allows switching
 *
 * Shows:
 * - Current source indicator ("API" or "CSV" or "None")
 * - Timestamp when source is API
 * - Button to switch between sources
 *
 * @module client/src/components/features/projection-source-toggle
 */

import { useAppContext } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import { Cloud, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectionSourceToggleProps {
  className?: string;
  onSwitchToCsv?: () => void;
}

/**
 * Format an ISO timestamp to human-readable date format
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted string like "Dec 15, 2024"
 */
function formatDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  return date.toLocaleDateString('en-US', dateOptions);
}

export function ProjectionSourceToggle({
  className,
  onSwitchToCsv,
}: ProjectionSourceToggleProps) {
  const {
    projectionSource,
    projectionsLastUpdated,
    projectionsLoading,
    refetchProjections,
  } = useAppContext();

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 bg-muted rounded-md',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {projectionSource === 'api' ? (
          <>
            <Cloud className="h-4 w-4 text-muted-foreground" data-testid="cloud-icon" />
            <span className="text-sm">Using API projections</span>
            {projectionsLastUpdated && (
              <span className="text-xs text-muted-foreground">
                ({formatDate(projectionsLastUpdated)})
              </span>
            )}
          </>
        ) : projectionSource === 'csv' ? (
          <>
            <FileText className="h-4 w-4 text-muted-foreground" data-testid="file-text-icon" />
            <span className="text-sm">Using uploaded projections</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">No projections loaded</span>
        )}
      </div>

      <div className="flex gap-2">
        {projectionSource === 'api' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSwitchToCsv}
            data-testid="button-switch-to-csv"
          >
            Upload Custom
          </Button>
        )}
        {projectionSource === 'csv' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refetchProjections}
            disabled={projectionsLoading}
            data-testid="button-switch-to-api"
          >
            {projectionsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" data-testid="loader-icon" />
            ) : (
              <Cloud className="h-4 w-4 mr-1" />
            )}
            Use API
          </Button>
        )}
      </div>
    </div>
  );
}
