/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

// Mock the useAppContext hook
vi.mock('@/lib/app-context', () => ({
  useAppContext: vi.fn(),
}));

import { DataFreshnessIndicator } from './data-freshness-indicator';
import * as appContext from '@/lib/app-context';

describe('DataFreshnessIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component existence and basic render', () => {
    it('should render without crashing', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: '2024-12-15T04:00:00.000Z',
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      expect(container).toBeTruthy();
    });
  });

  describe('Date formatting', () => {
    it('should format date as "Last updated: Mon DD, YYYY at H:MM AM/PM"', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: '2024-12-15T09:00:00.000Z',
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      render(<DataFreshnessIndicator />);
      // The exact format depends on locale but should contain key elements
      expect(screen.getByText(/Last updated:/i)).toBeTruthy();
      expect(screen.getByText(/Dec 15, 2024/i)).toBeTruthy();
    });
  });

  describe('CSV source display', () => {
    it('should show "Using uploaded projections" for CSV source', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: null,
        projectionSource: 'csv',
      } as ReturnType<typeof appContext.useAppContext>);

      render(<DataFreshnessIndicator />);
      expect(screen.getByText(/Using uploaded projections/i)).toBeTruthy();
    });

    it('should not show timestamp for CSV source', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: null,
        projectionSource: 'csv',
      } as ReturnType<typeof appContext.useAppContext>);

      render(<DataFreshnessIndicator />);
      expect(screen.queryByText(/Last updated:/i)).toBeNull();
    });
  });

  describe('Loading state', () => {
    it('should show loading text during loading', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: true,
        projectionsError: null,
        projectionsLastUpdated: null,
        projectionSource: null,
      } as ReturnType<typeof appContext.useAppContext>);

      render(<DataFreshnessIndicator />);
      expect(screen.getByText(/Loading projections.../i)).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('should render nothing when there is an error', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: 'Unable to load latest projections',
        projectionsLastUpdated: null,
        projectionSource: null,
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('No data state', () => {
    it('should render nothing when no projections loaded', () => {
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: null,
        projectionSource: null,
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Staleness thresholds', () => {
    it('should show fresh styling (green) for data less than 24 hours old', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: twoHoursAgo,
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      // Check for green/fresh styling class
      const textElement = container.querySelector('.text-green-700');
      expect(textElement).toBeTruthy();
    });

    it('should show warning styling (amber) for data older than 24 hours', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: twentyFiveHoursAgo,
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      // Check for amber/warning styling class
      const textElement = container.querySelector('.text-amber-600');
      expect(textElement).toBeTruthy();
    });

    it('should show error styling (red) for data older than 48 hours', () => {
      const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: fiftyHoursAgo,
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      // Check for red/error styling class
      const textElement = container.querySelector('.text-red-600');
      expect(textElement).toBeTruthy();
    });

    it('should have cursor-help class for warning state (tooltip present)', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: twentyFiveHoursAgo,
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      // cursor-help indicates a tooltip is available
      const textElement = container.querySelector('.cursor-help');
      expect(textElement).toBeTruthy();
    });

    it('should have cursor-help class for error state (tooltip present)', () => {
      const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: fiftyHoursAgo,
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      // cursor-help indicates a tooltip is available
      const textElement = container.querySelector('.cursor-help');
      expect(textElement).toBeTruthy();
    });

    it('should not have cursor-help class for fresh state (no tooltip)', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      vi.mocked(appContext.useAppContext).mockReturnValue({
        projectionsLoading: false,
        projectionsError: null,
        projectionsLastUpdated: twoHoursAgo,
        projectionSource: 'api',
      } as ReturnType<typeof appContext.useAppContext>);

      const { container } = render(<DataFreshnessIndicator />);
      // Fresh state should not have cursor-help (no tooltip needed)
      const textElement = container.querySelector('.cursor-help');
      expect(textElement).toBeNull();
    });
  });
});
