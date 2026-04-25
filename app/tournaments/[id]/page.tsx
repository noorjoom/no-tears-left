import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getTournament } from '@/lib/tournaments-service';
import {
  getTeamForUserInTournament,
  listTeamsByTournament,
} from '@/lib/teams-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { TeamList } from '@/components/tournaments/TeamList';
import { CreateTeamButton } from '@/components/tournaments/CreateTeamButton';
import { InviteLinkBox } from '@/components/dashboard/InviteLinkBox';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

function formatDate(d: Date): string {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await safeFetch(() => getTournament(db, id), null);
  if (!tournament) notFound();

  const teams = await safeFetch(() => listTeamsByTournament(db, id), []);

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const userTeam = userId
    ? await safeFetch(
        () => getTeamForUserInTournament(db, userId, id),
        null,
      )
    : null;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-4xl text-chrome">
            {tournament.name}
          </h1>
          <Badge tone="accent">{tournament.status}</Badge>
        </div>
        {tournament.description ? (
          <p className="mt-4 text-text-muted">{tournament.description}</p>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <dt className="font-mono text-xs uppercase text-text-muted">
              Registration deadline
            </dt>
            <dd className="text-text-primary">
              {formatDate(tournament.registrationDeadline)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase text-text-muted">Starts</dt>
            <dd className="text-text-primary">{formatDate(tournament.startsAt)}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase text-text-muted">Ends</dt>
            <dd className="text-text-primary">{formatDate(tournament.endsAt)}</dd>
          </div>
        </dl>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-chrome">Your team</h2>
          <div className="mt-4">
            {!userId ? (
              <p className="text-sm text-text-muted">
                <a
                  href="/api/auth/signin"
                  className="text-accent hover:text-accent-bright"
                >
                  Sign in
                </a>{' '}
                to register a team.
              </p>
            ) : userTeam ? (
              <div className="rounded-lg border border-border bg-bg-surface p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl text-chrome">
                      {userTeam.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {userTeam.captainId === userId ? 'Captain' : 'Partner'}
                    </p>
                  </div>
                  <Badge tone={userTeam.partnerId ? 'default' : 'warn'}>
                    {userTeam.partnerId ? 'Full' : 'Open seat'}
                  </Badge>
                </div>
                {userTeam.captainId === userId &&
                !userTeam.partnerId &&
                userTeam.inviteToken ? (
                  <InviteLinkBox
                    token={userTeam.inviteToken}
                    expiresAt={userTeam.inviteExpiresAt}
                  />
                ) : null}
                {userTeam.captainId === userId &&
                (tournament.status === 'OPEN' ||
                  tournament.status === 'IN_PROGRESS') ? (
                  <Link
                    href={`/tournaments/${tournament.id}/submit`}
                    className="mt-4 mr-3 inline-block rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
                  >
                    Submit a result
                  </Link>
                ) : null}
                <Link
                  href="/dashboard?tab=teams"
                  className="mt-4 inline-block text-sm text-accent hover:text-accent-bright"
                >
                  Manage on dashboard →
                </Link>
              </div>
            ) : tournament.status === 'OPEN' ? (
              <CreateTeamButton tournamentId={tournament.id} />
            ) : (
              <p className="text-sm text-text-muted">
                Registration is closed for this tournament.
              </p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-chrome">Teams</h2>
          <p className="mt-1 text-sm text-text-muted">
            {teams.length} {teams.length === 1 ? 'team' : 'teams'} registered
          </p>
          <div className="mt-4">
            <TeamList teams={teams} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
