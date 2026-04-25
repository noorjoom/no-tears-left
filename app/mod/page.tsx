import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { hasRole } from '@/lib/role-guard';
import { listApplicationsByStatus } from '@/lib/roster-service';
import { listSubmissionsByStatusWithContext } from '@/lib/submissions-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { ModRosterQueue } from '@/components/mod/ModRosterQueue';
import { ModSubmissionsQueue } from '@/components/mod/ModSubmissionsQueue';

export const dynamic = 'force-dynamic';

const TABS = ['roster', 'submissions'] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | undefined): value is Tab {
  return value !== undefined && (TABS as readonly string[]).includes(value);
}

export default async function ModPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!hasRole(session.user.role, 'MOD')) redirect('/');

  const { tab } = await searchParams;
  const activeTab: Tab = isTab(tab) ? tab : 'roster';

  const rosterQueue =
    activeTab === 'roster'
      ? await safeFetch(() => listApplicationsByStatus(db, 'PENDING'), [])
      : [];
  const submissionsQueue =
    activeTab === 'submissions'
      ? await safeFetch(
          () => listSubmissionsByStatusWithContext(db, 'PENDING'),
          [],
        )
      : [];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Moderator queue</h1>
        <p className="mt-2 text-sm text-text-muted">
          Review pending roster applications and tournament submissions.
        </p>

        <nav className="mt-8 flex gap-2 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/mod?tab=${t}`}
              className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize ${
                t === activeTab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t}
            </Link>
          ))}
        </nav>

        <section className="mt-8">
          {activeTab === 'roster' ? (
            <ModRosterQueue items={rosterQueue} reviewerId={session.user.id} />
          ) : (
            <ModSubmissionsQueue
              items={submissionsQueue}
              reviewerId={session.user.id}
            />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
