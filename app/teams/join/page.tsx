import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { JoinTeamForm } from '@/components/teams/JoinTeamForm';

export const dynamic = 'force-dynamic';

export default async function JoinTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  const { token } = await searchParams;

  if (!session?.user?.id) {
    const redirectTo = `/teams/join${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Join a team</h1>
        <p className="mt-2 text-sm text-text-muted">
          Confirm your invite to join your captain&apos;s team for this tournament.
        </p>
        <div className="mt-8">
          {token ? (
            <JoinTeamForm token={token} />
          ) : (
            <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Missing invite token.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
