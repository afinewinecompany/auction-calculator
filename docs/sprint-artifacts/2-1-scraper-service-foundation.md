# Story 2.1: Scraper Service Foundation

Status: done

## Story

As a developer,
I want a scraper service structure with orchestration logic,
So that scraping jobs can be executed with proper error handling and retry logic.

## Acceptance Criteria

1. **AC1: runScrape Function Exists**
   - `runScrape(type: 'batters' | 'pitchers')` function exists in `server/services/scraper/index.ts`
   - Function calls `createScrapeRecord()` to start tracking
   - Function calls appropriate fetch/parse function (to be implemented in Story 2.2/2.3)
   - On success: calls `completeScrapeRecord()` and inserts projections
   - On failure: implements single retry after 5-second wait
   - After retry failure: calls `failScrapeRecord()`
   - All events logged using structured logger

2. **AC2: runFullScrape Function Exists**
   - `runFullScrape()` function exists
   - Calls `runScrape('batters')` then `runScrape('pitchers')`
   - Tracks consecutive failure count in memory
   - Logs `scrape_alert` event when failures reach 2 (FR18)

3. **AC3: Consecutive Failure Tracking**
   - `consecutiveFailures` counter tracked in module scope
   - Counter resets to 0 on any successful scrape
   - Counter increments on each failed scrape (after retry exhausted)
   - `scrape_alert` event logged when counter reaches 2

4. **AC4: Structured Logging**
   - All scrape events logged with JSON format using `log()` utility
   - Events logged: `scrape_start`, `scrape_complete`, `scrape_failed`, `scrape_retry`, `scrape_alert`
   - Each event includes relevant context (type, url, error, attempt number, etc.)

5. **AC5: Retry Logic**
   - Single retry attempt before marking scrape as failed
   - 5-second wait between initial attempt and retry
   - Both attempts logged with attempt number
   - Retry uses `scrape_retry` event

6. **AC6: Placeholder Fetch Functions**
   - `fetchBatterProjections()` placeholder function exists (returns empty array)
   - `fetchPitcherProjections()` placeholder function exists (returns empty array)
   - Placeholders throw `AppError('NOT_IMPLEMENTED', ...)` to be replaced in Stories 2.2/2.3

7. **AC7: Unit Tests Pass**
   - Tests exist for `runScrape()` covering success, failure, and retry paths
   - Tests exist for `runFullScrape()` covering consecutive failure tracking
   - Tests verify correct logging calls
   - Tests verify correct projections service calls
   - All tests pass with mocked dependencies

## Tasks / Subtasks

- [x] Task 1: Create scraper service directory structure (AC: 1, 6)
  - [x] 1.1 Create `server/services/scraper/` directory
  - [x] 1.2 Create `server/services/scraper/index.ts` as main orchestration file
  - [x] 1.3 Create `server/services/scraper/fangraphs.ts` with placeholder functions

- [x] Task 2: Implement placeholder fetch functions (AC: 6)
  - [x] 2.1 Write failing test for `fetchBatterProjections()` throwing NOT_IMPLEMENTED
  - [x] 2.2 Implement `fetchBatterProjections()` placeholder that throws `AppError`
  - [x] 2.3 Write failing test for `fetchPitcherProjections()` throwing NOT_IMPLEMENTED
  - [x] 2.4 Implement `fetchPitcherProjections()` placeholder that throws `AppError`

- [x] Task 3: Implement runScrape function - happy path (AC: 1, 4)
  - [x] 3.1 Write failing test for runScrape success flow
  - [x] 3.2 Implement runScrape that calls createScrapeRecord, fetch, insert, completeScrapeRecord
  - [x] 3.3 Add `scrape_start` logging at beginning
  - [x] 3.4 Add `scrape_complete` logging on success

- [x] Task 4: Implement runScrape retry logic (AC: 5, 4)
  - [x] 4.1 Write failing test for retry on first failure
  - [x] 4.2 Implement 5-second delay using `setTimeout` wrapped in Promise
  - [x] 4.3 Add `scrape_retry` logging before retry attempt
  - [x] 4.4 Write failing test for `scrape_failed` after retry exhausted
  - [x] 4.5 Implement failScrapeRecord call after both attempts fail
  - [x] 4.6 Add `scrape_failed` logging with attempt count

- [x] Task 5: Implement consecutive failure tracking (AC: 3)
  - [x] 5.1 Write failing test for consecutive failure counter increment
  - [x] 5.2 Implement module-level `consecutiveFailures` variable
  - [x] 5.3 Write failing test for counter reset on success
  - [x] 5.4 Implement counter reset logic in success path

- [x] Task 6: Implement runFullScrape function (AC: 2, 3)
  - [x] 6.1 Write failing test for runFullScrape calling both scrapes
  - [x] 6.2 Implement runFullScrape orchestration
  - [x] 6.3 Write failing test for `scrape_alert` at 2 consecutive failures
  - [x] 6.4 Implement alert logging when consecutiveFailures reaches 2

- [x] Task 7: Verify all tests pass (AC: 7)
  - [x] 7.1 Run full test suite
  - [x] 7.2 Verify no regressions in existing tests
  - [x] 7.3 Verify TypeScript compilation passes

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow service organization from [Source: docs/architecture.md#Service-Organization]**

```
server/services/
├── projections/          # Existing from Story 1.3
│   └── index.ts
└── scraper/              # THIS STORY
    ├── index.ts          # Main orchestration (runScrape, runFullScrape)
    ├── fangraphs.ts      # Fetch/parse functions (placeholders now, Epic 2.2/2.3)
    └── scheduler.ts      # Epic 2.4 - cron setup (future)
```

### Dependencies from Previous Stories

**Import from Story 1.3 (projections service):**

```typescript
import {
  createScrapeRecord,
  completeScrapeRecord,
  failScrapeRecord,
  insertBatterProjections,
  insertPitcherProjections,
} from '../projections';
```

**Import from Story 1.1 (utilities):**

```typescript
import { AppError } from '../../lib/errors';
import { log } from '../../lib/logger';
```

### Fangraphs URLs (for constants)

```typescript
export const FANGRAPHS_BATTERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=bat&pos=&team=0&players=0&lg=all&pageitems=2000';

export const FANGRAPHS_PITCHERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all&pageitems=2000';
```

### runScrape Implementation Pattern

```typescript
import type { NewBatterProjection, NewPitcherProjection, ScrapeType } from '../../../shared/types/projections';

// Module-level state for consecutive failure tracking
let consecutiveFailures = 0;

export async function runScrape(type: ScrapeType): Promise<void> {
  const url = type === 'batters' ? FANGRAPHS_BATTERS_URL : FANGRAPHS_PITCHERS_URL;

  log('info', 'scrape_start', { type, url });

  // Create tracking record
  const scrapeRecord = await createScrapeRecord(type, url);

  // Attempt scrape with retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const projections = type === 'batters'
        ? await fetchBatterProjections()
        : await fetchPitcherProjections();

      // Insert projections
      if (type === 'batters') {
        await insertBatterProjections(scrapeRecord.id, projections as NewBatterProjection[]);
      } else {
        await insertPitcherProjections(scrapeRecord.id, projections as NewPitcherProjection[]);
      }

      // Mark success
      await completeScrapeRecord(scrapeRecord.id, projections.length);

      log('info', 'scrape_complete', {
        type,
        count: projections.length,
        scrapeId: scrapeRecord.id,
      });

      // Reset failure counter on success
      consecutiveFailures = 0;
      return;

    } catch (error) {
      if (attempt === 1) {
        log('warn', 'scrape_retry', {
          type,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt,
        });

        // Wait 5 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        // Final failure
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        await failScrapeRecord(scrapeRecord.id, errorMsg);

        log('error', 'scrape_failed', {
          type,
          error: errorMsg,
          attempt,
          scrapeId: scrapeRecord.id,
        });

        consecutiveFailures++;

        // Alert on consecutive failures
        if (consecutiveFailures >= 2) {
          log('error', 'scrape_alert', {
            message: 'Multiple consecutive scrape failures detected',
            consecutiveFailures,
            type,
          });
        }

        throw new AppError('SCRAPE_FAILED', errorMsg, 502, { type, scrapeId: scrapeRecord.id });
      }
    }
  }
}
```

### runFullScrape Implementation Pattern

```typescript
export async function runFullScrape(): Promise<void> {
  log('info', 'full_scrape_start', {});

  try {
    await runScrape('batters');
  } catch (error) {
    // Log but continue to pitchers
    log('warn', 'batter_scrape_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  try {
    await runScrape('pitchers');
  } catch (error) {
    log('warn', 'pitcher_scrape_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  log('info', 'full_scrape_complete', { consecutiveFailures });
}
```

### Placeholder Functions Pattern

**In `server/services/scraper/fangraphs.ts`:**

```typescript
import { AppError } from '../../lib/errors';
import type { NewBatterProjection, NewPitcherProjection } from '../../../shared/types/projections';

export const FANGRAPHS_BATTERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=bat&pos=&team=0&players=0&lg=all&pageitems=2000';

export const FANGRAPHS_PITCHERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all&pageitems=2000';

/**
 * Fetches and parses batter projections from Fangraphs.
 * PLACEHOLDER: To be implemented in Story 2.2
 *
 * @throws {AppError} NOT_IMPLEMENTED error until Story 2.2
 */
export async function fetchBatterProjections(): Promise<NewBatterProjection[]> {
  throw new AppError(
    'NOT_IMPLEMENTED',
    'fetchBatterProjections not yet implemented - see Story 2.2',
    501
  );
}

/**
 * Fetches and parses pitcher projections from Fangraphs.
 * PLACEHOLDER: To be implemented in Story 2.3
 *
 * @throws {AppError} NOT_IMPLEMENTED error until Story 2.3
 */
export async function fetchPitcherProjections(): Promise<NewPitcherProjection[]> {
  throw new AppError(
    'NOT_IMPLEMENTED',
    'fetchPitcherProjections not yet implemented - see Story 2.3',
    501
  );
}
```

### Testing Strategy

**Test file location:** `server/services/scraper/index.test.ts`

**Mock Strategy:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runScrape, runFullScrape, resetConsecutiveFailures } from './index';

// Mock projections service
vi.mock('../projections', () => ({
  createScrapeRecord: vi.fn().mockResolvedValue({ id: 1, scrapeType: 'batters', status: 'in_progress' }),
  completeScrapeRecord: vi.fn().mockResolvedValue(undefined),
  failScrapeRecord: vi.fn().mockResolvedValue(undefined),
  insertBatterProjections: vi.fn().mockResolvedValue(undefined),
  insertPitcherProjections: vi.fn().mockResolvedValue(undefined),
}));

// Mock fangraphs fetchers
vi.mock('./fangraphs', () => ({
  FANGRAPHS_BATTERS_URL: 'https://example.com/batters',
  FANGRAPHS_PITCHERS_URL: 'https://example.com/pitchers',
  fetchBatterProjections: vi.fn(),
  fetchPitcherProjections: vi.fn(),
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  log: vi.fn(),
}));

// Mock setTimeout for faster tests
vi.useFakeTimers();

describe('scraper service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConsecutiveFailures(); // Export helper to reset state for tests
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('runScrape', () => {
    it('should complete successfully when fetch succeeds', async () => {
      const mockBatters = [{ name: 'Test Player', positions: 'OF' }];
      vi.mocked(fetchBatterProjections).mockResolvedValueOnce(mockBatters);

      await runScrape('batters');

      expect(createScrapeRecord).toHaveBeenCalledWith('batters', expect.any(String));
      expect(completeScrapeRecord).toHaveBeenCalledWith(1, 1);
      expect(log).toHaveBeenCalledWith('info', 'scrape_complete', expect.any(Object));
    });

    it('should retry once on failure then succeed', async () => {
      const mockBatters = [{ name: 'Test Player', positions: 'OF' }];
      vi.mocked(fetchBatterProjections)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockBatters);

      const promise = runScrape('batters');

      // Fast-forward past the 5-second retry delay
      vi.advanceTimersByTime(5000);

      await promise;

      expect(log).toHaveBeenCalledWith('warn', 'scrape_retry', expect.any(Object));
      expect(completeScrapeRecord).toHaveBeenCalled();
    });

    it('should fail after retry exhausted', async () => {
      vi.mocked(fetchBatterProjections)
        .mockRejectedValue(new Error('Persistent error'));

      const promise = runScrape('batters');

      vi.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow('Persistent error');
      expect(failScrapeRecord).toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('error', 'scrape_failed', expect.any(Object));
    });
  });

  describe('consecutive failure tracking', () => {
    it('should alert after 2 consecutive failures', async () => {
      vi.mocked(fetchBatterProjections).mockRejectedValue(new Error('Error'));

      // First failure
      const promise1 = runScrape('batters');
      vi.advanceTimersByTime(5000);
      await expect(promise1).rejects.toThrow();

      // Second failure - should trigger alert
      const promise2 = runScrape('batters');
      vi.advanceTimersByTime(5000);
      await expect(promise2).rejects.toThrow();

      expect(log).toHaveBeenCalledWith('error', 'scrape_alert', expect.objectContaining({
        consecutiveFailures: 2,
      }));
    });
  });
});
```

**Export resetConsecutiveFailures for testing:**

```typescript
// For testing purposes only
export function resetConsecutiveFailures(): void {
  consecutiveFailures = 0;
}

// Alternative: export getter for assertions
export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}
```

### Learnings from Story 1.3

**Applied to this story:**

1. **Use `vi.useFakeTimers()`** - Essential for testing the 5-second retry delay
2. **Chainable mocks** - Projections service mocks work well with vi.fn()
3. **Module-level state** - Export helper functions to reset state between tests
4. **Error message extraction** - Use pattern `error instanceof Error ? error.message : 'Unknown error'`

### File Structure After This Story

```
server/
├── db/
│   └── index.ts              # Existing from 1.2
├── lib/
│   ├── errors.ts             # Existing from 1.1
│   └── logger.ts             # Existing from 1.1
├── middleware/
│   └── error-handler.ts      # Existing from 1.1
└── services/
    ├── projections/          # Existing from 1.3
    │   ├── index.ts
    │   └── index.test.ts
    └── scraper/              # NEW
        ├── index.ts          # NEW - Orchestration (runScrape, runFullScrape)
        ├── index.test.ts     # NEW - Orchestration tests
        ├── fangraphs.ts      # NEW - URL constants, placeholder fetch functions
        └── fangraphs.test.ts # NEW - Placeholder tests
```

### Function Signatures Reference

```typescript
// Main orchestration (index.ts)
export async function runScrape(type: ScrapeType): Promise<void>;
export async function runFullScrape(): Promise<void>;
export function resetConsecutiveFailures(): void;
export function getConsecutiveFailures(): number;

// Fetch functions (fangraphs.ts) - placeholders for now
export async function fetchBatterProjections(): Promise<NewBatterProjection[]>;
export async function fetchPitcherProjections(): Promise<NewPitcherProjection[]>;

// URL constants (fangraphs.ts)
export const FANGRAPHS_BATTERS_URL: string;
export const FANGRAPHS_PITCHERS_URL: string;
```

### Standard Log Events

From [Source: docs/architecture.md#Logging-Pattern]:

| Event | Level | When | Data Fields |
|-------|-------|------|-------------|
| `scrape_start` | info | Beginning of runScrape | type, url |
| `scrape_complete` | info | After successful scrape | type, count, scrapeId |
| `scrape_retry` | warn | Before retry attempt | type, error, attempt |
| `scrape_failed` | error | After all attempts exhausted | type, error, attempt, scrapeId |
| `scrape_alert` | error | When consecutiveFailures >= 2 | message, consecutiveFailures, type |
| `full_scrape_start` | info | Beginning of runFullScrape | - |
| `full_scrape_complete` | info | After runFullScrape finishes | consecutiveFailures |

### Error Codes

| Code | Status | When |
|------|--------|------|
| `NOT_IMPLEMENTED` | 501 | Placeholder functions called |
| `SCRAPE_FAILED` | 502 | Scrape failed after retry |

### Dependencies

No new dependencies required for this story. Cheerio will be added in Story 2.2.

### Environment Variables

No new environment variables for this story.

### References

- [Source: docs/architecture.md#Scraping-Architecture]
- [Source: docs/architecture.md#Service-Organization]
- [Source: docs/architecture.md#Error-Handling-Pattern]
- [Source: docs/architecture.md#Logging-Pattern]
- [Source: docs/epics.md#Story-2.1-Scraper-Service-Foundation]
- [Source: docs/prd.md#API-Backend-Requirements]
- [Source: project-context.md#Error-Handling]
- [Source: server/services/projections/index.ts] - Projections service pattern
- [Source: server/lib/errors.ts] - AppError class
- [Source: server/lib/logger.ts] - log function

## Dev Agent Record

### Context Reference

Story created by create-story workflow with comprehensive context from:
- docs/epics.md (Story 2.1 requirements)
- docs/architecture.md (scraping architecture, service organization, logging patterns)
- docs/prd.md (scrape timing, retry logic, alerting requirements)
- project-context.md (coding standards)
- Story 1.3 (projections service - functions to call)
- Story 1.1 (error handling, logging utilities)
- shared/types/projections.ts (type definitions)
- server/services/projections/index.ts (service pattern to follow)
- server/lib/errors.ts (AppError class)
- server/lib/logger.ts (log function)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All tests pass (96/96)
- Pre-existing TypeScript error in `client/src/lib/sample-data.ts` (unrelated to this story)
- Unhandled promise rejection warnings in tests due to fake timers + async code (expected with Vitest)

### Completion Notes List

1. Created scraper service structure following architecture patterns from Story 1.3
2. Implemented placeholder functions that throw NOT_IMPLEMENTED with clear story references
3. Used `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()` for testing 5-second delay
4. Module-level `consecutiveFailures` variable tracks failures across scrape attempts
5. Exported `resetConsecutiveFailures()` and `getConsecutiveFailures()` for test isolation
6. Alert logging triggered at consecutiveFailures >= 2 per FR18

### File List

- `server/services/scraper/index.ts` - Main orchestration (runScrape, runFullScrape)
- `server/services/scraper/index.test.ts` - 18 tests covering all orchestration logic
- `server/services/scraper/fangraphs.ts` - URL constants, placeholder fetch functions
- `server/services/scraper/fangraphs.test.ts` - 8 tests for placeholders and constants

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Implementation complete - 4 files, 26 tests passing | Amelia (Dev Agent) |
