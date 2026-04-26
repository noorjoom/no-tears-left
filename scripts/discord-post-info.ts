/**
 * One-shot script: post NTL info to Discord via webhooks.
 *
 * Usage:
 *   npm run discord:post -- --dry-run                    # print payloads, no POST
 *   npm run discord:post                                 # post all 3
 *   npm run discord:post -- --only=ntl                   # only #notearsleft
 *   npm run discord:post -- --only=announce              # only #announcement
 *   npm run discord:post -- --only=roster                # only #official-roster
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, rosterApplications, submissions, teams, tournaments } from '../db';
import { calcMatchScore } from '../lib/scoring';

const SITE = 'https://www.ntl.gg';
const ACCENT = 0xa8c8e8;
const ACCENT_CHROME = 0xd4d4d4;

type Target = 'ntl' | 'announce' | 'roster';

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

interface WebhookPayload {
  embeds: DiscordEmbed[];
}

function loadEnv(): void {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getWebhookUrl(target: Target): string {
  const map: Record<Target, string> = {
    ntl: 'DISCORD_WEBHOOK_NTL',
    announce: 'DISCORD_WEBHOOK_ANNOUNCE',
    roster: 'DISCORD_WEBHOOK_ROSTER',
  };
  const key = map[target];
  const url = process.env[key];
  if (!url) throw new Error(`${key} not set in environment`);
  return url;
}

function buildAboutEmbed(): DiscordEmbed {
  return {
    title: 'No Tears Left',
    description:
      'Community hub and tournament platform for the **Fortnite Zero Build (ZB)** competitive scene. ' +
      'Join the roster, compete in Duo Kill Race tournaments, climb the leaderboard.',
    url: SITE,
    color: ACCENT,
    fields: [
      {
        name: 'Tournaments',
        value:
          '**Duo Kill Race** — register a duo, play matches, submit screenshots. Verified submissions feed a cumulative leaderboard.',
      },
      {
        name: 'Scoring',
        value:
          '`points = eliminations + placement_bonus`\n' +
          '```\n' +
          '1st       → 10\n' +
          '2nd–3rd   →  7\n' +
          '4th–5th   →  5\n' +
          '6th–10th  →  3\n' +
          '11th–25th →  1\n' +
          '26th+     →  0\n' +
          '```',
      },
      {
        name: 'Roles',
        value:
          '**MEMBER** — default on first Discord login\n' +
          '**MOD** — approves roster apps, verifies submissions, runs tournaments\n' +
          '**ADMIN** — full control, role assignment, prize pool config',
        inline: false,
      },
      {
        name: 'Login',
        value: 'Discord OAuth only. No email/password.',
        inline: true,
      },
      {
        name: 'Site',
        value: `[ntl.gg](${SITE})`,
        inline: true,
      },
    ],
    footer: { text: 'No Tears Left · ntl.gg' },
  };
}

async function fetchLiveSnapshot(): Promise<DiscordEmbed> {
  const [rosterRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rosterApplications)
    .where(eq(rosterApplications.status, 'APPROVED'));
  const rosterCount = rosterRow?.count ?? 0;

  const activeTournaments = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
    })
    .from(tournaments)
    .where(inArray(tournaments.status, ['OPEN', 'IN_PROGRESS']))
    .orderBy(tournaments.startsAt)
    .limit(10);

  const verified = await db
    .select({
      teamId: submissions.teamId,
      eliminations: submissions.eliminations,
      placement: submissions.placement,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(teams, eq(teams.id, submissions.teamId))
    .where(eq(submissions.status, 'VERIFIED'));

  const totals = new Map<string, { name: string; points: number }>();
  for (const row of verified) {
    const points = calcMatchScore(row.eliminations, row.placement);
    const cur = totals.get(row.teamId);
    if (cur) cur.points += points;
    else totals.set(row.teamId, { name: row.teamName, points });
  }
  const top5 = [...totals.values()]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  const fields: DiscordEmbed['fields'] = [
    {
      name: 'Roster',
      value: `**${rosterCount}** approved member${rosterCount === 1 ? '' : 's'}`,
      inline: true,
    },
    {
      name: 'Active Tournaments',
      value:
        activeTournaments.length === 0
          ? '_None right now_'
          : activeTournaments
              .map((t) => `• **${t.name}** — ${t.status}`)
              .join('\n'),
      inline: false,
    },
    {
      name: 'Top 5 Teams (verified points)',
      value:
        top5.length === 0
          ? '_No verified submissions yet_'
          : top5
              .map((t, i) => `**${i + 1}.** ${t.name} — ${t.points} pts`)
              .join('\n'),
      inline: false,
    },
  ];

  return {
    title: 'NTL — Live Snapshot',
    description: 'Roster, active tournaments, and current top 5.',
    url: `${SITE}/leaderboard`,
    color: ACCENT,
    fields,
    footer: { text: 'Snapshot' },
    timestamp: new Date().toISOString(),
  };
}

function buildLinksEmbed(): DiscordEmbed {
  return {
    title: 'Join the NTL Roster',
    description:
      'The NTL roster is the public list of approved community members. Apply with your Discord account.',
    color: ACCENT_CHROME,
    fields: [
      {
        name: 'How to apply',
        value:
          '1. Log in with Discord at [ntl.gg](' +
          SITE +
          ')\n2. Submit your roster application\n3. Mods review — you get notified on approval',
      },
      {
        name: 'Apply',
        value: `[ntl.gg/roster/apply](${SITE}/roster/apply)`,
        inline: true,
      },
      {
        name: 'Roster',
        value: `[ntl.gg/roster](${SITE}/roster)`,
        inline: true,
      },
      {
        name: 'Tournaments',
        value: `[ntl.gg/tournaments](${SITE}/tournaments)`,
        inline: true,
      },
      {
        name: 'Leaderboard',
        value: `[ntl.gg/leaderboard](${SITE}/leaderboard)`,
        inline: true,
      },
    ],
    footer: { text: 'No Tears Left · ntl.gg' },
  };
}

async function postWebhook(url: string, payload: WebhookPayload): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook POST failed (${res.status}): ${text}`);
  }
}

function parseArgs(argv: string[]): { dryRun: boolean; only: Target | null } {
  let dryRun = false;
  let only: Target | null = null;
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--only=')) {
      const v = arg.slice('--only='.length);
      if (v === 'ntl' || v === 'announce' || v === 'roster') only = v;
      else throw new Error(`--only must be one of ntl|announce|roster, got: ${v}`);
    }
  }
  return { dryRun, only };
}

async function main(): Promise<void> {
  loadEnv();
  const { dryRun, only } = parseArgs(process.argv);

  const targets: { target: Target; build: () => Promise<DiscordEmbed> | DiscordEmbed }[] = [
    { target: 'ntl', build: buildAboutEmbed },
    { target: 'announce', build: fetchLiveSnapshot },
    { target: 'roster', build: buildLinksEmbed },
  ];

  for (const { target, build } of targets) {
    if (only && only !== target) continue;
    const embed = await build();
    const payload: WebhookPayload = { embeds: [embed] };

    if (dryRun) {
      console.log(`\n=== [${target}] DRY RUN ===`);
      console.log(JSON.stringify(payload, null, 2));
      continue;
    }

    const url = getWebhookUrl(target);
    await postWebhook(url, payload);
    console.log(`[${target}] posted ✓`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('discord-post-info failed:', err);
  process.exit(1);
});
