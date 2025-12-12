---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/prd.md
  - docs/index.md
  - docs/architecture.md (previous version - frontend only)
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-08'
project_name: 'FantasyBaseballAuction'
user_name: 'Dyl'
date: '2025-12-08'
---

# Fantasy Baseball Auction Calculator - Architecture

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines 18 functional requirements across 5 capability domains:

1. **Data Acquisition (FR1-5):** Automated web scraping of Fangraphs Steamer projections for both batting and pitching data. Includes nightly scheduling via cron, HTML table parsing, and single-retry failure handling.

2. **Data Storage (FR6-9):** Postgres database storage for player projections with scrape metadata (timestamp, player count, status, source). Uses a replacement strategy where fresh scrapes overwrite previous data.

3. **API Serving (FR10-12):** Two REST endpoints serving JSON - `/v1/projections/batters` and `/v1/projections/pitchers`. Responses include `lastUpdated` timestamp for frontend freshness display.

4. **Frontend Integration (FR13-16):** Auto-load projections on app startup eliminating manual CSV upload. Preserve CSV import as fallback. Display data freshness and error states.

5. **Monitoring & Reliability (FR17-18):** Structured logging for scrape events. Alert operator after 2 consecutive scrape failures.

**Non-Functional Requirements:**
13 NFRs that will drive architectural decisions:

| Category | Requirements | Impact |
|----------|--------------|--------|
| Performance | API < 500ms, scrape < 5min, DB queries < 100ms | Caching strategy, query optimization |
| Reliability | 99%+ uptime, graceful degradation, auto-retry | Fallback mechanisms, stale data serving |
| Integration | Handle HTML changes, respect rate limits, backward compat | Parser resilience, error logging |
| Data Quality | Min 500 batters/300 pitchers, validation before replace | Data integrity checks |

**Scale & Complexity:**

- Primary domain: API Backend with Frontend Integration
- Complexity level: Low-Medium
- Estimated architectural components: 4-5 (Scraper, Database, API, Frontend integration, Monitoring)

### Technical Constraints & Dependencies

**Existing System Constraints:**
- Must integrate with existing React 18 + Express.js monolith
- Express backend currently serves static files only - API routes are new
- Frontend uses React Context + localStorage - API data must flow into existing state management
- Existing CSV upload flow must continue to work as fallback

**External Dependencies:**
- Fangraphs website structure (HTML tables, URL patterns)
- Steamer projection system availability
- Postgres database hosting (Neon configured but unused)

**Deployment Constraints:**
- Currently deployed on Replit
- Nightly cron job execution environment needed

### Cross-Cutting Concerns Identified

1. **Error Handling & Graceful Degradation:** Scraper failures, API unavailability, and stale data scenarios must all degrade gracefully with clear user messaging

2. **Data Freshness Tracking:** Timestamps must flow from scrape → database → API → frontend for user awareness

3. **Monitoring & Alerting:** Centralized logging for scrape events with alerting mechanism for consecutive failures

4. **Backward Compatibility:** CSV upload remains functional; frontend must handle both API and manual data sources seamlessly

---

## Starter Template Evaluation

### Primary Technology Domain

API Backend extension to existing React + Express.js monolith

### Extension Strategy (vs. New Starter)

This project extends an existing production application rather than starting fresh. The current codebase already provides:

- **Frontend:** React 18.3.1 + Vite 5.4.20 + TypeScript 5.6.3
- **Backend:** Express 4.21.2 (static file serving)
- **Database:** Drizzle ORM + Neon PostgreSQL (configured, unused)
- **Styling:** Tailwind CSS 3.4.17 + Shadcn/ui
- **Build:** Vite (client) + esbuild (server)

### Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Extend Express** | Add API routes and scraper to existing server/ | Simplest path, no deployment changes, uses existing DB config | Couples scraper to web server |
| Separate Service | Standalone microservice for scraping/API | Clean separation, independent scaling | Over-engineered for scope, deployment complexity |
| Monorepo Restructure | Reorganize into apps/web, apps/api, packages/shared | Future-proof, clean boundaries | Significant refactor, delays MVP |

### Selected Approach: Extend Current Express Backend

**Rationale:**

- Express server infrastructure already exists and runs in production
- Drizzle ORM + Neon PostgreSQL already configured (just unused)
- No deployment changes required - same Replit environment
- Scope is simple: 1 scraper + 2 API endpoints
- "Boring technology that actually works" - matches project philosophy

**New Backend Components to Add:**

```
server/
├── index.ts              # Existing - add API route registration
├── routes/
│   └── v1/
│       └── projections.ts  # NEW - /v1/projections/* endpoints
├── services/
│   └── scraper/
│       ├── fangraphs.ts    # NEW - Scraping logic
│       └── scheduler.ts    # NEW - Cron job setup
└── db/
    └── projections.ts      # NEW - Database operations
```

**Architectural Decisions Inherited from Existing Stack:**

- **Language & Runtime:** TypeScript 5.6.3, Node.js
- **API Framework:** Express 4.21.2
- **Database ORM:** Drizzle with PostgreSQL
- **Validation:** Zod (already in use for frontend schemas)
- **Build Tooling:** esbuild for server bundle

**Note:** No project initialization needed - we're extending existing infrastructure.

---

## Core Architectural Decisions

### Decision Summary

| Category | Decision | Rationale |
|----------|----------|-----------|
| Database Schema | Separate Tables | Clean separation of batters/pitchers, independent scrape metadata |
| HTML Parsing | Cheerio | Lightweight, Fangraphs renders server-side HTML |
| Scheduling | node-cron | In-process, Railway keeps app running |
| API Errors | Structured format | `{ error: { code, message, details } }` for debuggability |
| Alerting | Console logging | MVP simplicity, structured logs for future integration |
| Data Source Priority | API First | Auto-load projections, CSV as explicit fallback |
| Deployment | Railway | PostgreSQL + cron support, migration from Replit |

### Data Architecture

**Database Schema: Separate Tables**

```sql
-- Batter projections
batter_projections (
  id, name, team, positions,
  pa, ab, h, hr, r, rbi, sb, bb, so, avg, obp, slg, woba, wrc_plus,
  scrape_id, created_at
)

-- Pitcher projections
pitcher_projections (
  id, name, team,
  ip, w, l, sv, era, whip, k, bb, hr, fip,
  scrape_id, created_at
)

-- Scrape metadata
scrape_metadata (
  id, scrape_type, source_url, projection_system,
  batter_count, pitcher_count, status, error_message,
  started_at, completed_at
)
```

**Data Replacement Strategy:** Each successful scrape inserts new rows with a new `scrape_id`. API serves only the latest successful scrape. Old data retained for debugging but not served.

### Scraping Architecture

**HTML Parsing: Cheerio**

- Lightweight jQuery-like parsing
- Fangraphs tables render server-side (no JS execution needed)
- Fast execution within 5-minute scrape window requirement

**Scheduling: node-cron**

- In-process scheduler runs within Express server
- Schedule: `0 4 * * *` (4:00 AM EST daily)
- Railway deployment keeps server running continuously

### API Design

**Error Response Format: Structured**

```typescript
interface ApiError {
  error: {
    code: string;        // e.g., "SCRAPE_STALE", "DB_ERROR"
    message: string;     // Human-readable message
    details?: unknown;   // Optional debugging info
  }
}

interface ApiSuccess<T> {
  data: T;
  meta: {
    lastUpdated: string; // ISO timestamp of last scrape
    count: number;       // Number of records
  }
}
```

### Monitoring & Alerting

**MVP: Structured Console Logging**

- All scrape events logged with consistent format
- Log levels: INFO (start/success), WARN (retry), ERROR (failure)
- Consecutive failure counter tracked in memory
- Future: Add webhook/email integration when needed

### Frontend Integration

**Data Source Priority: API First**

1. On app load, fetch from `/v1/projections/batters` and `/v1/projections/pitchers`
2. If API succeeds, populate `playerProjections` in AppContext
3. If API fails, show error message with "Upload CSV" fallback option
4. User can always override API data by uploading CSV manually

### Infrastructure & Deployment

**Platform: Railway**

- PostgreSQL provisioned via Railway (replacing Neon)
- Native cron support for scheduling
- Continuous deployment from GitHub
- Environment variables via Railway dashboard

**Migration from Replit:**

- Update `DATABASE_URL` to Railway Postgres connection string
- Add `railway.json` for deployment configuration
- Remove Replit-specific configuration

### Decision Impact Analysis

**Implementation Sequence:**

1. Database schema (Drizzle migrations)
2. Scraper service (Cheerio + node-cron)
3. API routes (Express endpoints)
4. Frontend integration (AppContext updates)
5. Railway deployment configuration

**New Dependencies to Add:**

- `cheerio` - HTML parsing
- `node-cron` - Scheduling
- `node-fetch` or native fetch - HTTP requests (Node 18+)

---

## Implementation Patterns & Consistency Rules

### Pattern Summary

These patterns ensure AI agents write consistent, compatible code across all new backend components.

| Category | Pattern | Example |
|----------|---------|---------|
| Database Naming | snake_case | `batter_projections`, `scrape_id` |
| API Routes | By version | `server/routes/v1/projections.ts` |
| Services | By feature | `server/services/scraper/`, `server/services/projections/` |
| Error Handling | Throw + middleware | Services throw, middleware formats response |
| Logging | JSON structured | `{"level":"info","event":"scrape_start",...}` |

### Database Naming Conventions

All database objects use **snake_case**:

```typescript
// Drizzle schema example
export const batterProjections = pgTable('batter_projections', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  scrapeId: integer('scrape_id').references(() => scrapeMetadata.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Rules:**

- Table names: plural snake_case (`batter_projections`, `scrape_metadata`)
- Column names: snake_case (`scrape_id`, `created_at`)
- Foreign keys: `<referenced_table_singular>_id` (`scrape_id`)
- Indexes: `idx_<table>_<column>` (`idx_batter_projections_scrape_id`)

### API Route Organization

Routes organized **by version** in `server/routes/`:

```
server/routes/
└── v1/
    └── projections.ts    # /v1/projections/* endpoints
```

**Rules:**

- Version prefix in directory, not repeated in file
- One file per resource (`projections.ts` handles both batters and pitchers)
- Router exported and mounted in `server/index.ts`

### Service Organization

Services organized **by feature**:

```
server/services/
├── scraper/
│   ├── index.ts          # Main scraper orchestration
│   ├── fangraphs.ts      # Fangraphs-specific parsing
│   └── scheduler.ts      # Cron job setup
└── projections/
    └── index.ts          # Projection data operations
```

**Rules:**

- Feature folder contains all related logic
- `index.ts` exports public interface
- Internal modules named by specific responsibility

### Error Handling Pattern

**Throw + Express Error Middleware:**

```typescript
// Custom error class
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
  }
}

// Service throws
async function scrapeProjections() {
  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError('SCRAPE_FAILED', 'Failed to fetch Fangraphs data', 502);
  }
}

// Error middleware formats
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details }
    });
  }
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
});
```

### Logging Pattern

**JSON Structured Logging:**

```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function log(level: LogEntry['level'], event: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data && { data }
  }));
}

// Usage
log('info', 'scrape_start', { type: 'batters', url: FANGRAPHS_BATTERS_URL });
log('info', 'scrape_complete', { type: 'batters', count: 523, durationMs: 2341 });
log('error', 'scrape_failed', { type: 'batters', error: err.message, attempt: 1 });
```

**Standard Events:**

- `scrape_start` - Scrape job beginning
- `scrape_complete` - Scrape succeeded
- `scrape_failed` - Scrape failed (includes attempt number)
- `scrape_retry` - Retry attempt starting
- `db_write_complete` - Database write succeeded
- `api_request` - API endpoint called

### Enforcement Guidelines

**All AI Agents MUST:**

1. Use snake_case for all database table and column names
2. Place new API routes under `server/routes/v1/`
3. Throw `AppError` for known error conditions, let middleware handle formatting
4. Use the `log()` function with standard event names for all scraper operations
5. Follow existing TypeScript strict mode and Zod validation patterns

**Pattern Verification:**

- TypeScript compiler catches naming inconsistencies in Drizzle schema
- ESLint rules enforce camelCase in code, snake_case in DB strings
- Code review checks route organization and error handling patterns

---

## Executive Summary

A production-grade React single-page application for fantasy baseball auction draft value calculation and live draft management. The application uses a client-side architecture with localStorage persistence, featuring a sophisticated calculation engine for player value analysis.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React Application                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │   Pages     │  │ Components  │  │    Context      │   │  │
│  │  │ - Settings  │  │ - UI Kit    │  │  (AppContext)   │   │  │
│  │  │ - Draft     │  │ - Forms     │  │                 │   │  │
│  │  └─────────────┘  └─────────────┘  └────────┬────────┘   │  │
│  │                                              │             │  │
│  │  ┌─────────────────────────────────────────┐│             │  │
│  │  │         Calculation Engine              ││             │  │
│  │  │ - Z-Score Analysis                      ││             │  │
│  │  │ - Position Allocation                   ││             │  │
│  │  │ - VAR Calculation                       ││             │  │
│  │  │ - Inflation Tracking                    ││             │  │
│  │  └─────────────────────────────────────────┘│             │  │
│  │                                              ▼             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                  localStorage                        │  │  │
│  │  │  (fantasy-baseball-app-state)                       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (static files only)
┌─────────────────────────────────────────────────────────────────┐
│                    Express Server (minimal)                      │
│  - Serves static files in production                            │
│  - Vite dev server middleware in development                    │
│  - No active API routes                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Language | TypeScript | 5.6.3 | Type safety |
| Frontend | React | 18.3.1 | UI framework |
| Build Tool | Vite | 5.4.20 | Dev server & bundling |
| Backend | Express | 4.21.2 | Static file serving |
| UI Components | Shadcn/ui | New York | Radix-based components |
| Styling | Tailwind CSS | 3.4.17 | Utility-first CSS |
| Routing | Wouter | 3.3.5 | Client-side routing |
| State | React Context | - | Global app state |
| Forms | React Hook Form + Zod | 7.55.0 / 3.24.2 | Form handling & validation |
| CSV Parsing | PapaParse | 5.5.3 | Projection imports |
| PDF Export | jsPDF + AutoTable | 3.0.4 / 5.0.2 | Cheat sheet generation |

## Application Flow

### User Workflow

1. **League Configuration** (`/`) - Define team count, budget, roster positions
2. **Scoring Format** - Choose Roto, H2H Categories, or H2H Points
3. **Projection Upload** - Import hitter/pitcher CSVs with column mapping
4. **Value Calculation** - Generate auction values using Z-Score/SGP methods
5. **Draft Room** (`/draft`) - Live draft with inflation tracking

### State Management

The application uses a centralized React Context (`AppContext`) with localStorage persistence:

```typescript
interface AppContextType {
  leagueSettings: LeagueSettings | null;
  scoringFormat: ScoringFormat | null;
  valueCalculationSettings: ValueCalculationSettings | null;
  playerProjections: PlayerProjection[];
  projectionFiles: ProjectionFile[];
  playerValues: PlayerValue[];
  draftState: DraftState | null;
  myTeamName: string;
  targetedPlayerIds: string[];
}
```

**Persistence Strategy:**
- All state persisted to `localStorage` under key `fantasy-baseball-app-state`
- Automatic save on every state change
- State normalized on load (team name validation, pick normalization)

## Calculation Engine (v2.0)

### Core Algorithm Flow

1. **Player Classification**
   - Identify hitters vs pitchers based on position eligibility
   - Handle two-way players (both hitting and pitching stats)

2. **Z-Score Calculation**
   - Per-category Z-scores with rate stat weighting
   - Volume-adjusted scoring (IP weight for ERA, AB weight for AVG)
   - Negative stat handling (ERA, WHIP inverted)

3. **Position Allocation**
   - Build draftable pool respecting league roster requirements
   - Handle multi-eligibility (MI = 2B/SS, CI = 1B/3B, UTIL = any hitter)
   - Players assigned to optimal position based on Z-score ranking

4. **Replacement Level**
   - Three methods: Last Drafted, First Undrafted, Blended
   - Per-position replacement levels
   - Tracks replacement player name for transparency

5. **VAR (Value Above Replacement)**
   - Player Z-score minus position replacement level
   - Negative VAR clamped to 0

6. **Dollar Conversion**
   - Reserve $1 per roster spot
   - Hitter/Pitcher budget split (calculated, manual, or preset)
   - Position scarcity multipliers (optional)

7. **Value Tiers**
   - ELITE (top 5%), STAR (70-95th), STARTER (30-70th), BENCH (5-30th), REPLACEMENT

### Inflation Tracking

```typescript
function calculateInflation(
  playerValues: PlayerValue[],
  draftPicks: DraftPick[],
  leagueSettings: LeagueSettings,
  pendingBids: PendingBid[] = []
): { inflationRate: number; adjustedValues: PlayerValue[] }
```

- Real-time inflation calculation during draft
- Pending bid system (prices "locked" before confirmation)
- Remaining budget = totalBudget - confirmedSpent - pendingSpent

## Data Models

### Core Schemas (Zod-validated)

```typescript
// League Configuration
LeagueSettings {
  teamCount: number (2-30)
  auctionBudget: number
  totalRosterSpots: number
  positionRequirements: { C, 1B, 2B, 3B, SS, OF, UTIL, MI, CI, SP, RP, P, BENCH }
}

// Scoring Format (discriminated union)
ScoringFormat =
  | { type: "roto" | "h2h-categories", hittingCategories, pitchingCategories }
  | { type: "h2h-points", hittingPoints, pitchingPoints }

// Player Value (calculated)
PlayerValue {
  id, name, team, positions
  originalValue: number
  adjustedValue?: number (inflation-adjusted)
  var: number (value above replacement)
  valueTier: "elite" | "star" | "starter" | "bench" | "replacement"
  isDrafted, draftPrice, draftedBy
  isDraftable, assignedPosition
}

// Draft State
DraftState {
  picks: DraftPick[]
  currentInflationRate: number
  totalBudgetSpent: number
  totalPlayersAvailable: number
  totalPlayersDrafted: number
}
```

## Component Architecture

### Pages
- `LeagueSettingsPage` (`/`) - Multi-step configuration wizard
- `DraftRoom` (`/draft`) - Live draft interface with player table and metrics

### Feature Components
| Component | Purpose |
|-----------|---------|
| `league-config-form` | Team/budget/roster configuration |
| `scoring-format-selector` | Scoring type and category selection |
| `projection-uploader` | CSV upload with column mapping |
| `value-calculation-panel` | Calculation method settings |
| `draft-player-table` | Sortable/filterable player grid |
| `draft-log` | Pick history with undo capability |
| `draft-metrics` | Budget/inflation dashboard |
| `positional-needs-tracker` | Roster slot tracking |
| `pdf-export-dialog` | Cheat sheet generation |

### UI Kit (Shadcn/ui)
48 Radix-based components in `client/src/components/ui/`

## Design System

**Baseball Card Aesthetic:**
- Warm parchment backgrounds (#F5E6D3, #FFF8E7)
- Baseball leather browns (#8B4513, #A0522D)
- Crisp navy accents (#1E3A5F, #2C5282)
- Forest green for positive values

**Typography:**
- Display: Bebas Neue / Oswald (headers)
- Monospace: Roboto Mono / JetBrains Mono (numbers)
- Body: Inter / Work Sans

## Development & Deployment

### Scripts
```bash
npm run dev      # Vite dev server with HMR
npm run build    # Production build (Vite + esbuild)
npm run start    # Production server
npm run check    # TypeScript type checking
npm run db:push  # Drizzle schema push (unused)
```

### Build Output
- Client: `dist/public/` (Vite bundle)
- Server: `dist/index.js` (esbuild bundle)

### Environment
- Development: Vite dev server with Express middleware
- Production: Express serves static files from dist/public

## Database (Configured but Unused)

Drizzle ORM with Neon PostgreSQL is configured but not actively used:
- Schema definitions in `shared/schema.ts`
- Migration output to `./migrations`
- Connection via `DATABASE_URL` environment variable

The database infrastructure exists for potential future features:

- Multi-user support
- Draft sharing
- Historical analysis

---

## Project Structure & Boundaries

### Complete Project Directory Structure

Files marked with `# NEW` are additions for the Fangraphs API feature:

```text
FantasyBaseballAuction/
├── .github/
│   └── workflows/
│       └── ci.yml
├── client/
│   └── src/
│       ├── components/
│       │   ├── ui/                    # Shadcn components (48 files)
│       │   └── features/
│       │       ├── projection-uploader.tsx
│       │       ├── projection-source-toggle.tsx  # NEW - API vs CSV toggle
│       │       └── ...
│       ├── lib/
│       │   ├── app-context.tsx        # Existing - add projection fetching
│       │   ├── api-client.ts          # NEW - API fetch utilities
│       │   └── ...
│       └── pages/
│           ├── LeagueSettingsPage.tsx
│           └── DraftRoom.tsx
├── server/
│   ├── index.ts                       # Existing - add route registration
│   ├── routes/                        # NEW directory
│   │   └── v1/                        # NEW
│   │       └── projections.ts         # NEW - /v1/projections/* endpoints
│   ├── services/                      # NEW directory
│   │   ├── scraper/                   # NEW
│   │   │   ├── index.ts               # NEW - Scraper orchestration
│   │   │   ├── fangraphs.ts           # NEW - HTML parsing logic
│   │   │   └── scheduler.ts           # NEW - node-cron setup
│   │   └── projections/               # NEW
│   │       └── index.ts               # NEW - DB operations
│   ├── lib/                           # NEW directory
│   │   ├── errors.ts                  # NEW - AppError class
│   │   └── logger.ts                  # NEW - JSON logging utility
│   └── middleware/                    # NEW directory
│       └── error-handler.ts           # NEW - Express error middleware
├── shared/
│   ├── schema.ts                      # Existing - add projection tables
│   └── types/                         # NEW directory
│       └── projections.ts             # NEW - Shared projection types
├── migrations/                        # Drizzle migrations (existing, unused)
├── docs/
│   ├── architecture.md                # This document
│   ├── prd.md                         # Product requirements
│   └── ...
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── railway.json                       # NEW - Railway deployment config
└── .env.example                       # Update with new vars
```

### Architectural Boundaries

#### API Boundaries

```text
External API (Public):
  /v1/projections/batters   → GET → JSON array of batter projections
  /v1/projections/pitchers  → GET → JSON array of pitcher projections

Internal Service Boundaries:
  server/routes/      → HTTP layer, request/response handling
  server/services/    → Business logic, orchestration
  shared/schema.ts    → Database schema definitions
```

#### Component Boundaries

```text
Frontend (client/):
  - React Context manages all state
  - Components fetch via api-client.ts
  - No direct DB access

Backend (server/):
  - Routes handle HTTP concerns only
  - Services contain business logic
  - Services throw AppError, middleware formats response

Shared (shared/):
  - Types and schemas used by both
  - No runtime logic, just definitions
```

#### Data Flow

```text
Scraping Flow:
  node-cron → scheduler.ts → fangraphs.ts → projections service → database

API Request Flow:
  Browser → /v1/projections/* → routes/v1/projections.ts → projections service → database → JSON response

Frontend Integration Flow:
  App load → api-client.ts → /v1/projections/* → AppContext → Components
       ↓ (on error)
  Show error → User uploads CSV → AppContext → Components
```

### Requirements to Structure Mapping

| PRD Requirement | Implementation Location |
|-----------------|------------------------|
| FR1-3: Scrape Fangraphs | `server/services/scraper/fangraphs.ts` |
| FR4: Nightly schedule | `server/services/scraper/scheduler.ts` |
| FR5: Retry logic | `server/services/scraper/index.ts` |
| FR6-9: Database storage | `shared/schema.ts`, `server/services/projections/` |
| FR10-12: API endpoints | `server/routes/v1/projections.ts` |
| FR13-14: Auto-load projections | `client/src/lib/api-client.ts`, `app-context.tsx` |
| FR15-16: CSV fallback | `client/src/components/features/projection-uploader.tsx` |
| FR17-18: Logging/alerting | `server/lib/logger.ts`, `server/services/scraper/index.ts` |

### New Files Summary

#### Backend Files

- **`server/routes/v1/projections.ts`** - Express router with `GET /v1/projections/batters` and `GET /v1/projections/pitchers`
- **`server/services/scraper/index.ts`** - Main orchestration with `runScrape()` and retry logic
- **`server/services/scraper/fangraphs.ts`** - Cheerio-based HTML parsing for batting and pitching tables
- **`server/services/scraper/scheduler.ts`** - node-cron configuration for 4 AM daily schedule
- **`server/services/projections/index.ts`** - Database operations for reading/writing projections
- **`server/lib/errors.ts`** - `AppError` class for structured error handling
- **`server/lib/logger.ts`** - JSON structured logging utility
- **`server/middleware/error-handler.ts`** - Express error middleware

#### Shared Files

- **`shared/schema.ts`** (additions) - Drizzle tables for `scrape_metadata`, `batter_projections`, `pitcher_projections`
- **`shared/types/projections.ts`** - TypeScript types for projection data

#### Frontend Files

- **`client/src/lib/api-client.ts`** - Fetch utilities with error handling
- **`client/src/components/features/projection-source-toggle.tsx`** - UI for API vs CSV selection

#### Configuration Files

- **`railway.json`** - Railway deployment configuration

---

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices work together seamlessly:

- TypeScript 5.6.3 for both frontend and backend
- Express 4.21.2 extended with API routes
- Drizzle ORM with PostgreSQL for data layer
- Cheerio for lightweight HTML parsing
- node-cron for in-process scheduling

**Pattern Consistency:** Implementation patterns align with technology stack:

- snake_case in database matches PostgreSQL conventions
- Structured JSON logging works with Railway log aggregation
- AppError + middleware pattern is idiomatic Express
- Service-based organization fits feature-by-feature structure

**Structure Alignment:** Project structure supports all decisions:

- Routes/services/lib separation enables clean testing
- Shared schema accessible to both client and server
- Middleware pattern allows cross-cutting concerns

### Requirements Coverage Validation

**All 18 Functional Requirements Covered:**

| Category | FRs | Architecture Support |
|----------|-----|---------------------|
| Data Acquisition | FR1-5 | scraper service, Cheerio, node-cron |
| Data Storage | FR6-9 | Drizzle schema, projections service |
| API Serving | FR10-12 | Express routes, structured responses |
| Frontend Integration | FR13-16 | api-client, AppContext, CSV fallback |
| Monitoring | FR17-18 | JSON logger, failure tracking |

**All 13 Non-Functional Requirements Addressed:**

- Performance: Simple queries, no complex joins
- Reliability: Retry logic, graceful degradation
- Integration: Cheerio resilience, error logging
- Data Quality: Validation before database write

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with versions, rationale, and examples.

**Structure Completeness:** Complete file structure with clear NEW file markers and responsibility descriptions.

**Pattern Completeness:** All potential conflict points addressed with concrete examples and enforcement guidelines.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Low-Medium)
- [x] Technical constraints identified (existing stack, Replit→Railway)
- [x] Cross-cutting concerns mapped (errors, logging, freshness)

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (API-first, CSV fallback)
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established (snake_case DB, camelCase code)
- [x] Structure patterns defined (by-version routes, by-feature services)
- [x] Communication patterns specified (throw + middleware)
- [x] Process patterns documented (JSON logging, retry logic)

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established (client/server/shared)
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Extends existing production infrastructure (minimal risk)
- Uses proven, boring technology that works
- Clear separation between scraper, API, and frontend
- Comprehensive patterns prevent AI agent conflicts

**Post-MVP Enhancements:**

- Response caching for API endpoints
- Health check endpoint for monitoring
- Manual scrape trigger for testing
- Multiple projection system support (ZiPS, ATC)

### Implementation Handoff

**AI Agent Guidelines:**

1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries
4. Refer to this document for all architectural questions

**Implementation Sequence:**

1. Add Drizzle schema for projection tables (`shared/schema.ts`)
2. Create scraper service (`server/services/scraper/`)
3. Create projections service (`server/services/projections/`)
4. Add API routes (`server/routes/v1/projections.ts`)
5. Add error handling middleware
6. Update frontend to fetch from API
7. Configure Railway deployment

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED

**Total Steps Completed:** 8

**Date Completed:** 2025-12-08

**Document Location:** docs/architecture.md

### Final Architecture Deliverables

**Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**

- 7 core architectural decisions made
- 5 implementation patterns defined
- 4 architectural components specified (Scraper, Database, API, Frontend)
- 18 functional + 13 non-functional requirements fully supported

**AI Agent Implementation Guide**

- Technology stack with verified versions
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Next Steps

1. **Install new dependencies:** `npm install cheerio node-cron @types/cheerio @types/node-cron`
2. **Add Drizzle schema** for projection tables in `shared/schema.ts`
3. **Create scraper service** in `server/services/scraper/`
4. **Create API routes** in `server/routes/v1/projections.ts`
5. **Update frontend** to fetch from API on load
6. **Configure Railway** deployment with PostgreSQL

---

**Architecture Status:** READY FOR IMPLEMENTATION
