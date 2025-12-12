/**
 * Scheduler Module
 *
 * Initializes cron job for nightly projection scraping.
 * Runs within Express server process (in-process scheduling).
 *
 * @module server/services/scraper/scheduler
 */
import cron, { type ScheduledTask } from 'node-cron';
import { log } from '../../lib/logger';
import { runFullScrape } from './index';

/** Cron schedule: 4:00 AM daily */
const SCRAPE_SCHEDULE = '0 4 * * *';

/**
 * Initializes the scrape scheduler.
 *
 * Creates a cron job that runs runFullScrape() at 4 AM daily.
 * Logs scheduler_started event on initialization.
 *
 * @returns The cron task instance (for testing/cleanup)
 */
export function initializeScheduler(): ScheduledTask {
  log('info', 'scheduler_started', {
    schedule: SCRAPE_SCHEDULE,
    description: 'Daily projection scrape at 4:00 AM server time (UTC on Railway)',
  });

  const task = cron.schedule(SCRAPE_SCHEDULE, async () => {
    log('info', 'scheduled_scrape_start', {
      schedule: SCRAPE_SCHEDULE,
      timestamp: new Date().toISOString(),
    });

    try {
      await runFullScrape();
    } catch (error) {
      log('error', 'scheduled_scrape_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return task;
}
