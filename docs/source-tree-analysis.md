# Source Tree Analysis

## Project Structure

```
FantasyBaseballAuction/
├── client/                      # React frontend application
│   ├── index.html              # HTML entry point
│   ├── public/                 # Static assets
│   └── src/
│       ├── App.tsx             # Application root with routing
│       ├── main.tsx            # React DOM entry point
│       ├── index.css           # Global styles + Tailwind
│       ├── components/         # React components
│       │   ├── ui/             # Shadcn/ui component library (48 components)
│       │   ├── draft-entry-dialog.tsx      # Quick draft modal
│       │   ├── draft-log.tsx               # Draft pick history
│       │   ├── draft-metrics.tsx           # Budget/inflation dashboard
│       │   ├── draft-player-table.tsx      # Main player grid (20KB)
│       │   ├── league-config-form.tsx      # League settings form
│       │   ├── pdf-export-dialog.tsx       # Cheat sheet export
│       │   ├── player-values-table.tsx     # Value display table
│       │   ├── positional-needs-tracker.tsx # Roster tracking
│       │   ├── projection-uploader.tsx     # CSV import (32KB)
│       │   ├── scoring-format-selector.tsx # Scoring config
│       │   ├── value-calculation-panel.tsx # Calc settings (19KB)
│       │   └── welcome-dialog.tsx          # Onboarding
│       ├── hooks/
│       │   ├── use-mobile.tsx  # Mobile detection hook
│       │   └── use-toast.ts    # Toast notification hook
│       ├── lib/
│       │   ├── app-context.tsx # Global state management (14KB)
│       │   ├── calculations.ts # Value calculation engine (28KB) ★
│       │   ├── mlb-api.ts      # MLB data fetching
│       │   ├── pdf-export.ts   # PDF generation logic
│       │   ├── position-lookup.ts # Position mapping
│       │   ├── projection-merger.ts # CSV merge logic
│       │   └── queryClient.ts  # TanStack Query setup
│       └── pages/
│           ├── draft-room.tsx  # Draft interface page
│           ├── league-settings.tsx # Configuration page
│           └── not-found.tsx   # 404 page
│
├── server/                      # Express backend (minimal)
│   ├── app.ts                  # Express configuration
│   ├── index-dev.ts            # Development server (Vite middleware)
│   ├── index-prod.ts           # Production server (static files)
│   ├── routes.ts               # API routes (empty - unused)
│   └── storage.ts              # Storage interface (unused)
│
├── shared/                      # Shared TypeScript code
│   └── schema.ts               # Zod schemas + types (8KB) ★
│
├── attached_assets/            # Reference data files
│   └── mlb_player_positions.csv # MLB position lookup
│
├── docs/                        # Documentation (generated)
│
├── .bmad/                       # BMAD workflow framework
├── .claude/                     # Claude Code configuration
│
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── drizzle.config.ts           # Database configuration (unused)
├── postcss.config.js           # PostCSS configuration
├── components.json             # Shadcn/ui configuration
├── design_guidelines.md        # UI/UX design system
└── replit.md                   # Comprehensive architecture doc
```

## Critical Files

### Core Logic (★)

| File | Size | Purpose |
|------|------|---------|
| `client/src/lib/calculations.ts` | 28KB | **Value calculation engine** - Z-score analysis, position allocation, VAR calculation, inflation tracking |
| `shared/schema.ts` | 8KB | **Data models** - Zod schemas for all domain types |
| `client/src/lib/app-context.tsx` | 14KB | **State management** - React Context with localStorage persistence |

### UI Components

| File | Size | Purpose |
|------|------|---------|
| `projection-uploader.tsx` | 32KB | CSV upload with dual-panel interface and column mapping |
| `draft-player-table.tsx` | 20KB | Main draft grid with sorting, filtering, quick draft |
| `value-calculation-panel.tsx` | 19KB | Calculation method configuration |
| `scoring-format-selector.tsx` | 11KB | Scoring format selection with presets |
| `draft-log.tsx` | 10KB | Draft history with undo and team filtering |

### Entry Points

| File | Purpose |
|------|---------|
| `client/src/main.tsx` | React DOM render entry |
| `client/src/App.tsx` | Application root with providers |
| `server/index-dev.ts` | Development server startup |
| `server/index-prod.ts` | Production server startup |

## Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:

| Alias | Target |
|-------|--------|
| `@/*` | `./client/src/*` |
| `@shared/*` | `./shared/*` |
| `@assets/*` | `./attached_assets/*` |

## File Size Distribution

### By Category
- **UI Components**: ~150KB across 13 feature components
- **UI Kit (Shadcn)**: ~120KB across 48 components
- **Core Logic**: ~50KB (calculations + context + schema)
- **Server**: ~5KB (minimal static file serving)

### Largest Files
1. `projection-uploader.tsx` (32KB) - Complex CSV handling
2. `calculations.ts` (28KB) - Calculation engine
3. `sidebar.tsx` (22KB) - UI component
4. `draft-player-table.tsx` (20KB) - Draft grid
5. `value-calculation-panel.tsx` (19KB) - Settings panel
