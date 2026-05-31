import { encode } from 'next-auth/jwt';
import type { Role } from '../../../lib/constants';

// Default Auth.js v5 session cookie name over http (localhost, non-secure).
// This string doubles as the JWT encryption `salt`.
export const SESSION_COOKIE_NAME = 'authjs.session-token';

const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;

export interface MintInput {
  userId: string;
  role: Role;
  discordId: string;
}

/**
 * Mint an Auth.js-compatible encrypted session JWT. The payload carries `id` and
 * `role` so the server's jwt callback skips its DB lookup, and `discordId`/`sub`
 * to mirror a real Discord login. Must use the same AUTH_SECRET the server runs
 * with (both read .env.e2e).
 */
export async function mintSessionToken({ userId, role, discordId }: MintInput): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET not set — cannot mint E2E session cookie');

  return encode({
    token: {
      sub: userId,
      id: userId,
      role,
      discordId,
      name: `E2E ${role}`,
    },
    secret,
    salt: SESSION_COOKIE_NAME,
    maxAge: THIRTY_DAYS_SEC,
  });
}

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
  }>;
  origins: never[];
}

/** Build a Playwright storageState carrying the minted session cookie. */
export async function buildStorageState(
  input: MintInput,
  domain = 'localhost',
): Promise<StorageState> {
  const value = await mintSessionToken(input);
  return {
    cookies: [
      {
        name: SESSION_COOKIE_NAME,
        value,
        domain,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + THIRTY_DAYS_SEC,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };
}
