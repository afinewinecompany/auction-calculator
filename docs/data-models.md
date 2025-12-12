# Data Models

All data models are defined using Zod schemas in `shared/schema.ts` with TypeScript type inference.

## Core Domain Models

### LeagueSettings

League configuration for team count, budget, and roster requirements.

```typescript
const leagueSettingsSchema = z.object({
  leagueName: z.string().optional(),
  teamCount: z.number().min(2).max(30),
  auctionBudget: z.number().min(1),
  totalRosterSpots: z.number().min(1),
  positionRequirements: z.object({
    C: z.number().min(0),
    "1B": z.number().min(0),
    "2B": z.number().min(0),
    "3B": z.number().min(0),
    SS: z.number().min(0),
    OF: z.number().min(0),
    UTIL: z.number().min(0),
    MI: z.number().min(0),
    CI: z.number().min(0),
    SP: z.number().min(0),
    RP: z.number().min(0),
    P: z.number().min(0),
    BENCH: z.number().min(0),
  }),
});
```

### ScoringFormat

Discriminated union supporting three scoring types.

```typescript
// Category-based (Roto & H2H Categories)
const categoryScoringSchema = z.object({
  type: z.enum(["roto", "h2h-categories"]),
  hittingCategories: z.array(z.string()),  // e.g., ["R", "HR", "RBI", "SB", "AVG"]
  pitchingCategories: z.array(z.string()), // e.g., ["W", "SV", "K", "ERA", "WHIP"]
});

// Points-based (H2H Points)
const pointsScoringSchema = z.object({
  type: z.literal("h2h-points"),
  hittingPoints: z.record(z.string(), z.number()),  // e.g., {"Home Run": 4, "RBI": 1}
  pitchingPoints: z.record(z.string(), z.number()), // e.g., {"Win": 5, "Strikeout": 1}
});

const scoringFormatSchema = z.discriminatedUnion("type", [
  categoryScoringSchema,
  pointsScoringSchema,
]);
```

### PlayerProjection

Raw player data imported from CSV projections.

```typescript
const playerProjectionSchema = z.object({
  name: z.string(),
  team: z.string().optional(),
  positions: z.array(z.string()),           // e.g., ["SS", "2B"]
  stats: z.record(z.string(), z.number()),  // e.g., {"HR": 25, "AVG": 0.280}
  mlbamId: z.string().optional(),           // For position lookup
});
```

### PlayerValue

Calculated auction value with draft state.

```typescript
const playerValueSchema = z.object({
  id: z.string(),                           // "player-{index}"
  name: z.string(),
  team: z.string().optional(),
  positions: z.array(z.string()),
  originalValue: z.number(),                // Base calculated value
  adjustedValue: z.number().optional(),     // Inflation-adjusted value
  rank: z.number(),                         // Overall rank by value
  positionRank: z.record(z.string(), z.number()).optional(),
  tier: z.number().optional(),              // Numeric tier (1-5)
  valueTier: z.enum(["elite", "star", "starter", "bench", "replacement"]).optional(),
  stats: z.record(z.string(), z.number()),
  isDrafted: z.boolean().default(false),
  draftPrice: z.number().optional(),
  draftedBy: z.string().optional(),
  isDraftable: z.boolean().default(true),   // In draftable pool
  assignedPosition: z.string().optional(),  // Position for value calc
  var: z.number().optional(),               // Value Above Replacement
  hasPendingBid: z.boolean().optional(),
  pendingBidIsMyBid: z.boolean().optional(),
});
```

## Draft Models

### DraftPick

Single draft pick record.

```typescript
const draftPickSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  positions: z.array(z.string()),
  projectedValue: z.number(),
  actualPrice: z.number(),
  isMyBid: z.boolean().default(false),
  draftedBy: z.string().optional(),
  pickNumber: z.number(),
  timestamp: z.number(),
});
```

### DraftState

Aggregate draft state.

```typescript
const draftStateSchema = z.object({
  picks: z.array(draftPickSchema),
  currentInflationRate: z.number().default(0),
  totalBudgetSpent: z.number().default(0),
  totalPlayersAvailable: z.number(),
  totalPlayersDrafted: z.number().default(0),
});
```

## Configuration Models

### ValueCalculationSettings

Calculation method configuration.

```typescript
const valueCalculationSettingsSchema = z.object({
  method: z.enum(["sgp", "z-score", "points-above-replacement"]),
  replacementLevelMethod: z.enum(["lastDrafted", "firstUndrafted", "blended"]),
  applyPositionScarcity: z.boolean().default(false),
  positionScarcityWeights: z.record(z.string(), z.number()).optional(),
  hitterPitcherSplit: z.object({
    method: z.enum(["calculated", "manual", "standard"]),
    manualSplit: z.object({
      hitters: z.number().min(0).max(100),
      pitchers: z.number().min(0).max(100),
    }).optional(),
    standardPreset: z.enum(["balanced", "hitter_heavy", "pitcher_heavy"]).optional(),
  }),
  hitterBudgetPercent: z.number().min(0).max(100).default(65),
  showTiers: z.boolean().default(true),
});
```

### CsvColumnMapping

Column mapping for CSV imports.

```typescript
const csvColumnMappingSchema = z.object({
  nameColumn: z.string(),
  teamColumn: z.string().optional(),
  positionColumn: z.string().optional(),
  mlbamIdColumn: z.string().optional(),
  statColumns: z.record(z.string(), z.string()),  // stat → CSV column
}).refine(data => data.positionColumn || data.mlbamIdColumn, {
  message: "Either positionColumn or mlbamIdColumn must be provided",
});
```

### ProjectionFile

Metadata for uploaded projection files.

```typescript
const projectionFileSchema = z.object({
  id: z.string(),
  kind: z.enum(["hitters", "pitchers", "mixed"]),
  fileName: z.string(),
  mapping: csvColumnMappingSchema.optional(),
  playerCount: z.number(),
  importedAt: z.number(),  // Unix timestamp
});
```

## Application State

### AppState

Complete localStorage-persisted state.

```typescript
const appStateSchema = z.object({
  leagueSettings: leagueSettingsSchema.optional(),
  scoringFormat: scoringFormatSchema.optional(),
  valueCalculationSettings: valueCalculationSettingsSchema.optional(),
  csvColumnMapping: csvColumnMappingSchema.optional(),
  playerProjections: z.array(playerProjectionSchema).optional(),
  playerValues: z.array(playerValueSchema).optional(),
  draftState: draftStateSchema.optional(),
  targetedPlayerIds: z.array(z.string()).optional(),
  projectionFiles: z.array(projectionFileSchema).optional(),
});
```

**Extended State** (runtime only):
```typescript
interface ExtendedAppState extends AppState {
  myTeamName?: string;
}
```

## Constants

### Default Categories

```typescript
const DEFAULT_HITTING_CATEGORIES = ["R", "HR", "RBI", "SB", "AVG"];
const DEFAULT_PITCHING_CATEGORIES = ["W", "SV", "K", "ERA", "WHIP"];
```

### Position Options

```typescript
const POSITION_OPTIONS = [
  "C", "1B", "2B", "3B", "SS", "OF", "UTIL", "MI", "CI", "SP", "RP", "P", "BENCH"
];
```

### Standard Budget Splits

```typescript
const STANDARD_SPLITS = {
  balanced: { hitters: 65, pitchers: 35 },
  hitter_heavy: { hitters: 70, pitchers: 30 },
  pitcher_heavy: { hitters: 60, pitchers: 40 },
};
```

## Storage

All state persisted to browser localStorage:

**Key**: `fantasy-baseball-app-state`

**Format**: JSON-serialized AppState object

**Persistence**: Automatic on every context update
