# Story 1.2: Database Schema for Projections

Status: done

## Story

As a developer,
I want database tables for storing projection data,
So that scraped projections can be persisted and retrieved efficiently.

## Acceptance Criteria

1. **AC1: Drizzle Schema Configured for PostgreSQL**
   - `shared/schema.ts` imports Drizzle PostgreSQL primitives (pgTable, serial, varchar, integer, decimal, timestamp, text)
   - Database connection utility exists in `server/db/index.ts`
   - Schema exports all new tables for use in services

2. **AC2: scrape_metadata Table Created**
   - Table name: `scrape_metadata` (snake_case)
   - Columns:
     - `id` - serial primary key
     - `scrape_type` - varchar(20) not null (values: 'batters', 'pitchers')
     - `source_url` - varchar(500) not null
     - `projection_system` - varchar(50) not null (e.g., 'steamer')
     - `player_count` - integer (nullable until scrape completes)
     - `status` - varchar(20) not null (values: 'in_progress', 'success', 'failed')
     - `error_message` - text (nullable)
     - `started_at` - timestamp not null (default now)
     - `completed_at` - timestamp (nullable)
   - TypeScript type `ScrapeMetadata` is exported

3. **AC3: batter_projections Table Created**
   - Table name: `batter_projections` (snake_case)
   - Columns:
     - `id` - serial primary key
     - `name` - varchar(255) not null
     - `team` - varchar(10) (nullable - some players may be free agents)
     - `positions` - varchar(50) not null
     - `pa`, `ab`, `h`, `hr`, `r`, `rbi`, `sb`, `bb`, `so` - integer not null (default 0)
     - `avg`, `obp`, `slg`, `woba` - decimal(5,3) not null (default 0.000)
     - `wrc_plus` - integer not null (default 0)
     - `scrape_id` - integer not null, foreign key to scrape_metadata.id
     - `created_at` - timestamp not null (default now)
   - Index on `scrape_id` for query performance
   - TypeScript type `BatterProjection` is exported

4. **AC4: pitcher_projections Table Created**
   - Table name: `pitcher_projections` (snake_case)
   - Columns:
     - `id` - serial primary key
     - `name` - varchar(255) not null
     - `team` - varchar(10) (nullable)
     - `ip` - decimal(5,1) not null (default 0.0)
     - `w`, `l`, `sv`, `k`, `bb`, `hr` - integer not null (default 0)
     - `era`, `whip`, `fip` - decimal(4,2) not null (default 0.00)
     - `scrape_id` - integer not null, foreign key to scrape_metadata.id
     - `created_at` - timestamp not null (default now)
   - Index on `scrape_id` for query performance
   - TypeScript type `PitcherProjection` is exported

5. **AC5: Database Connection Utility Works**
   - `server/db/index.ts` exports a `db` instance using Drizzle with the `DATABASE_URL` environment variable
   - Connection can be verified by importing in another file
   - Connection uses Neon serverless driver for Railway PostgreSQL compatibility

6. **AC6: TypeScript Types Exported**
   - `shared/types/projections.ts` exports:
     - `NewBatterProjection` - insert type (without id, created_at)
     - `NewPitcherProjection` - insert type (without id, created_at)
     - `NewScrapeMetadata` - insert type (without id)
     - `ScrapeMetadataRow` - select type (with id)
     - `BatterProjectionRow` - select type (with id)
     - `PitcherProjectionRow` - select type (with id)

7. **AC7: Unit Tests Pass**
   - Tests exist for schema type validation (TypeScript compiles)
   - Tests verify table definitions have correct column names
   - Tests verify foreign key relationships are defined

## Tasks / Subtasks

- [x] Task 1: Install Drizzle PostgreSQL dependencies (AC: 1, 5)
  - [x] 1.1 Install `drizzle-orm` and `@neondatabase/serverless` packages (already installed)
  - [x] 1.2 Install `drizzle-kit` as dev dependency (already present, verified)
  - [x] 1.3 Verify `drizzle.config.ts` is correctly configured

- [x] Task 2: Create database connection utility (AC: 5)
  - [x] 2.1 Create `server/db/` directory
  - [x] 2.2 Create `server/db/index.ts` with Neon serverless connection
  - [x] 2.3 Export `db` instance for use in services

- [x] Task 3: Add scrape_metadata table to schema (AC: 2)
  - [x] 3.1 Import pgTable, serial, varchar, integer, timestamp, text from drizzle-orm/pg-core
  - [x] 3.2 Define `scrapeMetadata` table with all columns
  - [x] 3.3 Export table and inferred types

- [x] Task 4: Add batter_projections table to schema (AC: 3)
  - [x] 4.1 Define `batterProjections` table with all columns
  - [x] 4.2 Add foreign key reference to scrape_metadata.id
  - [x] 4.3 Add index on scrape_id column
  - [x] 4.4 Export table and inferred types

- [x] Task 5: Add pitcher_projections table to schema (AC: 4)
  - [x] 5.1 Define `pitcherProjections` table with all columns
  - [x] 5.2 Add foreign key reference to scrape_metadata.id
  - [x] 5.3 Add index on scrape_id column
  - [x] 5.4 Export table and inferred types

- [x] Task 6: Create shared projection types (AC: 6)
  - [x] 6.1 Create `shared/types/` directory if not exists
  - [x] 6.2 Create `shared/types/projections.ts` with NewX and XRow types
  - [x] 6.3 Use Drizzle's `InferInsertModel` and `InferSelectModel` utilities

- [x] Task 7: Write unit tests (AC: 7)
  - [x] 7.1 Create `shared/schema.test.ts` for schema validation
  - [x] 7.2 Test that tables have expected column names
  - [x] 7.3 Test that foreign keys are properly defined

- [x] Task 8: Verify schema compilation (AC: 1-5)
  - [x] 8.1 TypeScript compilation verified (schema compiles correctly)
  - [x] 8.2 All 18 schema tests pass
  - [x] 8.3 Full test suite (42 tests) passes with no regressions

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow database naming conventions from [Source: docs/architecture.md#Database-Naming-Conventions]**

```typescript
// CORRECT - snake_case for table/column names in SQL strings
export const scrapeMetadata = pgTable('scrape_metadata', {
  id: serial('id').primaryKey(),
  scrapeType: varchar('scrape_type', { length: 20 }).notNull(),
  sourceUrl: varchar('source_url', { length: 500 }).notNull(),
  // ...
});

// WRONG - don't use camelCase in SQL name strings
export const scrapeMetadata = pgTable('scrapeMetadata', {
  scrapeType: varchar('scrapeType', { length: 20 }).notNull(), // WRONG
});
```

**CRITICAL: TypeScript variables remain camelCase [Source: project-context.md#Database-Naming]**

```typescript
// Variable name: camelCase
// SQL table name: snake_case
// SQL column name: snake_case
export const batterProjections = pgTable('batter_projections', {
  scrapeId: integer('scrape_id').references(() => scrapeMetadata.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Existing Schema Context

The `shared/schema.ts` file currently contains only Zod schemas for frontend state (league settings, player projections, draft state). These are NOT database tables - they're validation schemas.

**Current exports (DO NOT modify these):**
- `leagueSettingsSchema`, `scoringFormatSchema`, `playerProjectionSchema`, etc.
- These are Zod schemas used by frontend for validation
- They will coexist with new Drizzle table definitions

**New exports to add:**
- `scrapeMetadata` - Drizzle pgTable
- `batterProjections` - Drizzle pgTable
- `pitcherProjections` - Drizzle pgTable

### Drizzle ORM Patterns

**Table Definition Pattern:**

```typescript
import { pgTable, serial, varchar, integer, decimal, timestamp, text, index } from 'drizzle-orm/pg-core';

export const scrapeMetadata = pgTable('scrape_metadata', {
  id: serial('id').primaryKey(),
  scrapeType: varchar('scrape_type', { length: 20 }).notNull(),
  sourceUrl: varchar('source_url', { length: 500 }).notNull(),
  projectionSystem: varchar('projection_system', { length: 50 }).notNull(),
  playerCount: integer('player_count'),
  status: varchar('status', { length: 20 }).notNull(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});
```

**Foreign Key Pattern:**

```typescript
export const batterProjections = pgTable('batter_projections', {
  id: serial('id').primaryKey(),
  // ... other columns ...
  scrapeId: integer('scrape_id')
    .notNull()
    .references(() => scrapeMetadata.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  scrapeIdIdx: index('idx_batter_projections_scrape_id').on(table.scrapeId),
}));
```

**Type Inference Pattern:**

```typescript
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// Select type (includes id, created_at)
export type ScrapeMetadataRow = InferSelectModel<typeof scrapeMetadata>;

// Insert type (excludes auto-generated fields)
export type NewScrapeMetadata = InferInsertModel<typeof scrapeMetadata>;
```

### Database Connection Setup

**Neon Serverless Driver for Railway:**

```typescript
// server/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../shared/schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Alternative: Node Postgres (if Neon driver has issues):**

```typescript
// server/db/index.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle(pool, { schema });
```

### Column Type Reference

| PRD Requirement | Database Type | Drizzle Type |
|-----------------|---------------|--------------|
| Batting: PA, AB, H, HR, R, RBI, SB, BB, SO | INTEGER | `integer()` |
| Batting: AVG, OBP, SLG, wOBA | DECIMAL(5,3) | `decimal({ precision: 5, scale: 3 })` |
| Batting: wRC+ | INTEGER | `integer()` |
| Pitching: IP | DECIMAL(5,1) | `decimal({ precision: 5, scale: 1 })` |
| Pitching: W, L, SV, K, BB, HR | INTEGER | `integer()` |
| Pitching: ERA, WHIP, FIP | DECIMAL(4,2) | `decimal({ precision: 4, scale: 2 })` |

### Learnings from Story 1.1

**Applied to this story:**

1. **Vitest is configured** - Tests should use `import { describe, it, expect } from 'vitest'`
2. **Test file location** - Co-locate tests with source: `shared/schema.test.ts`
3. **TypeScript strict mode** - No `any` types; use `unknown` and type guards
4. **JSDoc comments** - Add to exported types for IDE support

### Index Naming Convention

From [Source: docs/architecture.md#Database-Naming-Conventions]:

```
idx_<table>_<column>
```

Examples:
- `idx_batter_projections_scrape_id`
- `idx_pitcher_projections_scrape_id`

### Testing Strategy

**Schema Validation Tests:**

```typescript
import { describe, it, expect } from 'vitest';
import { scrapeMetadata, batterProjections, pitcherProjections } from './schema';

describe('Database Schema', () => {
  describe('scrapeMetadata table', () => {
    it('should have correct table name', () => {
      // Access the table's SQL name
      expect(scrapeMetadata._.name).toBe('scrape_metadata');
    });

    it('should have required columns', () => {
      const columnNames = Object.keys(scrapeMetadata);
      expect(columnNames).toContain('scrapeType');
      expect(columnNames).toContain('sourceUrl');
      expect(columnNames).toContain('status');
    });
  });
});
```

### Dependencies to Install

```bash
# Required for Drizzle PostgreSQL
npm install drizzle-orm @neondatabase/serverless

# Already installed (verify)
# npm install -D drizzle-kit
```

### File Structure After This Story

```
shared/
├── schema.ts              # MODIFY - add Drizzle tables alongside existing Zod schemas
├── schema.test.ts         # NEW - schema validation tests
└── types/
    └── projections.ts     # NEW - Insert/Select type exports

server/
└── db/
    └── index.ts           # NEW - database connection utility
```

### Environment Variables Required

```
DATABASE_URL=postgresql://user:password@host:5432/database
```

Ensure this is set in Railway environment variables for deployment.

### References

- [Source: docs/architecture.md#Data-Architecture]
- [Source: docs/architecture.md#Database-Naming-Conventions]
- [Source: docs/epics.md#Story-1.2-Database-Schema-for-Projections]
- [Source: docs/prd.md#Data-Schema]
- [Source: project-context.md#Database-Naming]
- [Drizzle ORM PostgreSQL Documentation](https://orm.drizzle.team/docs/get-started-postgresql)

## Dev Agent Record

### Context Reference

Story created by create-story workflow with comprehensive context from:
- docs/epics.md (Story 1.2 requirements)
- docs/architecture.md (database patterns, naming conventions)
- docs/prd.md (data schema requirements)
- project-context.md (coding standards)
- shared/schema.ts (existing Zod schemas to preserve)
- drizzle.config.ts (database configuration)
- Story 1.1 learnings (vitest setup, strict TypeScript)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - story creation phase.

### Completion Notes List

- All three Drizzle tables defined with snake_case SQL names and camelCase TypeScript properties
- Database connection utility uses Neon serverless driver for Railway PostgreSQL compatibility
- TypeScript types exported using Drizzle's InferInsertModel and InferSelectModel utilities
- All 20 unit tests pass validating table names, column names, foreign keys, and type definitions
- Full test suite (44 tests) passes with no regressions from Story 1.1
- Vitest config updated to include `shared/**/*.test.ts` pattern
- Used `getTableName()` from drizzle-orm for table name verification (more reliable than internal `._` property)
- Added API response types (ApiBatterProjection, ApiPitcherProjection) for future use in Story 3.1

**Code Review Fixes Applied:**

- **M1:** Added `onDelete: 'cascade'` to foreign key references in both batterProjections and pitcherProjections tables
- **M2:** Implemented lazy database connection initialization via `getDb()` function - module no longer throws at load time
- **M4:** Strengthened foreign key tests to verify FK exists and onDelete CASCADE is configured using `getTableConfig()`

**Note:** `db:push` not run - requires DATABASE_URL environment variable. Tables will be created on first deployment to Railway.

### File List

**New Files:**

- server/db/index.ts - Database connection utility with Neon serverless driver
- shared/types/projections.ts - TypeScript types for DB operations (insert/select types, API types)
- shared/schema.test.ts - 18 schema validation tests

**Modified Files:**

- shared/schema.ts - Added Drizzle imports and 3 pgTable definitions (scrapeMetadata, batterProjections, pitcherProjections)
- vitest.config.ts - Added `shared/**/*.test.ts` to include patterns

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Implementation complete - all 8 tasks done, 18 new tests (42 total) passing | Amelia (Dev Agent) |
| 2025-12-10 | Code review fixes applied: M1 (onDelete CASCADE), M2 (lazy DB init), M4 (stronger FK tests) | Amelia (Dev Agent) |
