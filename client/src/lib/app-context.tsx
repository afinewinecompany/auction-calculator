import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type {
  LeagueSettings,
  ScoringFormat,
  ValueCalculationSettings,
  PlayerProjection,
  PlayerValue,
  DraftState,
  AppState,
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
  
  playerValues: PlayerValue[];
  setPlayerValues: (values: PlayerValue[]) => void;
  
  draftState: DraftState | null;
  setDraftState: (state: DraftState) => void;
  
  clearAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'fantasy-baseball-app-state';

export function AppProvider({ children }: { children: ReactNode }) {
  const [leagueSettings, setLeagueSettingsState] = useState<LeagueSettings | null>(null);
  const [scoringFormat, setScoringFormatState] = useState<ScoringFormat | null>(null);
  const [valueCalculationSettings, setValueCalculationSettingsState] = useState<ValueCalculationSettings | null>(null);
  const [playerProjections, setPlayerProjectionsState] = useState<PlayerProjection[]>([]);
  const [playerValues, setPlayerValuesState] = useState<PlayerValue[]>([]);
  const [draftState, setDraftStateState] = useState<DraftState | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: AppState = JSON.parse(stored);
        if (parsed.leagueSettings) setLeagueSettingsState(parsed.leagueSettings);
        if (parsed.scoringFormat) setScoringFormatState(parsed.scoringFormat);
        if (parsed.valueCalculationSettings) setValueCalculationSettingsState(parsed.valueCalculationSettings);
        if (parsed.playerProjections) setPlayerProjectionsState(parsed.playerProjections);
        if (parsed.playerValues) setPlayerValuesState(parsed.playerValues);
        if (parsed.draftState) setDraftStateState(parsed.draftState);
      } catch (error) {
        console.error('Failed to load app state:', error);
      }
    }
  }, []);

  const saveToLocalStorage = (state: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const setLeagueSettings = (settings: LeagueSettings) => {
    setLeagueSettingsState(settings);
    saveToLocalStorage({
      leagueSettings: settings,
      scoringFormat: scoringFormat || undefined,
      valueCalculationSettings: valueCalculationSettings || undefined,
      playerProjections,
      playerValues,
      draftState: draftState || undefined,
    });
  };

  const setScoringFormat = (format: ScoringFormat) => {
    setScoringFormatState(format);
    saveToLocalStorage({
      leagueSettings: leagueSettings || undefined,
      scoringFormat: format,
      valueCalculationSettings: valueCalculationSettings || undefined,
      playerProjections,
      playerValues,
      draftState: draftState || undefined,
    });
  };

  const setValueCalculationSettings = (settings: ValueCalculationSettings) => {
    setValueCalculationSettingsState(settings);
    saveToLocalStorage({
      leagueSettings: leagueSettings || undefined,
      scoringFormat: scoringFormat || undefined,
      valueCalculationSettings: settings,
      playerProjections,
      playerValues,
      draftState: draftState || undefined,
    });
  };

  const setPlayerProjections = (projections: PlayerProjection[]) => {
    setPlayerProjectionsState(projections);
    saveToLocalStorage({
      leagueSettings: leagueSettings || undefined,
      scoringFormat: scoringFormat || undefined,
      valueCalculationSettings: valueCalculationSettings || undefined,
      playerProjections: projections,
      playerValues,
      draftState: draftState || undefined,
    });
  };

  const setPlayerValues = (values: PlayerValue[]) => {
    setPlayerValuesState(values);
    saveToLocalStorage({
      leagueSettings: leagueSettings || undefined,
      scoringFormat: scoringFormat || undefined,
      valueCalculationSettings: valueCalculationSettings || undefined,
      playerProjections,
      playerValues: values,
      draftState: draftState || undefined,
    });
  };

  const setDraftState = (state: DraftState) => {
    setDraftStateState(state);
    saveToLocalStorage({
      leagueSettings: leagueSettings || undefined,
      scoringFormat: scoringFormat || undefined,
      valueCalculationSettings: valueCalculationSettings || undefined,
      playerProjections,
      playerValues,
      draftState: state,
    });
  };

  const clearAll = () => {
    setLeagueSettingsState(null);
    setScoringFormatState(null);
    setValueCalculationSettingsState(null);
    setPlayerProjectionsState([]);
    setPlayerValuesState([]);
    setDraftStateState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

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
        playerValues,
        setPlayerValues,
        draftState,
        setDraftState,
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
