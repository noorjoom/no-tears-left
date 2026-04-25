import { notFound } from 'next/navigation';
import { db } from '@/db';
import { getTournament } from '@/lib/tournaments-service';
import { listTeamsByTournament } from '@/lib/teams-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { TeamList } from '@/components/tournaments/TeamList';
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
