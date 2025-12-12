import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { throttle } from 'lodash';
import type {
  LeagueSettings,
  ScoringFormat,
  ValueCalculationSettings,
  PlayerProjection,
  PlayerValue,
  DraftState,
  DraftPick,
  AppState,
  ProjectionFile,
} from '@shared/schema';
import type { ProjectionSystem } from '@shared/types/projections';
import { fetchBatterProjections, fetchPitcherProjections } from './api-client';
import {
  saveProjectionsToIndexedDB,
  loadProjectionsFromIndexedDB,
  clearProjectionsFromIndexedDB,
  getProjectionsCount
} from './indexed-db';

interface AppContextType {
  leagueSettings: LeagueSettings | null;
  setLeagueSettings: (settings: LeagueSettings) => void;
  
  scoringFormat: ScoringFormat | null;
  setScoringFormat: (format: ScoringFormat) => void;
  
  valueCalculationSettings: ValueCalculationSettings | null;
  setValueCalculationSettings: (settings: ValueCalculationSettings) => void;
  
  playerProjections: PlayerProjection[];
  setPlayerProjections: (projections: PlayerProjection[]) => void;
  
  projectionFiles: ProjectionFile[];
  setProjectionFiles: (files: ProjectionFile[]) => void;
  addProjectionFile: (file: ProjectionFile) => void;
  removeProjectionFile: (fileId: string) => void;
  
  playerValues: PlayerValue[];
  setPlayerValues: (values: PlayerValue[]) => void;
  
  draftState: DraftState | null;
  setDraftState: (stateOrUpdater: DraftState | null | ((prev: DraftState | null) => DraftState | null)) => void;
  
  myTeamName: string;
  setMyTeamName: (name: string) => void;
  
  targetedPlayerIds: string[];
  setTargetedPlayerIds: (ids: string[]) => void;
  toggleTargetPlayer: (playerId: string) => void;
  isPlayerTargeted: (playerId: string) => boolean;

  // API projection state
  projectionsLoading: boolean;
  projectionsError: string | null;
  projectionsLastUpdated: string | null;
  projectionSource: 'api' | 'csv' | null;
  selectedProjectionSystem: ProjectionSystem;
  setSelectedProjectionSystem: (system: ProjectionSystem) => void;
  setProjectionSource: (source: 'api' | 'csv' | null) => void;
  setProjectionsError: (error: string | null) => void;
  setProjectionsLastUpdated: (timestamp: string | null) => void;
  refetchProjections: (system?: ProjectionSystem) => Promise<void>;

  clearAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'fantasy-baseball-app-state';
const DEFAULT_MY_TEAM = 'My Team';

interface ExtendedAppState extends AppState {
  myTeamName?: string;
  projectionSource?: 'api' | 'csv' | null;
  selectedProjectionSystem?: ProjectionSystem;
}

function normalizePicks(picks: DraftPick[], teamName: string): DraftPick[] {
  return picks.map(pick => ({
    ...pick,
    draftedBy: pick.draftedBy?.trim() || teamName,
  }));
}

function normalizeDraftState(draftState: DraftState | null | undefined, teamName: string): DraftState | undefined {
  if (!draftState) return undefined;
  return {
    ...draftState,
    picks: normalizePicks(draftState.picks || [], teamName),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [leagueSettings, setLeagueSettingsState] = useState<LeagueSettings | null>(null);
  const [scoringFormat, setScoringFormatState] = useState<ScoringFormat | null>(null);
  const [valueCalculationSettings, setValueCalculationSettingsState] = useState<ValueCalculationSettings | null>(null);
  const [playerProjections, setPlayerProjectionsState] = useState<PlayerProjection[]>([]);
  const [projectionFiles, setProjectionFilesState] = useState<ProjectionFile[]>([]);
  const [playerValues, setPlayerValuesState] = useState<PlayerValue[]>([]);
  const [draftState, setDraftStateState] = useState<DraftState | null>(null);
  const [myTeamName, setMyTeamNameState] = useState<string>(DEFAULT_MY_TEAM);
  const [targetedPlayerIds, setTargetedPlayerIdsState] = useState<string[]>([]);

  // API projection state
  const [projectionsLoading, setProjectionsLoading] = useState<boolean>(true);
  const [projectionsError, setProjectionsError] = useState<string | null>(null);
  const [projectionsLastUpdated, setProjectionsLastUpdated] = useState<string | null>(null);
  const [projectionSource, setProjectionSourceState] = useState<'api' | 'csv' | null>(null);
  const [selectedProjectionSystem, setSelectedProjectionSystemState] = useState<ProjectionSystem>('steamer');

  const isClearingRef = useRef(false);
  const myTeamNameRef = useRef<string>(DEFAULT_MY_TEAM);
  const hasLoadedFromStorageRef = useRef(false);

  useEffect(() => {
    myTeamNameRef.current = myTeamName;
  }, [myTeamName]);

  useEffect(() => {
    const initializeApp = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        try {
          // Parse state WITHOUT projections (they're in IndexedDB now)
          const parsed: ExtendedAppState = JSON.parse(stored);
          const teamName = parsed.myTeamName?.trim() || DEFAULT_MY_TEAM;

          // Load non-projection state synchronously (fast)
          if (parsed.leagueSettings) setLeagueSettingsState(parsed.leagueSettings);
          if (parsed.scoringFormat) setScoringFormatState(parsed.scoringFormat);
          if (parsed.valueCalculationSettings) setValueCalculationSettingsState(parsed.valueCalculationSettings);
          if (parsed.projectionFiles) setProjectionFilesState(parsed.projectionFiles);
          if (parsed.playerValues) setPlayerValuesState(parsed.playerValues);

          const normalizedDraftState = normalizeDraftState(parsed.draftState, teamName);
          if (normalizedDraftState) {
            setDraftStateState(normalizedDraftState);
          }

          setMyTeamNameState(teamName);
          myTeamNameRef.current = teamName;
          if (parsed.targetedPlayerIds) setTargetedPlayerIdsState(parsed.targetedPlayerIds);
          if (parsed.projectionSource) setProjectionSourceState(parsed.projectionSource);
          if (parsed.selectedProjectionSystem) setSelectedProjectionSystemState(parsed.selectedProjectionSystem);

          // Load projections from IndexedDB (non-blocking)
          const projectionsCount = await getProjectionsCount();
          if (projectionsCount > 0) {
            const projections = await loadProjectionsFromIndexedDB();
            setPlayerProjectionsState(projections);
            setProjectionsLoading(false);
            hasLoadedFromStorageRef.current = true;
          } else if (parsed.playerProjections && parsed.playerProjections.length > 0) {
            // Migration: Move old localStorage projections to IndexedDB
            console.log('Migrating projections from localStorage to IndexedDB...');
            await saveProjectionsToIndexedDB(parsed.playerProjections);
            setPlayerProjectionsState(parsed.playerProjections);
            setProjectionsLoading(false);
            hasLoadedFromStorageRef.current = true;

            // Remove projections from localStorage to save space
            delete parsed.playerProjections;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } else {
            hasLoadedFromStorageRef.current = false;
          }

          // Re-save normalized state (without projections)
          const stateToSave: ExtendedAppState = {
            ...parsed,
            draftState: normalizedDraftState,
            myTeamName: teamName,
            playerProjections: undefined, // Don't store in localStorage anymore
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
          console.error('Failed to load app state:', error);
          hasLoadedFromStorageRef.current = false;
        }
      } else {
        hasLoadedFromStorageRef.current = false;
      }
    };

    initializeApp();
  }, []);

  // Auto-load projections from API on mount when no projections exist
  useEffect(() => {
    // Skip if projections were loaded from localStorage
    if (hasLoadedFromStorageRef.current) {
      return;
    }

    const loadProjections = async () => {
      setProjectionsLoading(true);
      setProjectionsError(null);

      try {
        const [batterResult, pitcherResult] = await Promise.all([
          fetchBatterProjections(selectedProjectionSystem),
          fetchPitcherProjections(selectedProjectionSystem),
        ]);

        // Merge projections
        const allProjections = [
          ...batterResult.projections,
          ...pitcherResult.projections,
        ];

        // Use the more recent timestamp
        const batterTime = new Date(batterResult.lastUpdated).getTime();
        const pitcherTime = new Date(pitcherResult.lastUpdated).getTime();
        const latestTimestamp = batterTime > pitcherTime
          ? batterResult.lastUpdated
          : pitcherResult.lastUpdated;

        // Save to IndexedDB and update state (non-blocking)
        await saveProjectionsToIndexedDB(allProjections);

        setPlayerProjectionsState(allProjections);
        setProjectionsLastUpdated(latestTimestamp);
        setProjectionSourceState('api');

        // Save metadata to localStorage (NOT projections)
        const stored = localStorage.getItem(STORAGE_KEY);
        const existingState: ExtendedAppState = stored ? JSON.parse(stored) : {};
        existingState.projectionSource = 'api';
        existingState.playerProjections = undefined; // Don't store projections in localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existingState));
      } catch {
        setProjectionsError('Unable to load latest projections');
        // Don't crash - user can still upload CSV
      } finally {
        setProjectionsLoading(false);
      }
    };

    loadProjections();
  }, []);

  const buildStateSnapshot = useCallback((overrides: Partial<ExtendedAppState> = {}): ExtendedAppState => {
    const teamName = overrides.myTeamName ?? myTeamNameRef.current;
    const draftStateToUse = overrides.draftState !== undefined ? overrides.draftState : draftState;
    
    return {
      leagueSettings: overrides.leagueSettings ?? leagueSettings ?? undefined,
      scoringFormat: overrides.scoringFormat ?? scoringFormat ?? undefined,
      valueCalculationSettings: overrides.valueCalculationSettings ?? valueCalculationSettings ?? undefined,
      playerProjections: overrides.playerProjections ?? playerProjections,
      projectionFiles: overrides.projectionFiles ?? projectionFiles,
      playerValues: overrides.playerValues ?? playerValues,
      draftState: normalizeDraftState(draftStateToUse, teamName),
      myTeamName: teamName,
      targetedPlayerIds: overrides.targetedPlayerIds ?? targetedPlayerIds,
    };
  }, [leagueSettings, scoringFormat, valueCalculationSettings, playerProjections, projectionFiles, playerValues, draftState, targetedPlayerIds]);

  // Core save function without throttling (for internal use)
  const saveToStorageImmediate = useCallback((overrides: Partial<ExtendedAppState> = {}) => {
    if (isClearingRef.current) return;
    const snapshot = buildStateSnapshot(overrides);
    const toSave: ExtendedAppState = {};
    if (snapshot.leagueSettings) toSave.leagueSettings = snapshot.leagueSettings;
    if (snapshot.scoringFormat) toSave.scoringFormat = snapshot.scoringFormat;
    if (snapshot.valueCalculationSettings) toSave.valueCalculationSettings = snapshot.valueCalculationSettings;
    // NEVER save playerProjections to localStorage - they're in IndexedDB
    if (snapshot.projectionFiles?.length) toSave.projectionFiles = snapshot.projectionFiles;
    if (snapshot.playerValues?.length) toSave.playerValues = snapshot.playerValues;
    if (snapshot.draftState) toSave.draftState = snapshot.draftState;
    if (snapshot.myTeamName) toSave.myTeamName = snapshot.myTeamName;
    if (snapshot.targetedPlayerIds?.length) toSave.targetedPlayerIds = snapshot.targetedPlayerIds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [buildStateSnapshot]);

  // Throttled version to prevent excessive localStorage writes during rapid state changes
  const saveToStorage = useMemo(
    () => throttle(saveToStorageImmediate, 1000, { leading: false, trailing: true }),
    [saveToStorageImmediate]
  );

  const setLeagueSettings = useCallback((settings: LeagueSettings) => {
    setLeagueSettingsState(settings);
    saveToStorage({ leagueSettings: settings });
  }, [saveToStorage]);

  const setScoringFormat = useCallback((format: ScoringFormat) => {
    setScoringFormatState(format);
    saveToStorage({ scoringFormat: format });
  }, [saveToStorage]);

  const setValueCalculationSettings = useCallback((settings: ValueCalculationSettings) => {
    setValueCalculationSettingsState(settings);
    saveToStorage({ valueCalculationSettings: settings });
  }, [saveToStorage]);

  const setPlayerProjections = useCallback(async (projections: PlayerProjection[]) => {
    setPlayerProjectionsState(projections);
    // Save projections to IndexedDB instead of localStorage
    await saveProjectionsToIndexedDB(projections);
    // Don't save projections to localStorage anymore
  }, []);

  const setProjectionFiles = useCallback((files: ProjectionFile[]) => {
    setProjectionFilesState(files);
    saveToStorage({ projectionFiles: files });
  }, [saveToStorage]);

  const addProjectionFile = useCallback((file: ProjectionFile) => {
    setProjectionFilesState(prev => {
      const existingIndex = prev.findIndex(f => f.kind === file.kind);
      let newFiles: ProjectionFile[];
      if (existingIndex >= 0) {
        newFiles = [...prev];
        newFiles[existingIndex] = file;
      } else {
        newFiles = [...prev, file];
      }
      saveToStorage({ projectionFiles: newFiles });
      return newFiles;
    });
  }, [saveToStorage]);

  const removeProjectionFile = useCallback((fileId: string) => {
    setProjectionFilesState(prev => {
      const newFiles = prev.filter(f => f.id !== fileId);
      saveToStorage({ projectionFiles: newFiles });
      return newFiles;
    });
  }, [saveToStorage]);

  const setPlayerValues = useCallback((values: PlayerValue[]) => {
    setPlayerValuesState(values);
    saveToStorage({ playerValues: values });
  }, [saveToStorage]);

  const setDraftState = useCallback((stateOrUpdater: DraftState | null | ((prev: DraftState | null) => DraftState | null)) => {
    setDraftStateState(prev => {
      const newState = typeof stateOrUpdater === 'function' ? stateOrUpdater(prev) : stateOrUpdater;
      const normalizedState = newState ? normalizeDraftState(newState, myTeamNameRef.current) : undefined;
      
      if (!isClearingRef.current) {
        const snapshot = buildStateSnapshot({ draftState: normalizedState });
        const toSave: ExtendedAppState = {};
        if (snapshot.leagueSettings) toSave.leagueSettings = snapshot.leagueSettings;
        if (snapshot.scoringFormat) toSave.scoringFormat = snapshot.scoringFormat;
        if (snapshot.valueCalculationSettings) toSave.valueCalculationSettings = snapshot.valueCalculationSettings;
        if (snapshot.playerProjections?.length) toSave.playerProjections = snapshot.playerProjections;
        if (snapshot.playerValues?.length) toSave.playerValues = snapshot.playerValues;
        if (snapshot.draftState) toSave.draftState = snapshot.draftState;
        if (snapshot.myTeamName) toSave.myTeamName = snapshot.myTeamName;
        if (snapshot.targetedPlayerIds?.length) toSave.targetedPlayerIds = snapshot.targetedPlayerIds;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      }
      
      return normalizedState ?? null;
    });
  }, [buildStateSnapshot]);

  const setMyTeamName = useCallback((name: string) => {
    const trimmedName = name.trim();
    const validName = trimmedName || DEFAULT_MY_TEAM;
    const oldTeamName = myTeamNameRef.current;
    
    if (oldTeamName === validName) {
      return;
    }
    
    setMyTeamNameState(validName);
    myTeamNameRef.current = validName;
    
    if (draftState && draftState.picks.some(pick => pick.draftedBy === oldTeamName)) {
      const renamedPicks = draftState.picks.map(pick => ({
        ...pick,
        draftedBy: pick.draftedBy === oldTeamName ? validName : pick.draftedBy,
      }));
      const updatedDraftState: DraftState = { ...draftState, picks: renamedPicks };
      const normalizedDraftState = normalizeDraftState(updatedDraftState, validName);
      
      setDraftStateState(normalizedDraftState ?? null);
      
      const snapshot = buildStateSnapshot({ 
        draftState: normalizedDraftState,
        myTeamName: validName 
      });
      const toSave: ExtendedAppState = {};
      if (snapshot.leagueSettings) toSave.leagueSettings = snapshot.leagueSettings;
      if (snapshot.scoringFormat) toSave.scoringFormat = snapshot.scoringFormat;
      if (snapshot.valueCalculationSettings) toSave.valueCalculationSettings = snapshot.valueCalculationSettings;
      if (snapshot.playerProjections?.length) toSave.playerProjections = snapshot.playerProjections;
      if (snapshot.playerValues?.length) toSave.playerValues = snapshot.playerValues;
      if (snapshot.draftState) toSave.draftState = snapshot.draftState;
      toSave.myTeamName = validName;
      if (snapshot.targetedPlayerIds?.length) toSave.targetedPlayerIds = snapshot.targetedPlayerIds;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } else {
      saveToStorage({ myTeamName: validName });
    }
  }, [saveToStorage, draftState, buildStateSnapshot]);

  const setTargetedPlayerIds = useCallback((ids: string[]) => {
    setTargetedPlayerIdsState(ids);
    saveToStorage({ targetedPlayerIds: ids });
  }, [saveToStorage]);

  const toggleTargetPlayer = useCallback((playerId: string) => {
    setTargetedPlayerIdsState(prev => {
      const newTargets = prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId];
      saveToStorage({ targetedPlayerIds: newTargets });
      return newTargets;
    });
  }, [saveToStorage]);

  const isPlayerTargeted = useCallback((playerId: string) => {
    return targetedPlayerIds.includes(playerId);
  }, [targetedPlayerIds]);

  const setProjectionSource = useCallback((source: 'api' | 'csv' | null) => {
    setProjectionSourceState(source);
    // Persist to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    const existingState: ExtendedAppState = stored ? JSON.parse(stored) : {};
    existingState.projectionSource = source ?? undefined;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingState));
  }, []);

  const setSelectedProjectionSystem = useCallback((system: ProjectionSystem) => {
    setSelectedProjectionSystemState(system);
    // Persist to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    const existingState: ExtendedAppState = stored ? JSON.parse(stored) : {};
    existingState.selectedProjectionSystem = system;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingState));
  }, []);

  const refetchProjections = useCallback(async (system?: ProjectionSystem) => {
    const systemToUse = system ?? selectedProjectionSystem;
    setProjectionsLoading(true);
    setProjectionsError(null);

    try {
      let allProjections: PlayerProjection[];

      // JA Projections only has batters, so handle that case
      if (systemToUse === 'ja_projections') {
        const batterResult = await fetchBatterProjections(systemToUse);

        allProjections = batterResult.projections;

        // Defer state updates to prevent UI freeze
        setTimeout(() => {
          setPlayerProjectionsState(allProjections);
          setProjectionsLastUpdated(batterResult.lastUpdated);
          setProjectionSourceState('api');
          setSelectedProjectionSystemState(systemToUse);

          // Save to localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          const existingState: ExtendedAppState = stored ? JSON.parse(stored) : {};
          existingState.playerProjections = allProjections;
          existingState.projectionSource = 'api';
          existingState.selectedProjectionSystem = systemToUse;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existingState));
        }, 0);
      } else {
        const [batterResult, pitcherResult] = await Promise.all([
          fetchBatterProjections(systemToUse),
          fetchPitcherProjections(systemToUse),
        ]);

        // Merge projections
        allProjections = [
          ...batterResult.projections,
          ...pitcherResult.projections,
        ];

        // Use the more recent timestamp
        const batterTime = new Date(batterResult.lastUpdated).getTime();
        const pitcherTime = new Date(pitcherResult.lastUpdated).getTime();
        const latestTimestamp = batterTime > pitcherTime
          ? batterResult.lastUpdated
          : pitcherResult.lastUpdated;

        // Defer state updates to prevent UI freeze
        setTimeout(() => {
          setPlayerProjectionsState(allProjections);
          setProjectionsLastUpdated(latestTimestamp);
          setProjectionSourceState('api');
          setSelectedProjectionSystemState(systemToUse);

          // Save to localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          const existingState: ExtendedAppState = stored ? JSON.parse(stored) : {};
          existingState.playerProjections = allProjections;
          existingState.projectionSource = 'api';
          existingState.selectedProjectionSystem = systemToUse;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existingState));
        }, 0);
      }
    } catch {
      setProjectionsError('Unable to load latest projections');
    } finally {
      setProjectionsLoading(false);
    }
  }, [selectedProjectionSystem]);

  const clearAll = useCallback(async () => {
    isClearingRef.current = true;
    setLeagueSettingsState(null);
    setScoringFormatState(null);
    setValueCalculationSettingsState(null);
    setPlayerProjectionsState([]);
    setProjectionFilesState([]);
    setPlayerValuesState([]);
    setDraftStateState(null);
    setMyTeamNameState(DEFAULT_MY_TEAM);
    myTeamNameRef.current = DEFAULT_MY_TEAM;
    setTargetedPlayerIdsState([]);
    localStorage.removeItem(STORAGE_KEY);
    // Clear IndexedDB projections too
    await clearProjectionsFromIndexedDB();
    isClearingRef.current = false;
  }, []);

  return (
    <AppContext.Provider
      value={{
        leagueSettings,
        setLeagueSettings,
        scoringFormat,
        setScoringFormat,
        valueCalculationSettings,
        setValueCalculationSettings,
        playerProjections,
        setPlayerProjections,
        projectionFiles,
        setProjectionFiles,
        addProjectionFile,
        removeProjectionFile,
        playerValues,
        setPlayerValues,
        draftState,
        setDraftState,
        myTeamName,
        setMyTeamName,
        targetedPlayerIds,
        setTargetedPlayerIds,
        toggleTargetPlayer,
        isPlayerTargeted,
        projectionsLoading,
        projectionsError,
        projectionsLastUpdated,
        projectionSource,
        selectedProjectionSystem,
        setSelectedProjectionSystem,
        setProjectionSource,
        setProjectionsError,
        setProjectionsLastUpdated,
        refetchProjections,
        clearAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
