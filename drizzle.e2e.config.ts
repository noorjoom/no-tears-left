import type { Config } from 'drizzle-kit';
import { applyEnvFile } from './tests/e2e/helpers/load-env';

// Push schema to the throwaway E2E Postgres. Reads DATABASE_URL from .env.e2e
// so it never touches dev/prod, regardless of shell env.
applyEnvFile('.env.e2e');

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: false,
  verbose: false,
} satisfies Config;
