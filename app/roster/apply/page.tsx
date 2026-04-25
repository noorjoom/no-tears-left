import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getApplicationForUser } from '@/lib/roster-service';
import { safeFetch } from '@/lib/safe-fetch';
import { ROSTER_REAPPLY_COOLDOWN_DAYS } from '@/lib/constants';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { RosterApplyForm } from '@/components/roster/RosterApplyForm';

export const dynamic = 'force-dynamic';

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function RosterApplyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const userId = session.user.id;

  const application = await safeFetch(
    () => getApplicationForUser(db, userId),
    null,
  );

  let body: React.ReactNode;

  if (application?.status === 'PENDING') {
    body = (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <Badge tone="warn">PENDING</Badge>
        <h2 className="mt-3 font-display text-2xl text-chrome">
          Application pending review
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          You already have an application waiting on a mod. Check back later.
        </p>
        <Link
          href="/dashboard?tab=application"
          className="mt-4 inline-block text-sm text-accent hover:text-accent-bright"
        >
          Back to dashboard →
        </Link>
      </div>
    );
  } else if (application?.status === 'APPROVED') {
    body = (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <Badge tone="accent">APPROVED</Badge>
        <h2 className="mt-3 font-display text-2xl text-chrome">
          You&apos;re already on the roster
        </h2>
        <Link
          href="/roster"
          className="mt-4 inline-block text-sm text-accent hover:text-accent-bright"
        >
          View public roster →
        </Link>
      </div>
    );
  } else if (application?.status === 'REJECTED' && application.reviewedAt) {
    const cooldownEnd = new Date(
      new Date(application.reviewedAt).getTime() +
        ROSTER_REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    );
    if (cooldownEnd.getTime() > Date.now()) {
      body = (
        <div className="rounded-lg border border-border bg-bg-surface p-6">
          <Badge tone="muted">COOLDOWN</Badge>
          <h2 className="mt-3 font-display text-2xl text-chrome">
            Re-application cooldown
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            You can re-apply after {formatDate(cooldownEnd)}.
          </p>
        </div>
      );
    } else {
      body = <RosterApplyForm />;
    }
  } else {
    body = <RosterApplyForm />;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Apply to the roster</h1>
        <p className="mt-2 text-sm text-text-muted">
          Approved applicants are listed on the public NTL roster page.
        </p>
        <div className="mt-8">{body}</div>
      </main>
      <Footer />
    </>
  );
}
