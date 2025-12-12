# Story 3.1: Projections API Routes

Status: Done

## Story

As a user,
I want API endpoints that return projection data,
So that the frontend can fetch and display projections automatically.

## Acceptance Criteria

1. **AC1: GET /v1/projections/batters endpoint**
   - Endpoint exists at `/v1/projections/batters`
   - Calls `getLatestBatterProjections()` from projections service
   - Returns JSON response format:
     ```json
     {
       "data": [{ "name": "...", "team": "...", ... }],
       "meta": {
         "lastUpdated": "2024-01-15T04:00:00Z",
         "count": 523
       }
     }
     ```
   - Returns 503 with error if no projection data available

2. **AC2: GET /v1/projections/pitchers endpoint**
   - Endpoint exists at `/v1/projections/pitchers`
   - Calls `getLatestPitcherProjections()` from projections service
   - Returns same JSON response format as batters
   - Returns 503 with error if no projection data available

3. **AC3: Route Registration**
   - Routes registered in `server/routes.ts` under `/v1` prefix
   - Routes mounted at `/api/v1/projections/*`
   - Does not interfere with existing routes (admin, etc.)

4. **AC4: Error Response Format**
   - Error responses follow structured format: `{ error: { code, message } }`
   - No projection data: 503 with `{ error: { code: 'NO_PROJECTION_DATA', message: 'No projection data available' } }`
   - Database errors: 500 with appropriate error code and message

5. **AC5: Performance**
   - API responses complete within 500ms (NFR1)
   - Database queries complete within 100ms (NFR3)

6. **AC6: Unit Tests Pass**
   - Tests verify batters endpoint returns correct format
   - Tests verify pitchers endpoint returns correct format
   - Tests verify 503 response when no data available
   - Tests verify error response format
   - All existing tests continue to pass (no regressions)

## Tasks / Subtasks

- [x] Task 1: Create projections routes module (AC: 1, 2, 3)
  - [x] 1.1 Write failing test for projections route module existence
  - [x] 1.2 Create `server/routes/v1/projections.ts` with Express Router
  - [x] 1.3 Write failing test for GET /v1/projections/batters endpoint
  - [x] 1.4 Implement batters endpoint calling getLatestBatterProjections()
  - [x] 1.5 Write failing test for GET /v1/projections/pitchers endpoint
  - [x] 1.6 Implement pitchers endpoint calling getLatestPitcherProjections()

- [x] Task 2: Implement response formatting (AC: 1, 2, 4)
  - [x] 2.1 Write failing test for success response format with data and meta
  - [x] 2.2 Implement response formatting with lastUpdated as ISO string
  - [x] 2.3 Write failing test for 503 response when no data available
  - [x] 2.4 Implement 503 handling with correct error format

- [x] Task 3: Error handling (AC: 4)
  - [x] 3.1 Write failing test for database error response format
  - [x] 3.2 Implement error handling that lets AppError flow to middleware
  - [x] 3.3 Verify error middleware formats responses correctly

- [x] Task 4: Route registration (AC: 3)
  - [x] 4.1 Write failing test for route registration
  - [x] 4.2 Import and register projections routes in server/routes.ts
  - [x] 4.3 Verify routes mounted under /api/v1/projections prefix
  - [x] 4.4 Verify existing routes still work

- [x] Task 5: Full validation (AC: 5, 6)
  - [x] 5.1 Run full test suite to verify no regressions
  - [x] 5.2 Verify TypeScript compilation passes
  - [x] 5.3 Manual verification: call endpoints and verify response format

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow patterns from [Source: docs/architecture.md#API-Route-Organization]**

- Routes organized by version in `server/routes/v1/`
- Use Express Router pattern
- Error handling via middleware (throw AppError, let middleware format)
- One file per resource (`projections.ts` handles both batters and pitchers)

### Implementation Pattern

```typescript
/**
 * Projections API Routes
 *
 * REST API endpoints for retrieving projection data.
 * Part of Epic 3: Projections API Endpoints.
 *
 * @module server/routes/v1/projections
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
  getLatestBatterProjections,
  getLatestPitcherProjections,
} from '../../services/projections';
import { AppError } from '../../lib/errors';

const router = Router();

/**
 * GET /v1/projections/batters
 *
 * Returns all batter projections from the most recent successful scrape.
 *
 * Success Response (200):
 * {
 *   "data": [{ name, team, positions, pa, ab, h, hr, ... }],
 *   "meta": { "lastUpdated": "ISO date", "count": number }
 * }
 *
 * Error Response (503):
 * { "error": { "code": "NO_PROJECTION_DATA", "message": "..." } }
 */
router.get('/batters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getLatestBatterProjections();

    if (!result) {
      throw new AppError(
        'NO_PROJECTION_DATA',
        'No batter projection data available',
        503
      );
    }

    return res.json({
      data: result.data,
      meta: {
        lastUpdated: result.meta.lastUpdated.toISOString(),
        count: result.meta.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/projections/pitchers
 *
 * Returns all pitcher projections from the most recent successful scrape.
 */
router.get('/pitchers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getLatestPitcherProjections();

    if (!result) {
      throw new AppError(
        'NO_PROJECTION_DATA',
        'No pitcher projection data available',
        503
      );
    }

    return res.json({
      data: result.data,
      meta: {
        lastUpdated: result.meta.lastUpdated.toISOString(),
        count: result.meta.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Route Registration Pattern

In `server/routes.ts`:

```typescript
import projectionsRoutes from './routes/v1/projections';

// ... existing route registration ...

// Register API v1 routes
app.use('/api/v1/projections', projectionsRoutes);
```

### Existing Code Context

**From `server/services/projections/index.ts`:**
- `getLatestBatterProjections()` - Returns `BatterProjectionResult | null`
- `getLatestPitcherProjections()` - Returns `PitcherProjectionResult | null`
- Both return `{ data: T[], meta: { lastUpdated: Date, count: number, scrapeId: number } }`
- Both throw `AppError` on database failures

**From `server/lib/errors.ts`:**
- `AppError` class - `(code, message, statusCode, details?)`
- Standard error codes: `DB_QUERY_FAILED`, `DB_INSERT_FAILED`, etc.
- New error code for this story: `NO_PROJECTION_DATA`

**From `server/middleware/error-handler.ts`:**
- Catches `AppError` and formats as `{ error: { code, message, details } }`
- Sets appropriate HTTP status codes from `AppError.statusCode`

**From `server/routes.ts`:**
- Current routes: `/api/admin` (admin routes)
- Routes registered via `registerRoutes(app)` function
- New routes should be added before `createServer(app)`

### Test Strategy

**Test file:** `server/routes/v1/projections.test.ts`

**Mock Strategy:**
```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectionsRoutes from './projections';
import { errorHandler } from '../../middleware/error-handler';

// Mock projections service
vi.mock('../../services/projections', () => ({
  getLatestBatterProjections: vi.fn(),
  getLatestPitcherProjections: vi.fn(),
}));

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/projections', projectionsRoutes);
  app.use(errorHandler);
  return app;
}
```

**Test Cases:**

1. `GET /batters - should return batter projections with correct format`
2. `GET /batters - should return 503 when no data available`
3. `GET /batters - should return 500 on database error`
4. `GET /pitchers - should return pitcher projections with correct format`
5. `GET /pitchers - should return 503 when no data available`
6. `GET /pitchers - should return 500 on database error`
7. `should format lastUpdated as ISO string`
8. `should include count in meta`

### Response Format Verification

**Success Response (batters):**
```json
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
```

**Error Response (503):**
```json
{
  "error": {
    "code": "NO_PROJECTION_DATA",
    "message": "No batter projection data available"
  }
}
```

### File Structure After This Story

```
server/routes/
├── admin.ts              # Existing - admin/development routes
├── admin.test.ts         # Existing - admin route tests
└── v1/
    ├── projections.ts    # NEW - projection API endpoints
    └── projections.test.ts # NEW - projection route tests
```

### Performance Considerations

- Database queries use indexes on `scrape_id` and `scrape_type`
- No additional processing on projection data (passed through as-is)
- `lastUpdated` conversion to ISO string is O(1)
- Response should complete well under 500ms target

### Learnings from Previous Stories

1. **Mock service functions** - Use vi.mock for projections service, similar to admin routes
2. **Test app setup** - Create isolated express app with routes and error handler
3. **Error handling** - Let errors flow to middleware via next(error)
4. **Response format** - Match exact structure expected by frontend
5. **Express testing** - Use supertest for endpoint testing

### Dependencies

**Existing (no new deps):**
- express (Router, Request, Response, NextFunction)
- supertest (@types/supertest) - already installed for admin.test.ts
- vitest - test framework

**Services Used:**
- `server/services/projections/index.ts` - getLatestBatterProjections, getLatestPitcherProjections
- `server/lib/errors.ts` - AppError class
- `server/middleware/error-handler.ts` - errorHandler middleware

### API Design Notes

**From [Source: docs/architecture.md#API-Design]:**
- Versioned API: `/v1/` prefix
- Resource-based URLs: `/projections/batters`, `/projections/pitchers`
- Success format: `{ data: T, meta: { lastUpdated, count } }`
- Error format: `{ error: { code, message, details? } }`

**From [Source: docs/prd.md#API-Endpoints]:**
- `/v1/projections/batters` - GET - Returns all batter projections
- `/v1/projections/pitchers` - GET - Returns all pitcher projections
- Public API (no authentication for MVP)
- JSON response matching frontend expected format

### FRs Covered by This Story

| FR | Description | How Covered |
|----|-------------|-------------|
| FR10 | Frontend can retrieve all batter projections via API endpoint | GET /v1/projections/batters |
| FR11 | Frontend can retrieve all pitcher projections via API endpoint | GET /v1/projections/pitchers |
| FR12 | API responses include last-updated timestamp | meta.lastUpdated in response |

### Security Considerations

1. **Public API** - No authentication required for MVP
2. **Read-only endpoints** - No data modification possible
3. **No rate limiting** - Frontend is only consumer for now
4. **Error details** - Don't expose internal implementation in errors

### References

- [Source: docs/architecture.md#API-Route-Organization]
- [Source: docs/architecture.md#API-Design]
- [Source: docs/architecture.md#Error-Handling-Pattern]
- [Source: docs/epics.md#Story-3.1-Projections-API-Routes]
- [Source: docs/prd.md#API-Backend-Requirements]
- [Source: project-context.md#Code-Quality-Rules]
- [Source: server/services/projections/index.ts] - Service layer to call
- [Source: server/lib/errors.ts] - AppError class
- [Source: server/middleware/error-handler.ts] - Error middleware
- [Source: server/routes.ts] - Route registration location
- [Source: docs/sprint-artifacts/2-5-manual-scrape-trigger.md] - Previous story patterns

## Dev Agent Record

### Context Reference

Story created by Create-Story workflow with comprehensive context from:
- docs/epics.md (Story 3.1 requirements, AC, technical notes)
- docs/architecture.md (API route organization, error handling patterns)
- docs/prd.md (API requirements, response formats)
- project-context.md (coding standards, error handling)
- server/services/projections/index.ts (service layer to use)
- server/lib/errors.ts (AppError class)
- server/routes.ts (route registration pattern)
- Previous story 2-5-manual-scrape-trigger.md (testing patterns, supertest setup)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Created `server/routes/v1/projections.ts` with GET /batters and GET /pitchers endpoints
- Endpoints call projections service and format response with data and meta (lastUpdated as ISO string, count)
- Returns 503 with NO_PROJECTION_DATA error when no projections available
- Database errors flow through to error middleware via next(error)
- Registered routes in server/routes.ts under /api/v1/projections prefix
- 12 new tests added in server/routes/v1/projections.test.ts
- All 150 tests pass (no regressions)
- TypeScript compilation passes

### File List

- server/routes/v1/projections.ts (NEW)
- server/routes/v1/projections.test.ts (NEW)
- server/routes.ts (MODIFIED - added projections route registration)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Story implemented - all tasks complete, 12 tests added, 150 total tests pass | Amelia (Dev Agent) |
