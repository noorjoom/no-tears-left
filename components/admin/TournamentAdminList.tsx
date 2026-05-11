'use client';

import Link from 'next/link';
import type { Tournament } from '@/db/schema';

interface TournamentAdminListProps {
  items: Tournament[];
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'text-text-muted border-border',
  OPEN: 'text-accent border-accent/40',
  IN_PROGRESS: 'text-yellow-300 border-yellow-500/40',
  CLOSED: 'text-text-muted border-border',
  ARCHIVED: 'text-text-muted border-border',
};

export function TournamentAdminList({ items }: TournamentAdminListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        No tournaments yet.{' '}
        <Link href="/mod/tournaments/new" className="text-accent hover:text-accent-bright">
          Create one.
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li
          key={t.id}
          className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-5 py-4"
        >
          <div>
            <h3 className="text-sm font-medium text-text-primary">{t.name}</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Starts {new Date(t.startsAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded border px-2 py-0.5 text-xs ${STATUS_TONE[t.status] ?? 'text-text-muted border-border'}`}
            >
              {t.status}
            </span>
            <Link
              href={`/mod/tournaments/${t.id}/edit`}
              className="text-xs text-accent hover:text-accent-bright"
            >
              Edit
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
