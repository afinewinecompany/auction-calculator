# Fantasy Baseball Auction Value Calculator

## Overview

The Fantasy Baseball Auction Value Calculator is a production-grade React application designed to help fantasy baseball managers generate custom auction draft values based on their specific league settings and manage live draft inflation tracking. The application follows a baseball card aesthetic meets modern fintech design philosophy, featuring warm parchment backgrounds, rich leather browns, and crisp navy accents that create a nostalgic yet professional experience.

The application is built as a client-side single-page application with all data persisted in browser localStorage. It guides users through a multi-step workflow: configuring league settings, defining scoring formats, uploading player projections, calculating auction values, and managing a live draft room with real-time inflation tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management
- React Hook Form with Zod validation for form handling

**UI Component System:**
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom baseball-themed design tokens
- Custom CSS variables for theming (warm parchment backgrounds, baseball leather browns, navy accents)
- Responsive design with mobile-first approach

**State Management:**
- Custom React Context (`AppContext`) for global application state
- LocalStorage persistence for all user data (league settings, projections, draft state)
- No server-side state required - fully client-side application

**Key State Objects:**
- `LeagueSettings`: Team count, budget, roster requirements, position slots
- `ScoringFormat`: Discriminated union supporting Roto, H2H Categories, or H2H Points
- `PlayerProjection`: Raw statistical projections uploaded via CSV
- `PlayerValue`: Calculated auction values with inflation adjustments
- `DraftState`: Live draft tracking with picks, budget spent, inflation rate

### Application Flow

**Multi-Step Workflow:**
1. League Configuration - Define team count, budget, roster positions
2. Scoring Format Selection - Choose between category-based or points-based scoring with preset templates
3. Projection Upload - CSV import with column mapping for player statistics
4. Value Calculation - Choose calculation method (Z-Score or SGP) with configurable parameters
5. Draft Room - Live draft tracking with real-time inflation calculations, pending bid system, and roster-based metrics

**Draft Room Pending Bid System:**
- Entering a price in Quick Draft input triggers automatic inflation recalculation
- Players remain visible in the draft table until Draft button is clicked
- Pending bids are tracked as "phantom picks" - they affect inflation but don't confirm the draft
- When Draft button is clicked, the pending bid is cleared and the pick is confirmed
- Inflation formula: remainingBudget = totalBudget - confirmedSpent - pendingSpent

**Roster-Based Metrics:**
- "Roster Spots Left" shows: (teamCount × totalRosterSpots) - playersDrafted - pendingBidsCount
- "Avg $/Player" uses roster spots remaining as denominator instead of undrafted player count
- Budget Remaining subtracts pending bids from the total

**Calculation Engine (v2.0):**
The rebuilt calculation engine implements per-position value analysis:

*Draftable Pool Building:*
- Allocates players to positions respecting league roster requirements
- Handles multi-eligibility (MI = 2B/SS, CI = 1B/3B, UTIL = any hitter, P = any pitcher)
- Players assigned to their optimal position based on Z-score ranking
- BENCH slots included in allocation for remaining best-available players

*Per-Position Replacement Level:*
- Three methods: Last Drafted (most generous), First Undrafted (most conservative), Blended (average of 2 above + 2 below cutoff)
- Replacement level calculated per position (C, 1B, 2B, SS, 3B, OF, MI, CI, UTIL, SP, RP, P, BENCH)
- Tracks replacement player name for transparency

*VAR (Value Above Replacement):*
- Calculated as player's Z-score minus their position's replacement level Z-score
- Negative VAR clamped to 0 (replacement-level or worse players)

*Dollar Conversion:*
- Reserves $1 per roster spot (minimum viable bid)
- Distributable budget = (teams × budget) - (teams × roster spots)
- Hitter/Pitcher split with three modes:
  - Calculated: Based on proportion of total positive VAR
  - Standard Presets: Balanced (65/35), Hitter Heavy (70/30), Pitcher Heavy (60/40)
  - Manual: Custom slider control

*Position Scarcity:*
- Scarcity multiplier based on drop-off from top to replacement level
- Positions with steeper drop-offs (C, SS) get higher multipliers
- Normalized so average multiplier = 1.0

*Value Tiers:*
- ELITE: Top 5% of positive VAR
- STAR: 70th-95th percentile
- STARTER: 30th-70th percentile
- BENCH: 5th-30th percentile
- REPLACEMENT: Bottom 5% or non-draftable

### Data Persistence

**Client-Side Storage:**
- All data persisted to browser localStorage under a single key
- Automatic save on every state change
- Welcome dialog tracks onboarding completion
- No backend database required

**Data Import:**
- Multi-file CSV upload supporting separate hitter and pitcher files
- Dual-panel upload interface with tabs for Hitters and Pitchers
- Per-file column mapping with auto-detection based on scoring format (hitting stats for hitters, pitching stats for pitchers)
- Automatic merge/dedupe of projections (handles two-way players like Shohei Ohtani)
- CSV-based position lookup using MLBAM ID (reference file: attached_assets/mlb_player_positions.csv)
- Position column is optional when MLBAM ID is provided - positions will be auto-matched from reference data
- ProjectionFile metadata tracks each uploaded file (kind, fileName, playerCount, importedAt)
- Merge logic uses context playerProjections filtered by identifyPlayerType to persist between page navigation/reload
- Completion badges reflect uploaded file counts from context, not ephemeral component state
- Stat alias mapping for common header variations (SO↔K, BA→AVG, etc.) to improve auto-mapping accuracy
- Defensive position handling: blank position columns fall back to default positions (['UTIL'] for hitters, ['P'] for pitchers)

### Backend Architecture

**Minimal Express Server:**
- Express.js server serves static files in production
- Vite dev server with HMR in development
- No API routes currently implemented (storage interface exists but unused)
- Server exists primarily for static file serving and production deployment

**Development vs Production:**
- `index-dev.ts`: Vite middleware integration for development
- `index-prod.ts`: Static file serving from dist/public directory
- Shared `app.ts` for Express configuration

### Design System

**Typography:**
- Display font: Bebas Neue or Oswald for condensed, bold headers
- Monospace: Roboto Mono or JetBrains Mono for tabular numbers
- Body text: Inter or Work Sans for readability

**Color System:**
- Baseball leather browns (#8B4513, #A0522D) for primary elements
- Warm cream/parchment (#F5E6D3, #FFF8E7) for backgrounds
- Navy (#1E3A5F, #2C5282) for data emphasis
- Forest green for success states
- Functional colors for value indicators (green for value, red for overpays)

**Component Patterns:**
- Card-based layouts with warm borders
- Sticky headers for metrics tracking
- Hover elevation effects for interactive elements
- Monospace fonts for all numerical data to ensure alignment
- Badge components for player positions and status indicators

## External Dependencies

**UI Component Libraries:**
- @radix-ui/* - Headless UI primitives for accessible components (dialogs, dropdowns, popovers, etc.)
- class-variance-authority - Type-safe variant management for components
- tailwindcss - Utility-first CSS framework
- lucide-react - Icon library

**Data Management:**
- @tanstack/react-query - Async state management (currently minimal usage)
- react-hook-form - Form state and validation
- @hookform/resolvers - Zod integration for form validation
- zod - Schema validation and type inference
- drizzle-zod - Type-safe schema definitions (shared types only, no database)

**Data Processing:**
- papaparse - CSV parsing for projection uploads
- date-fns - Date formatting and manipulation
- jspdf & jspdf-autotable - PDF export for cheat sheets

**Database (Configured but Unused):**
- @neondatabase/serverless - PostgreSQL driver (provisioned but not actively used)
- drizzle-orm - TypeScript ORM (schema defined, no runtime usage)
- Database configuration exists for future server-side features

**Development Tools:**
- vite - Build tool and dev server
- typescript - Type safety
- esbuild - Server-side bundling for production
- tsx - TypeScript execution for development

**Note on Database:**
The application currently operates entirely client-side with localStorage. Database configuration (Drizzle + Neon Postgres) is present in the codebase but not actively used. This provides a foundation for future server-side features like multi-user support, draft sharing, or historical draft analysis.