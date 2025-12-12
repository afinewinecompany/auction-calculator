import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, LogEntry } from './logger';

describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log info level with event name', () => {
    log('info', 'test_event');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.mock.calls[0][0]) as LogEntry;

    expect(output.level).toBe('info');
    expect(output.event).toBe('test_event');
    expect(output.timestamp).toBeDefined();
    expect(output.data).toBeUndefined();
  });

  it('should log warn level', () => {
    log('warn', 'warning_event');

    const output = JSON.parse(consoleSpy.mock.calls[0][0]) as LogEntry;
    expect(output.level).toBe('warn');
  });

  it('should log error level', () => {
    log('error', 'error_event');

    const output = JSON.parse(consoleSpy.mock.calls[0][0]) as LogEntry;
    expect(output.level).toBe('error');
  });

  it('should include data when provided', () => {
    const data = { type: 'batters', count: 523 };
    log('info', 'scrape_complete', data);

    const output = JSON.parse(consoleSpy.mock.calls[0][0]) as LogEntry;

    expect(output.data).toEqual(data);
  });

  it('should output valid JSON format', () => {
    log('info', 'test', { key: 'value' });

    const rawOutput = consoleSpy.mock.calls[0][0];
    expect(() => JSON.parse(rawOutput)).not.toThrow();
  });

  it('should use ISO 8601 timestamp format', () => {
    log('info', 'test');

    const output = JSON.parse(consoleSpy.mock.calls[0][0]) as LogEntry;
    const timestamp = output.timestamp;

    // ISO 8601 format validation
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);

    // Should be parseable as a date
    const date = new Date(timestamp);
    expect(date.getTime()).not.toBeNaN();
  });

  it('should not include data key when data is not provided', () => {
    log('info', 'test_event');

    const output = JSON.parse(consoleSpy.mock.calls[0][0]) as LogEntry;
    expect('data' in output).toBe(false);
  });

  it('should handle complex nested data', () => {
    const complexData = {
      scrape: {
        type: 'batters',
        url: 'https://fangraphs.com',
      },
      metrics: {
        duration: 1234,
        retries: 1,
      },
    };

    log('info', 'scrape_complete', complexData);

    const output = JSON.parse(consoleSpy.mock.calls[0][0]) as LogEntry;
    expect(output.data).toEqual(complexData);
  });
});
