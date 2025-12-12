# Project Context - Fantasy Baseball Auction Calculator

This file provides AI agents with critical context for implementing code in this project. Read this before making changes.

## Project Overview

Fantasy Baseball Auction Calculator with automated Steamer projection scraping from Fangraphs. React 18 frontend with Express backend, deploying to Railway.

## Technology Stack

- **Language:** TypeScript 5.6.3 (strict mode enabled)
- **Frontend:** React 18.3.1 + Vite 5.4.20
- **Backend:** Express 4.21.2
- **Database:** PostgreSQL via Railway + Drizzle ORM
- **Styling:** Tailwind CSS 3.4.17 + Shadcn/ui (New York style)
- **Validation:** Zod 3.24.2
- **Scraping:** Cheerio + node-cron

## Critical Patterns

### Database Naming (MUST follow)

- Tables: plural snake_case (`batter_projections`, `scrape_metadata`)
- Columns: snake_case (`scrape_id`, `created_at`)
- Foreign keys: `<table_singular>_id` (`scrape_id`)
- TypeScript variables remain camelCase

```typescript
// CORRECT
export const batterProjections = pgTable('batter_projections', {
  scrapeId: integer('scrape_id').references(() => scrapeMetadata.id),
});

// WRONG - don't use camelCase in table/column strings
export const batterProjections = pgTable('batterProjections', { ... });
```

### Error Handling

Services throw `AppError`, middleware formats response:

```typescript
// In services - THROW errors
throw new AppError('SCRAPE_FAILED', 'Failed to fetch data', 502);

// In routes - let middleware handle
// DON'T catch and format errors in routes
```

### API Response Format

```typescript
// Success
{ data: T, meta: { lastUpdated: string, count: number } }

// Error
{ error: { code: string, message: string, details?: unknown } }
```

### Logging

Use JSON structured logging for scraper events:

```typescript
log('info', 'scrape_start', { type: 'batters' });
log('error', 'scrape_failed', { error: err.message, attempt: 1 });
```

Standard events: `scrape_start`, `scrape_complete`, `scrape_failed`, `scrape_retry`, `db_write_complete`

## File Organization

### Backend Structure

```
server/
├── routes/v1/           # API routes by version
├── services/            # Business logic by feature
│   ├── scraper/         # Fangraphs scraping
│   └── projections/     # DB operations
├── lib/                 # Utilities (errors.ts, logger.ts)
└── middleware/          # Express middleware
```

### Frontend Structure

- State lives in `AppContext` (`client/src/lib/app-context.tsx`)
- API calls go through `client/src/lib/api-client.ts`
- Feature components in `client/src/components/features/`
- UI primitives in `client/src/components/ui/` (Shadcn)

## State Management

- All app state in React Context (`AppContext`)
- Persisted to localStorage under `fantasy-baseball-app-state`
- API projections flow into `playerProjections` in context
- CSV upload is fallback when API fails

## Code Quality Rules

1. **No console.log in production code** - use the `log()` utility for backend
2. **Zod for all external data** - validate API responses and user input
3. **Async/await over promises** - cleaner error handling
4. **Export types from shared/** - keep types in `shared/types/`
5. **No relative imports across client/server** - use `shared/` for cross-boundary types

## Anti-Patterns to Avoid

- Don't put business logic in routes - routes are thin, services are thick
- Don't catch errors in routes - let error middleware handle formatting
- Don't use `any` type - use `unknown` and narrow with type guards
- Don't mutate state directly - use context setters
- Don't store secrets in code - use environment variables

## Testing Approach

- Unit tests co-located with source (`*.test.ts`)
- Integration tests for API endpoints
- Test database operations with test database
- Mock external APIs (Fangraphs) in tests

## Environment Variables

Required in `.env`:

```
DATABASE_URL=postgresql://...
NODE_ENV=development|production
```

## Deployment

- Platform: Railway
- Database: Railway PostgreSQL
- Build: `npm run build` (Vite + esbuild)
- Start: `npm run start`
