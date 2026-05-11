import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { TournamentForm } from '@/components/admin/TournamentForm';

export default async function NewTournamentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!hasRole(session.user.role, 'MOD')) redirect('/');

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
            New tournament
          </h1>
        </div>
        <TournamentForm mode="create" />
      </main>
      <Footer />
    </>
  );
}
