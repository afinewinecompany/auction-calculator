/**
 * @vitest-environment jsdom
 */
import React, { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AppProvider, useAppContext } from './app-context';
import * as apiClient from './api-client';

// Mock the api-client module
vi.mock('./api-client', () => ({
  fetchBatterProjections: vi.fn(),
  fetchPitcherProjections: vi.fn(),
}));

// Mock localStorage - create fresh store for each test
let mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: vi.fn(() => {
    mockStore = {};
  }),
  // Helper to completely reset store (used in beforeEach)
  _resetStore: () => {
    mockStore = {};
  },
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext projection loading', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLocalStorage._resetStore();
    // Restore the default implementation for getItem after resetAllMocks
    mockLocalStorage.getItem.mockImplementation((key: string) => mockStore[key] || null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('new state fields', () => {
    it('should expose projectionsLoading state', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      expect(typeof result.current.projectionsLoading).toBe('boolean');
    });

    it('should expose projectionsError state', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      expect(result.current.projectionsError === null || typeof result.current.projectionsError === 'string').toBe(true);
    });

    it('should expose projectionsLastUpdated state', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      expect(result.current.projectionsLastUpdated === null || typeof result.current.projectionsLastUpdated === 'string').toBe(true);
    });

    it('should expose projectionSource state', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      expect(
        result.current.projectionSource === null ||
        result.current.projectionSource === 'api' ||
        result.current.projectionSource === 'csv'
      ).toBe(true);
    });
  });

  describe('auto-load on mount', () => {
    it('should call both fetch functions on mount when no projections exist', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [{ name: 'Test Batter', positions: ['OF'], stats: {} }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [{ name: 'Test Pitcher', positions: ['P'], stats: {} }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });

      renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(apiClient.fetchBatterProjections).toHaveBeenCalled();
        expect(apiClient.fetchPitcherProjections).toHaveBeenCalled();
      });
    });

    it('should populate playerProjections with API data', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [{ name: 'Test Batter', positions: ['OF'], stats: { HR: 30 } }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [{ name: 'Test Pitcher', positions: ['P'], stats: { W: 15 } }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.playerProjections).toHaveLength(2);
      });

      expect(result.current.playerProjections).toContainEqual(
        expect.objectContaining({ name: 'Test Batter' })
      );
      expect(result.current.playerProjections).toContainEqual(
        expect.objectContaining({ name: 'Test Pitcher' })
      );
    });

    it('should set projectionsLastUpdated from API response', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T05:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Should use the more recent timestamp
      expect(result.current.projectionsLastUpdated).toBeTruthy();
    });

    it('should set projectionSource to api on successful load', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [{ name: 'Test', positions: ['OF'], stats: {} }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionSource).toBe('api');
      });
    });
  });

  describe('loading state transitions', () => {
    it('should set loading to true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(apiClient.fetchBatterProjections).mockReturnValue(pendingPromise as Promise<never>);
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      // Loading should be true initially
      expect(result.current.projectionsLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          projections: [],
          lastUpdated: '2024-01-15T04:00:00Z',
          count: 0,
        });
      });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });
    });

    it('should set loading to false on success', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });
    });

    it('should set loading to false on error', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should set projectionsError on API failure', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockRejectedValue(new Error('Network error'));
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsError).toBe('Unable to load latest projections');
      });
    });

    it('should not crash the application on error', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.fetchPitcherProjections).mockRejectedValue(new Error('API Error'));

      // Should not throw
      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Context should still be accessible
      expect(result.current.playerProjections).toEqual([]);
    });

    it('should allow CSV upload after API error', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.fetchPitcherProjections).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsError).toBeTruthy();
      });

      // Should still be able to set projections via CSV upload
      act(() => {
        result.current.setPlayerProjections([
          { name: 'CSV Player', positions: ['OF'], stats: {} },
        ]);
      });

      expect(result.current.playerProjections).toHaveLength(1);
      expect(result.current.playerProjections[0].name).toBe('CSV Player');
    });
  });

  describe('skip auto-load when projections exist', () => {
    it('should not auto-load if projections already exist in localStorage', async () => {
      const existingProjections = [{ name: 'Existing Player', positions: ['OF'], stats: {} }];
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ playerProjections: existingProjections })
      );

      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.playerProjections).toHaveLength(1);
      });

      // API should not have been called since projections exist
      expect(apiClient.fetchBatterProjections).not.toHaveBeenCalled();
      expect(apiClient.fetchPitcherProjections).not.toHaveBeenCalled();
    });
  });

  describe('setProjectionSource', () => {
    it('should expose setProjectionSource function', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      expect(typeof result.current.setProjectionSource).toBe('function');
    });

    it('should allow setting projectionSource to csv', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      act(() => {
        result.current.setProjectionSource('csv');
      });

      expect(result.current.projectionSource).toBe('csv');
    });
  });

  describe('setProjectionsError', () => {
    it('should expose setProjectionsError function', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      expect(typeof result.current.setProjectionsError).toBe('function');
    });

    it('should allow setting projectionsError to a string', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      act(() => {
        result.current.setProjectionsError('Test error message');
      });

      expect(result.current.projectionsError).toBe('Test error message');
    });

    it('should allow clearing projectionsError by setting to null', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Set an error first using the setter
      act(() => {
        result.current.setProjectionsError('Test error');
      });

      expect(result.current.projectionsError).toBe('Test error');

      // Now clear it
      act(() => {
        result.current.setProjectionsError(null);
      });

      expect(result.current.projectionsError).toBeNull();
    });
  });

  describe('setProjectionsLastUpdated', () => {
    it('should expose setProjectionsLastUpdated function', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      expect(typeof result.current.setProjectionsLastUpdated).toBe('function');
    });

    it('should allow clearing projectionsLastUpdated by setting to null', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Set a timestamp first using the setter
      act(() => {
        result.current.setProjectionsLastUpdated('2024-01-15T04:00:00Z');
      });

      expect(result.current.projectionsLastUpdated).toBe('2024-01-15T04:00:00Z');

      // Now clear it
      act(() => {
        result.current.setProjectionsLastUpdated(null);
      });

      expect(result.current.projectionsLastUpdated).toBeNull();
    });
  });

  describe('CSV upload integration flow', () => {
    it('should allow setting CSV state after API error via setters', async () => {
      // This test verifies the setters work correctly for the CSV upload use case
      // without depending on API error behavior (which is tested elsewhere)
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // First, set an error state (simulating what would happen if API failed)
      act(() => {
        result.current.setProjectionsError('Unable to load latest projections');
      });

      expect(result.current.projectionsError).toBe('Unable to load latest projections');

      // Now simulate what ProjectionUploader does on successful CSV import
      act(() => {
        result.current.setPlayerProjections([
          { name: 'CSV Player', positions: ['OF'], stats: { HR: 25 } },
        ]);
        result.current.setProjectionSource('csv');
        result.current.setProjectionsError(null);
        result.current.setProjectionsLastUpdated(null);
      });

      // Verify all state changes match AC4 and AC5 requirements
      expect(result.current.playerProjections).toHaveLength(1);
      expect(result.current.projectionSource).toBe('csv');
      expect(result.current.projectionsError).toBeNull();
      expect(result.current.projectionsLastUpdated).toBeNull();
    });

    it('should allow CSV to override any existing projections via setters', async () => {
      // This test verifies CSV override works via the setters
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [{ name: 'API Player', positions: ['1B'], stats: { HR: 30 } }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      // Wait for loading to complete first
      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Wait for projections to be available (either from API or localStorage)
      await waitFor(() => {
        expect(result.current.playerProjections.length).toBeGreaterThan(0);
      });

      // Override with CSV upload (AC6) - this should always work regardless of source
      act(() => {
        result.current.setPlayerProjections([
          { name: 'CSV Override Player', positions: ['SS'], stats: { HR: 15 } },
        ]);
        result.current.setProjectionSource('csv');
        result.current.setProjectionsError(null);
        result.current.setProjectionsLastUpdated(null);
      });

      // Verify CSV overrides existing data
      expect(result.current.playerProjections).toHaveLength(1);
      expect(result.current.playerProjections[0].name).toBe('CSV Override Player');
      expect(result.current.projectionSource).toBe('csv');
      expect(result.current.projectionsLastUpdated).toBeNull();
    });
  });

  describe('Projection Source Persistence (AC4)', () => {
    it('should persist projectionSource to localStorage when set to csv', async () => {
      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [{ name: 'Test', positions: ['OF'], stats: {} }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Verify auto-load saved to localStorage first
      const beforeStored = localStorage.getItem('fantasy-baseball-app-state');
      expect(beforeStored).toBeTruthy();
      const beforeParsed = JSON.parse(beforeStored!);
      expect(beforeParsed.projectionSource).toBe('api'); // Should be 'api' from auto-load

      // Set projection source to csv
      act(() => {
        result.current.setProjectionSource('csv');
      });

      // Verify localStorage contains projectionSource='csv'
      const stored = localStorage.getItem('fantasy-baseball-app-state');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.projectionSource).toBe('csv');
    });

    it('should restore projectionSource from localStorage on init', async () => {
      // Pre-populate localStorage with projectionSource='csv'
      const existingState = {
        playerProjections: [{ name: 'CSV Player', positions: ['1B'], stats: {} }],
        projectionSource: 'csv',
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingState));

      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Verify projectionSource is restored from localStorage
      expect(result.current.projectionSource).toBe('csv');
      // API should not have been called since projections existed
      expect(apiClient.fetchBatterProjections).not.toHaveBeenCalled();
    });

    it('should persist projectionSource to api after successful refetch', async () => {
      // Pre-populate mockStore directly (not mockReturnValue which overrides all calls)
      const existingState = {
        playerProjections: [{ name: 'CSV Player', positions: ['1B'], stats: {} }],
        projectionSource: 'csv',
      };
      mockStore['fantasy-baseball-app-state'] = JSON.stringify(existingState);

      vi.mocked(apiClient.fetchBatterProjections).mockResolvedValue({
        projections: [{ name: 'API Player', positions: ['OF'], stats: {} }],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 1,
      });
      vi.mocked(apiClient.fetchPitcherProjections).mockResolvedValue({
        projections: [],
        lastUpdated: '2024-01-15T04:00:00Z',
        count: 0,
      });

      const { result } = renderHook(() => useAppContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectionsLoading).toBe(false);
      });

      // Verify we started with CSV source
      expect(result.current.projectionSource).toBe('csv');

      // Now refetch from API
      await act(async () => {
        await result.current.refetchProjections();
      });

      // Verify projectionSource is now 'api'
      expect(result.current.projectionSource).toBe('api');

      // Verify localStorage was updated
      const stored = localStorage.getItem('fantasy-baseball-app-state');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.playerProjections).toHaveLength(1);
      expect(parsed.playerProjections[0].name).toBe('API Player');
    });
  });
});
