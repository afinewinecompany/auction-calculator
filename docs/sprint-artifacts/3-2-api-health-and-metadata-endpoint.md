# Story 3.2: API Health and Metadata Endpoint

Status: Done

## Story

As a developer,
I want a health check endpoint that includes scrape status,
So that I can monitor the API and data freshness.

## Acceptance Criteria

1. **AC1: GET /v1/health endpoint exists**
   - Endpoint exists at `/api/v1/health`
   - Returns JSON response with status and scrape metadata
   - Response format:
     ```json
     {
       "status": "healthy",
       "scrape": {
         "batters": {
           "lastSuccess": "2024-01-15T04:00:00Z",
           "playerCount": 523
         },
         "pitchers": {
           "lastSuccess": "2024-01-15T04:02:00Z",
           "playerCount": 312
         }
       }
     }
     ```

2. **AC2: Status degraded when data is stale**
   - Returns `status: "degraded"` if scrape data is older than 48 hours
   - Both batters AND pitchers must be checked for staleness
   - If either is stale, status is "degraded"

3. **AC3: Status unhealthy when no data exists**
   - Returns `status: "unhealthy"` if no scrape data exists for either type
   - Response still includes scrape object with null values for missing data

4. **AC4: Response format for missing data**
   - If batters have no data: `batters: { lastSuccess: null, playerCount: 0 }`
   - If pitchers have no data: `pitchers: { lastSuccess: null, playerCount: 0 }`

5. **AC5: Route registration**
   - Health route registered alongside projections routes
   - Accessible at `/api/v1/health`
   - Does not require authentication

6. **AC6: Unit tests pass**
   - Tests verify healthy status when data is fresh
   - Tests verify degraded status when data is stale (>48 hours)
   - Tests verify unhealthy status when no data exists
   - Tests verify response format with missing batters/pitchers
   - All existing tests continue to pass (no regressions)

## Tasks / Subtasks

- [x] Task 1: Create health route module (AC: 1, 5)
  - [x] 1.1 Write failing test for health route module existence
  - [x] 1.2 Create `server/routes/v1/health.ts` with Express Router
  - [x] 1.3 Write failing test for GET /v1/health endpoint
  - [x] 1.4 Implement basic health endpoint structure

- [x] Task 2: Implement scrape status retrieval (AC: 1, 4)
  - [x] 2.1 Write failing test for scrape metadata in response
  - [x] 2.2 Call getLatestScrapeMetadata for both batters and pitchers
  - [x] 2.3 Format response with lastSuccess as ISO string and playerCount
  - [x] 2.4 Handle null scrape data gracefully (null lastSuccess, 0 playerCount)

- [x] Task 3: Implement status determination logic (AC: 2, 3)
  - [x] 3.1 Write failing test for "healthy" status when data is fresh
  - [x] 3.2 Write failing test for "degraded" status when data is >48 hours old
  - [x] 3.3 Write failing test for "unhealthy" status when no data exists
  - [x] 3.4 Implement status determination based on data freshness
  - [x] 3.5 Add 48-hour threshold constant

- [x] Task 4: Route registration (AC: 5)
  - [x] 4.1 Write failing test for route registration
  - [x] 4.2 Import and register health route in server/routes.ts
  - [x] 4.3 Verify route mounted under /api/v1/health prefix
  - [x] 4.4 Verify existing routes still work

- [x] Task 5: Full validation (AC: 6)
  - [x] 5.1 Run full test suite to verify no regressions
  - [x] 5.2 Verify TypeScript compilation passes
  - [x] 5.3 Manual verification: call endpoint and verify response format

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow patterns from [Source: docs/architecture.md#API-Route-Organization]**

- Routes organized by version in `server/routes/v1/`
- Use Express Router pattern
- Error handling via middleware (throw AppError, let middleware format)
- Health endpoint is a standard pattern for Railway deployment health checks

### Implementation Pattern

```typescript
/**
 * Health Check API Route
 *
 * Provides health status and scrape metadata for monitoring.
 * Part of Epic 3: Projections API Endpoints.
 *
 * @module server/routes/v1/health
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getLatestScrapeMetadata } from '../../services/projections';

const router = Router();

/** Staleness threshold in milliseconds (48 hours) */
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Determines health status based on scrape data freshness.
 *
 * @param battersLastSuccess - Last successful batters scrape timestamp
 * @param pitchersLastSuccess - Last successful pitchers scrape timestamp
 * @returns 'healthy' | 'degraded' | 'unhealthy'
 */
function determineStatus(
  battersLastSuccess: Date | null,
  pitchersLastSuccess: Date | null
): 'healthy' | 'degraded' | 'unhealthy' {
  // No data at all = unhealthy
  if (!battersLastSuccess && !pitchersLastSuccess) {
    return 'unhealthy';
  }

  const now = Date.now();
  const battersAge = battersLastSuccess ? now - battersLastSuccess.getTime() : Infinity;
  const pitchersAge = pitchersLastSuccess ? now - pitchersLastSuccess.getTime() : Infinity;

  // Either missing or stale = degraded
  if (!battersLastSuccess || !pitchersLastSuccess) {
    return 'degraded';
  }

  // Both stale = degraded
  if (battersAge > STALE_THRESHOLD_MS || pitchersAge > STALE_THRESHOLD_MS) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * GET /v1/health
 *
 * Returns health status and scrape metadata for monitoring.
 *
 * Response format:
 * {
 *   "status": "healthy" | "degraded" | "unhealthy",
 *   "scrape": {
 *     "batters": { "lastSuccess": "ISO date" | null, "playerCount": number },
 *     "pitchers": { "lastSuccess": "ISO date" | null, "playerCount": number }
 *   }
 * }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [battersMetadata, pitchersMetadata] = await Promise.all([
      getLatestScrapeMetadata('batters'),
      getLatestScrapeMetadata('pitchers'),
    ]);

    const battersLastSuccess = battersMetadata?.completedAt ?? null;
    const pitchersLastSuccess = pitchersMetadata?.completedAt ?? null;

    const status = determineStatus(battersLastSuccess, pitchersLastSuccess);

    return res.json({
      status,
      scrape: {
        batters: {
          lastSuccess: battersLastSuccess?.toISOString() ?? null,
          playerCount: battersMetadata?.playerCount ?? 0,
        },
        pitchers: {
          lastSuccess: pitchersLastSuccess?.toISOString() ?? null,
          playerCount: pitchersMetadata?.playerCount ?? 0,
        },
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
import healthRoutes from './routes/v1/health';

// ... existing route registration ...

// Register API v1 routes
app.use('/api/v1/projections', projectionsRoutes);
app.use('/api/v1/health', healthRoutes);  // NEW
```

### Existing Code Context

**From `server/services/projections/index.ts`:**
- `getLatestScrapeMetadata(type: 'batters' | 'pitchers')` - Returns `ScrapeMetadataRow | null`
- `ScrapeMetadataRow` includes:
  - `id: number`
  - `scrapeType: string`
  - `sourceUrl: string`
  - `projectionSystem: string`
  - `playerCount: number | null`
  - `status: string`
  - `errorMessage: string | null`
  - `startedAt: Date`
  - `completedAt: Date | null`

**From `server/routes/v1/projections.ts`:**
- Pattern for async route handlers with try/catch and next(error)
- Response formatting with JSON
- Error handling via AppError

**From `server/routes.ts`:**
- Current routes: `/api/admin`, `/api/v1/projections`
- Routes registered via `registerRoutes(app)` function

### Test Strategy

**Test file:** `server/routes/v1/health.test.ts`

**Mock Strategy:**
```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRoutes from './health';
import { errorHandler } from '../../middleware/error-handler';

// Mock projections service
vi.mock('../../services/projections', () => ({
  getLatestScrapeMetadata: vi.fn(),
}));

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/health', healthRoutes);
  app.use(errorHandler);
  return app;
}
```

**Test Cases:**

1. `GET /health - should return healthy status when both scrapes are fresh`
2. `GET /health - should return degraded status when batters data is stale (>48h)`
3. `GET /health - should return degraded status when pitchers data is stale (>48h)`
4. `GET /health - should return degraded status when batters data is missing`
5. `GET /health - should return degraded status when pitchers data is missing`
6. `GET /health - should return unhealthy status when no scrape data exists`
7. `GET /health - should format lastSuccess as ISO string`
8. `GET /health - should include playerCount from scrape metadata`
9. `GET /health - should return null lastSuccess when no data`
10. `GET /health - should return 0 playerCount when no data`
11. `GET /health - should handle database errors gracefully`

### Response Format Verification

**Healthy Response:**
```json
{
  "status": "healthy",
  "scrape": {
    "batters": {
      "lastSuccess": "2024-01-15T04:00:00.000Z",
      "playerCount": 523
    },
    "pitchers": {
      "lastSuccess": "2024-01-15T04:02:00.000Z",
      "playerCount": 312
    }
  }
}
```

**Degraded Response (stale data):**
```json
{
  "status": "degraded",
  "scrape": {
    "batters": {
      "lastSuccess": "2024-01-13T04:00:00.000Z",
      "playerCount": 523
    },
    "pitchers": {
      "lastSuccess": "2024-01-13T04:02:00.000Z",
      "playerCount": 312
    }
  }
}
```

**Unhealthy Response (no data):**
```json
{
  "status": "unhealthy",
  "scrape": {
    "batters": {
      "lastSuccess": null,
      "playerCount": 0
    },
    "pitchers": {
      "lastSuccess": null,
      "playerCount": 0
    }
  }
}
```

### File Structure After This Story

```
server/routes/
├── admin.ts              # Existing - admin/development routes
├── admin.test.ts         # Existing - admin route tests
└── v1/
    ├── projections.ts    # Existing - projection API endpoints
    ├── projections.test.ts # Existing - projection route tests
    ├── health.ts         # NEW - health check endpoint
    └── health.test.ts    # NEW - health route tests
```

### Performance Considerations

- Two lightweight database queries (one for each scrape type)
- Queries use index on `scrape_type` and `status`
- `Promise.all` parallelizes the two queries
- Response should complete well under 500ms target

### Staleness Calculation

```typescript
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

function isStale(lastSuccess: Date | null): boolean {
  if (!lastSuccess) return true;
  return Date.now() - lastSuccess.getTime() > STALE_THRESHOLD_MS;
}
```

**Why 48 hours?**
- Scraper runs at 4 AM daily
- If it fails twice (4 AM day 1, 4 AM day 2), data is 48+ hours old
- This aligns with alerting threshold (FR18: alert after 2 consecutive failures)

### Learnings from Story 3.1

1. **Mock service functions** - Use vi.mock for projections service
2. **Test app setup** - Create isolated express app with routes and error handler
3. **Error handling** - Let errors flow to middleware via next(error)
4. **Response format** - Match exact structure for frontend/monitoring consumption
5. **Express testing** - Use supertest for endpoint testing

### Dependencies

**Existing (no new deps):**
- express (Router, Request, Response, NextFunction)
- supertest (@types/supertest) - already installed
- vitest - test framework

**Services Used:**
- `server/services/projections/index.ts` - getLatestScrapeMetadata
- `server/middleware/error-handler.ts` - errorHandler middleware

### Railway Health Check Integration

This endpoint is designed to work with Railway's health check system:
- Railway can poll `/api/v1/health` to determine app health
- Returns 200 for all statuses (healthy, degraded, unhealthy)
- Status field indicates actual health for monitoring dashboards
- Can be configured as Railway health check endpoint in railway.json

### FRs and NFRs Covered

| Requirement | Description | How Covered |
|-------------|-------------|-------------|
| Epic 3 | Health endpoint for monitoring | GET /v1/health endpoint |
| NFR | Railway health checks | Standard health endpoint pattern |
| FR12 | API includes last-updated | lastSuccess timestamps in response |

### Security Considerations

1. **Public endpoint** - No authentication required (health checks are typically public)
2. **Read-only** - No data modification possible
3. **No sensitive data** - Only scrape timestamps and counts exposed
4. **No rate limiting** - Health checks should be fast and frequent

### References

- [Source: docs/architecture.md#API-Route-Organization]
- [Source: docs/architecture.md#API-Design]
- [Source: docs/architecture.md#Error-Handling-Pattern]
- [Source: docs/epics.md#Story-3.2-API-Health-and-Metadata-Endpoint]
- [Source: project-context.md#Code-Quality-Rules]
- [Source: server/services/projections/index.ts] - getLatestScrapeMetadata
- [Source: server/routes/v1/projections.ts] - Route pattern to follow
- [Source: server/routes.ts] - Route registration location
- [Source: docs/sprint-artifacts/3-1-projections-api-routes.md] - Previous story patterns

## Dev Agent Record

### Context Reference

Story created by Create-Story workflow with comprehensive context from:
- docs/epics.md (Story 3.2 requirements, AC, technical notes)
- docs/architecture.md (API route organization, error handling patterns)
- project-context.md (coding standards, error handling)
- server/services/projections/index.ts (getLatestScrapeMetadata service)
- server/routes/v1/projections.ts (route pattern to follow)
- server/routes.ts (route registration pattern)
- Previous story 3-1-projections-api-routes.md (testing patterns, implementation approach)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Created `server/routes/v1/health.ts` with GET /v1/health endpoint
- Implemented status determination logic: healthy (fresh), degraded (>48h or partial), unhealthy (no data)
- Calls getLatestScrapeMetadata for both batters and pitchers in parallel
- Returns lastSuccess as ISO string, playerCount from scrape metadata
- Handles null scrape data gracefully (null lastSuccess, 0 playerCount)
- Registered route in server/routes.ts under /api/v1/health prefix
- 11 new tests added in server/routes/v1/health.test.ts
- All 161 tests pass (no regressions)
- TypeScript compilation passes

### File List

- server/routes/v1/health.ts (NEW)
- server/routes/v1/health.test.ts (NEW)
- server/routes.ts (MODIFIED - added health route registration)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Story implemented - all tasks complete, 11 tests added, 161 total tests pass | Amelia (Dev Agent) |
