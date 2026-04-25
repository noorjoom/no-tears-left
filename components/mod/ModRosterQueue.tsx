'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';

interface RosterQueueItem {
  id: string;
  userId: string;
  epicUsername: string;
  platform: 'PC' | 'CONSOLE';
  timezone: string;
  whyText: string;
  vodUrl: string | null;
  createdAt: Date | string;
  discordUsername: string;
}

interface ModRosterQueueProps {
  items: ReadonlyArray<RosterQueueItem>;
  reviewerId: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Application no longer exists.',
  NOT_PENDING: 'Already reviewed by another mod.',
  CANNOT_REVIEW_OWN: 'You cannot review your own application.',
};

export function ModRosterQueue({ items, reviewerId }: ModRosterQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  void reviewerId;

  if (items.length === 0) {
    return (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        No pending applications.
      </p>
    );
  }

  async function review(id: string, decision: 'APPROVED' | 'REJECTED') {
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/roster/${id}`, {
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
      {items.map((it) => (
        <li
          key={it.id}
          className="rounded-lg border border-border bg-bg-surface p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-xl text-chrome">
                {it.discordUsername}
              </h3>
              <p className="mt-1 text-xs font-mono text-text-muted">
                Epic: {it.epicUsername} · {it.platform} · {it.timezone}
              </p>
            </div>
            <Badge tone="warn">PENDING</Badge>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-text-primary">
            {it.whyText}
          </p>
          {it.vodUrl ? (
            <a
              href={it.vodUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-accent hover:text-accent-bright"
            >
              VOD ↗
            </a>
          ) : null}
          <div className="mt-4 space-y-2">
            <textarea
              placeholder="Optional review note"
              rows={2}
              maxLength={500}
              value={notes[it.id] ?? ''}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [it.id]: e.currentTarget.value }))
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
                onClick={() => review(it.id, 'APPROVED')}
                disabled={isPending}
                className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
              >
                Approve
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
        </li>
      ))}
    </ul>
  );
}
