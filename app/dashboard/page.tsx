import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getApplicationForUser } from '@/lib/roster-service';
import { getTeamsForUser } from '@/lib/teams-service';
import {
  countUnreadForUser,
  listNotificationsForUser,
} from '@/lib/notifications-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { ApplicationTab } from '@/components/dashboard/ApplicationTab';
import { TeamsTab } from '@/components/dashboard/TeamsTab';
import { NotificationsTab } from '@/components/dashboard/NotificationsTab';

export const dynamic = 'force-dynamic';

const TABS = ['application', 'teams', 'notifications'] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | undefined): value is Tab {
  return value !== undefined && (TABS as readonly string[]).includes(value);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const userId = session.user.id;

  const { tab } = await searchParams;
  const activeTab: Tab = isTab(tab) ? tab : 'application';

  const application =
    activeTab === 'application'
      ? await safeFetch(() => getApplicationForUser(db, userId), null)
      : null;
  const teams =
    activeTab === 'teams'
      ? await safeFetch(() => getTeamsForUser(db, userId), [])
      : [];
  const notifications =
    activeTab === 'notifications'
      ? await safeFetch(() => listNotificationsForUser(db, userId), [])
      : [];
  const unreadCount =
    activeTab === 'notifications'
      ? await safeFetch(() => countUnreadForUser(db, userId), 0)
      : 0;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Dashboard</h1>
        <p className="mt-2 text-sm text-text-muted">
          Signed in as {session.user.name ?? 'unknown'}
        </p>

        <nav className="mt-8 flex gap-2 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/dashboard?tab=${t}`}
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
          {activeTab === 'application' ? (
            <ApplicationTab application={application} />
          ) : null}
          {activeTab === 'teams' ? <TeamsTab teams={teams} /> : null}
          {activeTab === 'notifications' ? (
            <NotificationsTab
              initialItems={notifications}
              initialUnreadCount={unreadCount}
            />
          ) : null}
        </section>
      </main>
      <Footer />
    </>
  );
}
