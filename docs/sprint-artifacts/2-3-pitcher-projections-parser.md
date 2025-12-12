# Story 2.3: Pitcher Projections Parser

Status: done

## Story

As a developer,
I want to parse pitching projections from the Fangraphs HTML page,
So that pitcher data can be extracted and stored in the database.

## Acceptance Criteria

1. **AC1: fetchPitcherProjections Function Implementation**
   - Replace placeholder in `server/services/scraper/fangraphs.ts`
   - Function fetches HTML from `FANGRAPHS_PITCHERS_URL` using native fetch
   - Sets User-Agent header to avoid blocking
   - Returns array of `NewPitcherProjection` objects
   - Throws `AppError('SCRAPE_FAILED', ...)` on fetch failure

2. **AC2: JSON Parsing (Same Pattern as Batters)**
   - Uses Cheerio to extract `__NEXT_DATA__` script tag content
   - Parses JSON to extract pitcher data array
   - Handles Next.js page structure (same as batter parser)
   - Throws appropriate AppError if JSON structure is invalid

3. **AC3: Field Mapping**
   - Maps each row to a `NewPitcherProjection` with all required fields:
     - `name` (string, required) - Player full name
     - `team` (string | null) - Team abbreviation
     - `ip` (string with 1 decimal place, e.g., "180.0") - Innings pitched
     - `w`, `l`, `sv`, `k`, `bb`, `hr` (integers) - Counting stats
     - `era`, `whip`, `fip` (strings with 2 decimal places, e.g., "3.45")
   - All integer stats default to 0 for missing/null values
   - All decimal stats default to "0.00" or "0.0" for missing/null values
   - Team defaults to null if missing

4. **AC4: Data Validation**
   - Validates minimum 300 pitchers captured (NFR11 from PRD)
   - Throws `AppError('SCRAPE_FAILED', 'Insufficient pitchers: ...')` if below threshold
   - Logs `scrape_complete` with player count on success

5. **AC5: Error Handling**
   - HTTP errors throw `AppError('SCRAPE_FAILED', ...)` with status 502
   - Parse errors throw `AppError('SCRAPE_FAILED', 'Failed to parse HTML: ...')` with status 502
   - Logs error details for debugging

6. **AC6: Unit Tests Pass**
   - Tests exist for successful fetch and parse flow (mocked HTML)
   - Tests exist for HTTP error handling
   - Tests exist for parse error handling
   - Tests verify minimum player count validation
   - Tests verify field mapping for all stat columns
   - All tests pass with mocked fetch responses

## Tasks / Subtasks

- [x] Task 1: Implement fetchPitcherProjections function (AC: 1, 2)
  - [x] 1.1 Write failing test for successful fetch returning pitchers
  - [x] 1.2 Implement fetch with User-Agent header (copy pattern from batters)
  - [x] 1.3 Write failing test for HTTP error (non-200 status)
  - [x] 1.4 Implement HTTP error handling with AppError

- [x] Task 2: Implement JSON parsing with Cheerio (AC: 2)
  - [x] 2.1 Write failing test for parsing __NEXT_DATA__ JSON
  - [x] 2.2 Implement parseFangraphsPitchers helper function
  - [x] 2.3 Write failing test for parse error (invalid JSON structure)
  - [x] 2.4 Implement parse error handling

- [x] Task 3: Implement field mapping (AC: 3)
  - [x] 3.1 Write failing test for correct field mapping
  - [x] 3.2 Implement field extraction from FangraphsPitcherData
  - [x] 3.3 Write failing test for missing/null value defaults
  - [x] 3.4 Implement default value handling for all fields
  - [x] 3.5 Write failing test for decimal formatting (ip, era, whip, fip)
  - [x] 3.6 Implement decimal string formatting (1 decimal for IP, 2 for rates)

- [x] Task 4: Implement data validation (AC: 4)
  - [x] 4.1 Write failing test for minimum player count validation
  - [x] 4.2 Implement minimum 300 pitchers check
  - [x] 4.3 Add scrape_complete logging with count

- [x] Task 5: Integration verification (AC: 6)
  - [x] 5.1 Run full test suite (117 tests pass)
  - [x] 5.2 Verify no regressions in existing scraper tests
  - [x] 5.3 Verify TypeScript compilation passes

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow architecture patterns from [Source: docs/architecture.md#Scraping-Architecture]**

- Use same Cheerio + __NEXT_DATA__ JSON approach as batter parser
- Set User-Agent header to avoid blocking
- Throw AppError for all failure cases, let middleware format

### Fangraphs Pitchers URL (Already Defined)

```typescript
// Already defined in fangraphs.ts from Story 2.1
export const FANGRAPHS_PITCHERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all&pageitems=2000';
```

### Existing Code to Leverage

The batter parser implementation provides a complete pattern to follow. Key reusable elements:

1. **FangraphsPitcherData interface** (already defined in fangraphs.ts):
```typescript
interface FangraphsPitcherData {
  PlayerName: string;
  Team: string;
  IP: number;
  W: number;
  L: number;
  SV: number;
  K: number;
  BB: number;
  HR: number;
  ERA: number;
  WHIP: number;
  FIP: number;
}
```

2. **Utility functions** (already exist):
   - `parseIntSafe(value)` - Safely parses integers with default 0
   - `formatDecimal(value)` - Formats numbers to 3 decimal places
   - `parseCSVLine(line)` - Parses CSV with quoted fields

3. **Constants** (already defined):
   - `MIN_PITCHERS = 300`
   - `USER_AGENT` - Browser user agent string

### Implementation Pattern (Follow Batter Parser)

```typescript
/**
 * Fetches and parses pitcher projections from Fangraphs.
 * Uses JSON extraction from __NEXT_DATA__ script tag.
 *
 * @returns Array of pitcher projections
 * @throws {AppError} SCRAPE_FAILED on fetch or parse failure
 */
export async function fetchPitcherProjections(): Promise<NewPitcherProjection[]> {
  log('info', 'fetch_pitchers_start', { url: FANGRAPHS_PITCHERS_URL, source: 'fangraphs' });

  try {
    const response = await fetch(FANGRAPHS_PITCHERS_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      throw new AppError(
        'SCRAPE_FAILED',
        `HTTP ${response.status}: Failed to fetch Fangraphs pitchers`,
        502
      );
    }

    const html = await response.text();
    const pitchers = parseFangraphsPitchers(html);

    if (pitchers.length < MIN_PITCHERS) {
      throw new AppError(
        'SCRAPE_FAILED',
        `Insufficient pitchers: ${pitchers.length} (minimum ${MIN_PITCHERS})`,
        502
      );
    }

    log('info', 'fetch_pitchers_complete', { count: pitchers.length, source: 'fangraphs' });
    return pitchers;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'SCRAPE_FAILED',
      `Failed to fetch Fangraphs pitchers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      502
    );
  }
}

/**
 * Parses pitcher projections from Fangraphs HTML.
 * Extracts JSON from __NEXT_DATA__ script tag.
 */
function parseFangraphsPitchers(html: string): NewPitcherProjection[] {
  const $ = cheerio.load(html);
  const scriptTag = $('#__NEXT_DATA__');

  if (!scriptTag.length) {
    throw new AppError(
      'SCRAPE_FAILED',
      'Failed to parse HTML: __NEXT_DATA__ script tag not found',
      502
    );
  }

  let nextData: FangraphsNextData;
  try {
    nextData = JSON.parse(scriptTag.text());
  } catch {
    throw new AppError(
      'SCRAPE_FAILED',
      'Failed to parse HTML: Invalid JSON in __NEXT_DATA__',
      502
    );
  }

  const playersData = nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data;
  if (!Array.isArray(playersData)) {
    throw new AppError(
      'SCRAPE_FAILED',
      'Failed to parse HTML: Player data array not found in expected location',
      502
    );
  }

  return (playersData as FangraphsPitcherData[]).map((player) => ({
    name: player.PlayerName || '',
    team: player.Team || null,
    ip: formatDecimalIP(player.IP),  // 1 decimal place for IP
    w: Math.round(player.W || 0),
    l: Math.round(player.L || 0),
    sv: Math.round(player.SV || 0),
    k: Math.round(player.K || 0),
    bb: Math.round(player.BB || 0),
    hr: Math.round(player.HR || 0),
    era: formatDecimalRate(player.ERA),  // 2 decimal places
    whip: formatDecimalRate(player.WHIP),  // 2 decimal places
    fip: formatDecimalRate(player.FIP),  // 2 decimal places
    scrapeId: 0, // Will be set by caller
  }));
}

// New utility function needed for IP (1 decimal) vs rates (2 decimals)
function formatDecimalIP(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0';
  }
  return value.toFixed(1);
}

function formatDecimalRate(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}
```

### Database Schema Reference

From [Source: shared/schema.ts#pitcher_projections]:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| name | varchar(255) | required | Player full name |
| team | varchar(10) | null | Team abbreviation (e.g., "NYY") |
| ip | decimal(5,1) | "0.0" | Innings pitched (e.g., "180.0") |
| w | integer | 0 | Wins |
| l | integer | 0 | Losses |
| sv | integer | 0 | Saves |
| k | integer | 0 | Strikeouts |
| bb | integer | 0 | Walks allowed |
| hr | integer | 0 | Home runs allowed |
| era | decimal(4,2) | "0.00" | Earned run average |
| whip | decimal(4,2) | "0.00" | Walks + Hits per IP |
| fip | decimal(4,2) | "0.00" | Fielding Independent Pitching |

### Test Strategy

**Test file:** `server/services/scraper/fangraphs.test.ts` (add to existing)

**Sample JSON Fixture for Tests:**

```typescript
const SAMPLE_PITCHER_NEXT_DATA = {
  props: {
    pageProps: {
      dehydratedState: {
        queries: [{
          state: {
            data: [
              {
                PlayerName: 'Gerrit Cole',
                Team: 'NYY',
                IP: 180.0,
                W: 12,
                L: 7,
                SV: 0,
                K: 210,
                BB: 45,
                HR: 22,
                ERA: 3.45,
                WHIP: 1.12,
                FIP: 3.28,
              },
              // ... generate 300+ entries for validation tests
            ],
          },
        }],
      },
    },
  },
};
```

**Test Cases Required:**

1. `should fetch and parse pitchers successfully` - 300+ pitchers returned
2. `should set User-Agent header` - Verify header in fetch call
3. `should throw AppError on HTTP failure` - 503 response
4. `should throw AppError when __NEXT_DATA__ missing` - Invalid HTML
5. `should throw AppError when JSON is invalid` - Malformed JSON
6. `should throw AppError when player data array missing` - Wrong JSON structure
7. `should throw AppError when insufficient pitchers` - Less than 300
8. `should map all pitcher fields correctly` - Field mapping verification
9. `should handle missing/null values with defaults` - Default values
10. `should format IP with 1 decimal place` - "180.0" not "180"
11. `should format ERA/WHIP/FIP with 2 decimal places` - "3.45" not "3.4"

### Learnings from Story 2.2 to Apply

1. **Fangraphs uses Next.js JSON, not HTML tables** - Already discovered and implemented
2. **FangraphsNextData interface is generic** - Works for both batters and pitchers
3. **Use same error handling pattern** - AppError with SCRAPE_FAILED code
4. **Log events consistently** - fetch_pitchers_start, fetch_pitchers_complete
5. **Mock fetch globally in tests** - `global.fetch = vi.fn()`

### Key Differences from Batter Parser

| Aspect | Batters | Pitchers |
|--------|---------|----------|
| URL | `stats=bat` | `stats=pit` |
| Minimum count | 500 | 300 |
| Fields | PA, AB, H, HR, R, RBI, SB, BB, SO, AVG, OBP, SLG, wOBA, wRC+ | IP, W, L, SV, K, BB, HR, ERA, WHIP, FIP |
| Decimal format | 3 places for rate stats | 1 place for IP, 2 places for ERA/WHIP/FIP |
| Log events | fetch_batters_* | fetch_pitchers_* |

### File Structure After This Story

```
server/services/scraper/
├── index.ts          # Existing - orchestration (calls fetchPitcherProjections)
├── index.test.ts     # Existing - orchestration tests
├── fangraphs.ts      # MODIFIED - implement fetchPitcherProjections
└── fangraphs.test.ts # MODIFIED - add pitcher parser tests
```

### Integration with Scraper Orchestration

The `runScrape('pitchers')` function in `server/services/scraper/index.ts` already calls `fetchPitcherProjections()`. Once implemented, the full scrape flow will work:

```typescript
// In index.ts (already exists)
export async function runScrape(type: ScrapeType): Promise<void> {
  // ...
  if (type === 'pitchers') {
    const pitchers = await fetchPitcherProjections();
    await insertPitcherProjections(scrapeRecord.id, pitchers);
  }
  // ...
}
```

### Environment Variables

No new environment variables required.

### Dependencies

No new dependencies required - Cheerio already installed from Story 2.2.

### References

- [Source: docs/architecture.md#Scraping-Architecture]
- [Source: docs/architecture.md#HTML-Parsing-Cheerio]
- [Source: docs/epics.md#Story-2.3-Pitcher-Projections-Parser]
- [Source: docs/prd.md#FR2] - Scrape pitching projection data
- [Source: docs/prd.md#FR3] - Parse HTML tables (now JSON) for player data
- [Source: docs/prd.md#NFR11] - Data Quality: Min 300 pitchers
- [Source: project-context.md#Error-Handling]
- [Source: shared/schema.ts#pitcher_projections] - Database schema
- [Source: shared/types/projections.ts#NewPitcherProjection] - TypeScript type
- [Source: server/services/scraper/fangraphs.ts] - Existing code with batter parser pattern
- [Source: docs/sprint-artifacts/2-2-batter-projections-parser.md] - Previous story learnings

## Dev Agent Record

### Context Reference

Story created by create-story workflow with comprehensive context from:
- docs/epics.md (Story 2.3 requirements, AC, technical notes)
- docs/architecture.md (scraping architecture, Cheerio usage, error handling)
- docs/prd.md (FR2-3 scraping requirements, NFR11 data quality)
- project-context.md (coding standards, error handling patterns)
- Story 2.2 implementation (batter parser - provides complete pattern to follow)
- shared/schema.ts (pitcher_projections table structure)
- shared/types/projections.ts (NewPitcherProjection type)
- server/services/scraper/fangraphs.ts (existing code with batter implementation)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

1. **Implementation follows batter parser pattern exactly**: Used same `__NEXT_DATA__` JSON extraction approach that was discovered in Story 2.2.

2. **New utility functions added**: `formatDecimalIP()` for 1 decimal place (innings pitched) and `formatDecimalRate()` for 2 decimal places (ERA, WHIP, FIP).

3. **Test coverage**: 10 new tests covering all acceptance criteria - successful parsing, field mapping, decimal formatting, HTTP errors, JSON parse errors, validation errors, and network errors.

4. **Full test suite passes**: 117 tests pass with no regressions. TypeScript compilation clean.

### File List

- `server/services/scraper/fangraphs.ts` - Implemented `fetchPitcherProjections()` and `parseFangraphsPitchers()` functions, plus utility functions `formatDecimalIP()` and `formatDecimalRate()`
- `server/services/scraper/fangraphs.test.ts` - Added 11 tests for pitcher parsing (total 30 tests in file: 3 URL tests, 8 Fangraphs batter tests, 8 JA batter tests, 11 pitcher tests)

**Dependencies (created in earlier stories):**
- `server/lib/errors.ts` - AppError class (Story 2.1)
- `server/lib/logger.ts` - log() utility (Story 2.1)
- `server/services/scraper/index.ts` - Orchestration that calls fetchPitcherProjections() (Story 2.1)
- `shared/types/projections.ts` - NewPitcherProjection type (Story 1.2)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context from Story 2.2 learnings | Amelia (Dev Agent) |
| 2025-12-10 | Implementation complete - all ACs satisfied, 117 tests passing | Amelia (Dev Agent) |
| 2025-12-10 | Code review: Updated File List with dependencies, corrected test counts | Amelia (Dev Agent) |
