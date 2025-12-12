/**
 * Database connection utility using postgres driver.
 * Exports a configured Drizzle instance for use in services.
 *
 * Uses lazy initialization to avoid throwing at module load time,
 * allowing tests to import the module without DATABASE_URL.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Gets the database instance, initializing it on first call.
 * Throws if DATABASE_URL is not set.
 */
export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const sql = postgres(process.env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

/** Convenience getter - use getDb() for explicit initialization */
export const db = {
  get instance() {
    return getDb();
  },
};
