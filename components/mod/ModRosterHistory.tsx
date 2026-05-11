import { Badge } from '@/components/ui/Badge';

interface RosterHistoryItem {
  id: string;
  epicUsername: string;
  platform: 'PC' | 'CONSOLE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  applicantUsername: string;
  reviewerUsername: string | null;
}

interface ModRosterHistoryProps {
  items: ReadonlyArray<RosterHistoryItem>;
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ModRosterHistory({ items }: ModRosterHistoryProps) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        No reviewed applications yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li
          key={it.id}
          className="rounded-lg border border-border bg-bg-surface px-5 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-text-primary">
                {it.applicantUsername}
              </span>
              <span className="ml-2 text-xs text-text-muted">
                Epic: {it.epicUsername} · {it.platform}
              </span>
            </div>
            <Badge tone={it.status === 'APPROVED' ? 'accent' : it.status === 'REJECTED' ? 'muted' : 'warn'}>
              {it.status}
            </Badge>
          </div>
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
      ))}
    </ul>
  );
}
