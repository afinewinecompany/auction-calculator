/**
 * Tests for Scheduler Service
 *
 * Tests initializeScheduler function including:
 * - Cron job creation with correct schedule
 * - Logging events (scheduler_started, scheduled_scrape_start)
 * - Callback execution calling runFullScrape
 * - Error handling in callback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
    }),
  },
}));

// Mock runFullScrape
vi.mock('./index', () => ({
  runFullScrape: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  log: vi.fn(),
}));

// Import after mocking
import { initializeScheduler } from './scheduler';
import cron from 'node-cron';
import { runFullScrape } from './index';
import { log } from '../../lib/logger';

describe('scheduler service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeScheduler', () => {
    it('should create cron job with correct schedule (0 4 * * *)', () => {
      initializeScheduler();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 4 * * *',
        expect.any(Function)
      );
    });

    it('should log scheduler_started on initialization', () => {
      initializeScheduler();

      expect(log).toHaveBeenCalledWith('info', 'scheduler_started', {
        schedule: '0 4 * * *',
        description: 'Daily projection scrape at 4:00 AM server time (UTC on Railway)',
      });
    });

    it('should return cron task instance', () => {
      const task = initializeScheduler();

      expect(task).toBeDefined();
      expect(task.start).toBeDefined();
      expect(task.stop).toBeDefined();
    });

    it('should log scheduled_scrape_start when cron callback is triggered', async () => {
      // Capture the callback passed to cron.schedule
      let cronCallback: () => Promise<void>;
      vi.mocked(cron.schedule).mockImplementation((schedule, callback) => {
        cronCallback = callback as () => Promise<void>;
        return { start: vi.fn(), stop: vi.fn() } as unknown as cron.ScheduledTask;
      });

      initializeScheduler();

      // Execute the callback
      await cronCallback!();

      expect(log).toHaveBeenCalledWith('info', 'scheduled_scrape_start', {
        schedule: '0 4 * * *',
        timestamp: expect.any(String),
      });
    });

    it('should call runFullScrape when cron callback is triggered', async () => {
      // Capture the callback passed to cron.schedule
      let cronCallback: () => Promise<void>;
      vi.mocked(cron.schedule).mockImplementation((schedule, callback) => {
        cronCallback = callback as () => Promise<void>;
        return { start: vi.fn(), stop: vi.fn() } as unknown as cron.ScheduledTask;
      });

      initializeScheduler();

      // Execute the callback
      await cronCallback!();

      expect(runFullScrape).toHaveBeenCalled();
    });

    it('should handle runFullScrape errors gracefully without throwing', async () => {
      // Capture the callback passed to cron.schedule
      let cronCallback: () => Promise<void>;
      vi.mocked(cron.schedule).mockImplementation((schedule, callback) => {
        cronCallback = callback as () => Promise<void>;
        return { start: vi.fn(), stop: vi.fn() } as unknown as cron.ScheduledTask;
      });

      // Mock runFullScrape to throw
      vi.mocked(runFullScrape).mockRejectedValueOnce(new Error('Scrape failed'));

      initializeScheduler();

      // Execute the callback - should not throw
      await expect(cronCallback!()).resolves.toBeUndefined();

      // Should log the error
      expect(log).toHaveBeenCalledWith('error', 'scheduled_scrape_error', {
        error: 'Scrape failed',
      });
    });
  });
});
