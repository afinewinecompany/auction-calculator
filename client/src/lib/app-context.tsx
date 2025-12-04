import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  
  clearAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'fantasy-baseball-app-state';
const DEFAULT_MY_TEAM = 'My Team';

interface ExtendedAppState extends AppState {
  myTeamName?: string;
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
  
  const isClearingRef = useRef(false);
  const myTeamNameRef = useRef<string>(DEFAULT_MY_TEAM);

  useEffect(() => {
    myTeamNameRef.current = myTeamName;
  }, [myTeamName]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ExtendedAppState = JSON.parse(stored);
        const teamName = parsed.myTeamName?.trim() || DEFAULT_MY_TEAM;
        
        if (parsed.leagueSettings) setLeagueSettingsState(parsed.leagueSettings);
        if (parsed.scoringFormat) setScoringFormatState(parsed.scoringFormat);
        if (parsed.valueCalculationSettings) setValueCalculationSettingsState(parsed.valueCalculationSettings);
        if (parsed.playerProjections) setPlayerProjectionsState(parsed.playerProjections);
        if (parsed.projectionFiles) setProjectionFilesState(parsed.projectionFiles);
        if (parsed.playerValues) setPlayerValuesState(parsed.playerValues);
        
        const normalizedDraftState = normalizeDraftState(parsed.draftState, teamName);
        if (normalizedDraftState) {
          setDraftStateState(normalizedDraftState);
        }
        
        setMyTeamNameState(teamName);
        myTeamNameRef.current = teamName;
        if (parsed.targetedPlayerIds) setTargetedPlayerIdsState(parsed.targetedPlayerIds);

        const stateToSave: ExtendedAppState = {
          ...parsed,
          draftState: normalizedDraftState,
          myTeamName: teamName,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Failed to load app state:', error);
      }
    }
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

  const saveToStorage = useCallback((overrides: Partial<ExtendedAppState> = {}) => {
    if (isClearingRef.current) return;
    const snapshot = buildStateSnapshot(overrides);
    const toSave: ExtendedAppState = {};
    if (snapshot.leagueSettings) toSave.leagueSettings = snapshot.leagueSettings;
    if (snapshot.scoringFormat) toSave.scoringFormat = snapshot.scoringFormat;
    if (snapshot.valueCalculationSettings) toSave.valueCalculationSettings = snapshot.valueCalculationSettings;
    if (snapshot.playerProjections?.length) toSave.playerProjections = snapshot.playerProjections;
    if (snapshot.projectionFiles?.length) toSave.projectionFiles = snapshot.projectionFiles;
    if (snapshot.playerValues?.length) toSave.playerValues = snapshot.playerValues;
    if (snapshot.draftState) toSave.draftState = snapshot.draftState;
    if (snapshot.myTeamName) toSave.myTeamName = snapshot.myTeamName;
    if (snapshot.targetedPlayerIds?.length) toSave.targetedPlayerIds = snapshot.targetedPlayerIds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [buildStateSnapshot]);

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

  const setPlayerProjections = useCallback((projections: PlayerProjection[]) => {
    setPlayerProjectionsState(projections);
    saveToStorage({ playerProjections: projections });
  }, [saveToStorage]);

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
      const normalizedState = newState ? normalizeDraftState(newState, myTeamNameRef.current) : null;
      
      if (!isClearingRef.current) {
        const snapshot = buildStateSnapshot({ draftState: normalizedState || undefined });
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
      
      return normalizedState;
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
      
      setDraftStateState(normalizedDraftState || null);
      
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

  const clearAll = useCallback(() => {
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
