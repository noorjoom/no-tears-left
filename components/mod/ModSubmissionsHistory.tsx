import { Badge } from '@/components/ui/Badge';
import { calcMatchScore } from '@/lib/scoring';

interface SubmissionsHistoryItem {
  id: string;
  teamName: string;
  tournamentName: string;
  matchId: string;
  eliminations: number;
  placement: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reviewNote: string | null;
  reviewedAt: Date | string | null;
  submittedAt: Date | string;
  reviewerUsername: string | null;
}

interface ModSubmissionsHistoryProps {
  items: ReadonlyArray<SubmissionsHistoryItem>;
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ModSubmissionsHistory({ items }: ModSubmissionsHistoryProps) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        No reviewed submissions yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => {
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
                  {it.tournamentName} · match {it.matchId}
                </span>
              </div>
              <Badge tone={it.status === 'VERIFIED' ? 'accent' : it.status === 'REJECTED' ? 'muted' : 'warn'}>
                {it.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs font-mono text-text-muted">
              {it.eliminations} elims · #{it.placement} · {score} pts
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Reviewed {formatDate(it.reviewedAt)}
              {it.reviewerUsername ? ` by ${it.reviewerUsername}` : ''}
            </p>
            {it.reviewNote ? (
              <p className="mt-2 text-xs text-text-muted italic">
                &ldquo;{it.reviewNote}&rdquo;
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
