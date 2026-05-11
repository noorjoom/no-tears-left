import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { db } from '@/db';
import { getConfig } from '@/lib/prize-pool-service';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { RoleManager } from '@/components/admin/RoleManager';
import { PrizePoolForm } from '@/components/admin/PrizePoolForm';

export const dynamic = 'force-dynamic';

const TABS = ['roles', 'prize-pool'] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | undefined): value is Tab {
  return value !== undefined && (TABS as readonly string[]).includes(value);
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!hasRole(session.user.role, 'ADMIN')) redirect('/');

  const { tab } = await searchParams;
  const activeTab: Tab = isTab(tab) ? tab : 'roles';

  const prizePoolConfig =
    activeTab === 'prize-pool' ? await getConfig(db) : null;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Admin settings</h1>
        <p className="mt-2 text-sm text-text-muted">
          Manage roles and prize pool configuration.
        </p>

        <nav className="mt-8 flex gap-2 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/admin/settings?tab=${t}`}
              className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize ${
                t === activeTab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t === 'prize-pool' ? 'Prize pool' : 'Roles'}
            </Link>
          ))}
        </nav>

        <section className="mt-8">
          {activeTab === 'roles' ? (
            <div>
              <h2 className="mb-4 text-lg text-chrome">Role management</h2>
              <p className="mb-6 text-sm text-text-muted">
                Promote MEMBERs to MOD or demote MODs back to MEMBER. Admin
                roles are immutable.
              </p>
              <RoleManager />
            </div>
          ) : (
            <div>
              <h2 className="mb-4 text-lg text-chrome">Prize pool</h2>
              <p className="mb-6 text-sm text-text-muted">
                Update the goal, current amount, and Ko-fi link shown on the
                landing page.
              </p>
              <PrizePoolForm initial={prizePoolConfig} />
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
