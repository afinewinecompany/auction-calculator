# Story 4.2: Data Freshness Display

Status: Done

## Story

As a user,
I want to see when projection data was last updated,
So that I know how current my auction values are.

## Acceptance Criteria

1. **AC1: Freshness Indicator Displayed**
   - "Last updated: [date/time]" text is visible when projections are loaded from API
   - Format: "Last updated: Dec 15, 2024 at 4:00 AM"
   - Freshness indicator appears near the projection data/player table area

2. **AC2: Warning Styling for Stale Data**
   - If data is older than 24 hours, show warning style (yellow/amber)
   - Visual indicator clearly communicates data may be outdated
   - Tooltip or text explains the warning: "Projections may be outdated"

3. **AC3: Error Styling for Very Stale Data**
   - If data is older than 48 hours, show error style (red)
   - Visual indicator clearly communicates data is likely outdated
   - Tooltip or text explains: "Projections are likely outdated. Consider uploading fresh CSV."

4. **AC4: Dynamic Updates**
   - Freshness indicator updates when new data is loaded
   - Indicator clears/hides when projections are cleared
   - Styling updates dynamically as time passes (if user stays on page for extended period)

5. **AC5: CSV Source Handling**
   - When projections are from CSV upload, show "Using uploaded projections"
   - Do not show timestamp for CSV-uploaded projections (no lastUpdated available)
   - Use neutral styling for CSV source (no warning/error)

6. **AC6: Loading and Error States**
   - During loading, show appropriate loading indicator (not stale warning)
   - If API error occurred, show error message (from Story 4.1) not freshness indicator
   - Component handles all states: loading, error, api-loaded, csv-loaded, no-data

7. **AC7: Unit Tests Pass**
   - Tests verify correct date formatting
   - Tests verify warning threshold (24 hours)
   - Tests verify error threshold (48 hours)
   - Tests verify CSV source display
   - Tests verify loading/error state handling
   - All existing tests continue to pass (no regressions)

## Tasks / Subtasks

- [x] Task 1: Create DataFreshnessIndicator component (AC: 1, 5, 6)
  - [x] 1.1 Write failing test for component existence and basic render
  - [x] 1.2 Create `client/src/components/features/data-freshness-indicator.tsx`
  - [x] 1.3 Write failing test for date formatting output
  - [x] 1.4 Implement date formatting: "Dec 15, 2024 at 4:00 AM"
  - [x] 1.5 Write failing test for CSV source display
  - [x] 1.6 Implement CSV source display: "Using uploaded projections"
  - [x] 1.7 Write failing test for loading state
  - [x] 1.8 Implement loading state display
  - [x] 1.9 Write failing test for error state
  - [x] 1.10 Implement error state display (defer to error message, hide freshness)

- [x] Task 2: Implement staleness detection and styling (AC: 2, 3)
  - [x] 2.1 Write failing test for 24-hour warning threshold
  - [x] 2.2 Implement warning styling (yellow/amber) for >24 hours
  - [x] 2.3 Write failing test for 48-hour error threshold
  - [x] 2.4 Implement error styling (red) for >48 hours
  - [x] 2.5 Write failing test for fresh data styling (normal/green)
  - [x] 2.6 Implement fresh data styling for <24 hours

- [x] Task 3: Add tooltip/explanation text (AC: 2, 3)
  - [x] 3.1 Write failing test for warning tooltip text
  - [x] 3.2 Implement warning tooltip: "Projections may be outdated"
  - [x] 3.3 Write failing test for error tooltip text
  - [x] 3.4 Implement error tooltip: "Projections are likely outdated. Consider uploading fresh CSV."

- [x] Task 4: Integrate component into UI (AC: 1, 4)
  - [x] 4.1 Identify appropriate location in UI (near projection data)
  - [x] 4.2 Import and render DataFreshnessIndicator in parent component
  - [x] 4.3 Connect to AppContext for projection state access
  - [x] 4.4 Verify dynamic updates when state changes

- [x] Task 5: Full validation (AC: 7)
  - [x] 5.1 Run full test suite to verify no regressions
  - [x] 5.2 Verify TypeScript compilation passes
  - [x] 5.3 Manual verification: freshness indicator works with API and CSV sources

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow patterns from [Source: docs/architecture.md#Frontend-Integration]**

- Use `projectionsLastUpdated` from AppContext (already implemented in Story 4.1)
- Use `projectionSource` from AppContext ('api' | 'csv' | null)
- Use `projectionsLoading` and `projectionsError` from AppContext for state handling
- Feature components in `client/src/components/features/`

**From [Source: project-context.md#Frontend-Structure]:**
- Feature components in `client/src/components/features/`
- UI primitives in `client/src/components/ui/` (Shadcn)
- State lives in `AppContext` (`client/src/lib/app-context.tsx`)

### AppContext State Available (from Story 4.1)

The following state is already available in AppContext:

```typescript
// API projection state (from Story 4.1)
projectionsLoading: boolean;      // true during API fetch
projectionsError: string | null;  // "Unable to load latest projections" on error
projectionsLastUpdated: string | null;  // ISO timestamp from API meta
projectionSource: 'api' | 'csv' | null; // Source of current projections
```

Access these via `useAppContext()`:

```typescript
const {
  projectionsLoading,
  projectionsError,
  projectionsLastUpdated,
  projectionSource,
} = useAppContext();
```

### Date Formatting

**Required format:** "Dec 15, 2024 at 4:00 AM"

```typescript
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

// Example: "Last updated: Dec 15, 2024 at 4:00 AM"
```

### Staleness Calculation

```typescript
function getStalenessStatus(isoTimestamp: string): 'fresh' | 'warning' | 'error' {
  const lastUpdated = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const hoursOld = (now - lastUpdated) / (1000 * 60 * 60);

  if (hoursOld >= 48) return 'error';
  if (hoursOld >= 24) return 'warning';
  return 'fresh';
}
```

### Component Implementation Pattern

```typescript
// client/src/components/features/data-freshness-indicator.tsx
import { useAppContext } from '@/lib/app-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataFreshnessIndicatorProps {
  className?: string;
}

export function DataFreshnessIndicator({ className }: DataFreshnessIndicatorProps) {
  const {
    projectionsLoading,
    projectionsError,
    projectionsLastUpdated,
    projectionSource,
  } = useAppContext();

  // Loading state - show nothing or loading indicator
  if (projectionsLoading) {
    return <div className={cn("text-sm text-muted-foreground", className)}>Loading projections...</div>;
  }

  // Error state - let error display handle it, hide freshness
  if (projectionsError) {
    return null; // Error message handled elsewhere
  }

  // CSV source - show neutral indicator
  if (projectionSource === 'csv') {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Using uploaded projections</span>
      </div>
    );
  }

  // No data state
  if (!projectionsLastUpdated || projectionSource !== 'api') {
    return null;
  }

  // API source - show freshness with staleness styling
  const staleness = getStalenessStatus(projectionsLastUpdated);
  const formattedDate = formatLastUpdated(projectionsLastUpdated);

  const statusConfig = {
    fresh: {
      icon: CheckCircle,
      iconClass: 'text-green-600',
      textClass: 'text-green-700',
      tooltip: null,
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-amber-500',
      textClass: 'text-amber-600',
      tooltip: 'Projections may be outdated',
    },
    error: {
      icon: AlertCircle,
      iconClass: 'text-red-500',
      textClass: 'text-red-600',
      tooltip: 'Projections are likely outdated. Consider uploading fresh CSV.',
    },
  };

  const config = statusConfig[staleness];
  const Icon = config.icon;

  const indicator = (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Icon className={cn("h-4 w-4", config.iconClass)} />
      <span className={config.textClass}>{formattedDate}</span>
    </div>
  );

  if (config.tooltip) {
    return (
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
    );
  }

  return indicator;
}
```

### Test Strategy

**Test file: `client/src/components/features/data-freshness-indicator.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataFreshnessIndicator } from './data-freshness-indicator';
import * as appContext from '@/lib/app-context';

// Mock the useAppContext hook
vi.mock('@/lib/app-context', () => ({
  useAppContext: vi.fn(),
}));

describe('DataFreshnessIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading text during loading', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: true,
        projectionsError: null,
        projectionsLastUpdated: null,
        projectionSource: null,
        // ... other required context values
      } as any);

      render(<DataFreshnessIndicator />);
      expect(screen.getByText('Loading projections...')).toBeInTheDocument();
    });
  });

  describe('Date formatting', () => {
    it('should format date as "Dec 15, 2024 at 4:00 AM"', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
        projectionSource: 'api',
      } as any);

      render(<DataFreshnessIndicator />);
      expect(screen.getByText(/Last updated: Dec 15, 2024 at 4:00 AM/i)).toBeInTheDocument();
    });
  });

  describe('Staleness thresholds', () => {
    it('should show warning styling for data older than 24 hours', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: twentyFiveHoursAgo,
        projectionSource: 'api',
      } as any);

      render(<DataFreshnessIndicator />);
      // Verify amber/warning styling is present
      const indicator = screen.getByText(/Last updated:/);
      expect(indicator.className).toContain('amber');
    });

    it('should show error styling for data older than 48 hours', () => {
      const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: fiftyHoursAgo,
        projectionSource: 'api',
      } as any);

      render(<DataFreshnessIndicator />);
      // Verify red/error styling is present
      const indicator = screen.getByText(/Last updated:/);
      expect(indicator.className).toContain('red');
    });
  });

  describe('CSV source', () => {
    it('should show "Using uploaded projections" for CSV source', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: null,
        projectionSource: 'csv',
      } as any);

      render(<DataFreshnessIndicator />);
      expect(screen.getByText('Using uploaded projections')).toBeInTheDocument();
    });
  });
});
```

### UI Integration Location

**Recommended placement:** In the projection section header or above the player table

From existing code structure, likely locations:
1. `client/src/pages/LeagueSettingsPage.tsx` - Near projection upload section
2. `client/src/pages/DraftRoom.tsx` - Above the player table
3. `client/src/components/features/projection-uploader.tsx` - Near file status

The component should be placed where users naturally look for projection status info.

### Shadcn/ui Components to Use

**Already available in `client/src/components/ui/`:**
- `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` - For staleness explanation
- Standard text styling via Tailwind classes

**Icons (lucide-react - already a dependency):**
- `CheckCircle` - Fresh data
- `AlertTriangle` - Warning (24+ hours)
- `AlertCircle` - Error (48+ hours)
- `Upload` - CSV source indicator

### Styling Classes

**Color scheme following project design system:**
- Fresh (green): `text-green-600`, `text-green-700`
- Warning (amber): `text-amber-500`, `text-amber-600`
- Error (red): `text-red-500`, `text-red-600`
- Neutral (muted): `text-muted-foreground`

### Edge Cases to Handle

1. **projectionsLastUpdated is null** - Don't render anything (no API data)
2. **projectionSource is null** - Don't render anything (no data loaded yet)
3. **Invalid timestamp** - Handle gracefully, show fallback text
4. **Timezone handling** - Use user's local timezone for display
5. **Very old data** - Cap at "error" state, don't show increasingly dire warnings

### Learnings from Previous Stories

From Story 4.1 implementation:
1. **Context state already exists** - Use existing `projectionsLastUpdated`, `projectionSource`, etc.
2. **Test mocking pattern** - Mock `useAppContext` to control state in tests
3. **Path aliases** - Use `@/lib/...` and `@/components/...` imports
4. **Component naming** - Use kebab-case for file names, PascalCase for component names

### Dependencies

**Existing (no new deps needed):**
- React hooks (useAppContext from app-context)
- Shadcn/ui components (Tooltip)
- lucide-react icons
- Tailwind CSS for styling
- vitest + @testing-library/react for testing

### File Structure After This Story

```
client/src/components/features/
├── data-freshness-indicator.tsx       # NEW - Freshness display component
├── data-freshness-indicator.test.tsx  # NEW - Component tests
├── projection-uploader.tsx            # Existing
└── ...
```

### FRs Covered by This Story

| FR | Description | How Covered |
|----|-------------|-------------|
| FR14 | Users can see when projection data was last updated | Freshness indicator with formatted date |

### References

- [Source: docs/architecture.md#Frontend-Integration]
- [Source: docs/epics.md#Story-4.2-Data-Freshness-Display]
- [Source: docs/prd.md#Frontend-Integration-Requirements]
- [Source: project-context.md#Frontend-Structure]
- [Source: client/src/lib/app-context.tsx] - Context with projection state
- [Source: docs/sprint-artifacts/4-1-api-client-and-auto-load-projections.md] - Previous story implementation

## Dev Agent Record

### Context Reference

Story created by Create-Story workflow with comprehensive context from:
- docs/epics.md (Story 4.2 requirements, AC, technical notes)
- docs/architecture.md (Frontend integration patterns)
- docs/prd.md (Frontend integration requirements)
- project-context.md (coding standards, frontend structure)
- client/src/lib/app-context.tsx (existing context with projection state from Story 4.1)
- docs/sprint-artifacts/4-1-api-client-and-auto-load-projections.md (previous story learnings)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Added `@vitest-environment jsdom` comment to test file for React testing
- Used `cleanup()` in afterEach to prevent DOM leakage between tests
- Avoided `toBeInTheDocument()` matcher (jest-dom not installed) - used `toBeTruthy()` instead

### Completion Notes List

- **Task 1**: Created `DataFreshnessIndicator` component with date formatting, CSV source display, loading state, and error state handling. 7 tests cover basic functionality.
- **Task 2**: Implemented staleness detection with `getStalenessStatus()` and `getStalenessConfig()` functions. Fresh (<24h) shows green, warning (24-48h) shows amber, error (>48h) shows red. 3 tests cover thresholds.
- **Task 3**: Added Radix UI Tooltip with `cursor-help` class for warning/error states. Warning shows "Projections may be outdated", error shows "Projections are likely outdated. Consider uploading fresh CSV." 3 tests verify tooltip presence via cursor-help class.
- **Task 4**: Integrated component into League Settings page (below AUCTION VALUES header) and Draft Room page (below DRAFT ROOM title). Component reads state from AppContext.
- **Task 5**: Full test suite passes (206 tests), TypeScript compilation passes with no errors.

### File List

- `client/src/components/features/data-freshness-indicator.tsx` - NEW - Freshness indicator component with staleness styling and tooltips
- `client/src/components/features/data-freshness-indicator.test.tsx` - NEW - 13 tests for the component
- `client/src/pages/league-settings.tsx` - MODIFIED - Added DataFreshnessIndicator import and render
- `client/src/pages/draft-room.tsx` - MODIFIED - Added DataFreshnessIndicator import and render

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-11 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-11 | Implemented DataFreshnessIndicator with staleness detection, tooltips, all tests pass (206 total) | Amelia (Dev Agent) |
