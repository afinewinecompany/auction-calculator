# Story 2.5: Manual Scrape Trigger (Development)

Status: Done

## Story

As a developer,
I want a way to manually trigger scraping for testing,
So that I can verify the scraper works without waiting for the scheduled time.

## Acceptance Criteria

1. **AC1: Admin Endpoint Created**
   - `POST /api/admin/scrape` endpoint exists in `server/routes/admin.ts`
   - Endpoint triggers `runFullScrape()` from scraper service
   - Returns JSON response with scrape status

2. **AC2: Development-Only Access**
   - Endpoint is only available when `NODE_ENV !== 'production'`
   - Returns 404 in production environment
   - Clear logging when endpoint is accessed

3. **AC3: Response Format**
   - Success response: `{ success: true, message: "Scrape initiated" }`
   - Endpoint returns immediately (async scrape runs in background)
   - Error response follows standard `{ error: { code, message } }` format

4. **AC4: Logging**
   - Logs `manual_scrape_triggered` event when endpoint is called
   - Includes timestamp and requester info (if available)
   - Uses structured JSON logging via existing `log()` utility

5. **AC5: Server Integration**
   - Admin routes registered in `server/routes.ts`
   - Route mounted under `/api/admin` prefix
   - Does not interfere with existing routes

6. **AC6: Unit Tests Pass**
   - Tests verify endpoint triggers `runFullScrape()`
   - Tests verify 404 in production environment
   - Tests verify correct response format
   - Tests use mocked runFullScrape
   - All tests pass

## Tasks / Subtasks

- [x] Task 1: Create admin routes module (AC: 1, 5)
  - [x] 1.1 Write failing test for admin route module existence
  - [x] 1.2 Create `server/routes/admin.ts` with Express Router
  - [x] 1.3 Write failing test for POST /api/admin/scrape endpoint
  - [x] 1.4 Implement scrape endpoint that calls runFullScrape()

- [x] Task 2: Implement development-only guard (AC: 2)
  - [x] 2.1 Write failing test for 404 in production environment
  - [x] 2.2 Add NODE_ENV check middleware to admin routes
  - [x] 2.3 Write test verifying endpoint works in development
  - [x] 2.4 Verify guard returns proper 404 response

- [x] Task 3: Implement response handling (AC: 3)
  - [x] 3.1 Write failing test for success response format
  - [x] 3.2 Implement async execution with immediate response
  - [x] 3.3 Write failing test for error response format
  - [x] 3.4 Implement error handling with AppError

- [x] Task 4: Add logging (AC: 4)
  - [x] 4.1 Write failing test for manual_scrape_triggered log event
  - [x] 4.2 Implement logging in endpoint handler
  - [x] 4.3 Verify log includes timestamp

- [x] Task 5: Server integration (AC: 5)
  - [x] 5.1 Write failing test for route registration
  - [x] 5.2 Import and register admin routes in server/routes.ts
  - [x] 5.3 Verify routes mounted under /api/admin prefix

- [x] Task 6: Full validation (AC: 6)
  - [x] 6.1 Run full test suite to verify no regressions
  - [x] 6.2 Verify TypeScript compilation passes
  - [x] 6.3 Manual verification: call endpoint and verify scrape executes

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow patterns from [Source: docs/architecture.md#API-Route-Organization]**

- Routes organized by version/purpose in `server/routes/`
- Use Express Router pattern
- Error handling via middleware

### Implementation Pattern

```typescript
/**
 * Admin Routes
 *
 * Development-only endpoints for testing and debugging.
 * NOT available in production.
 *
 * @module server/routes/admin
 */
import { Router } from 'express';
import { log } from '../lib/logger';
import { runFullScrape } from '../services/scraper';

const router = Router();

/**
 * Middleware to block admin routes in production.
 */
function developmentOnly(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Not found' }
    });
  }
  next();
}

// Apply guard to all admin routes
router.use(developmentOnly);

/**
 * POST /api/admin/scrape
 *
 * Manually triggers a full scrape of all projection sources.
 * Runs asynchronously - returns immediately.
 */
router.post('/scrape', (req, res) => {
  log('info', 'manual_scrape_triggered', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
  });

  // Run scrape in background (don't await)
  runFullScrape().catch((error) => {
    log('error', 'manual_scrape_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  return res.json({
    success: true,
    message: 'Scrape initiated',
  });
});

export default router;
```

### Route Registration Pattern

In `server/routes.ts`:

```typescript
import adminRoutes from './routes/admin';

// ... existing route registration ...

// Register admin routes (development only)
app.use('/api/admin', adminRoutes);
```

### Existing Code Context

**From `server/services/scraper/index.ts`:**
- `runFullScrape()` - Already implemented, scrapes both batters and pitchers
- Handles errors internally, logs all events
- Does not throw on individual scrape failures (continues to next)

**From `server/lib/logger.ts`:**
- `log(level, event, data)` - Structured JSON logging
- Standard events: `scrape_start`, `scrape_complete`, `scrape_failed`
- New event for this story: `manual_scrape_triggered`

**From `server/app.ts`:**
- Routes registered via `registerRoutes(app)` function
- Error handler middleware applied after routes
- Scheduler initialized after route registration

### Test Strategy

**Test file:** `server/routes/admin.test.ts`

**Mock Strategy:**
```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock runFullScrape
vi.mock('../services/scraper', () => ({
  runFullScrape: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  log: vi.fn(),
}));
```

**Test Cases:**

1. `should return 404 when NODE_ENV is production` - Verify production guard
2. `should return success response in development` - Verify endpoint works
3. `should trigger runFullScrape when called` - Verify scraper is called
4. `should log manual_scrape_triggered event` - Verify logging
5. `should return immediately without waiting for scrape` - Verify async behavior
6. `should handle runFullScrape errors gracefully` - Verify error handling

### File Structure After This Story

```
server/routes/
├── index.ts          # Existing - route registration
├── admin.ts          # NEW - admin/development routes
├── admin.test.ts     # NEW - admin route tests
└── v1/
    └── projections.ts # Existing - API routes
```

### Environment Variables

**Existing:**
- `NODE_ENV` - Used to guard admin routes (development vs production)

No new environment variables required.

### Design Decision: Option B Selected

From epics.md, two options were presented:

**Option A: Environment-based trigger**
- `RUN_SCRAPE_ON_START=true` runs scrape on server startup
- Simple but inflexible

**Option B: Admin endpoint (development only)** <- SELECTED
- `POST /api/admin/scrape` triggers `runFullScrape()`
- Only available when `NODE_ENV=development`
- More flexible for testing
- Can be triggered on-demand
- Easier to integrate with testing workflows

**Rationale:** Option B provides better developer experience:
- Can trigger scrapes at any time, not just on restart
- Doesn't require server restart to test
- Can be called from tests or CLI tools
- Production safety via NODE_ENV check

### Security Considerations

1. **Production Guard:** Endpoint returns 404 in production - not 403 (avoids revealing endpoint existence)
2. **No Authentication:** Since it's development-only, no auth required
3. **Rate Limiting:** Not implemented for MVP (development use only)

### Learnings from Previous Stories

1. **Mock global dependencies** - Use vi.mock for runFullScrape, similar to scheduler tests
2. **Async execution** - Return immediately, let scrape run in background
3. **Error handling in callbacks** - Catch and log errors from async operations
4. **Structured logging consistency** - Use same log() pattern as other scraper events
5. **Express testing** - Use supertest for endpoint testing

### References

- [Source: docs/architecture.md#API-Route-Organization]
- [Source: docs/epics.md#Story-2.5-Manual-Scrape-Trigger]
- [Source: project-context.md#Code-Quality-Rules]
- [Source: server/services/scraper/index.ts] - runFullScrape implementation
- [Source: server/lib/logger.ts] - Logging utility
- [Source: server/app.ts] - Server and route setup
- [Source: docs/sprint-artifacts/2-4-cron-job-scheduler.md] - Previous story patterns

## Dev Agent Record

### Context Reference

Story created by Dev Agent with comprehensive context from:
- docs/epics.md (Story 2.5 requirements, AC, technical notes)
- docs/architecture.md (API route organization, error handling patterns)
- project-context.md (coding standards, logging patterns)
- server/services/scraper/index.ts (runFullScrape implementation to call)
- server/lib/logger.ts (log utility for events)
- server/app.ts (route registration pattern)
- Previous story 2-4-cron-job-scheduler.md (testing patterns)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Installed supertest and @types/supertest for API endpoint testing
- Created server/routes/admin.ts with POST /scrape endpoint
- Implemented developmentOnly middleware returning 404 in production
- Endpoint calls runFullScrape() asynchronously and returns immediately
- Logs manual_scrape_triggered event with timestamp and IP
- Registered admin routes in server/routes.ts under /api/admin prefix
- All 136 tests pass (7 new admin route tests)
- TypeScript compilation passes

### File List

- server/routes/admin.ts (NEW)
- server/routes/admin.test.ts (NEW, +2 tests from code review)
- server/routes.ts (MODIFIED - added admin route registration)
- server/lib/logger.ts (MODIFIED - added admin events to documentation)
- package.json (MODIFIED - added supertest dependency)
- package-lock.json (MODIFIED)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Story implemented - all tasks complete, 7 tests added, 136 total tests pass | Amelia (Dev Agent) |
| 2025-12-10 | Code review: Added route registration integration test, staging env test, updated logger docs | Amelia (Dev Agent) |
