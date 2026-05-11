import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { db } from '@/db';
import { listTournaments } from '@/lib/tournaments-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { TournamentAdminList } from '@/components/admin/TournamentAdminList';

export const dynamic = 'force-dynamic';

export default async function ModTournamentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!hasRole(session.user.role, 'MOD')) redirect('/');

  const tournaments = await safeFetch(
    () => listTournaments(db, { includeDrafts: true }),
    [],
  );

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl text-chrome">Tournaments</h1>
            <p className="mt-2 text-sm text-text-muted">
              Manage all tournaments including drafts.
            </p>
          </div>
          <Link
            href="/mod/tournaments/new"
            className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
          >
            + New tournament
          </Link>
        </div>

        <section className="mt-8">
          <TournamentAdminList items={tournaments} />
        </section>
      </main>
      <Footer />
    </>
  );
}
