# Story 4.1: API Client and Auto-Load Projections

Status: Done

## Story

As a user,
I want projections to load automatically when I open the app,
So that I can start calculating auction values immediately without uploading files.

## Acceptance Criteria

1. **AC1: API Client Module Created**
   - `client/src/lib/api-client.ts` exists with exported functions
   - `fetchBatterProjections()` calls `GET /api/v1/projections/batters`
   - `fetchPitcherProjections()` calls `GET /api/v1/projections/pitchers`
   - Both functions return typed projection data matching `PlayerProjection[]`
   - Both functions throw on network or API errors with descriptive messages

2. **AC2: Auto-Load on App Startup**
   - `AppContext` calls both fetch functions on initial load via `useEffect`
   - Projections populate `playerProjections` state automatically
   - `lastUpdated` timestamp from API response is stored in context
   - Loading state is set during fetch (for UI feedback)
   - Error state is set if fetch fails

3. **AC3: Loading Indicator**
   - Loading indicator shows while fetching API projections
   - Loading state clears when data loads successfully
   - Loading state clears when error occurs

4. **AC4: Error Handling (FR16)**
   - Error message displays if API fails: "Unable to load latest projections"
   - Error state is accessible from AppContext
   - Error does not crash the application
   - User can still use CSV upload as fallback after error

5. **AC5: Performance**
   - Users see projections within 2 seconds on app startup (NFR)
   - API calls complete within 500ms (relies on backend performance)

6. **AC6: Data Transformation**
   - API batter projections are transformed to `PlayerProjection` format
   - API pitcher projections are transformed to `PlayerProjection` format
   - Positions are correctly parsed into string arrays
   - Stats are correctly mapped to the stats object

7. **AC7: Unit Tests Pass**
   - Tests verify api-client functions make correct API calls
   - Tests verify AppContext auto-loads projections on mount
   - Tests verify loading state transitions
   - Tests verify error state on API failure
   - Tests verify data transformation is correct
   - All existing tests continue to pass (no regressions)

## Tasks / Subtasks

- [x] Task 1: Create API client module (AC: 1, 6)
  - [x] 1.1 Write failing test for api-client module existence
  - [x] 1.2 Create `client/src/lib/api-client.ts` with type definitions
  - [x] 1.3 Write failing test for fetchBatterProjections function
  - [x] 1.4 Implement fetchBatterProjections with data transformation
  - [x] 1.5 Write failing test for fetchPitcherProjections function
  - [x] 1.6 Implement fetchPitcherProjections with data transformation
  - [x] 1.7 Write failing test for error handling in both functions
  - [x] 1.8 Implement error handling with descriptive error messages

- [x] Task 2: Add projection state to AppContext (AC: 2, 3, 4)
  - [x] 2.1 Add new state fields: `projectionsLoading`, `projectionsError`, `projectionsLastUpdated`
  - [x] 2.2 Write failing test for auto-load behavior on mount
  - [x] 2.3 Implement useEffect that calls API on initial load
  - [x] 2.4 Implement state updates for loading, success, and error cases
  - [x] 2.5 Write failing test for loading state transitions
  - [x] 2.6 Verify loading indicator integration works

- [x] Task 3: Data transformation (AC: 6)
  - [x] 3.1 Write failing test for batter projection transformation
  - [x] 3.2 Implement transformation from ApiBatterProjection to PlayerProjection
  - [x] 3.3 Write failing test for pitcher projection transformation
  - [x] 3.4 Implement transformation from ApiPitcherProjection to PlayerProjection

- [x] Task 4: Error state handling (AC: 4)
  - [x] 4.1 Write failing test for error state accessibility
  - [x] 4.2 Expose error state in AppContext value
  - [x] 4.3 Verify CSV fallback still works after API error

- [x] Task 5: Full validation (AC: 5, 7)
  - [x] 5.1 Run full test suite to verify no regressions
  - [x] 5.2 Verify TypeScript compilation passes
  - [x] 5.3 Manual verification: app loads projections on startup

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow patterns from [Source: docs/architecture.md#Frontend-Integration]**

- API data flows into existing `playerProjections` in AppContext
- Maintain backward compatibility with existing state structure
- State lives in `AppContext` (`client/src/lib/app-context.tsx`)
- API calls go through `client/src/lib/api-client.ts`

**From [Source: project-context.md#Frontend-Structure]:**
- State lives in `AppContext` (`client/src/lib/app-context.tsx`)
- API calls go through `client/src/lib/api-client.ts`
- Feature components in `client/src/components/features/`

### API Response Format

**From Story 3.1 implementation:**

```typescript
// Success response from /api/v1/projections/batters
{
  "data": [
    {
      "id": 1,
      "name": "Aaron Judge",
      "team": "NYY",
      "positions": "OF",
      "pa": 600,
      "ab": 520,
      "h": 150,
      "hr": 45,
      "r": 100,
      "rbi": 110,
      "sb": 5,
      "bb": 75,
      "so": 150,
      "avg": "0.288",
      "obp": "0.380",
      "slg": "0.580",
      "woba": "0.410",
      "wrcPlus": 165,
      "scrapeId": 1,
      "createdAt": "2024-01-15T04:00:00.000Z"
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-15T04:00:00.000Z",
    "count": 523
  }
}

// Error response (503)
{
  "error": {
    "code": "NO_PROJECTION_DATA",
    "message": "No batter projection data available"
  }
}
```

### Data Transformation Pattern

**Transform API projections to PlayerProjection format:**

```typescript
// API batter → PlayerProjection
function transformBatterToProjection(batter: ApiBatterProjection): PlayerProjection {
  return {
    name: batter.name,
    team: batter.team || undefined,
    positions: batter.positions.split(/[,/]/).map(p => p.trim().toUpperCase()).filter(Boolean),
    stats: {
      PA: batter.pa,
      AB: batter.ab,
      H: batter.h,
      HR: batter.hr,
      R: batter.r,
      RBI: batter.rbi,
      SB: batter.sb,
      BB: batter.bb,
      SO: batter.so,
      AVG: parseFloat(batter.avg),
      OBP: parseFloat(batter.obp),
      SLG: parseFloat(batter.slg),
      wOBA: parseFloat(batter.woba),
      'wRC+': batter.wrcPlus,
    },
  };
}

// API pitcher → PlayerProjection
function transformPitcherToProjection(pitcher: ApiPitcherProjection): PlayerProjection {
  return {
    name: pitcher.name,
    team: pitcher.team || undefined,
    positions: ['P'], // All pitchers get 'P' position
    stats: {
      IP: parseFloat(pitcher.ip),
      W: pitcher.w,
      L: pitcher.l,
      SV: pitcher.sv,
      K: pitcher.k,
      BB: pitcher.bb,
      HR: pitcher.hr,
      ERA: parseFloat(pitcher.era),
      WHIP: parseFloat(pitcher.whip),
      FIP: parseFloat(pitcher.fip),
    },
  };
}
```

### AppContext Modifications

**New state fields to add:**

```typescript
interface AppContextType {
  // ... existing fields ...

  // NEW: API projection state
  projectionsLoading: boolean;
  projectionsError: string | null;
  projectionsLastUpdated: string | null;
  projectionSource: 'api' | 'csv' | null;
}
```

**Auto-load implementation pattern:**

```typescript
// In AppProvider component
useEffect(() => {
  // Only auto-load if no projections exist yet
  if (playerProjections.length > 0) return;

  const loadProjections = async () => {
    setProjectionsLoading(true);
    setProjectionsError(null);

    try {
      const [batters, pitchers] = await Promise.all([
        fetchBatterProjections(),
        fetchPitcherProjections(),
      ]);

      // Merge and set projections
      const allProjections = [...batters, ...pitchers];
      setPlayerProjections(allProjections);
      setProjectionsLastUpdated(/* from API meta */);
      setProjectionSource('api');
    } catch (error) {
      setProjectionsError('Unable to load latest projections');
      // Don't crash - user can still upload CSV
    } finally {
      setProjectionsLoading(false);
    }
  };

  loadProjections();
}, []); // Only run once on mount
```

### API Client Implementation

**File: `client/src/lib/api-client.ts`**

```typescript
/**
 * API Client for projection data.
 *
 * Fetches projection data from the backend API and transforms it
 * to the PlayerProjection format used by the application.
 *
 * @module client/src/lib/api-client
 */

import type { PlayerProjection } from '@shared/schema';
import type { ApiBatterProjection, ApiPitcherProjection, ProjectionMeta } from '@shared/types/projections';

interface ProjectionResponse<T> {
  data: T[];
  meta: ProjectionMeta;
}

interface ProjectionResult {
  projections: PlayerProjection[];
  lastUpdated: string;
  count: number;
}

/**
 * Fetch batter projections from API and transform to PlayerProjection format.
 * @throws Error with descriptive message on network or API failure
 */
export async function fetchBatterProjections(): Promise<ProjectionResult> {
  const response = await fetch('/api/v1/projections/batters');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Failed to fetch batter projections (${response.status})`;
    throw new Error(message);
  }

  const data: ProjectionResponse<ApiBatterProjection> = await response.json();

  return {
    projections: data.data.map(transformBatterToProjection),
    lastUpdated: data.meta.lastUpdated,
    count: data.meta.count,
  };
}

/**
 * Fetch pitcher projections from API and transform to PlayerProjection format.
 * @throws Error with descriptive message on network or API failure
 */
export async function fetchPitcherProjections(): Promise<ProjectionResult> {
  const response = await fetch('/api/v1/projections/pitchers');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Failed to fetch pitcher projections (${response.status})`;
    throw new Error(message);
  }

  const data: ProjectionResponse<ApiPitcherProjection> = await response.json();

  return {
    projections: data.data.map(transformPitcherToProjection),
    lastUpdated: data.meta.lastUpdated,
    count: data.meta.count,
  };
}
```

### Test Strategy

**Test file: `client/src/lib/api-client.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBatterProjections, fetchPitcherProjections } from './api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api-client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('fetchBatterProjections', () => {
    it('should fetch and transform batter projections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{ name: 'Test Player', team: 'NYY', positions: 'OF', ... }],
          meta: { lastUpdated: '2024-01-15T04:00:00Z', count: 1 }
        }),
      });

      const result = await fetchBatterProjections();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/projections/batters');
      expect(result.projections).toHaveLength(1);
      expect(result.projections[0].name).toBe('Test Player');
    });

    it('should throw descriptive error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          error: { code: 'NO_PROJECTION_DATA', message: 'No batter projection data available' }
        }),
      });

      await expect(fetchBatterProjections()).rejects.toThrow('No batter projection data available');
    });
  });
});
```

### Existing Code to Preserve

**From `client/src/components/projection-uploader.tsx`:**
- CSV upload functionality must continue to work
- `addProjectionFile` function adds projection metadata
- `setPlayerProjections` sets projections in context
- `mergeProjections` handles combining hitters and pitchers

**From `client/src/lib/app-context.tsx`:**
- Existing state structure must be preserved
- localStorage persistence continues to work
- No breaking changes to existing context consumers

### Error Display Location

Error state should be accessible in AppContext so that:
1. `projection-uploader.tsx` can show "Upload CSV" as fallback
2. Future `data-freshness-display.tsx` (Story 4.2) can show error state
3. Any component can check if API load failed

### Performance Considerations

- Use `Promise.all` to fetch batters and pitchers concurrently
- Don't block app render on API load (show loading state instead)
- If localStorage has projections, don't overwrite with API data automatically
- Consider: only auto-load if no projections exist yet

### Learnings from Previous Stories

1. **API endpoint structure** - Use `/api/v1/projections/*` prefix (from 3-1)
2. **Error format** - API returns `{ error: { code, message } }` on failure
3. **Type imports** - Import API types from `@shared/types/projections`
4. **Testing pattern** - Mock fetch globally for API client tests
5. **State management** - Use functional updates for setState to avoid stale closures

### Dependencies

**Existing (no new deps):**
- React hooks (useState, useEffect, useCallback)
- TypeScript for type safety
- vitest for testing

**Types Used:**
- `PlayerProjection` from `@shared/schema`
- `ApiBatterProjection`, `ApiPitcherProjection`, `ProjectionMeta` from `@shared/types/projections`

### File Structure After This Story

```
client/src/lib/
├── api-client.ts          # NEW - API fetch utilities
├── api-client.test.ts     # NEW - API client tests
├── app-context.tsx        # MODIFIED - add auto-load and state
├── calculations.ts        # Existing
├── position-lookup.ts     # Existing
├── projection-merger.ts   # Existing
└── ...
```

### FRs Covered by This Story

| FR | Description | How Covered |
|----|-------------|-------------|
| FR13 | Users can view projections automatically on app startup without manual upload | Auto-load in AppContext useEffect |
| FR16 | Users can see an error message when projections fail to load | Error state + display |

### Security Considerations

1. **No authentication** - API is public for MVP
2. **Same-origin requests** - API calls to same domain
3. **Error sanitization** - Don't expose internal errors to users
4. **No sensitive data** - Projection data is public information

### References

- [Source: docs/architecture.md#Frontend-Integration]
- [Source: docs/architecture.md#API-Design]
- [Source: docs/epics.md#Story-4.1-API-Client-and-Auto-Load-Projections]
- [Source: docs/prd.md#Frontend-Integration-Requirements]
- [Source: project-context.md#Frontend-Structure]
- [Source: project-context.md#State-Management]
- [Source: shared/schema.ts] - PlayerProjection type
- [Source: shared/types/projections.ts] - API projection types
- [Source: client/src/lib/app-context.tsx] - Context to modify
- [Source: client/src/components/projection-uploader.tsx] - CSV fallback to preserve
- [Source: docs/sprint-artifacts/3-1-projections-api-routes.md] - API implementation details

## Dev Agent Record

### Context Reference

Story created by Create-Story workflow with comprehensive context from:
- docs/epics.md (Story 4.1 requirements, AC, technical notes)
- docs/architecture.md (Frontend integration patterns)
- docs/prd.md (Frontend integration requirements)
- project-context.md (coding standards, frontend structure)
- shared/schema.ts (PlayerProjection type definition)
- shared/types/projections.ts (API projection types)
- client/src/lib/app-context.tsx (existing context implementation)
- client/src/components/projection-uploader.tsx (CSV upload to preserve)
- docs/sprint-artifacts/3-1-projections-api-routes.md (API endpoint details)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed React import issue in test file by using `import React from 'react'`
- Updated vitest.config.ts with esbuild jsx: 'automatic' for JSX transform support
- Added path aliases to vitest.config.ts for @shared resolution

### Completion Notes List

- **Task 1**: API client module (`client/src/lib/api-client.ts`) created with `fetchBatterProjections()` and `fetchPitcherProjections()` functions. Both functions call correct API endpoints, transform data to PlayerProjection format, and throw descriptive errors on failure. 17 tests cover all functionality.
- **Task 2**: AppContext modified to include `projectionsLoading`, `projectionsError`, `projectionsLastUpdated`, and `projectionSource` state fields. Auto-load useEffect fetches projections on mount when no existing projections in localStorage. 15 tests cover all state transitions and error handling.
- **Task 3**: Data transformation implemented for both batters and pitchers. Batters: positions split by comma/slash, stats mapped correctly, team handled as optional. Pitchers: all get 'P' position, decimal stats parsed correctly. Tests verify all transformations.
- **Task 4**: Error state exposed in AppContext value. Tests verify error message "Unable to load latest projections" is set on API failure. Tests confirm CSV fallback works after API error - user can still upload projections manually.
- **Task 5**: Full test suite passes (132 tests), TypeScript compilation passes with no errors.

### File List

- `client/src/lib/api-client.ts` - NEW - API client with fetch functions and transformations
- `client/src/lib/api-client.test.ts` - NEW - 17 tests for API client
- `client/src/lib/app-context.tsx` - MODIFIED - Added projection state fields and auto-load useEffect
- `client/src/lib/app-context.test.tsx` - NEW - 15 tests for AppContext projection loading
- `vitest.config.ts` - MODIFIED - Added esbuild jsx config and path aliases

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-11 | Implemented API client, AppContext auto-load, all tests pass (132 total) | Amelia (Dev Agent) |
