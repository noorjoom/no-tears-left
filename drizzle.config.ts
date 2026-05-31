import type { Config } from 'drizzle-kit';
import { applyEnvFile } from './tests/e2e/helpers/load-env';

// Load DATABASE_URL from .env.local so `db:push`/`db:generate` target the local
// dev Postgres — never prod. Prod schema changes use an inline DATABASE_URL.
// Does not clobber an already-set shell env var.
applyEnvFile('.env.local');

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
} satisfies Config;
