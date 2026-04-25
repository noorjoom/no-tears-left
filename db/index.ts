import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __ntlDb: NodePgDatabase<typeof schema> | undefined;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalThis.__ntlDb) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    globalThis.__ntlDb = drizzle(pool, { schema });
  }
  return globalThis.__ntlDb;
}

/**
 * Lazy proxy: db.select(), db.insert(), etc. defer connection setup until
 * first use. Lets modules import { db } at the top level without crashing
 * during build when DATABASE_URL is unset.
 */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
}) as NodePgDatabase<typeof schema>;

export * from './schema';
