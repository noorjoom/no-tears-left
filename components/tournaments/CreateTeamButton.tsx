'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  TOURNAMENT_NOT_FOUND: 'Tournament not found.',
  TOURNAMENT_NOT_OPEN: 'Tournament is not accepting registrations.',
  ALREADY_ON_TEAM: 'You are already on a team in this tournament.',
};

interface CreateTeamButtonProps {
  tournamentId: string;
}

export function CreateTeamButton({ tournamentId }: CreateTeamButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Team name is required.');
      return;
    }

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, name: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? 'UNKNOWN';
        setError(ERROR_MESSAGES[code] ?? code);
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError('Network error. Try again.');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-accent hover:bg-accent/20"
      >
        Create team
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-bg-surface p-4"
    >
      <label
        htmlFor="team-name"
        className="block font-mono text-xs uppercase text-text-muted"
      >
        Team name
      </label>
      <input
        id="team-name"
        type="text"
        required
        maxLength={64}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
      />
      {error ? (
        <p className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          {isPending ? 'Creating…' : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-border px-4 py-2 text-sm text-text-muted hover:border-accent/40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
