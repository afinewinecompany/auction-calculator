# Story 1.1: Backend Utilities Setup

Status: done

## Story

As a developer,
I want error handling and logging utilities in place,
so that all backend services have consistent error formatting and structured logging.

## Acceptance Criteria

1. **AC1: AppError Class Created**
   - `server/lib/errors.ts` exists
   - Constructor accepts: `code: string`, `message: string`, `statusCode: number`, `details?: unknown`
   - Extends base Error class
   - Exports `AppError` for use throughout backend

2. **AC2: JSON Structured Logger Created**
   - `server/lib/logger.ts` exists
   - `log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>)` function exported
   - Outputs JSON format: `{ level, event, timestamp, data }`
   - Timestamp is ISO 8601 format

3. **AC3: Express Error Middleware Created**
   - `server/middleware/error-handler.ts` exists
   - Catches `AppError` instances and formats as `{ error: { code, message, details } }`
   - Catches unknown errors and returns `{ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }`
   - Sets appropriate HTTP status codes from AppError.statusCode or defaults to 500

4. **AC4: Error Middleware Registered**
   - Error middleware is registered in `server/app.ts`
   - Middleware is registered AFTER all routes (critical for Express error handling)
   - Replaces or enhances existing basic error handler at lines 72-78

5. **AC5: Unit Tests Pass**
   - Tests exist for AppError class construction and properties
   - Tests exist for logger output format
   - Tests exist for error middleware handling both AppError and unknown errors

## Tasks / Subtasks

- [x] Task 1: Create AppError class (AC: 1)
  - [x] 1.1 Create `server/lib/` directory if not exists
  - [x] 1.2 Create `server/lib/errors.ts` with AppError class
  - [x] 1.3 Write unit tests for AppError in `server/lib/errors.test.ts`

- [x] Task 2: Create JSON structured logger (AC: 2)
  - [x] 2.1 Create `server/lib/logger.ts` with log function
  - [x] 2.2 Ensure timestamp uses ISO 8601 format (toISOString())
  - [x] 2.3 Write unit tests for logger in `server/lib/logger.test.ts`

- [x] Task 3: Create error handler middleware (AC: 3)
  - [x] 3.1 Create `server/middleware/` directory if not exists
  - [x] 3.2 Create `server/middleware/error-handler.ts`
  - [x] 3.3 Handle AppError instances with structured response
  - [x] 3.4 Handle unknown errors with generic response
  - [x] 3.5 Write unit tests for error handler in `server/middleware/error-handler.test.ts`

- [x] Task 4: Register error middleware in app.ts (AC: 4)
  - [x] 4.1 Import error handler middleware in `server/app.ts`
  - [x] 4.2 Replace existing error handler (lines 72-78) with new middleware
  - [x] 4.3 Ensure middleware is registered after all other routes

- [x] Task 5: Verify all tests pass (AC: 5)
  - [x] 5.1 Run full test suite
  - [x] 5.2 Ensure no regressions in existing functionality

## Dev Notes

### Architecture Compliance

**CRITICAL: Follow these patterns exactly from [Source: docs/architecture.md#Error-Handling-Pattern]**

```typescript
// server/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

**CRITICAL: Follow logging pattern from [Source: docs/architecture.md#Logging-Pattern]**

```typescript
// server/lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export function log(
  level: LogEntry['level'],
  event: string,
  data?: Record<string, unknown>
): void {
  console.log(JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  }));
}
```

### Existing Code Context

**Current error handler in server/app.ts (lines 72-78) to replace:**
```typescript
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});
```

**Issues with current handler:**
- Does not use structured error format
- Re-throws error after sending response (problematic)
- No error code differentiation

### File Structure

Create these new directories and files:
```
server/
├── lib/                        # NEW directory
│   ├── errors.ts               # NEW - AppError class
│   ├── errors.test.ts          # NEW - Tests
│   ├── logger.ts               # NEW - JSON logging
│   └── logger.test.ts          # NEW - Tests
├── middleware/                 # NEW directory
│   ├── error-handler.ts        # NEW - Express middleware
│   └── error-handler.test.ts   # NEW - Tests
└── app.ts                      # MODIFY - register middleware
```

### Testing Standards

**From [Source: project-context.md#Testing-Approach]:**
- Unit tests co-located with source (`*.test.ts`)
- Use existing test framework (check package.json for vitest or jest)
- Mock console.log for logger tests
- Mock Express req/res/next for middleware tests

### Standard Log Events (for future stories)

These events will be used in subsequent stories - define them but don't implement handlers yet:
- `scrape_start` - Scrape job beginning
- `scrape_complete` - Scrape succeeded
- `scrape_failed` - Scrape failed
- `scrape_retry` - Retry attempt starting
- `db_write_complete` - Database write succeeded

### Error Codes (for future stories)

Common error codes that will be used:
- `INTERNAL_ERROR` - Unknown/unexpected errors
- `SCRAPE_FAILED` - Fangraphs scrape failure
- `DB_ERROR` - Database operation failure
- `VALIDATION_ERROR` - Input validation failure
- `NOT_FOUND` - Resource not found

### TypeScript Requirements

**From [Source: project-context.md#Technology-Stack]:**
- TypeScript 5.6.3 strict mode enabled
- No `any` type - use `unknown` and narrow with type guards
- Export types alongside implementations

### Project Structure Notes

- Alignment with unified project structure from architecture.md
- `server/lib/` for utility modules (errors, logger)
- `server/middleware/` for Express middleware
- Tests co-located with source files

### References

- [Source: docs/architecture.md#Error-Handling-Pattern]
- [Source: docs/architecture.md#Logging-Pattern]
- [Source: docs/architecture.md#Implementation-Patterns-Consistency-Rules]
- [Source: project-context.md#Error-Handling]
- [Source: project-context.md#Code-Quality-Rules]
- [Source: docs/epics.md#Story-1.1-Backend-Utilities-Setup]

## Dev Agent Record

### Context Reference

Story created by create-story workflow with comprehensive context from:
- docs/epics.md (Epic 1 story definitions)
- docs/architecture.md (implementation patterns)
- docs/prd.md (functional requirements context)
- project-context.md (coding standards)
- Existing codebase analysis (server/app.ts current error handler)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None required - implementation was straightforward.

### Completion Notes List

- Implemented AppError class exactly as specified in architecture.md
- Created JSON structured logger with ISO 8601 timestamps
- Built Express error middleware that handles both AppError and unknown errors
- Replaced problematic existing error handler that was re-throwing errors
- Added vitest testing framework to project (was not previously installed)
- All 24 unit tests pass (5 for errors, 8 for logger, 11 for middleware)
- TypeScript strict mode compliance verified

**Code Review Fixes Applied:**
- M1: Added error logging to middleware (logs all errors before responding)
- M2: Renamed conflicting `log` function to `httpLog` in app.ts
- M3: Fixed vitest config (removed globals, added environment: 'node')
- M5: Added Object.setPrototypeOf for proper prototype chain
- L1: Added JSDoc to LogLevel and LogEntry types
- Added 2 new tests for error logging behavior

### File List

**New Files:**

- server/lib/errors.ts - AppError class with prototype chain fix
- server/lib/errors.test.ts - 5 unit tests
- server/lib/logger.ts - JSON structured logging utility with JSDoc
- server/lib/logger.test.ts - 8 unit tests
- server/middleware/error-handler.ts - Express error middleware with logging
- server/middleware/error-handler.test.ts - 11 unit tests (incl. logging tests)
- vitest.config.ts - Vitest configuration with node environment

**Modified Files:**

- server/app.ts - Imported error handler, renamed log→httpLog
- package.json - Added vitest, test scripts

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-09 | Story created with comprehensive developer context | Amelia (Dev Agent) |
| 2025-12-09 | Implementation complete - all 5 tasks done, 22 tests passing | Amelia (Dev Agent) |
| 2025-12-09 | Code review fixes applied - 5 medium, 3 low issues fixed, 24 tests passing | Amelia (Code Review) |
