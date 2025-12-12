# Story 2.2: Batter Projections Parser

Status: done

## Story

As a developer,
I want to parse batting projections from the Fangraphs HTML page,
So that batter data can be extracted and stored in the database.

## Acceptance Criteria

1. **AC1: fetchBatterProjections Function Implementation**
   - Replace placeholder in `server/services/scraper/fangraphs.ts`
   - Function fetches HTML from `FANGRAPHS_BATTERS_URL` using native fetch
   - Sets User-Agent header to avoid blocking
   - Returns array of `NewBatterProjection` objects
   - Throws `AppError('SCRAPE_FAILED', ...)` on fetch failure

2. **AC2: HTML Parsing with Cheerio**
   - Uses Cheerio to parse the HTML response
   - Identifies the projections data table correctly
   - Extracts all visible player rows from the table
   - Handles Fangraphs' table structure (may have nested elements)

3. **AC3: Field Mapping**
   - Maps each row to a `NewBatterProjection` with all required fields:
     - `name` (string, required) - Player full name
     - `team` (string | null) - Team abbreviation
     - `positions` (string, required) - Position eligibility (e.g., "OF", "1B/OF")
     - `pa`, `ab`, `h`, `hr`, `r`, `rbi`, `sb`, `bb`, `so` (integers)
     - `avg`, `obp`, `slg`, `woba` (strings with 3 decimal places, e.g., "0.285")
     - `wrcPlus` (integer)
   - All integer stats default to 0 for missing/null values
   - All decimal stats default to "0.000" for missing/null values
   - Team defaults to null if missing

4. **AC4: Data Validation**
   - Validates minimum 500 batters captured (NFR11 from PRD)
   - Throws `AppError('SCRAPE_FAILED', 'Insufficient batters: ...')` if below threshold
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

- [x] Task 1: Add Cheerio dependency (AC: 2)
  - [x] 1.1 Install cheerio package: `npm install cheerio`
  - [x] 1.2 Install types: `npm install -D @types/cheerio`
  - [x] 1.3 Verify TypeScript recognizes cheerio imports

- [x] Task 2: Research Fangraphs HTML structure (AC: 2, 3)
  - [x] 2.1 Manually inspect Fangraphs batters projection page HTML
  - [x] 2.2 Identify table selector for projections data (discovered __NEXT_DATA__ JSON approach)
  - [x] 2.3 Identify column headers and their order
  - [x] 2.4 Document column-to-field mapping in code comments
  - [x] 2.5 Save sample HTML snippet for test fixtures

- [x] Task 3: Implement fetchBatterProjections - fetch logic (AC: 1, 5)
  - [x] 3.1 Write failing test for successful fetch returning batters
  - [x] 3.2 Implement fetch with User-Agent header
  - [x] 3.3 Write failing test for HTTP error (non-200 status)
  - [x] 3.4 Implement HTTP error handling with AppError

- [x] Task 4: Implement HTML parsing with Cheerio (AC: 2, 3)
  - [x] 4.1 Write failing test for parsing sample HTML fixture
  - [x] 4.2 Implement Cheerio parsing to extract __NEXT_DATA__ JSON
  - [x] 4.3 Write failing test for parse error (invalid HTML structure)
  - [x] 4.4 Implement parse error handling

- [x] Task 5: Implement field mapping (AC: 3)
  - [x] 5.1 Write failing test for correct field mapping
  - [x] 5.2 Implement parseFangraphsBatters helper function
  - [x] 5.3 Write failing test for missing/null value defaults
  - [x] 5.4 Implement default value handling for all fields
  - [x] 5.5 Write failing test for decimal formatting (avg, obp, slg, woba)
  - [x] 5.6 Implement decimal string formatting

- [x] Task 6: Implement data validation (AC: 4)
  - [x] 6.1 Write failing test for minimum player count validation
  - [x] 6.2 Implement minimum 500 batters check
  - [x] 6.3 Add scrape_complete logging with count

- [x] Task 7: Integration verification (AC: 6)
  - [x] 7.1 Run full test suite (110 tests pass)
  - [x] 7.2 Verify no regressions in scraper orchestration tests
  - [x] 7.3 Verify TypeScript compilation passes

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow architecture patterns from [Source: docs/architecture.md#Scraping-Architecture]**

- Use Cheerio for HTML parsing (lightweight, server-side rendering)
- Set User-Agent header to avoid blocking
- Throw AppError for all failure cases, let middleware format

### Fangraphs URL

```typescript
// Already defined in fangraphs.ts from Story 2.1
export const FANGRAPHS_BATTERS_URL =
  'https://www.fangraphs.com/projections?type=steamer&stats=bat&pos=&team=0&players=0&lg=all&pageitems=2000';
```

### Expected HTML Structure (Research Required)

Fangraphs projection tables typically render server-side. The table structure needs research, but expect:

```html
<!-- Approximate structure - verify during Task 2 -->
<table class="rgMasterTable" id="ProjectionBoard...">
  <thead>
    <tr>
      <th>Name</th>
      <th>Team</th>
      <th>PA</th>
      <!-- ... more columns -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="...">Player Name</a></td>
      <td>NYY</td>
      <td>600</td>
      <!-- ... more cells -->
    </tr>
  </tbody>
</table>
```

### Implementation Pattern

```typescript
import * as cheerio from 'cheerio';
import { AppError } from '../../lib/errors';
import { log } from '../../lib/logger';
import type { NewBatterProjection } from '../../../shared/types/projections';

const MIN_BATTERS = 500;
const USER_AGENT = 'Mozilla/5.0 (compatible; FantasyBaseballApp/1.0)';

export async function fetchBatterProjections(): Promise<NewBatterProjection[]> {
  log('info', 'fetch_batters_start', { url: FANGRAPHS_BATTERS_URL });

  // Fetch HTML
  const response = await fetch(FANGRAPHS_BATTERS_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new AppError(
      'SCRAPE_FAILED',
      `HTTP ${response.status}: Failed to fetch Fangraphs batters`,
      502
    );
  }

  const html = await response.text();

  // Parse HTML
  const $ = cheerio.load(html);
  const batters: NewBatterProjection[] = [];

  // TODO: Replace with actual selectors after research
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    const batter = parseRow($, cells);
    if (batter) {
      batters.push(batter);
    }
  });

  // Validate count
  if (batters.length < MIN_BATTERS) {
    throw new AppError(
      'SCRAPE_FAILED',
      `Insufficient batters: ${batters.length} (minimum ${MIN_BATTERS})`,
      502
    );
  }

  log('info', 'fetch_batters_complete', { count: batters.length });
  return batters;
}

// Helper to parse a single row
function parseRow($: cheerio.CheerioAPI, cells: cheerio.Cheerio<any>): NewBatterProjection | null {
  // Skip header rows or empty rows
  if (cells.length < 10) return null;

  // TODO: Adjust indices based on actual column order from research
  return {
    name: $(cells[0]).text().trim(),
    team: $(cells[1]).text().trim() || null,
    positions: $(cells[2]).text().trim() || 'DH',
    pa: parseIntSafe($(cells[3]).text()),
    ab: parseIntSafe($(cells[4]).text()),
    h: parseIntSafe($(cells[5]).text()),
    hr: parseIntSafe($(cells[6]).text()),
    r: parseIntSafe($(cells[7]).text()),
    rbi: parseIntSafe($(cells[8]).text()),
    sb: parseIntSafe($(cells[9]).text()),
    bb: parseIntSafe($(cells[10]).text()),
    so: parseIntSafe($(cells[11]).text()),
    avg: parseDecimalSafe($(cells[12]).text()),
    obp: parseDecimalSafe($(cells[13]).text()),
    slg: parseDecimalSafe($(cells[14]).text()),
    woba: parseDecimalSafe($(cells[15]).text()),
    wrcPlus: parseIntSafe($(cells[16]).text()),
    scrapeId: 0, // Will be set by caller
  };
}

function parseIntSafe(value: string): number {
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDecimalSafe(value: string): string {
  const parsed = parseFloat(value.trim());
  return isNaN(parsed) ? '0.000' : parsed.toFixed(3);
}
```

### Test Strategy

**Test file:** `server/services/scraper/fangraphs.test.ts` (update existing)

**Mock Strategy:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchBatterProjections, FANGRAPHS_BATTERS_URL } from './fangraphs';
import { AppError } from '../../lib/errors';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('../../lib/logger', () => ({
  log: vi.fn(),
}));

// Sample HTML fixture (create after researching actual structure)
const SAMPLE_HTML = `
<html>
  <table class="rgMasterTable">
    <tbody>
      <!-- 500+ rows for validation test -->
    </tbody>
  </table>
</html>
`;

describe('fetchBatterProjections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and parse batters successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => SAMPLE_HTML,
    });

    const batters = await fetchBatterProjections();

    expect(mockFetch).toHaveBeenCalledWith(
      FANGRAPHS_BATTERS_URL,
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.any(String),
        }),
      })
    );
    expect(batters.length).toBeGreaterThanOrEqual(500);
  });

  it('should throw AppError on HTTP failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(fetchBatterProjections()).rejects.toMatchObject({
      code: 'SCRAPE_FAILED',
      statusCode: 502,
    });
  });

  it('should throw AppError when insufficient batters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<html><table><tbody></tbody></table></html>',
    });

    await expect(fetchBatterProjections()).rejects.toMatchObject({
      code: 'SCRAPE_FAILED',
      message: expect.stringContaining('Insufficient batters'),
    });
  });
});
```

### Field Mapping Reference

From [Source: shared/schema.ts#batter_projections] and [Source: docs/epics.md#Story-2.2]:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| name | varchar(255) | required | Player full name |
| team | varchar(10) | null | Team abbreviation (e.g., "NYY") |
| positions | varchar(50) | required | Position eligibility (e.g., "OF", "1B/OF") |
| pa | integer | 0 | Plate appearances |
| ab | integer | 0 | At bats |
| h | integer | 0 | Hits |
| hr | integer | 0 | Home runs |
| r | integer | 0 | Runs scored |
| rbi | integer | 0 | Runs batted in |
| sb | integer | 0 | Stolen bases |
| bb | integer | 0 | Walks |
| so | integer | 0 | Strikeouts |
| avg | decimal(5,3) | "0.000" | Batting average |
| obp | decimal(5,3) | "0.000" | On-base percentage |
| slg | decimal(5,3) | "0.000" | Slugging percentage |
| woba | decimal(5,3) | "0.000" | Weighted on-base average |
| wrcPlus | integer | 0 | wRC+ (weighted runs created plus) |

### Learnings from Story 2.1

**Applied to this story:**

1. **Use `vi.useFakeTimers()` if needed** - May not be needed here since no delays
2. **Mock fetch globally** - Use `global.fetch = vi.fn()` pattern
3. **Error message extraction** - Use pattern `error instanceof Error ? error.message : 'Unknown error'`
4. **AppError consistency** - Always include code, message, statusCode

### File Structure After This Story

```
server/services/scraper/
├── index.ts          # Existing from 2.1 - orchestration
├── index.test.ts     # Existing from 2.1 - orchestration tests
├── fangraphs.ts      # MODIFIED - implement fetchBatterProjections
└── fangraphs.test.ts # MODIFIED - add batter parser tests
```

### Dependencies

**New dependencies to add:**

```bash
npm install cheerio
npm install -D @types/cheerio
```

### Environment Variables

No new environment variables required.

### References

- [Source: docs/architecture.md#Scraping-Architecture]
- [Source: docs/architecture.md#HTML-Parsing-Cheerio]
- [Source: docs/epics.md#Story-2.2-Batter-Projections-Parser]
- [Source: docs/prd.md#FR1-FR3]
- [Source: docs/prd.md#NFR11] - Data Quality: Min 500 batters
- [Source: project-context.md#Error-Handling]
- [Source: shared/schema.ts#batter_projections] - Database schema
- [Source: shared/types/projections.ts] - TypeScript types
- [Source: server/services/scraper/fangraphs.ts] - Current placeholder
- [Source: server/services/scraper/index.ts] - Orchestration (calls this function)
- [Source: server/lib/errors.ts] - AppError class

## Dev Agent Record

### Context Reference

Story created by create-story workflow with comprehensive context from:
- docs/epics.md (Story 2.2 requirements, AC, technical notes)
- docs/architecture.md (scraping architecture, Cheerio usage, error handling)
- docs/prd.md (FR1-3 scraping requirements, NFR11 data quality)
- project-context.md (coding standards, error handling patterns)
- Story 2.1 (scraper service foundation - functions that call this)
- shared/schema.ts (batter_projections table structure)
- shared/types/projections.ts (NewBatterProjection type)
- server/services/scraper/fangraphs.ts (current placeholder to replace)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

1. **Fangraphs uses Next.js**: Discovered that Fangraphs uses Next.js and embeds projection data as JSON in a `#__NEXT_DATA__` script tag, not traditional HTML tables. Adjusted implementation to parse JSON instead of scraping HTML tables with Cheerio.

2. **Alternative data source added**: Per user request, added `fetchJABatterProjections()` function to support JA Projections from Google Sheets as an alternative data source. JA Projections is missing wOBA, wRC+, and H fields - H is calculated from AB*AVG, others default to 0.

3. **CSV parsing**: Implemented robust CSV parsing that handles quoted fields with commas (e.g., "O'Neill, Tyler").

4. **Position normalization**: JA Projections includes "P" in positions for two-way players like Ohtani. Added normalization to remove "P" from batter position strings.

5. **Test coverage**: 22 tests covering both Fangraphs and JA Projections parsing, including error handling, field mapping, validation, and edge cases.

### File List

- `server/services/scraper/fangraphs.ts` - Full implementation with fetchBatterProjections() and fetchJABatterProjections()
- `server/services/scraper/fangraphs.test.ts` - Comprehensive test suite for batter parsing (22 batter-related tests)
- `package.json` - Added cheerio dependency
- `package-lock.json` - Updated lockfile for cheerio

**Dependencies (created in earlier stories):**
- `server/lib/errors.ts` - AppError class (Story 2.1)
- `server/lib/logger.ts` - log() utility (Story 2.1)
- `server/services/scraper/index.ts` - Orchestration that calls fetchBatterProjections() (Story 2.1)
- `shared/types/projections.ts` - NewBatterProjection type (Story 1.2)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-10 | Implementation complete - all ACs satisfied, 22 tests passing | Amelia (Dev Agent) |
| 2025-12-10 | Code review: Updated File List with dependencies, wired JA Projections to orchestration | Amelia (Dev Agent) |
