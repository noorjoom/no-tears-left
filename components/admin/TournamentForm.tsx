'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Tournament } from '@/db/schema';

type TournamentFormProps =
  | { mode: 'create'; initial?: never }
  | { mode: 'edit'; initial: Tournament };

type TournamentStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';

const STATUS_OPTIONS: TournamentStatus[] = [
  'DRAFT', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED',
];

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_DATES: 'Registration deadline must be before start, and start must be before end.',
  INVALID_MAX_TEAMS: 'Max teams must be at least 1.',
  NOT_FOUND: 'Tournament not found.',
};

function toDatetimeLocal(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

export function TournamentForm({ mode, initial }: TournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [regDeadline, setRegDeadline] = useState(toDatetimeLocal(initial?.registrationDeadline));
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initial?.endsAt));
  const [maxTeams, setMaxTeams] = useState(initial?.maxTeams != null ? String(initial.maxTeams) : '');
  const [status, setStatus] = useState<TournamentStatus>(initial?.status ?? 'DRAFT');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    const body: Record<string, unknown> = {
      name,
      description: description.trim() || null,
      registrationDeadline: regDeadline ? new Date(regDeadline).toISOString() : undefined,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      maxTeams: maxTeams !== '' ? parseInt(maxTeams, 10) : null,
    };

    if (mode === 'edit') {
      body.status = status;
    }

    try {
      const url =
        mode === 'create' ? '/api/tournaments' : `/api/tournaments/${initial.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        const code = data?.error ?? 'UNKNOWN';
        setError(ERROR_MESSAGES[code] ?? code);
        return;
      }

      if (mode === 'create') {
        startTransition(() => router.push('/mod/tournaments'));
      } else {
        setSaved(true);
        startTransition(() => router.refresh());
      }
    } catch {
      setError('Network error.');
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-5">
      <div>
        <label htmlFor="t-name" className="mb-1 block text-sm text-text-muted">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="t-name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="t-desc" className="mb-1 block text-sm text-text-muted">
          Description
        </label>
        <textarea
          id="t-desc"
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="t-reg" className="mb-1 block text-sm text-text-muted">
            Reg. deadline <span className="text-red-400">*</span>
          </label>
          <input
            id="t-reg"
            type="datetime-local"
            required
            value={regDeadline}
            onChange={(e) => setRegDeadline(e.target.value)}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="t-start" className="mb-1 block text-sm text-text-muted">
            Starts at <span className="text-red-400">*</span>
          </label>
          <input
            id="t-start"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="t-end" className="mb-1 block text-sm text-text-muted">
            Ends at <span className="text-red-400">*</span>
          </label>
          <input
            id="t-end"
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="t-max" className="mb-1 block text-sm text-text-muted">
          Max teams (optional)
        </label>
        <input
          id="t-max"
          type="number"
          min={1}
          value={maxTeams}
          onChange={(e) => setMaxTeams(e.target.value)}
          placeholder="Unlimited"
          className="w-48 rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      {mode === 'edit' && (
        <div>
          <label htmlFor="t-status" className="mb-1 block text-sm text-text-muted">
            Status
          </label>
          <select
            id="t-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TournamentStatus)}
            className="rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
          Tournament updated.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          {mode === 'create' ? 'Create tournament' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/mod/tournaments')}
          className="rounded border border-border bg-bg-elevated px-4 py-2 text-sm text-text-muted hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
