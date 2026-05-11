import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { db } from '@/db';
import { getTournament } from '@/lib/tournaments-service';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { TournamentForm } from '@/components/admin/TournamentForm';

export const dynamic = 'force-dynamic';

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!hasRole(session.user.role, 'MOD')) redirect('/');

  const { id } = await params;
  const tournament = await getTournament(db, id, { includeDrafts: true });
  if (!tournament) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <Link
            href="/mod/tournaments"
            className="text-xs text-text-muted hover:text-text-primary"
          >
            ← Back to tournaments
          </Link>
          <h1 className="mt-3 font-display text-4xl text-chrome">
            Edit tournament
          </h1>
          <p className="mt-1 text-sm text-text-muted">{tournament.name}</p>
        </div>
        <TournamentForm mode="edit" initial={tournament} />
      </main>
      <Footer />
    </>
  );
}
