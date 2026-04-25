import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { teams, tournaments } from '@/db/schema';
import type { RosterDb } from './roster-service';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type SupportedContentType = 'image/png' | 'image/jpeg' | 'image/webp';

const CONTENT_TYPE_EXT: Record<SupportedContentType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface SignedUploadHandle {
  signedUrl: string;
  token: string;
  path: string;
}

export interface StorageAdapter {
  bucket: string;
  publicBaseUrl: string;
  createSignedUploadUrl: (path: string) => Promise<SignedUploadHandle>;
}

export type SubmissionUploadInput = {
  kind: 'submission';
  actorId: string;
  tournamentId: string;
  teamId: string;
  matchId: string;
  contentType: SupportedContentType;
};

export type RosterUploadInput = {
  kind: 'roster';
  actorId: string;
  contentType: SupportedContentType;
};

export type RequestUploadUrlInput = SubmissionUploadInput | RosterUploadInput;

export type UploadUrlError =
  | 'BAD_CONTENT_TYPE'
  | 'TEAM_NOT_FOUND'
  | 'NOT_CAPTAIN'
  | 'TOURNAMENT_NOT_FOUND'
  | 'TOURNAMENT_NOT_OPEN'
  | 'WINDOW_CLOSED'
  | 'STORAGE_ERROR';

export interface UploadUrlResult {
  path: string;
  signedUrl: string;
  token: string;
  publicUrl: string;
}

const SUBMISSION_TOURNAMENT_OK = new Set(['OPEN', 'IN_PROGRESS']);

function extFor(contentType: string): string | null {
  if (contentType in CONTENT_TYPE_EXT) {
    return CONTENT_TYPE_EXT[contentType as SupportedContentType];
  }
  return null;
}

function sanitizeMatchId(matchId: string): string {
  return matchId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export async function requestUploadUrl(
  db: RosterDb,
  input: RequestUploadUrlInput,
  adapter: StorageAdapter,
  now: Date = new Date(),
): Promise<ServiceResult<UploadUrlResult, UploadUrlError>> {
  const ext = extFor(input.contentType);
  if (!ext) return { ok: false, error: 'BAD_CONTENT_TYPE' };

  let path: string;

  if (input.kind === 'submission') {
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.id, input.teamId),
          eq(teams.tournamentId, input.tournamentId),
        ),
      )
      .limit(1);
    if (!team) return { ok: false, error: 'TEAM_NOT_FOUND' };
    if (team.captainId !== input.actorId) {
      return { ok: false, error: 'NOT_CAPTAIN' };
    }

    const [tourney] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, team.tournamentId))
      .limit(1);
    if (!tourney) return { ok: false, error: 'TOURNAMENT_NOT_FOUND' };
    if (!SUBMISSION_TOURNAMENT_OK.has(tourney.status)) {
      return { ok: false, error: 'TOURNAMENT_NOT_OPEN' };
    }
    if (
      tourney.startsAt.getTime() > now.getTime() ||
      tourney.endsAt.getTime() < now.getTime()
    ) {
      return { ok: false, error: 'WINDOW_CLOSED' };
    }

    const safeMatch = sanitizeMatchId(input.matchId);
    path = `${input.tournamentId}/${input.teamId}/${safeMatch}-${randomUUID()}.${ext}`;
  } else {
    path = `roster/${input.actorId}/${randomUUID()}.${ext}`;
  }

  let handle: SignedUploadHandle;
  try {
    handle = await adapter.createSignedUploadUrl(path);
  } catch {
    return { ok: false, error: 'STORAGE_ERROR' };
  }

  const base = adapter.publicBaseUrl.replace(/\/$/, '');
  return {
    ok: true,
    value: {
      path: handle.path,
      signedUrl: handle.signedUrl,
      token: handle.token,
      publicUrl: `${base}/${handle.path}`,
    },
  };
}
