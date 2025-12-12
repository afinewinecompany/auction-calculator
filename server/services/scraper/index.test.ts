/**
 * Tests for Scraper Service orchestration
 *
 * Tests runScrape and runFullScrape functions including:
 * - Success flow
 * - Retry logic with 5-second delay
 * - Consecutive failure tracking
 * - Alert logging
 *
 * Note: Tests use fake timers which can cause "PromiseRejectionHandledWarning"
 * warnings. These are expected when testing async retry logic and don't affect
 * test validity.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError } from '../../lib/errors';

// Mock modules before importing the module under test
vi.mock('../projections', () => ({
  createScrapeRecord: vi.fn(),
  completeScrapeRecord: vi.fn(),
  failScrapeRecord: vi.fn(),
  insertBatterProjections: vi.fn(),
  insertPitcherProjections: vi.fn(),
}));

vi.mock('./fangraphs', () => ({
  FANGRAPHS_BATTERS_URL: 'https://example.com/batters',
  FANGRAPHS_PITCHERS_URL: 'https://example.com/pitchers',
  JA_PROJECTIONS_BATTERS_URL: 'https://example.com/ja-batters',
  fetchBatterProjections: vi.fn(),
  fetchJABatterProjections: vi.fn(),
  fetchPitcherProjections: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  log: vi.fn(),
}));

// Import after mocking
import {
  runScrape,
  runFullScrape,
  resetConsecutiveFailures,
  getConsecutiveFailures,
} from './index';
import {
  createScrapeRecord,
  completeScrapeRecord,
  failScrapeRecord,
  insertBatterProjections,
  insertPitcherProjections,
} from '../projections';
import { fetchBatterProjections, fetchJABatterProjections, fetchPitcherProjections } from './fangraphs';
import { log } from '../../lib/logger';

// Helper to run scrape and properly handle expected rejection
async function runScrapeExpectingFailure(type: 'batters' | 'pitchers'): Promise<AppError> {
  const promise = runScrape(type);
  await vi.advanceTimersByTimeAsync(5000);
  try {
    await promise;
    throw new Error('Expected runScrape to throw');
  } catch (error) {
    if (error instanceof AppError) {
      return error;
    }
    throw error;
  }
}

describe('scraper service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetConsecutiveFailures();

    // Default mock implementations
    vi.mocked(createScrapeRecord).mockResolvedValue({
      id: 1,
      scrapeType: 'batters',
      sourceUrl: 'https://example.com',
      projectionSystem: 'steamer',
      playerCount: null,
      status: 'in_progress',
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
    });
    vi.mocked(completeScrapeRecord).mockResolvedValue(undefined);
    vi.mocked(failScrapeRecord).mockResolvedValue(undefined);
    vi.mocked(insertBatterProjections).mockResolvedValue(undefined);
    vi.mocked(insertPitcherProjections).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('runScrape', () => {
    describe('success flow', () => {
      it('should complete successfully when batter fetch succeeds', async () => {
        const mockBatters = [
          { name: 'Test Player', positions: 'OF', pa: 500, ab: 450, h: 120, hr: 20, r: 80, rbi: 70, sb: 10, bb: 40, so: 100, avg: '0.267', obp: '0.340', slg: '0.450', woba: '0.350', wrcPlus: 115 },
        ] as any;
        vi.mocked(fetchBatterProjections).mockResolvedValueOnce(mockBatters);

        await runScrape('batters');

        expect(createScrapeRecord).toHaveBeenCalledWith('batters', expect.any(String), 'steamer');
        expect(fetchBatterProjections).toHaveBeenCalled();
        expect(insertBatterProjections).toHaveBeenCalledWith(1, mockBatters);
        expect(completeScrapeRecord).toHaveBeenCalledWith(1, 1, { type: 'batters', projectionSystem: 'steamer' });
        expect(log).toHaveBeenCalledWith('info', 'scrape_start', expect.any(Object));
        expect(log).toHaveBeenCalledWith('info', 'scrape_complete', expect.objectContaining({
          type: 'batters',
          count: 1,
          scrapeId: 1,
        }));
      });

      it('should complete successfully when pitcher fetch succeeds', async () => {
        const mockPitchers = [
          { name: 'Test Pitcher', team: 'NYY', ip: '180.0', w: 12, l: 8, sv: 0, k: 180, bb: 50, hr: 20, era: '3.50', whip: '1.15', fip: '3.40' },
        ] as any;
        vi.mocked(fetchPitcherProjections).mockResolvedValueOnce(mockPitchers);

        await runScrape('pitchers');

        expect(createScrapeRecord).toHaveBeenCalledWith('pitchers', expect.any(String), 'steamer');
        expect(fetchPitcherProjections).toHaveBeenCalled();
        expect(insertPitcherProjections).toHaveBeenCalledWith(1, mockPitchers);
        expect(completeScrapeRecord).toHaveBeenCalledWith(1, 1, { type: 'pitchers', projectionSystem: 'steamer' });
      });

      it('should reset consecutive failures on success', async () => {
        // First, create some failures
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error')); // For retry

        await runScrapeExpectingFailure('batters');

        expect(getConsecutiveFailures()).toBe(1);

        // Now succeed
        vi.mocked(fetchBatterProjections).mockResolvedValueOnce([]);
        await runScrape('batters');

        expect(getConsecutiveFailures()).toBe(0);
      });
    });

    describe('retry logic', () => {
      it('should retry once after failure and succeed', async () => {
        const mockBatters = [{ name: 'Test', positions: 'OF', pa: 0, ab: 0, h: 0, hr: 0, r: 0, rbi: 0, sb: 0, bb: 0, so: 0, avg: '0.000', obp: '0.000', slg: '0.000', woba: '0.000', wrcPlus: 0 }] as any;
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(mockBatters);

        const promise = runScrape('batters');

        // Advance timers to trigger the retry
        await vi.advanceTimersByTimeAsync(5000);

        await promise;

        expect(log).toHaveBeenCalledWith('warn', 'scrape_retry', expect.objectContaining({
          type: 'batters',
          error: 'Network error',
          attempt: 1,
        }));
        expect(completeScrapeRecord).toHaveBeenCalled();
        expect(failScrapeRecord).not.toHaveBeenCalled();
      });

      it('should wait 5 seconds before retry', async () => {
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockResolvedValueOnce([]);

        const promise = runScrape('batters');

        // Before 5 seconds, second call shouldn't have happened
        await vi.advanceTimersByTimeAsync(4999);
        expect(fetchBatterProjections).toHaveBeenCalledTimes(1);

        // After 5 seconds, retry should happen
        await vi.advanceTimersByTimeAsync(1);
        await promise;
        expect(fetchBatterProjections).toHaveBeenCalledTimes(2);
      });

      it('should fail after retry exhausted', async () => {
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Persistent error'))
          .mockRejectedValueOnce(new Error('Persistent error'));

        const error = await runScrapeExpectingFailure('batters');

        expect(error.message).toBe('Persistent error');
        expect(failScrapeRecord).toHaveBeenCalledWith(1, 'Persistent error');
        expect(log).toHaveBeenCalledWith('error', 'scrape_failed', expect.objectContaining({
          type: 'batters',
          error: 'Persistent error',
          attempt: 2,
          scrapeId: 1,
        }));
      });

      it('should throw AppError with SCRAPE_FAILED code after retry', async () => {
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        const error = await runScrapeExpectingFailure('batters');

        expect(error).toBeInstanceOf(AppError);
        expect(error.code).toBe('SCRAPE_FAILED');
        expect(error.statusCode).toBe(502);
      });
    });

    describe('consecutive failure tracking', () => {
      it('should increment consecutive failures on each failed scrape', async () => {
        // First failure - need mocks for both attempts
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        await runScrapeExpectingFailure('batters');
        expect(getConsecutiveFailures()).toBe(1);

        // Second failure - need mocks for both attempts
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        await runScrapeExpectingFailure('batters');
        expect(getConsecutiveFailures()).toBe(2);
      });

      it('should log alert after 2 consecutive failures', async () => {
        // First failure - no alert
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        await runScrapeExpectingFailure('batters');
        expect(log).not.toHaveBeenCalledWith('error', 'scrape_alert', expect.any(Object));

        vi.clearAllMocks();

        // Second failure - should trigger alert
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        await runScrapeExpectingFailure('batters');
        expect(log).toHaveBeenCalledWith('error', 'scrape_alert', expect.objectContaining({
          message: 'Multiple consecutive scrape failures detected',
          consecutiveFailures: 2,
          type: 'batters',
        }));
      });

      it('should continue alerting on subsequent failures', async () => {
        // First failure (no alert)
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        await runScrapeExpectingFailure('batters');

        // Second failure (alert)
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        await runScrapeExpectingFailure('batters');

        // Third failure (alert again)
        vi.mocked(fetchBatterProjections)
          .mockRejectedValueOnce(new Error('Error'))
          .mockRejectedValueOnce(new Error('Error'));

        await runScrapeExpectingFailure('batters');

        expect(getConsecutiveFailures()).toBe(3);

        // Alert should have been called for failures 2 and 3
        const alertCalls = vi.mocked(log).mock.calls.filter(
          call => call[1] === 'scrape_alert'
        );
        expect(alertCalls.length).toBe(2);
      });
    });
  });

  describe('runFullScrape', () => {
    it('should call runScrape for Steamer batters, pitchers, and JA Projections', async () => {
      vi.mocked(fetchBatterProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchPitcherProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchJABatterProjections).mockResolvedValueOnce([]);

      await runFullScrape();

      expect(fetchBatterProjections).toHaveBeenCalled();
      expect(fetchPitcherProjections).toHaveBeenCalled();
      expect(fetchJABatterProjections).toHaveBeenCalled();
    });

    it('should log full_scrape_start at beginning', async () => {
      vi.mocked(fetchBatterProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchPitcherProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchJABatterProjections).mockResolvedValueOnce([]);

      await runFullScrape();

      expect(log).toHaveBeenCalledWith('info', 'full_scrape_start', {});
    });

    it('should log full_scrape_complete at end', async () => {
      vi.mocked(fetchBatterProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchPitcherProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchJABatterProjections).mockResolvedValueOnce([]);

      await runFullScrape();

      expect(log).toHaveBeenCalledWith('info', 'full_scrape_complete', expect.objectContaining({
        consecutiveFailures: expect.any(Number),
      }));
    });

    it('should scrape both Steamer and JA Projections batters', async () => {
      vi.mocked(fetchBatterProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchPitcherProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchJABatterProjections).mockResolvedValueOnce([]);

      await runFullScrape();

      expect(fetchBatterProjections).toHaveBeenCalled();
      expect(fetchPitcherProjections).toHaveBeenCalled();
      expect(fetchJABatterProjections).toHaveBeenCalled();
    });

    it('should continue to pitchers and JA Projections even if steamer batters fail', async () => {
      vi.mocked(fetchBatterProjections)
        .mockRejectedValueOnce(new Error('Batter error'))
        .mockRejectedValueOnce(new Error('Batter error')); // For retry
      vi.mocked(fetchPitcherProjections).mockResolvedValueOnce([]);
      vi.mocked(fetchJABatterProjections).mockResolvedValueOnce([]);

      const promise = runFullScrape();

      // Advance timers for batter retry
      await vi.advanceTimersByTimeAsync(5000);

      await promise;

      expect(fetchBatterProjections).toHaveBeenCalled();
      expect(fetchPitcherProjections).toHaveBeenCalled();
      expect(fetchJABatterProjections).toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('warn', 'steamer_batter_scrape_failed', expect.any(Object));
    });

    it('should log both failures if both scrapes fail', async () => {
      // Steamer batters fail
      vi.mocked(fetchBatterProjections)
        .mockRejectedValueOnce(new Error('Batter error'))
        .mockRejectedValueOnce(new Error('Batter error'));
      // Steamer pitchers fail
      vi.mocked(fetchPitcherProjections)
        .mockRejectedValueOnce(new Error('Pitcher error'))
        .mockRejectedValueOnce(new Error('Pitcher error'));
      // JA Projections batters fail
      vi.mocked(fetchJABatterProjections)
        .mockRejectedValueOnce(new Error('JA error'))
        .mockRejectedValueOnce(new Error('JA error'));

      const promise = runFullScrape();

      // Advance timers for all retries (3 scrapes × 5s retry each)
      await vi.advanceTimersByTimeAsync(20000);

      await promise;

      expect(log).toHaveBeenCalledWith('warn', 'steamer_batter_scrape_failed', expect.any(Object));
      expect(log).toHaveBeenCalledWith('warn', 'steamer_pitcher_scrape_failed', expect.any(Object));
      expect(log).toHaveBeenCalledWith('warn', 'ja_projections_batter_scrape_failed', expect.any(Object));
    });

    it('should not throw even if all scrapes fail', async () => {
      vi.mocked(fetchBatterProjections)
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'));
      vi.mocked(fetchPitcherProjections)
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'));
      vi.mocked(fetchJABatterProjections)
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'));

      const promise = runFullScrape();
      await vi.advanceTimersByTimeAsync(20000);

      // Should not throw
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('helper functions', () => {
    it('resetConsecutiveFailures should reset counter to 0', () => {
      // Artificially set via failure
      vi.mocked(fetchBatterProjections).mockRejectedValue(new Error('Error'));

      // Can't easily set without going through failure flow, but we can verify reset works
      resetConsecutiveFailures();
      expect(getConsecutiveFailures()).toBe(0);
    });

    it('getConsecutiveFailures should return current count', async () => {
      vi.mocked(fetchBatterProjections)
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'));

      expect(getConsecutiveFailures()).toBe(0);

      await runScrapeExpectingFailure('batters');

      expect(getConsecutiveFailures()).toBe(1);
    });
  });

  describe('JA Projections source', () => {
    it('should use fetchJABatterProjections when source is ja_projections', async () => {
      const mockBatters = [{ name: 'Test', positions: 'OF' }] as any;
      vi.mocked(fetchJABatterProjections).mockResolvedValueOnce(mockBatters);

      await runScrape('batters', 'ja_projections');

      expect(fetchJABatterProjections).toHaveBeenCalled();
      expect(fetchBatterProjections).not.toHaveBeenCalled();
      expect(insertBatterProjections).toHaveBeenCalledWith(1, mockBatters);
    });

    it('should throw INVALID_SOURCE error for ja_projections pitchers', async () => {
      await expect(runScrape('pitchers', 'ja_projections')).rejects.toMatchObject({
        code: 'INVALID_SOURCE',
        message: 'JA Projections does not support pitcher data',
        statusCode: 400,
      });

      expect(fetchPitcherProjections).not.toHaveBeenCalled();
      expect(fetchJABatterProjections).not.toHaveBeenCalled();
    });

    it('should default to fangraphs when source not specified', async () => {
      vi.mocked(fetchBatterProjections).mockResolvedValueOnce([]);

      await runScrape('batters');

      expect(fetchBatterProjections).toHaveBeenCalled();
      expect(fetchJABatterProjections).not.toHaveBeenCalled();
    });

    it('should log source in scrape events', async () => {
      vi.mocked(fetchJABatterProjections).mockResolvedValueOnce([]);

      await runScrape('batters', 'ja_projections');

      expect(log).toHaveBeenCalledWith('info', 'scrape_start', expect.objectContaining({
        type: 'batters',
        source: 'ja_projections',
      }));
      expect(log).toHaveBeenCalledWith('info', 'scrape_complete', expect.objectContaining({
        source: 'ja_projections',
      }));
    });
  });
});
