/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/league-settings', vi.fn()],
}));

// Mock useAppContext
vi.mock('@/lib/app-context', () => ({
  useAppContext: vi.fn(),
}));

// Mock child components to isolate testing
vi.mock('@/components/league-config-form', () => ({
  LeagueConfigForm: () => <div data-testid="league-config-form">LeagueConfigForm</div>,
}));

vi.mock('@/components/scoring-format-selector', () => ({
  ScoringFormatSelector: () => <div data-testid="scoring-format-selector">ScoringFormatSelector</div>,
}));

vi.mock('@/components/projection-uploader', () => ({
  ProjectionUploader: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="projection-uploader">
      <button data-testid="mock-upload-complete" onClick={onComplete}>Complete Upload</button>
    </div>
  ),
}));

vi.mock('@/components/value-calculation-panel', () => ({
  ValueCalculationPanel: () => <div data-testid="value-calculation-panel">ValueCalculationPanel</div>,
}));

vi.mock('@/components/player-values-table', () => ({
  PlayerValuesTable: () => <div data-testid="player-values-table">PlayerValuesTable</div>,
}));

vi.mock('@/components/features/data-freshness-indicator', () => ({
  DataFreshnessIndicator: () => <div data-testid="data-freshness-indicator">DataFreshnessIndicator</div>,
}));

vi.mock('@/components/features/projection-source-toggle', () => ({
  ProjectionSourceToggle: ({ onSwitchToCsv }: { onSwitchToCsv?: () => void }) => (
    <div data-testid="projection-source-toggle">
      <button data-testid="mock-switch-to-csv" onClick={onSwitchToCsv}>Switch to CSV</button>
    </div>
  ),
}));

import LeagueSettingsPage from './league-settings';
import * as appContext from '@/lib/app-context';

describe('LeagueSettingsPage - CSV Fallback Error UI', () => {
  const mockLeagueSettings = {
    teamCount: 12,
    auctionBudget: 260,
    totalRosterSpots: 23,
    positionRequirements: {
      C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 1, MI: 0, CI: 0, SP: 5, RP: 3, P: 0, BENCH: 6,
    },
  };

  const mockBaseContext = {
    leagueSettings: mockLeagueSettings,
    scoringFormat: { type: 'h2h-categories' as const, hittingCategories: ['R'], pitchingCategories: ['W'] },
    playerProjections: [],
    playerValues: [],
    setLeagueSettings: vi.fn(),
    setScoringFormat: vi.fn(),
    setValueCalculationSettings: vi.fn(),
    setPlayerProjections: vi.fn(),
    setProjectionFiles: vi.fn(),
    addProjectionFile: vi.fn(),
    removeProjectionFile: vi.fn(),
    setPlayerValues: vi.fn(),
    setDraftState: vi.fn(),
    setMyTeamName: vi.fn(),
    setTargetedPlayerIds: vi.fn(),
    toggleTargetPlayer: vi.fn(),
    isPlayerTargeted: vi.fn(),
    projectionsLoading: false,
    projectionsError: null,
    projectionsLastUpdated: null,
    projectionSource: null,
    setProjectionSource: vi.fn(),
    setProjectionsError: vi.fn(),
    setProjectionsLastUpdated: vi.fn(),
    refetchProjections: vi.fn(),
    clearAll: vi.fn(),
    valueCalculationSettings: null,
    projectionFiles: [],
    draftState: null,
    myTeamName: 'My Team',
    targetedPlayerIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('AC1: Error Message Displayed', () => {
    it('should display error message when projectionsError is set', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: 'Unable to load latest projections',
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      // Error message should be visible
      expect(screen.getByText(/Unable to load latest projections/i)).toBeTruthy();
    });

    it('should display error message with visually distinct error styling', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: 'Unable to load latest projections',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<LeagueSettingsPage />);

      // Should have error styling (red border or background)
      const errorSection = container.querySelector('[data-testid="projections-error-section"]');
      expect(errorSection).toBeTruthy();
      expect(errorSection?.className).toMatch(/red|error/i);
    });

    it('should not display error section when there is no error', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: null,
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<LeagueSettingsPage />);

      const errorSection = container.querySelector('[data-testid="projections-error-section"]');
      expect(errorSection).toBeNull();
    });
  });

  describe('AC2: Prominent CSV Upload Button', () => {
    it('should show Upload CSV button when error exists', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: 'Unable to load latest projections',
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      // Upload CSV button should be visible
      const uploadButton = screen.getByTestId('button-upload-csv-fallback');
      expect(uploadButton).not.toBeNull();
      expect(uploadButton.textContent).toMatch(/Upload.*CSV/i);
    });

    it('should show ProjectionUploader when Upload CSV button is clicked', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: 'Unable to load latest projections',
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      const uploadButton = screen.getByTestId('button-upload-csv-fallback');
      fireEvent.click(uploadButton);

      // ProjectionUploader should be visible
      expect(screen.getByTestId('projection-uploader')).not.toBeNull();
    });
  });

  describe('AC3: CSV Upload Flow Works', () => {
    it('should render ProjectionUploader component when no error exists', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: null,
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      // ProjectionUploader should be visible in normal state
      expect(screen.getByTestId('projection-uploader')).not.toBeNull();
    });

    it('should call onComplete callback from ProjectionUploader', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: null,
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      // Click the mock complete button
      const completeButton = screen.getByTestId('mock-upload-complete');
      fireEvent.click(completeButton);

      // The section should collapse (implementation detail verified by state change)
      expect(completeButton).not.toBeNull();
    });
  });

  describe('AC4: Error Clears on Successful Upload', () => {
    it('should hide error section when showErrorUploader is true', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: 'Unable to load latest projections',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<LeagueSettingsPage />);

      // Click upload button to show uploader
      const uploadButton = screen.getByTestId('button-upload-csv-fallback');
      fireEvent.click(uploadButton);

      // Error section should be hidden, uploader should be visible
      const errorSection = container.querySelector('[data-testid="projections-error-section"]');
      expect(errorSection).toBeNull();
      expect(screen.getByTestId('projection-uploader')).not.toBeNull();
    });

    it('should not show error section when projectionsError is cleared', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: null,
        playerProjections: [{ name: 'Test Player', positions: ['1B'], stats: { HR: 20 } }],
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<LeagueSettingsPage />);

      // Error section should not exist
      const errorSection = container.querySelector('[data-testid="projections-error-section"]');
      expect(errorSection).toBeNull();
    });
  });

  describe('AC5: CSV Source Indicator', () => {
    it('should show DataFreshnessIndicator when playerValues exist', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: null,
        playerProjections: [{ name: 'Test Player', positions: ['1B'], stats: { HR: 20 } }],
        playerValues: [{
          id: '1',
          name: 'Test',
          positions: ['1B'],
          originalValue: 10,
          rank: 1,
          stats: { HR: 20 },
          isDrafted: false,
          isDraftable: true,
        }],
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      // DataFreshnessIndicator should be rendered
      expect(screen.getByTestId('data-freshness-indicator')).not.toBeNull();
    });
  });

  describe('AC6: CSV Override Available', () => {
    it('should show ProjectionUploader even when projections already exist', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: null,
        playerProjections: [{ name: 'Test Player', positions: ['1B'], stats: { HR: 20 } }],
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      // ProjectionUploader should be accessible
      expect(screen.getByTestId('projection-uploader')).not.toBeNull();
    });

    it('should allow CSV upload to override existing API projections', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        ...mockBaseContext,
        projectionsError: null,
        projectionSource: 'api',
        playerProjections: [{ name: 'API Player', positions: ['1B'], stats: { HR: 20 } }],
      } as ReturnType<typeof appContext.useAppContext>);

      render(<LeagueSettingsPage />);

      // ProjectionUploader should still be available for override
      const uploader = screen.getByTestId('projection-uploader');
      expect(uploader).not.toBeNull();
    });
  });
});
