import { db } from '@/db';
import { getCumulativeLeaderboard } from '@/lib/leaderboard-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const rows = await safeFetch(() => getCumulativeLeaderboard(db), []);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Leaderboard</h1>
        <p className="mt-2 text-text-muted">
          Cumulative points across all tournaments. Verified results only.
        </p>
        <div className="mt-8 overflow-x-auto">
          <LeaderboardTable rows={rows} />
        </div>
      </main>
      <Footer />
    </>
  );
}
