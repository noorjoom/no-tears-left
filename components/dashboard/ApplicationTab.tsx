import Link from 'next/link';
import type { RosterApplication } from '@/db/schema';
import { Badge } from '@/components/ui/Badge';
import { ROSTER_REAPPLY_COOLDOWN_DAYS } from '@/lib/constants';

interface ApplicationTabProps {
  application: RosterApplication | null;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function cooldownEnd(reviewedAt: Date | string | null): Date | null {
  if (!reviewedAt) return null;
  return new Date(
    new Date(reviewedAt).getTime() +
      ROSTER_REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function ApplicationTab({ application }: ApplicationTabProps) {
  if (!application) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="font-display text-2xl text-chrome">No application yet</h2>
        <p className="mt-2 text-sm text-text-muted">
          Apply to be listed on the public NTL roster.
        </p>
        <Link
          href="/roster/apply"
          className="mt-4 inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-accent hover:bg-accent/20"
        >
          Apply now
        </Link>
      </div>
    );
  }

  if (application.status === 'PENDING') {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl text-chrome">Application pending</h2>
          <Badge tone="warn">PENDING</Badge>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Submitted {formatDate(application.createdAt)}. A mod will review soon.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="font-mono text-xs uppercase text-text-muted">Epic</dt>
            <dd className="text-text-primary">{application.epicUsername}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase text-text-muted">Platform</dt>
            <dd className="text-text-primary">{application.platform}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (application.status === 'APPROVED') {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl text-chrome">You&apos;re on the roster</h2>
          <Badge tone="accent">APPROVED</Badge>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Approved {application.reviewedAt ? formatDate(application.reviewedAt) : ''}.
        </p>
        <Link
          href="/roster"
          className="mt-4 inline-block text-sm text-accent hover:text-accent-bright"
        >
          View public roster →
        </Link>
      </div>
    );
  }

  // REJECTED
  const cooldown = cooldownEnd(application.reviewedAt);
  const cooldownActive = cooldown ? cooldown.getTime() > Date.now() : true;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-2xl text-chrome">Application rejected</h2>
        <Badge tone="muted">REJECTED</Badge>
      </div>
      {application.reviewNote ? (
        <p className="mt-2 text-sm text-text-muted">
          Mod note: {application.reviewNote}
        </p>
      ) : null}
      {cooldownActive && cooldown ? (
        <p className="mt-4 text-sm text-text-muted">
          You can re-apply after {formatDate(cooldown)}.
        </p>
      ) : (
        <Link
          href="/roster/apply"
          className="mt-4 inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-accent hover:bg-accent/20"
        >
          Apply again
        </Link>
      )}
    </div>
  );
}
