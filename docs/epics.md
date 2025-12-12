# FantasyBaseballAuction - Epic Breakdown

**Author:** Dyl
**Date:** 2025-12-08
**Project Level:** MVP
**Target Scale:** Single-user fantasy baseball auction calculator with automated projections

---

## Overview

This document provides the complete epic and story breakdown for FantasyBaseballAuction, decomposing the requirements from the [PRD](./prd.md) into implementable stories.

**Living Document Notice:** This is the initial version created from PRD + Architecture analysis.

---

## Functional Requirements Inventory

### Data Acquisition (FR1-5)
| FR | Description |
|----|-------------|
| FR1 | System can scrape batting projection data from Fangraphs Steamer projections page |
| FR2 | System can scrape pitching projection data from Fangraphs Steamer projections page |
| FR3 | System can parse HTML tables to extract player names, teams, positions, and statistical projections |
| FR4 | System can execute scraping jobs on a nightly schedule |
| FR5 | System can retry failed scrape attempts once before marking as failed |

### Data Storage (FR6-9)
| FR | Description |
|----|-------------|
| FR6 | System can store batter projections in a database |
| FR7 | System can store pitcher projections in a database |
| FR8 | System can store scrape metadata (timestamp, player count, status, source) |
| FR9 | System can replace previous projection data with fresh scrape results |

### API Serving (FR10-12)
| FR | Description |
|----|-------------|
| FR10 | Frontend can retrieve all batter projections via API endpoint |
| FR11 | Frontend can retrieve all pitcher projections via API endpoint |
| FR12 | API responses can include last-updated timestamp for data freshness display |

### Frontend Integration (FR13-16)
| FR | Description |
|----|-------------|
| FR13 | Users can view projections automatically on app startup without manual upload |
| FR14 | Users can see when projection data was last updated |
| FR15 | Users can upload CSV projections manually as fallback when API data unavailable |
| FR16 | Users can see an error message when projections fail to load |

### Monitoring & Reliability (FR17-18)
| FR | Description |
|----|-------------|
| FR17 | System can log scrape success/failure events |
| FR18 | System can alert operator after 2 consecutive scrape failures |

**Total: 18 Functional Requirements**

---

## FR Coverage Map

| FR | Epic | Story | Description |
|----|------|-------|-------------|
| FR1 | 2 | 2.1, 2.2 | Scrape batting projections |
| FR2 | 2 | 2.1, 2.3 | Scrape pitching projections |
| FR3 | 2 | 2.2, 2.3 | Parse HTML tables |
| FR4 | 2 | 2.4 | Nightly schedule |
| FR5 | 2 | 2.5 | Retry logic |
| FR6 | 1 | 1.2 | Store batter projections |
| FR7 | 1 | 1.2 | Store pitcher projections |
| FR8 | 1 | 1.2 | Store scrape metadata |
| FR9 | 2 | 2.1 | Replace previous data |
| FR10 | 3 | 3.1 | GET batters endpoint |
| FR11 | 3 | 3.1 | GET pitchers endpoint |
| FR12 | 3 | 3.1 | Include lastUpdated |
| FR13 | 4 | 4.1 | Auto-load projections |
| FR14 | 4 | 4.2 | Show data freshness |
| FR15 | 4 | 4.3 | CSV fallback |
| FR16 | 4 | 4.1 | Error messaging |
| FR17 | 2 | 2.5 | Log scrape events |
| FR18 | 2 | 2.5 | Alert on failures |

---

## Epic Summary

| Epic | Title | FRs Covered | Dependencies |
|------|-------|-------------|--------------|
| 1 | Backend Foundation & Database Setup | FR6-9 | None |
| 2 | Fangraphs Scraper Service | FR1-5, FR17-18 | Epic 1 |
| 3 | Projections API Endpoints | FR10-12 | Epic 1, 2 |
| 4 | Frontend Integration & Fallback | FR13-16 | Epic 3 |

---

## Epic 1: Backend Foundation & Database Setup

**Goal:** Establish the backend infrastructure required to store and retrieve projection data, including database schema, error handling utilities, and logging foundation.

**User Value:** Enables the system to persistently store projection data, setting the foundation for automated data delivery to users.

**FRs Covered:** FR6, FR7, FR8, FR9

---

### Story 1.1: Backend Utilities Setup

As a developer,
I want error handling and logging utilities in place,
So that all backend services have consistent error formatting and structured logging.

**Acceptance Criteria:**

**Given** the server codebase exists
**When** I create the backend utilities
**Then** the following files are created:

1. `server/lib/errors.ts` - AppError class
   - Constructor accepts: `code: string`, `message: string`, `statusCode: number`, `details?: unknown`
   - Extends base Error class
   - Exports `AppError` for use throughout backend

2. `server/lib/logger.ts` - JSON structured logging utility
   - `log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>)` function
   - Outputs JSON format: `{ level, event, timestamp, data }`
   - Standard events: `scrape_start`, `scrape_complete`, `scrape_failed`, `scrape_retry`, `db_write_complete`

3. `server/middleware/error-handler.ts` - Express error middleware
   - Catches `AppError` instances and formats as `{ error: { code, message, details } }`
   - Catches unknown errors and returns `{ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }`
   - Sets appropriate HTTP status codes

**And** error middleware is registered in `server/index.ts`

**Technical Notes:**
- Follow Architecture section on Error Handling Pattern [Source: docs/architecture.md#Error-Handling-Pattern]
- Follow Architecture section on Logging Pattern [Source: docs/architecture.md#Logging-Pattern]
- Use TypeScript strict mode

**Prerequisites:** None

---

### Story 1.2: Database Schema for Projections

As a developer,
I want database tables for storing projection data,
So that scraped projections can be persisted and retrieved efficiently.

**Acceptance Criteria:**

**Given** the Drizzle ORM is configured in `shared/schema.ts`
**When** I add the projection tables
**Then** the following tables are defined:

1. `scrape_metadata` table:
   - `id` - serial primary key
   - `scrape_type` - varchar (e.g., 'batters', 'pitchers')
   - `source_url` - varchar
   - `projection_system` - varchar (e.g., 'steamer')
   - `player_count` - integer
   - `status` - varchar ('success', 'failed')
   - `error_message` - text (nullable)
   - `started_at` - timestamp
   - `completed_at` - timestamp (nullable)

2. `batter_projections` table:
   - `id` - serial primary key
   - `name` - varchar(255) not null
   - `team` - varchar(10)
   - `positions` - varchar(50)
   - `pa`, `ab`, `h`, `hr`, `r`, `rbi`, `sb`, `bb`, `so` - integer
   - `avg`, `obp`, `slg`, `woba` - decimal(5,3)
   - `wrc_plus` - integer
   - `scrape_id` - integer, foreign key to scrape_metadata.id
   - `created_at` - timestamp with default now()

3. `pitcher_projections` table:
   - `id` - serial primary key
   - `name` - varchar(255) not null
   - `team` - varchar(10)
   - `ip` - decimal(5,1)
   - `w`, `l`, `sv`, `k`, `bb`, `hr` - integer
   - `era`, `whip`, `fip` - decimal(4,2)
   - `scrape_id` - integer, foreign key to scrape_metadata.id
   - `created_at` - timestamp with default now()

**And** all table names use snake_case (e.g., `batter_projections`, `scrape_metadata`)
**And** all column names use snake_case in the database (e.g., `scrape_id`, `created_at`)
**And** TypeScript variable names remain camelCase in Drizzle schema definitions

**Technical Notes:**
- Follow Architecture section on Database Naming Conventions [Source: docs/architecture.md#Database-Naming-Conventions]
- Follow Architecture section on Data Architecture [Source: docs/architecture.md#Data-Architecture]
- Add indexes for `scrape_id` columns for query performance

**Prerequisites:** Story 1.1

---

### Story 1.3: Projections Database Service

As a developer,
I want a service layer for projection database operations,
So that other services can easily read and write projection data.

**Acceptance Criteria:**

**Given** the database schema from Story 1.2 exists
**When** I create the projections service
**Then** `server/services/projections/index.ts` is created with:

1. `createScrapeRecord(type: 'batters' | 'pitchers', sourceUrl: string)`
   - Creates new scrape_metadata record with status 'in_progress'
   - Returns the scrape record with id

2. `completeScrapeRecord(scrapeId: number, playerCount: number)`
   - Updates scrape_metadata with status 'success', player_count, completed_at

3. `failScrapeRecord(scrapeId: number, errorMessage: string)`
   - Updates scrape_metadata with status 'failed', error_message, completed_at

4. `insertBatterProjections(scrapeId: number, batters: BatterProjection[])`
   - Bulk inserts batter projections linked to scrape_id
   - Uses transaction for atomicity

5. `insertPitcherProjections(scrapeId: number, pitchers: PitcherProjection[])`
   - Bulk inserts pitcher projections linked to scrape_id
   - Uses transaction for atomicity

6. `getLatestBatterProjections()`
   - Returns all batters from most recent successful scrape
   - Includes scrape metadata for lastUpdated timestamp

7. `getLatestPitcherProjections()`
   - Returns all pitchers from most recent successful scrape
   - Includes scrape metadata for lastUpdated timestamp

8. `getLatestScrapeMetadata(type: 'batters' | 'pitchers')`
   - Returns most recent successful scrape record for type

**And** service throws `AppError` for database failures
**And** service uses the `log()` utility for `db_write_complete` events

**Technical Notes:**
- Follow Architecture section on Service Organization [Source: docs/architecture.md#Service-Organization]
- Use Drizzle ORM query builder
- Export types for `BatterProjection` and `PitcherProjection` from `shared/types/projections.ts`

**Prerequisites:** Story 1.2

---

## Epic 2: Fangraphs Scraper Service

**Goal:** Implement automated scraping of Steamer projections from Fangraphs, with retry logic, structured logging, and failure alerting.

**User Value:** Fresh projection data is automatically fetched nightly, ensuring users always have current Steamer projections without manual intervention.

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR17, FR18

---

### Story 2.1: Scraper Service Foundation

As a developer,
I want a scraper service structure with orchestration logic,
So that scraping jobs can be executed with proper error handling and retry logic.

**Acceptance Criteria:**

**Given** the backend utilities and database service exist
**When** I create the scraper service foundation
**Then** `server/services/scraper/index.ts` is created with:

1. `runScrape(type: 'batters' | 'pitchers')` - Main orchestration function
   - Calls `createScrapeRecord()` to start tracking
   - Calls appropriate fetch/parse function
   - On success: calls `completeScrapeRecord()` and inserts projections
   - On failure: implements single retry, then calls `failScrapeRecord()`
   - Logs all events using structured logger

2. `runFullScrape()` - Scrapes both batters and pitchers
   - Calls `runScrape('batters')` then `runScrape('pitchers')`
   - Tracks consecutive failure count in memory
   - Logs alert event after 2 consecutive failures (FR18)

3. Consecutive failure tracking
   - `consecutiveFailures` counter (in-memory)
   - Resets to 0 on any successful scrape
   - Logs `scrape_alert` event when reaching 2 failures

**And** all scrape events are logged with structured JSON format
**And** retry waits 5 seconds before second attempt

**Technical Notes:**

- Follow Architecture section on Scraping Architecture [Source: docs/architecture.md#Scraping-Architecture]
- Use the `log()` utility for all events
- Standard events: `scrape_start`, `scrape_complete`, `scrape_failed`, `scrape_retry`, `scrape_alert`

**Prerequisites:** Story 1.3

---

### Story 2.2: Batter Projections Parser

As a developer,
I want to parse batting projections from the Fangraphs HTML page,
So that batter data can be extracted and stored in the database.

**Acceptance Criteria:**

**Given** the Fangraphs batters URL: `https://www.fangraphs.com/projections?type=steamer&stats=bat&pos=&team=0&players=0&lg=all&pageitems=2000`
**When** I fetch and parse the page
**Then** `server/services/scraper/fangraphs.ts` contains:

1. `fetchBatterProjections()` function that:
   - Fetches HTML from the batters URL using native fetch
   - Parses HTML using Cheerio
   - Extracts table rows from the projections table
   - Maps each row to a `BatterProjection` object with fields:
     - `name`, `team`, `positions`
     - `pa`, `ab`, `h`, `hr`, `r`, `rbi`, `sb`, `bb`, `so`
     - `avg`, `obp`, `slg`, `woba`, `wrcPlus`
   - Returns array of `BatterProjection` objects
   - Throws `AppError('SCRAPE_FAILED', ...)` on fetch or parse failure

**And** parser handles missing/null values gracefully (defaults to 0 or empty string)
**And** parser validates minimum 500 batters captured (FR Data Quality NFR11)
**And** parser logs `scrape_complete` with player count on success

**Technical Notes:**

- Use Cheerio for HTML parsing [Source: docs/architecture.md#HTML-Parsing-Cheerio]
- Fangraphs renders tables server-side, no JS execution needed
- Set User-Agent header to avoid blocking

**Prerequisites:** Story 2.1

---

### Story 2.3: Pitcher Projections Parser

As a developer,
I want to parse pitching projections from the Fangraphs HTML page,
So that pitcher data can be extracted and stored in the database.

**Acceptance Criteria:**

**Given** the Fangraphs pitchers URL: `https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all&pageitems=2000`
**When** I fetch and parse the page
**Then** `server/services/scraper/fangraphs.ts` contains:

1. `fetchPitcherProjections()` function that:
   - Fetches HTML from the pitchers URL using native fetch
   - Parses HTML using Cheerio
   - Extracts table rows from the projections table
   - Maps each row to a `PitcherProjection` object with fields:
     - `name`, `team`
     - `ip`, `w`, `l`, `sv`, `era`, `whip`, `k`, `bb`, `hr`, `fip`
   - Returns array of `PitcherProjection` objects
   - Throws `AppError('SCRAPE_FAILED', ...)` on fetch or parse failure

**And** parser handles missing/null values gracefully
**And** parser validates minimum 300 pitchers captured (FR Data Quality NFR11)
**And** parser logs `scrape_complete` with player count on success

**Technical Notes:**

- Use same Cheerio pattern as batter parser
- Share common parsing utilities if possible

**Prerequisites:** Story 2.2

---

### Story 2.4: Cron Job Scheduler

As a developer,
I want scraping jobs to run automatically on a nightly schedule,
So that projection data stays fresh without manual intervention.

**Acceptance Criteria:**

**Given** the scraper service is complete
**When** I implement the scheduler
**Then** `server/services/scraper/scheduler.ts` is created with:

1. `initializeScheduler()` function that:
   - Uses node-cron to schedule `runFullScrape()`
   - Schedule: `0 4 * * *` (4:00 AM EST daily)
   - Logs `scheduler_started` event on initialization

2. Scheduler is initialized in `server/index.ts` on server startup

**And** scheduler runs within the Express server process (in-process scheduling)
**And** scheduler logs each scheduled run start

**Technical Notes:**

- Use node-cron for scheduling [Source: docs/architecture.md#Scheduling-node-cron]
- Railway deployment keeps server running continuously
- Add `npm install node-cron @types/node-cron`

**Prerequisites:** Story 2.3

---

### Story 2.5: Manual Scrape Trigger (Development)

As a developer,
I want a way to manually trigger scraping for testing,
So that I can verify the scraper works without waiting for the scheduled time.

**Acceptance Criteria:**

**Given** the scraper and scheduler are complete
**When** I add a manual trigger
**Then** one of these options is implemented:

Option A: Environment-based trigger
- If `RUN_SCRAPE_ON_START=true`, run `runFullScrape()` on server startup

Option B: Admin endpoint (development only)
- `POST /api/admin/scrape` triggers `runFullScrape()`
- Only available when `NODE_ENV=development`

**And** manual trigger uses the same scraper logic as scheduled runs
**And** results are logged the same way as scheduled runs

**Technical Notes:**

- This is a development convenience, not a production feature
- Choose simplest option that enables testing

**Prerequisites:** Story 2.4

---

## Epic 3: Projections API Endpoints

**Goal:** Expose REST API endpoints for retrieving projection data, enabling the frontend to fetch projections on app load.

**User Value:** Users can access projection data via API, enabling zero-friction onboarding where projections appear immediately on app startup.

**FRs Covered:** FR10, FR11, FR12

---

### Story 3.1: Projections API Routes

As a user,
I want API endpoints that return projection data,
So that the frontend can fetch and display projections automatically.

**Acceptance Criteria:**

**Given** the projections database service exists
**When** I create the API routes
**Then** `server/routes/v1/projections.ts` is created with:

1. `GET /v1/projections/batters`
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

2. `GET /v1/projections/pitchers`
   - Calls `getLatestPitcherProjections()` from projections service
   - Returns same JSON response format as batters
   - Returns 503 with error if no projection data available

**And** routes are registered in `server/index.ts` under `/v1` prefix
**And** error responses follow structured format: `{ error: { code, message } }`
**And** API responses complete within 500ms (NFR1)

**Technical Notes:**

- Follow Architecture section on API Route Organization [Source: docs/architecture.md#API-Route-Organization]
- Follow Architecture section on API Design [Source: docs/architecture.md#API-Design]
- Use Express Router pattern

**Prerequisites:** Story 1.3, Story 2.3 (data must exist to serve)

---

### Story 3.2: API Health and Metadata Endpoint

As a developer,
I want a health check endpoint that includes scrape status,
So that I can monitor the API and data freshness.

**Acceptance Criteria:**

**Given** the projections API exists
**When** I add a health endpoint
**Then** `GET /v1/health` returns:

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

**And** returns `status: "degraded"` if scrape data is older than 48 hours
**And** returns `status: "unhealthy"` if no scrape data exists

**Technical Notes:**

- This endpoint helps with Railway health checks
- Useful for monitoring data freshness

**Prerequisites:** Story 3.1

---

## Epic 4: Frontend Integration & Fallback

**Goal:** Integrate the frontend with the projections API, enabling automatic data loading on app startup with CSV fallback for reliability.

**User Value:** Users experience zero-friction onboarding - projections load automatically when they open the app. If the API fails, they can still upload CSV manually.

**FRs Covered:** FR13, FR14, FR15, FR16

---

### Story 4.1: API Client and Auto-Load Projections

As a user,
I want projections to load automatically when I open the app,
So that I can start calculating auction values immediately without uploading files.

**Acceptance Criteria:**

**Given** the projections API endpoints exist
**When** the app loads
**Then** the following is implemented:

1. `client/src/lib/api-client.ts` is created with:
   - `fetchBatterProjections()` - calls `GET /v1/projections/batters`
   - `fetchPitcherProjections()` - calls `GET /v1/projections/pitchers`
   - Both functions return typed projection data
   - Both functions throw on network or API errors

2. `AppContext` is updated to:
   - Call both fetch functions on initial load (useEffect)
   - Populate `playerProjections` state with API data
   - Store `lastUpdated` timestamp from API response
   - Set loading state during fetch
   - Set error state if fetch fails

**And** users see projections immediately on app startup (within 2 seconds)
**And** loading indicator shows while fetching
**And** error message displays if API fails (FR16)

**Technical Notes:**

- Follow Architecture section on Frontend Integration [Source: docs/architecture.md#Frontend-Integration]
- API data flows into existing `playerProjections` in AppContext
- Maintain backward compatibility with existing state structure

**Prerequisites:** Story 3.1

---

### Story 4.2: Data Freshness Display

As a user,
I want to see when projection data was last updated,
So that I know how current my auction values are.

**Acceptance Criteria:**

**Given** projections are loaded from API
**When** I view the app
**Then** the data freshness is displayed:

1. Show "Last updated: [date/time]" in the projection section
2. Format: "Last updated: Dec 15, 2024 at 4:00 AM"
3. If data is older than 24 hours, show warning style (yellow/amber)
4. If data is older than 48 hours, show error style (red)

**And** freshness indicator appears near the projection data
**And** freshness updates when new data is loaded

**Technical Notes:**

- Use `meta.lastUpdated` from API response
- Store in AppContext for access across components
- Use existing Shadcn/ui components for styling

**Prerequisites:** Story 4.1

---

### Story 4.3: CSV Fallback with Error Messaging

As a user,
I want to upload CSV projections manually when API data is unavailable,
So that I can still use the app even if the automated scraping fails.

**Acceptance Criteria:**

**Given** the API fetch fails or returns no data
**When** the app displays the error state
**Then** the following behavior occurs:

1. Error message displays: "Unable to load latest projections"
2. Prominent "Upload CSV" button appears below error message
3. Clicking button opens existing CSV upload flow
4. After successful CSV upload:
   - Error message clears
   - Projections display from CSV data
   - "Using manually uploaded projections" indicator shows

**And** existing CSV upload functionality continues to work
**And** users can choose to upload CSV even when API data is available (override)
**And** CSV data takes precedence over API data when manually uploaded

**Technical Notes:**

- Preserve existing `projection-uploader.tsx` component
- Add error state handling in AppContext
- Follow PRD Journey 3 (Marcus fallback path) [Source: docs/prd.md#Journey-3]

**Prerequisites:** Story 4.2

---

### Story 4.4: Projection Source Toggle

As a user,
I want to choose between API and CSV projections,
So that I can use my preferred data source.

**Acceptance Criteria:**

**Given** projections are available from API
**When** I want to use custom projections
**Then** I can:

1. See current projection source indicator ("API" or "CSV")
2. Click to switch to CSV upload mode
3. Upload custom CSV projections
4. Switch back to API projections if desired

**And** toggle is accessible but not prominent (most users use API)
**And** selection persists in localStorage
**And** clear indication of which source is currently active

**Technical Notes:**

- Create `projection-source-toggle.tsx` component
- Store preference in AppContext with localStorage persistence
- Default to API source

**Prerequisites:** Story 4.3

---

## Summary

This epic breakdown covers all 18 functional requirements across 4 epics and 13 stories:

| Epic | Stories | FRs Covered |
|------|---------|-------------|
| 1: Backend Foundation | 3 | FR6-9 |
| 2: Fangraphs Scraper | 5 | FR1-5, FR17-18 |
| 3: Projections API | 2 | FR10-12 |
| 4: Frontend Integration | 4 | FR13-16 |

**Total: 14 stories covering 18 FRs**

---

_For implementation: Use the `sprint-planning` workflow to create sprint-status.yaml, then `create-story` to generate individual story files with full implementation context._

