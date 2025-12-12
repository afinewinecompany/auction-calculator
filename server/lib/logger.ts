/**
 * JSON structured logging utility for backend services.
 * Outputs logs in a consistent JSON format for easy parsing and monitoring.
 *
 * Standard events:
 * - scrape_start, scrape_complete, scrape_failed, scrape_retry
 * - db_write_complete
 * - api_request
 * - scheduler_started, scheduled_scrape_start, scheduled_scrape_error
 * - manual_scrape_triggered, manual_scrape_error
 *
 * @example
 * log('info', 'scrape_start', { type: 'batters', url: 'https://...' });
 * log('error', 'scrape_failed', { error: err.message, attempt: 1 });
 */

/** Severity levels for structured logging */
export type LogLevel = 'info' | 'warn' | 'error';

/** Structure of a JSON log entry output by the logger */
export interface LogEntry {
  /** Severity level of the log */
  level: LogLevel;
  /** Event identifier (e.g., 'scrape_start', 'app_error') */
  event: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Optional structured data associated with the event */
  data?: Record<string, unknown>;
}

export function log(
  level: LogLevel,
  event: string,
  data?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
  };

  console.log(JSON.stringify(entry));
}
