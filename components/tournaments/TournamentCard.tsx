import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { Tournament } from '@/db/schema';

const STATUS_TONE: Record<Tournament['status'], 'accent' | 'muted' | 'warn' | 'default'> = {
  DRAFT: 'muted',
  OPEN: 'accent',
  IN_PROGRESS: 'warn',
  CLOSED: 'muted',
  ARCHIVED: 'muted',
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="block rounded-lg border border-border bg-bg-surface p-5 transition hover:border-accent/40 hover:bg-bg-elevated"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-xl text-chrome">{tournament.name}</h3>
        <Badge tone={STATUS_TONE[tournament.status]}>{tournament.status}</Badge>
      </div>
      {tournament.description ? (
        <p className="mt-2 text-sm text-text-muted">{tournament.description}</p>
      ) : null}
      <p className="mt-4 font-mono text-xs text-text-muted">
        {formatDate(tournament.startsAt)} → {formatDate(tournament.endsAt)}
      </p>
    </Link>
  );
}
