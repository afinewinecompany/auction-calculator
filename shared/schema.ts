import { z } from "zod";

// League Configuration
export const leagueSettingsSchema = z.object({
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

export type LeagueSettings = z.infer<typeof leagueSettingsSchema>;

// Scoring Format Types
export const scoringFormatTypeSchema = z.enum(["roto", "h2h-categories", "h2h-points"]);
export type ScoringFormatType = z.infer<typeof scoringFormatTypeSchema>;

// Category-based scoring (Roto & H2H Categories)
export const categoryScoringSchema = z.object({
  type: z.enum(["roto", "h2h-categories"]),
  hittingCategories: z.array(z.string()),
  pitchingCategories: z.array(z.string()),
});

// Points-based scoring (H2H Points)
export const pointsScoringSchema = z.object({
  type: z.literal("h2h-points"),
  hittingPoints: z.record(z.string(), z.number()),
  pitchingPoints: z.record(z.string(), z.number()),
});

export const scoringFormatSchema = z.discriminatedUnion("type", [
  categoryScoringSchema,
  pointsScoringSchema,
]);

export type ScoringFormat = z.infer<typeof scoringFormatSchema>;

// Player Projection
export const playerProjectionSchema = z.object({
  name: z.string(),
  team: z.string().optional(),
  positions: z.array(z.string()),
  stats: z.record(z.string(), z.number()),
  mlbamId: z.string().optional(),
});

export type PlayerProjection = z.infer<typeof playerProjectionSchema>;

// Calculated Player Value
export const playerValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.string().optional(),
  positions: z.array(z.string()),
  originalValue: z.number(),
  adjustedValue: z.number().optional(),
  rank: z.number(),
  positionRank: z.record(z.string(), z.number()).optional(),
  tier: z.number().optional(),
  valueTier: z.enum(["elite", "star", "starter", "bench", "replacement"]).optional(),
  stats: z.record(z.string(), z.number()),
  isDrafted: z.boolean().default(false),
  draftPrice: z.number().optional(),
  draftedBy: z.string().optional(),
  isDraftable: z.boolean().default(true),
  assignedPosition: z.string().optional(),
  var: z.number().optional(),
});

export type PlayerValue = z.infer<typeof playerValueSchema>;

// Value Tier (for player classification)
export const valueTierSchema = z.enum(["elite", "star", "starter", "bench", "replacement"]);
export type ValueTier = z.infer<typeof valueTierSchema>;

// Hitter/Pitcher Split Configuration
export const splitMethodSchema = z.enum(["calculated", "manual", "standard"]);
export const standardPresetSchema = z.enum(["balanced", "hitter_heavy", "pitcher_heavy"]);

export const hitterPitcherSplitSchema = z.object({
  method: splitMethodSchema.default("calculated"),
  manualSplit: z.object({
    hitters: z.number().min(0).max(100),
    pitchers: z.number().min(0).max(100),
  }).optional(),
  standardPreset: standardPresetSchema.optional(),
});

export type HitterPitcherSplit = z.infer<typeof hitterPitcherSplitSchema>;

// Replacement Level Configuration
export const replacementLevelMethodSchema = z.enum(["lastDrafted", "firstUndrafted", "blended"]);
export type ReplacementLevelMethod = z.infer<typeof replacementLevelMethodSchema>;

// Standard Split Presets
export const STANDARD_SPLITS = {
  balanced: { hitters: 65, pitchers: 35 },
  hitter_heavy: { hitters: 70, pitchers: 30 },
  pitcher_heavy: { hitters: 60, pitchers: 40 },
} as const;

// Value Calculation Settings
export const valueCalculationSettingsSchema = z.object({
  method: z.enum(["sgp", "z-score", "points-above-replacement"]),
  replacementLevelMethod: replacementLevelMethodSchema.default("lastDrafted"),
  applyPositionScarcity: z.boolean().default(false),
  positionScarcityWeights: z.record(z.string(), z.number()).optional(),
  hitterPitcherSplit: hitterPitcherSplitSchema.default({ method: "calculated" }),
  hitterBudgetPercent: z.number().min(0).max(100).default(65),
  showTiers: z.boolean().default(true),
});

export type ValueCalculationSettings = z.infer<typeof valueCalculationSettingsSchema>;

// CSV Column Mapping
export const csvColumnMappingSchema = z.object({
  nameColumn: z.string(),
  teamColumn: z.string().optional(),
  positionColumn: z.string().optional(),
  mlbamIdColumn: z.string().optional(),
  statColumns: z.record(z.string(), z.string()),
}).refine(data => data.positionColumn || data.mlbamIdColumn, {
  message: "Either positionColumn or mlbamIdColumn must be provided",
});

export type CsvColumnMapping = z.infer<typeof csvColumnMappingSchema>;

// Projection File (for multi-file uploads)
export const projectionFileKindSchema = z.enum(["hitters", "pitchers", "mixed"]);
export type ProjectionFileKind = z.infer<typeof projectionFileKindSchema>;

export const projectionFileSchema = z.object({
  id: z.string(),
  kind: projectionFileKindSchema,
  fileName: z.string(),
  mapping: csvColumnMappingSchema.optional(),
  playerCount: z.number(),
  importedAt: z.number(),
});

export type ProjectionFile = z.infer<typeof projectionFileSchema>;

// Draft Pick
export const draftPickSchema = z.object({
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

export type DraftPick = z.infer<typeof draftPickSchema>;

// Draft State
export const draftStateSchema = z.object({
  picks: z.array(draftPickSchema),
  currentInflationRate: z.number().default(0),
  totalBudgetSpent: z.number().default(0),
  totalPlayersAvailable: z.number(),
  totalPlayersDrafted: z.number().default(0),
});

export type DraftState = z.infer<typeof draftStateSchema>;

// Application State (for localStorage persistence)
export const appStateSchema = z.object({
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

export type AppState = z.infer<typeof appStateSchema>;

// Default values
export const DEFAULT_HITTING_CATEGORIES = ["R", "HR", "RBI", "SB", "AVG"];
export const DEFAULT_PITCHING_CATEGORIES = ["W", "SV", "K", "ERA", "WHIP"];

export const DEFAULT_HITTING_POINTS = {
  "Single": 1,
  "Double": 2,
  "Triple": 3,
  "Home Run": 4,
  "Run": 1,
  "RBI": 1,
  "Walk": 1,
  "Stolen Base": 2,
  "Caught Stealing": -1,
  "Strikeout": -0.5,
  "Hit By Pitch": 1,
};

export const DEFAULT_PITCHING_POINTS = {
  "Inning Pitched": 3,
  "Win": 5,
  "Loss": -3,
  "Save": 5,
  "Earned Run": -2,
  "Hit Allowed": -1,
  "Walk Allowed": -1,
  "Strikeout": 1,
  "Quality Start": 3,
  "Complete Game": 3,
  "Shutout": 5,
  "No Hitter": 10,
};

export const COMMON_HITTING_CATEGORIES = [
  "R", "HR", "RBI", "SB", "AVG", "OBP", "SLG", "OPS", "TB", "H", "BB", "K"
];

export const COMMON_PITCHING_CATEGORIES = [
  "W", "SV", "K", "ERA", "WHIP", "QS", "HLD", "IP", "K/9", "K/BB"
];

export const POSITION_OPTIONS = [
  "C", "1B", "2B", "3B", "SS", "OF", "UTIL", "MI", "CI", "SP", "RP", "P", "BENCH"
];
