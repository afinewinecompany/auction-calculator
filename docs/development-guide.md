# Development Guide

## Prerequisites

- **Node.js**: v20.x or later (LTS recommended)
- **npm**: v10.x or later
- **Git**: For version control

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd FantasyBaseballAuction
npm install
```

### 2. Environment Setup

The application runs entirely client-side and requires no environment variables for basic operation.

**Optional Database Configuration** (currently unused):
```bash
# .env (if enabling database features)
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Development Server

```bash
npm run dev
```

This starts the Vite development server with:
- Hot Module Replacement (HMR)
- Express backend middleware
- Automatic TypeScript compilation
- Source maps for debugging

Access the app at `http://localhost:5000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production (Vite + esbuild) |
| `npm run start` | Run production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to database (unused) |

## Project Structure

```
client/           # React frontend
├── src/
│   ├── components/   # UI components
│   ├── pages/        # Route pages
│   ├── lib/          # Core logic
│   └── hooks/        # Custom hooks

server/           # Express backend
shared/           # Shared types/schemas
```

## Development Workflow

### Adding a New Component

1. Create component in `client/src/components/`
2. Use Shadcn/ui primitives from `components/ui/`
3. Import types from `@shared/schema`
4. Access state via `useAppContext()`

Example:
```tsx
import { useAppContext } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import type { PlayerValue } from '@shared/schema';

export function MyComponent() {
  const { playerValues } = useAppContext();
  // ...
}
```

### Adding a Shadcn Component

```bash
npx shadcn-ui@latest add <component-name>
```

Components are installed to `client/src/components/ui/`.

### Modifying State

1. Update schema in `shared/schema.ts`
2. Update context in `client/src/lib/app-context.tsx`
3. State automatically persists to localStorage

### Styling Guidelines

- Use Tailwind utility classes
- Reference design tokens in `tailwind.config.ts`
- Use CSS variables for theming (see `index.css`)
- Follow the baseball aesthetic (parchment, leather browns, navy)

```tsx
// Good - using design system
<div className="bg-baseball-cream text-baseball-navy p-6 rounded-lg border-2 border-baseball-leather">

// Avoid - hardcoded colors
<div style={{ backgroundColor: '#F5E6D3' }}>
```

## Type Checking

Run TypeScript checks:
```bash
npm run check
```

Type definitions:
- All schemas in `shared/schema.ts` use Zod with type inference
- Import types: `import type { PlayerValue } from '@shared/schema'`
- Path aliases: `@/*` (client), `@shared/*` (shared)

## Build Process

### Development Build
- Vite dev server with HMR
- Express middleware for API routes
- Source maps enabled

### Production Build
```bash
npm run build
```

Output:
- `dist/public/` - Vite-bundled frontend
- `dist/index.js` - esbuild-bundled server

### Production Server
```bash
npm run start
```

Serves static files from `dist/public/`.

## Data Flow

### State Persistence

```
User Action → Context Update → localStorage Save
                    ↓
              Component Re-render
```

### Calculation Pipeline

```
Projections + Settings → calculatePlayerValues()
                              ↓
                        Z-Score Analysis
                              ↓
                        Position Allocation
                              ↓
                        VAR Calculation
                              ↓
                        Dollar Conversion
                              ↓
                        PlayerValue[]
```

### Draft Inflation

```
Draft Pick → draftState Update → calculateInflation()
                                       ↓
                                 adjustedValues[]
```

## Common Tasks

### Import New Projection Data
1. Export CSV from projection source
2. Use Projection Uploader component
3. Map columns to expected stats
4. Values auto-calculate on import

### Modify Calculation Logic
1. Edit `client/src/lib/calculations.ts`
2. Key functions:
   - `calculatePlayerValues()` - Main entry point
   - `buildDraftablePoolWithPositionAllocation()` - Position allocation
   - `calculateInflation()` - Draft-time adjustments

### Add New Position
1. Update `POSITION_OPTIONS` in `shared/schema.ts`
2. Update `positionRequirements` type
3. Update allocation logic in `calculations.ts`

## Debugging

### Browser DevTools
- React DevTools for component inspection
- Application tab → Local Storage for state
- Console for calculation logs

### Calculation Logging
The calculation engine logs summary info:
```
[Calculations] Generated 450 player values. Draftable: 360 (240 hitters, 120 pitchers). Total budget: $2600, Assigned: $2598. Split: 65%/35%
```

## Testing

Currently no automated tests. Manual testing workflow:

1. Configure league settings
2. Upload test projections
3. Verify value calculations
4. Test draft flow with picks
5. Verify inflation calculations
6. Test PDF export
