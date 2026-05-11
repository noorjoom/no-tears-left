import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!hasRole(session.user.role, 'ADMIN')) redirect('/');

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Admin</h1>
        <p className="mt-2 text-sm text-text-muted">
          Site administration tools.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/settings?tab=roles"
            className="rounded-lg border border-border bg-bg-surface p-6 hover:border-accent/40 transition-colors"
          >
            <h2 className="text-base font-medium text-chrome">Role management</h2>
            <p className="mt-1 text-sm text-text-muted">
              Promote MEMBERs to MOD or demote MODs back to MEMBER.
            </p>
          </Link>

          <Link
            href="/admin/settings?tab=prize-pool"
            className="rounded-lg border border-border bg-bg-surface p-6 hover:border-accent/40 transition-colors"
          >
            <h2 className="text-base font-medium text-chrome">Prize pool</h2>
            <p className="mt-1 text-sm text-text-muted">
              Update goal, current amount, and Ko-fi link.
            </p>
          </Link>

          <Link
            href="/mod"
            className="rounded-lg border border-border bg-bg-surface p-6 hover:border-accent/40 transition-colors"
          >
            <h2 className="text-base font-medium text-chrome">Mod queue</h2>
            <p className="mt-1 text-sm text-text-muted">
              Review roster applications and tournament submissions.
            </p>
          </Link>

          <Link
            href="/mod/tournaments"
            className="rounded-lg border border-border bg-bg-surface p-6 hover:border-accent/40 transition-colors"
          >
            <h2 className="text-base font-medium text-chrome">Tournaments</h2>
            <p className="mt-1 text-sm text-text-muted">
              Create, edit, and publish tournaments.
            </p>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
