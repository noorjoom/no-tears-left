import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getTournament } from '@/lib/tournaments-service';
import { getTeamForUserInTournament } from '@/lib/teams-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { SubmissionUploadForm } from '@/components/submissions/SubmissionUploadForm';

export const dynamic = 'force-dynamic';

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const userId = session.user.id;

  const tournament = await safeFetch(() => getTournament(db, id), null);
  if (!tournament) notFound();

  const team = await safeFetch(
    () => getTeamForUserInTournament(db, userId, id),
    null,
  );

  let body: React.ReactNode;
  if (!team) {
    body = (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        You are not on a team in this tournament.
      </p>
    );
  } else if (team.captainId !== userId) {
    body = (
      <p className="rounded border border-border bg-bg-surface p-6 text-sm text-text-muted">
        Only the captain can submit results.
      </p>
    );
  } else {
    body = (
      <SubmissionUploadForm
        tournamentId={tournament.id}
        teamId={team.id}
        teamName={team.name}
      />
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Submit a result</h1>
        <p className="mt-2 text-sm text-text-muted">{tournament.name}</p>
        <div className="mt-8">{body}</div>
      </main>
      <Footer />
    </>
  );
}
