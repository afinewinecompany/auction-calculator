# Story 4.3: CSV Fallback with Error Messaging

Status: done

## Story

As a user,
I want to upload CSV projections manually when API data is unavailable,
So that I can still use the app even if the automated scraping fails.

## Acceptance Criteria

1. **AC1: Error Message Displayed**
   - When API fetch fails, error message displays: "Unable to load latest projections"
   - Error message is visually distinct (red/error styling)
   - Error appears in the projections section of the league settings page

2. **AC2: Prominent CSV Upload Button**
   - "Upload CSV" button appears prominently below error message
   - Button is clearly actionable (primary styling, good contrast)
   - Button is labeled clearly: "Upload CSV" or "Upload Projections"

3. **AC3: CSV Upload Flow Works**
   - Clicking upload button opens existing CSV upload flow (tabs for Hitters/Pitchers)
   - User can select files, map columns, and import projections
   - Existing `projection-uploader.tsx` functionality preserved

4. **AC4: Error Clears on Successful Upload**
   - After successful CSV upload, error message disappears
   - Projections display from CSV data
   - User can proceed with value calculations

5. **AC5: CSV Source Indicator**
   - After CSV upload, show "Using uploaded projections" indicator
   - Indicator replaces error message and freshness indicator
   - Neutral styling (not warning/error)

6. **AC6: CSV Override Available**
   - Users can choose to upload CSV even when API data is available
   - CSV upload button accessible in normal state (not just error state)
   - CSV data takes precedence over API data when manually uploaded

7. **AC7: Unit Tests Pass**
   - Tests verify error message displays on API failure
   - Tests verify CSV upload button appears with error
   - Tests verify error clears after successful CSV upload
   - Tests verify projectionSource changes to 'csv' after upload
   - All existing tests continue to pass (no regressions)

## Tasks / Subtasks

- [x] Task 1: Create error state UI in league settings (AC: 1, 2)
  - [x] 1.1 Write failing test for error message display
  - [x] 1.2 Add error state section in LeagueSettingsPage when projectionsError is set
  - [x] 1.3 Style error message with red/error colors
  - [x] 1.4 Write failing test for CSV upload button visibility
  - [x] 1.5 Add prominent "Upload CSV" button below error message
  - [x] 1.6 Wire button to expand/show ProjectionUploader component

- [x] Task 2: Connect CSV upload to clear error state (AC: 3, 4)
  - [x] 2.1 Write failing test for error clearing on successful upload
  - [x] 2.2 Update ProjectionUploader onComplete callback to clear projectionsError
  - [x] 2.3 Update AppContext to expose setProjectionsError (or add clearProjectionsError)
  - [x] 2.4 Verify existing CSV upload flow still works

- [x] Task 3: Update projectionSource on CSV upload (AC: 5)
  - [x] 3.1 Write failing test for projectionSource changing to 'csv'
  - [x] 3.2 Update ProjectionUploader to set projectionSource to 'csv' after successful upload
  - [x] 3.3 Clear projectionsLastUpdated when switching to CSV (no timestamp available)
  - [x] 3.4 Verify DataFreshnessIndicator shows "Using uploaded projections"

- [x] Task 4: Enable CSV override when API data exists (AC: 6)
  - [x] 4.1 Ensure ProjectionUploader is accessible in normal state (not hidden)
  - [x] 4.2 Add a way to expand/access CSV upload even when projections exist
  - [x] 4.3 CSV upload should override API projections and update projectionSource

- [x] Task 5: Full validation (AC: 7)
  - [x] 5.1 Run full test suite to verify no regressions
  - [x] 5.2 Verify TypeScript compilation passes
  - [x] 5.3 Manual verification: error flow works when API fails
  - [x] 5.4 Manual verification: CSV upload works and clears error

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow patterns from [Source: docs/architecture.md#Frontend-Integration]**

- API data flows into existing `playerProjections` in AppContext
- Maintain backward compatibility with existing CSV upload flow
- Follow PRD Journey 3 (Marcus fallback path) [Source: docs/prd.md#Journey-3]

**From [Source: project-context.md#Frontend-Structure]:**
- Feature components in `client/src/components/features/`
- State lives in `AppContext` (`client/src/lib/app-context.tsx`)
- Preserve existing `projection-uploader.tsx` component

### Current AppContext State (from Stories 4.1 and 4.2)

The following state is already available in AppContext:

```typescript
// API projection state
projectionsLoading: boolean;      // true during API fetch
projectionsError: string | null;  // "Unable to load latest projections" on error
projectionsLastUpdated: string | null;  // ISO timestamp from API meta
projectionSource: 'api' | 'csv' | null; // Source of current projections
```

**MISSING: Need to add setters for projectionsError and projectionSource**

Currently these are internal state only. Need to expose:
- `setProjectionsError` - to clear error on CSV upload success
- `setProjectionSource` - to set to 'csv' on CSV upload

OR add a convenience method:
- `onCsvUploadComplete()` - clears error, sets source to 'csv', clears lastUpdated

### AppContext Updates Required

Add to AppContext interface:

```typescript
interface AppContextType {
  // ... existing properties ...

  // NEW: Methods to manage projection source state
  setProjectionsError: (error: string | null) => void;
  setProjectionSource: (source: 'api' | 'csv' | null) => void;
  setProjectionsLastUpdated: (timestamp: string | null) => void;
}
```

Or add a single convenience method:

```typescript
interface AppContextType {
  // ... existing properties ...

  // Convenience method for CSV upload completion
  onCsvUploadSuccess: () => void;  // Clears error, sets source='csv', clears lastUpdated
}
```

### Error State UI Pattern

```tsx
// In LeagueSettingsPage.tsx - Add error state section
{projectionsError && (
  <div className="rounded-lg border border-red-200 bg-red-50 p-6 space-y-4">
    <div className="flex items-center gap-3">
      <AlertCircle className="h-6 w-6 text-red-500" />
      <div>
        <h3 className="font-semibold text-red-800">Unable to Load Projections</h3>
        <p className="text-sm text-red-600">{projectionsError}</p>
      </div>
    </div>
    <Button
      onClick={() => setShowUploader(true)}
      className="w-full"
    >
      <Upload className="mr-2 h-4 w-4" />
      Upload CSV Projections
    </Button>
  </div>
)}
```

### ProjectionUploader Integration

The existing `ProjectionUploader` component already handles:
- File selection and parsing
- Column mapping
- Merging hitter/pitcher projections
- Setting `playerProjections` in context

**Need to add:**
1. Call `setProjectionSource('csv')` after successful upload
2. Call `setProjectionsError(null)` to clear any error
3. Call `setProjectionsLastUpdated(null)` since CSV has no timestamp

```tsx
// In ProjectionUploader.tsx - After successful merge
const handleMergeComplete = () => {
  setPlayerProjections(mergedProjections);
  setProjectionSource('csv');
  setProjectionsError(null);
  setProjectionsLastUpdated(null);
  onComplete();
};
```

### Test Strategy

**Test file: Add tests to `client/src/lib/app-context.test.tsx` or create new test file**

```typescript
describe('CSV Fallback Flow', () => {
  it('should display error message when projectionsError is set', () => {
    // Mock context with projectionsError set
    // Render LeagueSettingsPage
    // Verify error message visible
  });

  it('should show upload button when error exists', () => {
    // Render with error state
    // Verify "Upload CSV" button exists
  });

  it('should clear error and set source to csv on successful upload', () => {
    // Start with error state
    // Simulate successful CSV upload
    // Verify error is null
    // Verify projectionSource is 'csv'
  });

  it('should show "Using uploaded projections" after CSV upload', () => {
    // Set projectionSource to 'csv'
    // Render DataFreshnessIndicator
    // Verify neutral CSV message shown
  });
});
```

### Existing ProjectionUploader Behavior

From reading the current code:
- Located at `client/src/components/projection-uploader.tsx`
- Has `onComplete` callback prop
- Uses `setPlayerProjections` from context
- Has tabs for Hitters/Pitchers
- Handles file parsing, column mapping, validation
- Calls `addProjectionFile` to track uploaded files

**Key integration point:** The `handleFinalMerge` or similar function that completes the upload flow.

### Files to Modify

1. **`client/src/lib/app-context.tsx`**
   - Export `setProjectionsError`, `setProjectionSource`, `setProjectionsLastUpdated`
   - Or add `onCsvUploadSuccess()` convenience method

2. **`client/src/pages/league-settings.tsx`**
   - Add error state UI section with upload button
   - Show CSV upload option even when API data exists

3. **`client/src/components/projection-uploader.tsx`**
   - Update completion handler to set projection source state
   - Clear error state on successful upload

4. **Tests**
   - Add integration tests for error flow
   - Test projection source changes

### UI/UX Considerations

**Error State (API failed):**
- Red border, red-50 background
- AlertCircle icon
- Clear message: "Unable to Load Projections"
- Prominent "Upload CSV" button

**Normal State (API succeeded):**
- ProjectionUploader available but not prominent
- "Override with CSV" option or small upload button
- DataFreshnessIndicator shows API timestamp

**CSV Active State:**
- DataFreshnessIndicator shows "Using uploaded projections"
- Neutral styling
- Option to reload from API? (future enhancement)

### Learnings from Previous Stories

From Story 4.2 implementation:
1. **Test environment:** Use `@vitest-environment jsdom` comment for React tests
2. **Mocking pattern:** Mock `useAppContext` to control state in tests
3. **Component styling:** Use Tailwind classes for error/warning styling
4. **Context access:** Use `useAppContext()` hook

### Dependencies

**Existing (no new deps needed):**
- AppContext state management
- ProjectionUploader component
- DataFreshnessIndicator component
- lucide-react icons (AlertCircle, Upload)
- Tailwind CSS for styling

### File Structure After This Story

```
client/src/
├── lib/
│   └── app-context.tsx         # MODIFIED - Add setters for projection state
├── pages/
│   └── league-settings.tsx     # MODIFIED - Add error state UI
└── components/
    └── projection-uploader.tsx # MODIFIED - Set projection source on upload
```

### FRs Covered by This Story

| FR | Description | How Covered |
|----|-------------|-------------|
| FR15 | Users can upload CSV projections manually as fallback | Error state with CSV upload button |
| FR16 | Users can see an error message when projections fail to load | Error UI with clear message |

### References

- [Source: docs/architecture.md#Frontend-Integration]
- [Source: docs/epics.md#Story-4.3-CSV-Fallback-with-Error-Messaging]
- [Source: docs/prd.md#Journey-3-Marcus-Fallback-Path]
- [Source: project-context.md#Frontend-Structure]
- [Source: client/src/lib/app-context.tsx] - Context with projection state
- [Source: client/src/components/projection-uploader.tsx] - Existing CSV upload component
- [Source: docs/sprint-artifacts/4-2-data-freshness-display.md] - Previous story implementation

## Dev Agent Record

### Context Reference

Story created by Create-Story workflow with comprehensive context from:
- docs/epics.md (Story 4.3 requirements, AC, technical notes)
- docs/architecture.md (Frontend integration patterns)
- docs/prd.md (Marcus fallback journey)
- project-context.md (coding standards, frontend structure)
- client/src/lib/app-context.tsx (existing context implementation)
- client/src/components/projection-uploader.tsx (existing CSV upload component)
- docs/sprint-artifacts/4-2-data-freshness-display.md (previous story learnings)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - clean implementation with all tests passing.

### Completion Notes List

- **Task 1:** Created error state UI in league-settings.tsx with red styling, AlertCircle icon, and "Upload CSV Projections" button
- **Task 2:** Added `setProjectionsError` and `setProjectionsLastUpdated` to AppContext interface and provider
- **Task 3:** Updated ProjectionUploader to call `setProjectionSource('csv')`, `setProjectionsError(null)`, and `setProjectionsLastUpdated(null)` on successful CSV import
- **Task 4:** ProjectionUploader accessible in normal state via collapsible section - users can expand to override API data
- **Task 5:** All 227 tests pass, TypeScript compiles cleanly

### File List

**Modified:**
- client/src/lib/app-context.tsx - Added setProjectionsError, setProjectionsLastUpdated to interface and provider
- client/src/pages/league-settings.tsx - Added error state UI with AlertCircle icon and Upload CSV button
- client/src/components/projection-uploader.tsx - Clear error and lastUpdated on CSV upload, removed debug console.logs

**New:**
- client/src/pages/league-settings.test.tsx - Unit tests for error state UI and CSV fallback flow (13 tests covering AC1-AC6)

**Note:** Other files in git diff (sample-data.ts, draft-room.tsx, server/app.ts, server/routes.ts, shared/schema.ts, package.json) are from previous stories and unrelated to this story's changes.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-11 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-11 | Implementation complete: error UI, AppContext setters, CSV upload clears error | Amelia (Dev Agent) |
| 2025-12-11 | Code review: Added 7 missing tests (AC3-AC6), removed console.logs, updated File List | Amelia (Dev Agent) |
| 2025-12-11 | Adversarial code review: Fixed sprint-status sync, added 7 new tests for setters and CSV integration flow, removed console.error from projection-uploader, corrected test count to 227 | Amelia (Dev Agent) |
