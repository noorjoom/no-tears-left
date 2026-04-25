'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: 'This invite link is invalid or has already been used.',
  EXPIRED: 'This invite has expired. Ask your captain for a new link.',
  TEAM_FULL: 'This team is already full.',
  CANNOT_JOIN_OWN: 'You cannot join your own team.',
  ALREADY_ON_TEAM: 'You are already on a team in this tournament.',
};

interface JoinTeamFormProps {
  token: string;
}

export function JoinTeamForm({ token }: JoinTeamFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleJoin() {
    setError(null);
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken: token }),
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
        router.push('/dashboard?tab=teams');
      });
    } catch {
      setError('Network error. Try again.');
    }
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6">
      <p className="text-sm text-text-muted">
        Click below to join the team using this invite token.
      </p>
      {error ? (
        <p className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="mt-4 w-full rounded border border-accent/40 bg-accent/10 px-4 py-2 text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {isPending ? 'Joining…' : 'Join team'}
      </button>
    </div>
  );
}
