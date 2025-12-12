# Story 2.4: Cron Job Scheduler

Status: Done

## Story

As a developer,
I want scraping jobs to run automatically on a nightly schedule,
So that projection data stays fresh without manual intervention.

## Acceptance Criteria

1. **AC1: Scheduler Module Created**
   - `server/services/scraper/scheduler.ts` file is created
   - Exports `initializeScheduler()` function
   - Uses `node-cron` package for scheduling

2. **AC2: Schedule Configuration**
   - Cron schedule: `0 4 * * *` (4:00 AM EST daily)
   - Calls `runFullScrape()` from scraper service at scheduled time
   - Scheduler runs within Express server process (in-process scheduling)

3. **AC3: Initialization Logging**
   - Logs `scheduler_started` event on initialization with schedule info
   - Logs `scheduled_scrape_start` event when each scheduled run begins
   - Uses structured JSON logging via existing `log()` utility

4. **AC4: Server Integration**
   - Scheduler is initialized in `server/app.ts` on server startup
   - Initialization happens after Express routes are configured
   - Does not block server startup

5. **AC5: Unit Tests Pass**
   - Tests verify `initializeScheduler()` creates cron job
   - Tests verify scheduled callback calls `runFullScrape()`
   - Tests verify logging events are emitted
   - Tests use mocked node-cron and runFullScrape
   - All tests pass

## Tasks / Subtasks

- [x] Task 1: Install node-cron dependency (AC: 1)
  - [x] 1.1 Run `npm install node-cron`
  - [x] 1.2 Run `npm install -D @types/node-cron`
  - [x] 1.3 Verify package.json updated correctly

- [x] Task 2: Create scheduler module (AC: 1, 2, 3)
  - [x] 2.1 Write failing test for initializeScheduler creating cron job
  - [x] 2.2 Create scheduler.ts with initializeScheduler function
  - [x] 2.3 Write failing test for scheduler_started log event
  - [x] 2.4 Implement scheduler_started logging
  - [x] 2.5 Write failing test for scheduled_scrape_start log event
  - [x] 2.6 Implement scheduled_scrape_start logging in callback

- [x] Task 3: Implement cron job callback (AC: 2)
  - [x] 3.1 Write failing test for callback calling runFullScrape
  - [x] 3.2 Implement callback that calls runFullScrape
  - [x] 3.3 Write failing test for error handling in callback
  - [x] 3.4 Implement try-catch in callback to prevent unhandled rejections

- [x] Task 4: Server integration (AC: 4)
  - [x] 4.1 Write failing test for scheduler initialization in app.ts
  - [x] 4.2 Import and call initializeScheduler in server/app.ts
  - [x] 4.3 Verify server starts without blocking

- [x] Task 5: Full validation (AC: 5)
  - [x] 5.1 Run full test suite to verify no regressions
  - [x] 5.2 Verify TypeScript compilation passes
  - [x] 5.3 Manual verification: start server and check logs

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow patterns from [Source: docs/architecture.md#Scheduling-node-cron]**

- Use node-cron for in-process scheduling
- Railway deployment keeps server running continuously
- Schedule: `0 4 * * *` (4:00 AM EST daily)

### node-cron API Reference

```typescript
import cron from 'node-cron';

// Schedule a task
const task = cron.schedule('0 4 * * *', () => {
  console.log('Running at 4 AM every day');
});

// Task methods
task.start();  // Start the scheduler
task.stop();   // Stop the scheduler
```

**Cron Expression: `0 4 * * *`**
- Minute: 0 (at the top of the hour)
- Hour: 4 (4 AM)
- Day of month: * (every day)
- Month: * (every month)
- Day of week: * (every day)

### Implementation Pattern

```typescript
/**
 * Scheduler Module
 *
 * Initializes cron job for nightly projection scraping.
 * Runs within Express server process (in-process scheduling).
 *
 * @module server/services/scraper/scheduler
 */
import cron from 'node-cron';
import { log } from '../../lib/logger';
import { runFullScrape } from './index';

/** Cron schedule: 4:00 AM daily */
const SCRAPE_SCHEDULE = '0 4 * * *';

/**
 * Initializes the scrape scheduler.
 *
 * Creates a cron job that runs runFullScrape() at 4 AM EST daily.
 * Logs scheduler_started event on initialization.
 *
 * @returns The cron task instance (for testing/cleanup)
 */
export function initializeScheduler(): cron.ScheduledTask {
  log('info', 'scheduler_started', {
    schedule: SCRAPE_SCHEDULE,
    description: 'Daily projection scrape at 4:00 AM EST'
  });

  const task = cron.schedule(SCRAPE_SCHEDULE, async () => {
    log('info', 'scheduled_scrape_start', {
      schedule: SCRAPE_SCHEDULE,
      timestamp: new Date().toISOString()
    });

    try {
      await runFullScrape();
    } catch (error) {
      log('error', 'scheduled_scrape_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return task;
}
```

### Server Integration Pattern

In `server/app.ts`:

```typescript
import { initializeScheduler } from './services/scraper/scheduler';

// ... after route configuration ...

// Initialize scrape scheduler (runs at 4 AM daily)
initializeScheduler();

// ... rest of server startup ...
```

### Existing Code Context

**From `server/services/scraper/index.ts`:**
- `runFullScrape()` - Already implemented, scrapes both batters and pitchers
- Handles errors internally, logs all events
- Does not throw on individual scrape failures (continues to next)

**From `server/lib/logger.ts`:**
- `log(level, event, data)` - Structured JSON logging
- Standard events: `scrape_start`, `scrape_complete`, `scrape_failed`
- New events for scheduler: `scheduler_started`, `scheduled_scrape_start`

### Test Strategy

**Test file:** `server/services/scraper/scheduler.test.ts`

**Mock Strategy:**
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
    }),
  },
}));

// Mock runFullScrape
vi.mock('./index', () => ({
  runFullScrape: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  log: vi.fn(),
}));
```

**Test Cases:**

1. `should create cron job with correct schedule` - Verify cron.schedule called with '0 4 * * *'
2. `should log scheduler_started on initialization` - Verify log called with event
3. `should return cron task instance` - Verify return value has start/stop methods
4. `should call runFullScrape when triggered` - Execute callback, verify runFullScrape called
5. `should log scheduled_scrape_start when triggered` - Execute callback, verify log called
6. `should handle runFullScrape errors gracefully` - Mock error, verify no throw

### File Structure After This Story

```
server/services/scraper/
├── index.ts          # Existing - orchestration (runFullScrape)
├── index.test.ts     # Existing - orchestration tests
├── fangraphs.ts      # Existing - HTML parsing
├── fangraphs.test.ts # Existing - parser tests
├── scheduler.ts      # NEW - cron job setup
└── scheduler.test.ts # NEW - scheduler tests
```

### Environment Variables

No new environment variables required. The schedule is hardcoded as `0 4 * * *` per requirements.

**Note:** For production flexibility, the schedule could be made configurable via `SCRAPE_SCHEDULE` env var in future enhancement.

### Dependencies

**New dependencies to install:**
- `node-cron` - Cron scheduling library
- `@types/node-cron` - TypeScript type definitions

```bash
npm install node-cron
npm install -D @types/node-cron
```

### Timezone Considerations

node-cron runs in the system's local timezone by default. Railway servers typically run in UTC.

**Option A (Simple):** Keep `0 4 * * *` as-is. On Railway (UTC), this runs at 4 AM UTC = 11 PM EST.
**Option B (Explicit):** Use node-cron's timezone option:

```typescript
cron.schedule(SCRAPE_SCHEDULE, callback, {
  timezone: 'America/New_York'
});
```

**Recommendation:** Use Option A for MVP simplicity. The exact time is less important than having fresh daily data. 4 AM UTC is actually better (11 PM EST) as it updates before next day's usage.

### Learnings from Previous Stories

1. **Mock global dependencies** - Use vi.mock for node-cron, similar to mocking fetch in scraper tests
2. **Return values for testing** - Return the cron task instance so tests can verify creation
3. **Error handling in callbacks** - Wrap async callbacks in try-catch to prevent unhandled promise rejections
4. **Structured logging consistency** - Use same log() pattern as other scraper events

### References

- [Source: docs/architecture.md#Scheduling-node-cron]
- [Source: docs/epics.md#Story-2.4-Cron-Job-Scheduler]
- [Source: docs/prd.md#FR4] - Execute scraping jobs on nightly schedule
- [Source: project-context.md#Code-Quality-Rules]
- [Source: server/services/scraper/index.ts] - runFullScrape implementation
- [Source: server/lib/logger.ts] - Logging utility
- [Source: docs/sprint-artifacts/2-3-pitcher-projections-parser.md] - Previous story patterns

## Dev Agent Record

### Context Reference

Story created by create-story workflow with comprehensive context from:
- docs/epics.md (Story 2.4 requirements, AC, technical notes)
- docs/architecture.md (scheduling approach, node-cron, in-process scheduling)
- docs/prd.md (FR4 nightly schedule requirement)
- project-context.md (coding standards, logging patterns)
- server/services/scraper/index.ts (runFullScrape implementation to call)
- server/lib/logger.ts (log utility for events)
- Previous stories 2.2 and 2.3 (testing patterns, mock strategies)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- ✅ Installed node-cron@4.2.1 and @types/node-cron@3.0.11
- ✅ Created scheduler.ts with initializeScheduler() function
- ✅ Implemented scheduler_started logging on initialization
- ✅ Implemented scheduled_scrape_start logging when cron fires
- ✅ Implemented runFullScrape() call with error handling
- ✅ Integrated scheduler into server/app.ts after routes configured
- ✅ All 129 tests pass (6 new scheduler tests added)
- ✅ TypeScript compilation passes
- ✅ Manual verification: scheduler logs correctly on startup

### File List

- server/services/scraper/scheduler.ts (NEW)
- server/services/scraper/scheduler.test.ts (NEW)
- server/app.ts (MODIFIED - added scheduler import and initialization)
- server/lib/logger.ts (MODIFIED - added scheduler events to documentation)
- package.json (MODIFIED - added node-cron dependency)
- package-lock.json (MODIFIED)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Story implemented - all tasks complete, 6 tests added | Amelia (Dev Agent) |
| 2025-12-10 | Code review: Fixed timezone description in log, updated logger docs | Amelia (Dev Agent) |
