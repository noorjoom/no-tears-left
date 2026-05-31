import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Minimal .env.e2e loader — avoids a dotenv dependency. Parses KEY=VALUE lines
 * (ignoring blanks and # comments) and returns them as a record. Does NOT mutate
 * process.env by default so callers control precedence.
 */
export function readEnvFile(file = '.env.e2e'): Record<string, string> {
  const path = resolve(process.cwd(), file);
  const raw = readFileSync(path, 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

/** Load .env.e2e into process.env without clobbering already-set vars. */
export function applyEnvFile(file = '.env.e2e'): Record<string, string> {
  const env = readEnvFile(file);
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return env;
}
