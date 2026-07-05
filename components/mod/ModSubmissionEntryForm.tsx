'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { calcMatchScore } from '@/lib/scoring';

interface TournamentOption {
  id: string;
  name: string;
}

interface TeamOption {
  id: string;
  tournamentId: string;
  name: string;
}

interface ModSubmissionEntryFormProps {
  tournaments: ReadonlyArray<TournamentOption>;
  teams: ReadonlyArray<TeamOption>;
}

const ERROR_MESSAGES: Record<string, string> = {
  TEAM_NOT_FOUND: 'Team not found.',
  TOURNAMENT_NOT_FOUND: 'Tournament not found.',
  WINDOW_CLOSED: 'Tournament is not currently open for results.',
  DUPLICATE_MATCH: 'A submission for this match and team already exists.',
};

export function ModSubmissionEntryForm({
  tournaments,
  teams,
}: ModSubmissionEntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? '');
  const [teamId, setTeamId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [eliminations, setEliminations] = useState('');
  const [placement, setPlacement] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const teamsInTournament = teams.filter((t) => t.tournamentId === tournamentId);
  const elimsNum = Number(eliminations);
  const placementNum = Number(placement);
  const previewScore =
    eliminations !== '' && placement !== '' && Number.isInteger(elimsNum) && Number.isInteger(placementNum)
      ? calcMatchScore(elimsNum, placementNum)
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!teamId) {
      setError('Select a team.');
      return;
    }

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          matchId,
          eliminations: elimsNum,
          placement: placementNum,
          screenshotUrl: screenshotUrl || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? 'UNKNOWN';
        setError(ERROR_MESSAGES[code] ?? code);
        return;
      }
      setMatchId('');
      setEliminations('');
      setPlacement('');
      setScreenshotUrl('');
      setSuccess('Submission added.');
      startTransition(() => router.refresh());
    } catch {
      setError('Network error.');
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-lg space-y-4 rounded-lg border border-border bg-bg-surface p-6"
    >
      <div>
        <label htmlFor="tournamentId" className="mb-1 block text-xs uppercase text-text-muted">
          Tournament
        </label>
        <select
          id="tournamentId"
          value={tournamentId}
          onChange={(e) => {
            setTournamentId(e.currentTarget.value);
            setTeamId('');
          }}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="teamId" className="mb-1 block text-xs uppercase text-text-muted">
          Team
        </label>
        <select
          id="teamId"
          value={teamId}
          onChange={(e) => setTeamId(e.currentTarget.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">Select a team…</option>
          {teamsInTournament.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="matchId" className="mb-1 block text-xs uppercase text-text-muted">
          Match ID
        </label>
        <input
          id="matchId"
          value={matchId}
          onChange={(e) => setMatchId(e.currentTarget.value)}
          maxLength={64}
          required
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="eliminations" className="mb-1 block text-xs uppercase text-text-muted">
            Eliminations
          </label>
          <input
            id="eliminations"
            type="number"
            min={0}
            max={100}
            value={eliminations}
            onChange={(e) => setEliminations(e.currentTarget.value)}
            required
            className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="placement" className="mb-1 block text-xs uppercase text-text-muted">
            Placement
          </label>
          <input
            id="placement"
            type="number"
            min={1}
            max={100}
            value={placement}
            onChange={(e) => setPlacement(e.currentTarget.value)}
            required
            className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="screenshotUrl" className="mb-1 block text-xs uppercase text-text-muted">
          Discord link (optional)
        </label>
        <input
          id="screenshotUrl"
          type="url"
          value={screenshotUrl}
          onChange={(e) => setScreenshotUrl(e.currentTarget.value)}
          placeholder="https://discord.com/channels/…"
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      {previewScore !== null ? (
        <p className="text-xs font-mono text-text-muted">
          Computed score: <span className="text-accent">{previewScore}</span> pts
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        Add result
      </button>
    </form>
  );
}
