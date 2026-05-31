import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyEnvFile } from './helpers/load-env';
import { buildStorageState } from './helpers/mint-cookie';
import { E2E_IDS, E2E_DISCORD, runSeed } from './seed';
import type { Role } from '../../lib/constants';

export const AUTH_DIR = resolve(process.cwd(), 'tests/e2e/.auth');

/** Logical actor -> storageState file. Specs import these paths. */
export const STORAGE_STATE = {
  admin: resolve(AUTH_DIR, 'admin.json'),
  mod: resolve(AUTH_DIR, 'mod.json'),
  captain: resolve(AUTH_DIR, 'captain.json'),
  partner: resolve(AUTH_DIR, 'partner.json'),
  freshApplicant: resolve(AUTH_DIR, 'fresh.json'),
} as const;

const ACTORS: Array<{
  file: string;
  userId: string;
  role: Role;
  discordId: string;
}> = [
  { file: STORAGE_STATE.admin, userId: E2E_IDS.admin, role: 'ADMIN', discordId: E2E_DISCORD.admin },
  { file: STORAGE_STATE.mod, userId: E2E_IDS.mod, role: 'MOD', discordId: E2E_DISCORD.mod },
  { file: STORAGE_STATE.captain, userId: E2E_IDS.captain, role: 'MEMBER', discordId: E2E_DISCORD.captain },
  { file: STORAGE_STATE.partner, userId: E2E_IDS.partner, role: 'MEMBER', discordId: E2E_DISCORD.partner },
  { file: STORAGE_STATE.freshApplicant, userId: E2E_IDS.freshApplicant, role: 'MEMBER', discordId: E2E_DISCORD.freshApplicant },
];

export default async function globalSetup(): Promise<void> {
  applyEnvFile('.env.e2e');

  // 1. Reset + seed the throwaway DB.
  await runSeed();

  // 2. Mint per-role session cookies into storageState files.
  mkdirSync(AUTH_DIR, { recursive: true });
  for (const actor of ACTORS) {
    const state = await buildStorageState({
      userId: actor.userId,
      role: actor.role,
      discordId: actor.discordId,
    });
    writeFileSync(actor.file, JSON.stringify(state, null, 2));
  }
}
