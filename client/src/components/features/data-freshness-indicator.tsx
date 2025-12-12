/**
 * DataFreshnessIndicator - Shows when projection data was last updated
 *
 * Displays freshness information with staleness warnings:
 * - Fresh (<24h): Green styling
 * - Warning (24-48h): Amber/yellow styling with tooltip
 * - Error (>48h): Red styling with tooltip
 * - CSV source: Neutral "Using uploaded projections"
 *
 * @module client/src/components/features/data-freshness-indicator
 */

import { useAppContext } from '@/lib/app-context';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DataFreshnessIndicatorProps {
  className?: string;
}

type StalenessStatus = 'fresh' | 'warning' | 'error';

interface StalenessConfig {
  classes: string;
  tooltip: string | null;
}

/**
 * Format an ISO timestamp to human-readable format
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted string like "Dec 15, 2024 at 4:00 AM"
 */
function formatLastUpdated(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const dateStr = date.toLocaleDateString('en-US', dateOptions);
  const timeStr = date.toLocaleTimeString('en-US', timeOptions);

  return `Last updated: ${dateStr} at ${timeStr}`;
}

/**
 * Determine staleness status based on timestamp age
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns 'fresh' if <24h, 'warning' if 24-48h, 'error' if >48h
 */
function getStalenessStatus(isoTimestamp: string): StalenessStatus {
  const lastUpdated = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const hoursOld = (now - lastUpdated) / (1000 * 60 * 60);

  if (hoursOld >= 48) return 'error';
  if (hoursOld >= 24) return 'warning';
  return 'fresh';
}

/**
 * Get styling configuration for staleness status
 * Includes CSS classes and tooltip text
 */
function getStalenessConfig(status: StalenessStatus): StalenessConfig {
  switch (status) {
    case 'fresh':
      return {
        classes: 'text-green-700',
        tooltip: null,
      };
    case 'warning':
      return {
        classes: 'text-amber-600 cursor-help',
        tooltip: 'Projections may be outdated',
      };
    case 'error':
      return {
        classes: 'text-red-600 cursor-help',
        tooltip: 'Projections are likely outdated. Consider uploading fresh CSV.',
      };
  }
}

export function DataFreshnessIndicator({ className }: DataFreshnessIndicatorProps) {
  const {
    projectionsLoading,
    projectionsError,
    projectionsLastUpdated,
    projectionSource,
  } = useAppContext();

  // Loading state - show loading text
  if (projectionsLoading) {
    return <div className={className}>Loading projections...</div>;
  }

  // Error state - let error display handle it elsewhere
  if (projectionsError) {
    return null;
  }

  // No data state
  if (!projectionsLastUpdated && projectionSource !== 'csv') {
    return null;
  }

  // CSV source - show neutral indicator
  if (projectionSource === 'csv') {
    return (
      <div className={className}>
        Using uploaded projections
      </div>
    );
  }

  // API source - show formatted timestamp with staleness styling
  const formattedDate = formatLastUpdated(projectionsLastUpdated!);
  const staleness = getStalenessStatus(projectionsLastUpdated!);
  const config = getStalenessConfig(staleness);

  const indicator = (
    <span className={config.classes}>{formattedDate}</span>
  );

  // Wrap in tooltip if there's tooltip text (warning or error states)
  if (config.tooltip) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {indicator}
            </TooltipTrigger>
            <TooltipContent>
              <p>{config.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {indicator}
    </div>
  );
}
