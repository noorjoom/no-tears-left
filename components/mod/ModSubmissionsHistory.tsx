'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { calcMatchScore } from '@/lib/scoring';

interface SubmissionsHistoryItem {
  id: string;
  teamName: string;
  tournamentName: string;
  matchId: string;
  eliminations: number;
  placement: number;
  reviewedAt: Date | string | null;
  submittedAt: Date | string;
  reviewerUsername: string | null;
}

interface ModSubmissionsHistoryProps {
  items: ReadonlyArray<SubmissionsHistoryItem>;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Submission no longer exists.',
  DUPLICATE_MATCH: 'Another submission already uses that match ID for this team.',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ModSubmissionsHistory({ items }: ModSubmissionsHistoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { matchId: string; eliminations: string; placement: string }>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        No submissions yet.
      </p>
    );
  }

  function startEdit(it: SubmissionsHistoryItem) {
    setDrafts((prev) => ({
      ...prev,
      [it.id]: {
        matchId: it.matchId,
        eliminations: String(it.eliminations),
        placement: String(it.placement),
      },
    }));
    setEditingId(it.id);
  }

  async function saveEdit(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: draft.matchId,
          eliminations: Number(draft.eliminations),
          placement: Number(draft.placement),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? 'UNKNOWN';
        setErrors((prev) => ({ ...prev, [id]: ERROR_MESSAGES[code] ?? code }));
        return;
      }
      setEditingId(null);
      startTransition(() => router.refresh());
    } catch {
      setErrors((prev) => ({ ...prev, [id]: 'Network error.' }));
    }
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const isEditing = editingId === it.id;
        const draft = drafts[it.id];
        const score = calcMatchScore(it.eliminations, it.placement);
        return (
          <li
            key={it.id}
            className="rounded-lg border border-border bg-bg-surface px-5 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-medium text-text-primary">
                  {it.teamName}
                </span>
                <span className="ml-2 text-xs text-text-muted">
                  {it.tournamentName}
                </span>
              </div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => startEdit(it)}
                  className="text-xs text-accent hover:text-accent-bright"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {isEditing && draft ? (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={draft.matchId}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [it.id]: { ...draft, matchId: e.currentTarget.value },
                      }))
                    }
                    placeholder="Match ID"
                    className="rounded border border-border bg-bg-base px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    value={draft.eliminations}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [it.id]: { ...draft, eliminations: e.currentTarget.value },
                      }))
                    }
                    placeholder="Elims"
                    className="rounded border border-border bg-bg-base px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    value={draft.placement}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [it.id]: { ...draft, placement: e.currentTarget.value },
                      }))
                    }
                    placeholder="Placement"
                    className="rounded border border-border bg-bg-base px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
                {errors[it.id] ? (
                  <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {errors[it.id]}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(it.id)}
                    disabled={isPending}
                    className="rounded border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent hover:bg-accent/20 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded border border-border bg-bg-elevated px-3 py-1 text-xs text-text-primary hover:border-red-500/40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs font-mono text-text-muted">
                  match {it.matchId} · {it.eliminations} elims · #{it.placement} ·{' '}
                  {score} pts
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Added {formatDate(it.reviewedAt)}
                  {it.reviewerUsername ? ` by ${it.reviewerUsername}` : ''}
                </p>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
