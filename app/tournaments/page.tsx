import { db } from '@/db';
import { listTournaments } from '@/lib/tournaments-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { TournamentCard } from '@/components/tournaments/TournamentCard';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
  const tournaments = await safeFetch(() => listTournaments(db), []);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Tournaments</h1>
        <p className="mt-2 text-text-muted">
          Duo Kill Race events. Register, play, submit, rank.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {tournaments.length === 0 ? (
            <p className="text-text-muted">No tournaments yet.</p>
          ) : (
            tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
