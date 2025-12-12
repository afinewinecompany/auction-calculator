# Story 1.3: Projections Database Service

Status: done

## Story

As a developer,
I want a service layer for projection database operations,
So that other services can easily read and write projection data.

## Acceptance Criteria

1. **AC1: createScrapeRecord Function**
   - `createScrapeRecord(type: 'batters' | 'pitchers', sourceUrl: string)` function exists
   - Creates new `scrape_metadata` record with status `'in_progress'`
   - Sets `projection_system` to `'steamer'`
   - Sets `started_at` to current timestamp
   - Returns the scrape record with id

2. **AC2: completeScrapeRecord Function**
   - `completeScrapeRecord(scrapeId: number, playerCount: number)` function exists
   - Updates `scrape_metadata` with:
     - `status` = `'success'`
     - `player_count` = provided value
     - `completed_at` = current timestamp

3. **AC3: failScrapeRecord Function**
   - `failScrapeRecord(scrapeId: number, errorMessage: string)` function exists
   - Updates `scrape_metadata` with:
     - `status` = `'failed'`
     - `error_message` = provided message
     - `completed_at` = current timestamp

4. **AC4: insertBatterProjections Function**
   - `insertBatterProjections(scrapeId: number, batters: NewBatterProjection[])` function exists
   - Bulk inserts batter projections linked to `scrape_id`
   - Uses transaction for atomicity (all succeed or all fail)
   - Logs `db_write_complete` event on success

5. **AC5: insertPitcherProjections Function**
   - `insertPitcherProjections(scrapeId: number, pitchers: NewPitcherProjection[])` function exists
   - Bulk inserts pitcher projections linked to `scrape_id`
   - Uses transaction for atomicity
   - Logs `db_write_complete` event on success

6. **AC6: getLatestBatterProjections Function**
   - `getLatestBatterProjections()` function exists
   - Returns all batters from most recent successful scrape
   - Includes scrape metadata for `lastUpdated` timestamp
   - Returns `{ batters: BatterProjectionRow[], meta: { lastUpdated: Date, count: number } }`

7. **AC7: getLatestPitcherProjections Function**
   - `getLatestPitcherProjections()` function exists
   - Returns all pitchers from most recent successful scrape
   - Includes scrape metadata for `lastUpdated` timestamp
   - Returns `{ pitchers: PitcherProjectionRow[], meta: { lastUpdated: Date, count: number } }`

8. **AC8: getLatestScrapeMetadata Function**
   - `getLatestScrapeMetadata(type: 'batters' | 'pitchers')` function exists
   - Returns most recent successful scrape record for type
   - Returns `null` if no successful scrape exists

9. **AC9: Error Handling**
   - Service throws `AppError` for database failures
   - Uses error codes: `'DB_INSERT_FAILED'`, `'DB_UPDATE_FAILED'`, `'DB_QUERY_FAILED'`

10. **AC10: Unit Tests Pass**
    - Tests exist for all 8 service functions
    - Tests verify correct database operations are called
    - Tests verify error handling with `AppError`
    - Tests verify logging calls for `db_write_complete`

## Tasks / Subtasks

- [x] Task 1: Create projections service directory structure (AC: 1-8)
  - [x] 1.1 Create `server/services/projections/` directory
  - [x] 1.2 Create `server/services/projections/index.ts` as main export file

- [x] Task 2: Implement createScrapeRecord function (AC: 1)
  - [x] 2.1 Write failing test for createScrapeRecord
  - [x] 2.2 Implement function that inserts into scrape_metadata
  - [x] 2.3 Return inserted record with id

- [x] Task 3: Implement completeScrapeRecord function (AC: 2)
  - [x] 3.1 Write failing test for completeScrapeRecord
  - [x] 3.2 Implement update function for success status
  - [x] 3.3 Verify completed_at timestamp is set

- [x] Task 4: Implement failScrapeRecord function (AC: 3)
  - [x] 4.1 Write failing test for failScrapeRecord
  - [x] 4.2 Implement update function for failed status
  - [x] 4.3 Verify error_message is stored

- [x] Task 5: Implement insertBatterProjections function (AC: 4)
  - [x] 5.1 Write failing test for insertBatterProjections
  - [x] 5.2 Implement bulk insert with transaction
  - [x] 5.3 Add `db_write_complete` logging
  - [x] 5.4 Add AppError handling for insert failures

- [x] Task 6: Implement insertPitcherProjections function (AC: 5)
  - [x] 6.1 Write failing test for insertPitcherProjections
  - [x] 6.2 Implement bulk insert with transaction
  - [x] 6.3 Add `db_write_complete` logging
  - [x] 6.4 Add AppError handling for insert failures

- [x] Task 7: Implement getLatestBatterProjections function (AC: 6)
  - [x] 7.1 Write failing test for getLatestBatterProjections
  - [x] 7.2 Implement query for most recent successful batters scrape
  - [x] 7.3 Return batters array with metadata

- [x] Task 8: Implement getLatestPitcherProjections function (AC: 7)
  - [x] 8.1 Write failing test for getLatestPitcherProjections
  - [x] 8.2 Implement query for most recent successful pitchers scrape
  - [x] 8.3 Return pitchers array with metadata

- [x] Task 9: Implement getLatestScrapeMetadata function (AC: 8)
  - [x] 9.1 Write failing test for getLatestScrapeMetadata
  - [x] 9.2 Implement query for most recent successful scrape by type
  - [x] 9.3 Return null when no scrape exists

- [x] Task 10: Verify all tests pass and no regressions (AC: 10)
  - [x] 10.1 Run full test suite
  - [x] 10.2 Verify all new service tests pass
  - [x] 10.3 Verify no regressions in existing tests

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow service organization from [Source: docs/architecture.md#Service-Organization]**

```
server/services/
├── scraper/              # Epic 2 - Fangraphs scraping (future)
│   ├── index.ts
│   ├── fangraphs.ts
│   └── scheduler.ts
└── projections/          # THIS STORY
    └── index.ts          # All projection DB operations
```

**Service Pattern:**
- Feature folder contains all related logic
- `index.ts` exports public interface
- Services throw `AppError`, routes/consumers handle formatting

### Database Connection Usage

**Use lazy initialization pattern from Story 1.2:**

```typescript
import { getDb } from '../../db';
import { scrapeMetadata, batterProjections, pitcherProjections } from '../../../shared/schema';

// Inside functions, get db instance:
const db = getDb();
```

### Drizzle ORM Query Patterns

**Insert Pattern:**

```typescript
import { eq, desc } from 'drizzle-orm';

// Single insert with returning
const [record] = await db
  .insert(scrapeMetadata)
  .values({
    scrapeType: type,
    sourceUrl: sourceUrl,
    projectionSystem: 'steamer',
    status: 'in_progress',
  })
  .returning();

// Bulk insert (batters/pitchers)
await db.insert(batterProjections).values(batters);
```

**Update Pattern:**

```typescript
await db
  .update(scrapeMetadata)
  .set({
    status: 'success',
    playerCount: count,
    completedAt: new Date(),
  })
  .where(eq(scrapeMetadata.id, scrapeId));
```

**Query Pattern (Latest Successful Scrape):**

```typescript
// Get latest successful scrape metadata
const [latestScrape] = await db
  .select()
  .from(scrapeMetadata)
  .where(eq(scrapeMetadata.scrapeType, 'batters'))
  .where(eq(scrapeMetadata.status, 'success'))
  .orderBy(desc(scrapeMetadata.completedAt))
  .limit(1);

// Get all projections for that scrape
const batters = await db
  .select()
  .from(batterProjections)
  .where(eq(batterProjections.scrapeId, latestScrape.id));
```

### Transaction Pattern for Bulk Inserts

**CRITICAL: Use transactions for atomicity:**

```typescript
import { getDb } from '../../db';

export async function insertBatterProjections(
  scrapeId: number,
  batters: NewBatterProjection[]
): Promise<void> {
  const db = getDb();

  try {
    // Drizzle neon-http driver doesn't support transactions directly
    // But bulk insert is atomic - all rows succeed or fail together
    await db.insert(batterProjections).values(
      batters.map(b => ({ ...b, scrapeId }))
    );

    log('info', 'db_write_complete', {
      table: 'batter_projections',
      count: batters.length,
      scrapeId,
    });
  } catch (error) {
    throw new AppError(
      'DB_INSERT_FAILED',
      `Failed to insert batter projections: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { scrapeId, count: batters.length }
    );
  }
}
```

**Note on Neon HTTP Driver:** The Neon serverless HTTP driver doesn't support interactive transactions. However, bulk inserts are atomic by default - the entire VALUES clause succeeds or fails together.

### Type Imports

**Use types from Story 1.2:**

```typescript
import type {
  NewBatterProjection,
  NewPitcherProjection,
  BatterProjectionRow,
  PitcherProjectionRow,
  ScrapeMetadataRow,
  ScrapeType,
} from '../../../shared/types/projections';
```

### Error Handling Pattern

**Follow error handling from [Source: docs/architecture.md#Error-Handling-Pattern]:**

```typescript
import { AppError } from '../../lib/errors';

// Throw specific errors with context
throw new AppError(
  'DB_QUERY_FAILED',
  'Failed to fetch latest batter projections',
  500,
  { error: err.message }
);
```

**Standard Error Codes for this service:**
- `DB_INSERT_FAILED` - Bulk insert operation failed
- `DB_UPDATE_FAILED` - Update operation failed
- `DB_QUERY_FAILED` - Select query failed

### Logging Pattern

**Use structured logging from [Source: docs/architecture.md#Logging-Pattern]:**

```typescript
import { log } from '../../lib/logger';

// Log database write completions
log('info', 'db_write_complete', {
  table: 'batter_projections',
  count: batters.length,
  scrapeId,
  durationMs: Date.now() - startTime,
});
```

### Return Type Definitions

**Define return types for clarity:**

```typescript
export interface ProjectionResult<T> {
  data: T[];
  meta: {
    lastUpdated: Date;
    count: number;
    scrapeId: number;
  };
}

export type BatterProjectionResult = ProjectionResult<BatterProjectionRow>;
export type PitcherProjectionResult = ProjectionResult<PitcherProjectionRow>;
```

### Testing Strategy

**Test file location:** `server/services/projections/index.test.ts`

**Mock Strategy:**
- Mock `getDb()` to return a mock Drizzle client
- Mock `log()` to verify logging calls
- Use type-safe mocks with `vi.fn()`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createScrapeRecord } from './index';

// Mock the database
vi.mock('../../db', () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1, ... }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([...]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  log: vi.fn(),
}));

describe('projections service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createScrapeRecord', () => {
    it('should create a scrape record with in_progress status', async () => {
      const result = await createScrapeRecord('batters', 'https://fangraphs.com/...');

      expect(result.status).toBe('in_progress');
      expect(result.scrapeType).toBe('batters');
      expect(result.projectionSystem).toBe('steamer');
    });
  });
});
```

### Learnings from Story 1.2

**Applied to this story:**

1. **Lazy DB initialization** - Use `getDb()` function, not direct import
2. **onDelete CASCADE** - Foreign keys have cascade delete, so deleting a scrape_metadata record deletes all associated projections
3. **Vitest mocking** - Use `vi.mock()` at module level, `vi.fn()` for functions
4. **Type inference** - Use Drizzle's `InferSelectModel` types already exported

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
    └── projections/          # NEW
        ├── index.ts          # NEW - Main service exports
        └── index.test.ts     # NEW - Service tests
```

### Function Signatures Reference

```typescript
// Scrape record management
export function createScrapeRecord(
  type: ScrapeType,
  sourceUrl: string
): Promise<ScrapeMetadataRow>;

export function completeScrapeRecord(
  scrapeId: number,
  playerCount: number
): Promise<void>;

export function failScrapeRecord(
  scrapeId: number,
  errorMessage: string
): Promise<void>;

// Projection inserts
export function insertBatterProjections(
  scrapeId: number,
  batters: NewBatterProjection[]
): Promise<void>;

export function insertPitcherProjections(
  scrapeId: number,
  pitchers: NewPitcherProjection[]
): Promise<void>;

// Projection queries
export function getLatestBatterProjections(): Promise<BatterProjectionResult | null>;

export function getLatestPitcherProjections(): Promise<PitcherProjectionResult | null>;

export function getLatestScrapeMetadata(
  type: ScrapeType
): Promise<ScrapeMetadataRow | null>;
```

### Dependencies

No new dependencies required - uses existing:
- `drizzle-orm` (installed in 1.2)
- `@neondatabase/serverless` (installed in 1.2)

### Environment Variables

Uses existing `DATABASE_URL` from Story 1.2.

### References

- [Source: docs/architecture.md#Service-Organization]
- [Source: docs/architecture.md#Error-Handling-Pattern]
- [Source: docs/architecture.md#Logging-Pattern]
- [Source: docs/epics.md#Story-1.3-Projections-Database-Service]
- [Source: project-context.md#Error-Handling]
- [Source: server/db/index.ts] - Database connection pattern
- [Source: shared/types/projections.ts] - Type definitions
- [Drizzle ORM Select Documentation](https://orm.drizzle.team/docs/select)
- [Drizzle ORM Insert Documentation](https://orm.drizzle.team/docs/insert)

## Dev Agent Record

### Context Reference

Story created by create-story workflow with comprehensive context from:
- docs/epics.md (Story 1.3 requirements)
- docs/architecture.md (service organization, error handling, logging patterns)
- docs/prd.md (API response requirements)
- project-context.md (coding standards)
- Story 1.2 (database schema, types, connection pattern, learnings)
- Story 1.1 (error handling, logging utilities)
- shared/schema.ts (Drizzle table definitions)
- shared/types/projections.ts (type definitions)
- server/db/index.ts (getDb() pattern)
- server/lib/errors.ts (AppError class)
- server/lib/logger.ts (log function)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All tests pass (70/70)
- TypeScript compilation clean for new files (pre-existing error in client/src/lib/sample-data.ts unrelated)

### Completion Notes List

1. Implemented all 8 service functions per AC
2. Used `and()` from drizzle-orm for compound where conditions
3. Chainable mock pattern works well for Drizzle's fluent API
4. Neon HTTP driver bulk inserts are atomic by default

### File List

- `server/services/projections/index.ts` - Main service with 8 exported functions
- `server/services/projections/index.test.ts` - 26 unit tests covering all functions

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Implementation complete - all 8 functions, 26 tests passing | Amelia (Dev Agent) |
