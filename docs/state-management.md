# State Management

## Overview

The application uses a centralized React Context pattern with automatic localStorage persistence. All application state flows through `AppContext`, providing a single source of truth.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AppProvider                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    AppContext                        │    │
│  │                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │
│  │  │ leagueSettings│  │ scoringFormat │  │ draftState│ │    │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │    │
│  │                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │
│  │  │playerProjections│ │ playerValues │  │ myTeamName│ │    │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │    │
│  │                                                      │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │               localStorage Persistence               │    │
│  │         key: "fantasy-baseball-app-state"           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## AppContext Interface

```typescript
interface AppContextType {
  // League Configuration
  leagueSettings: LeagueSettings | null;
  setLeagueSettings: (settings: LeagueSettings) => void;

  // Scoring Format
  scoringFormat: ScoringFormat | null;
  setScoringFormat: (format: ScoringFormat) => void;

  // Calculation Settings
  valueCalculationSettings: ValueCalculationSettings | null;
  setValueCalculationSettings: (settings: ValueCalculationSettings) => void;

  // Player Data
  playerProjections: PlayerProjection[];
  setPlayerProjections: (projections: PlayerProjection[]) => void;
  playerValues: PlayerValue[];
  setPlayerValues: (values: PlayerValue[]) => void;

  // Projection Files
  projectionFiles: ProjectionFile[];
  setProjectionFiles: (files: ProjectionFile[]) => void;
  addProjectionFile: (file: ProjectionFile) => void;
  removeProjectionFile: (fileId: string) => void;

  // Draft State
  draftState: DraftState | null;
  setDraftState: (state: DraftState | null | ((prev) => DraftState | null)) => void;

  // User Preferences
  myTeamName: string;
  setMyTeamName: (name: string) => void;

  // Player Targeting
  targetedPlayerIds: string[];
  setTargetedPlayerIds: (ids: string[]) => void;
  toggleTargetPlayer: (playerId: string) => void;
  isPlayerTargeted: (playerId: string) => boolean;

  // Reset
  clearAll: () => void;
}
```

## Persistence Strategy

### Storage Key
```typescript
const STORAGE_KEY = 'fantasy-baseball-app-state';
```

### Save Logic
Every setter function triggers immediate persistence:

```typescript
const setLeagueSettings = useCallback((settings: LeagueSettings) => {
  setLeagueSettingsState(settings);
  saveToStorage({ leagueSettings: settings });
}, [saveToStorage]);
```

### Load Logic
State is hydrated from localStorage on mount:

```typescript
useEffect(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed: ExtendedAppState = JSON.parse(stored);
    // Hydrate all state slices
    if (parsed.leagueSettings) setLeagueSettingsState(parsed.leagueSettings);
    if (parsed.scoringFormat) setScoringFormatState(parsed.scoringFormat);
    // ... etc
  }
}, []);
```

### Normalization on Load
Draft state is normalized to ensure consistent team names:

```typescript
function normalizeDraftState(draftState: DraftState, teamName: string): DraftState {
  return {
    ...draftState,
    picks: draftState.picks.map(pick => ({
      ...pick,
      draftedBy: pick.draftedBy?.trim() || teamName,
    })),
  };
}
```

## State Dependencies

### Calculation Flow
```
leagueSettings + scoringFormat + playerProjections + valueCalculationSettings
                              ↓
                    calculatePlayerValues()
                              ↓
                        playerValues
```

### Draft Flow
```
playerValues + draftState
       ↓
calculateInflation()
       ↓
adjustedValues (merged back into playerValues)
```

## Usage Patterns

### Accessing State
```typescript
import { useAppContext } from '@/lib/app-context';

function MyComponent() {
  const { playerValues, draftState, setDraftState } = useAppContext();
  // ...
}
```

### Updating State with Previous Value
```typescript
const { setDraftState } = useAppContext();

// Functional update pattern
setDraftState(prev => ({
  ...prev,
  picks: [...prev.picks, newPick],
  totalPlayersDrafted: prev.totalPlayersDrafted + 1,
}));
```

### Team Name Propagation
When team name changes, all existing picks are updated:

```typescript
const setMyTeamName = useCallback((name: string) => {
  const oldTeamName = myTeamNameRef.current;

  if (draftState && draftState.picks.some(pick => pick.draftedBy === oldTeamName)) {
    const renamedPicks = draftState.picks.map(pick => ({
      ...pick,
      draftedBy: pick.draftedBy === oldTeamName ? validName : pick.draftedBy,
    }));
    // Update draft state with renamed picks
  }
}, [draftState]);
```

## Clear All Reset

```typescript
const clearAll = useCallback(() => {
  isClearingRef.current = true;

  // Reset all state to defaults
  setLeagueSettingsState(null);
  setScoringFormatState(null);
  setValueCalculationSettingsState(null);
  setPlayerProjectionsState([]);
  setProjectionFilesState([]);
  setPlayerValuesState([]);
  setDraftStateState(null);
  setMyTeamNameState(DEFAULT_MY_TEAM);
  setTargetedPlayerIdsState([]);

  // Clear localStorage
  localStorage.removeItem(STORAGE_KEY);

  isClearingRef.current = false;
}, []);
```

## Refs for Immediate Access

The context uses refs for values that need synchronous access during updates:

```typescript
const myTeamNameRef = useRef<string>(DEFAULT_MY_TEAM);

useEffect(() => {
  myTeamNameRef.current = myTeamName;
}, [myTeamName]);
```

This prevents stale closures when updating draft picks that reference the team name.

## Best Practices

1. **Always use context setters** - Never modify localStorage directly
2. **Functional updates for complex state** - Use callback form of setters
3. **Check for null** - State slices may be null before configuration
4. **Avoid prop drilling** - Use `useAppContext()` in any component that needs state
5. **Cleanup guard** - Use `isClearingRef` to prevent saves during reset
