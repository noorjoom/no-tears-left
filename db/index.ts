import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __ntlPgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!globalThis.__ntlPgPool) {
    globalThis.__ntlPgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return globalThis.__ntlPgPool;
}

export const db = drizzle(
  new Proxy({} as Pool, {
    get(_target, prop, receiver) {
      const pool = getPool();
      const value = Reflect.get(pool, prop, pool);
      return typeof value === 'function' ? value.bind(pool) : value;
    },
  }),
  { schema },
);

export * from './schema';
