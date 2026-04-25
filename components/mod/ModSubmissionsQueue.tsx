'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { calcMatchScore } from '@/lib/scoring';

interface SubmissionQueueItem {
  id: string;
  teamId: string;
  teamName: string;
  captainId: string;
  partnerId: string | null;
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  eliminations: number;
  placement: number;
  screenshotUrl: string;
  submittedAt: Date | string;
}

interface ModSubmissionsQueueProps {
  items: ReadonlyArray<SubmissionQueueItem>;
  reviewerId: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Submission no longer exists.',
  NOT_PENDING: 'Already reviewed by another mod.',
  CONFLICT_OF_INTEREST: 'You cannot review your own team.',
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ModSubmissionsQueue({
  items,
  reviewerId,
}: ModSubmissionsQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        No pending submissions.
      </p>
    );
  }

  async function review(id: string, decision: 'VERIFIED' | 'REJECTED') {
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewNote: notes[id] || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? 'UNKNOWN';
        setErrors((prev) => ({
          ...prev,
          [id]: ERROR_MESSAGES[code] ?? code,
        }));
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setErrors((prev) => ({ ...prev, [id]: 'Network error.' }));
    }
  }

  return (
    <ul className="space-y-4">
      {items.map((it) => {
        const conflicted =
          it.captainId === reviewerId || it.partnerId === reviewerId;
        const score = calcMatchScore(it.eliminations, it.placement);
        return (
          <li
            key={it.id}
            className="rounded-lg border border-border bg-bg-surface p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-chrome">
                  {it.teamName}
                </h3>
                <p className="mt-1 text-xs font-mono text-text-muted">
                  {it.tournamentName} · match {it.matchId}
                </p>
              </div>
              <Badge tone="warn">PENDING</Badge>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="font-mono text-xs uppercase text-text-muted">
                  Elims
                </dt>
                <dd className="text-text-primary">{it.eliminations}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase text-text-muted">
                  Placement
                </dt>
                <dd className="text-text-primary">#{it.placement}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase text-text-muted">
                  Computed score
                </dt>
                <dd className="font-mono text-accent">{score}</dd>
              </div>
            </dl>

            <a
              href={it.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.screenshotUrl}
                alt={`Submission ${it.matchId}`}
                className="max-h-96 w-full rounded border border-border object-contain"
              />
            </a>

            <p className="mt-2 text-xs text-text-muted">
              Submitted {formatDate(it.submittedAt)}
            </p>

            {conflicted ? (
              <p className="mt-4 rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                Conflict of interest — you cannot review your own team.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                <textarea
                  placeholder="Optional review note"
                  rows={2}
                  maxLength={500}
                  value={notes[it.id] ?? ''}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [it.id]: e.currentTarget.value,
                    }))
                  }
                  className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                />
                {errors[it.id] ? (
                  <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {errors[it.id]}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => review(it.id, 'VERIFIED')}
                    disabled={isPending}
                    className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => review(it.id, 'REJECTED')}
                    disabled={isPending}
                    className="rounded border border-border bg-bg-elevated px-4 py-2 text-sm text-text-primary hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
