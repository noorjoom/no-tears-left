import { db } from '@/db';
import { getCumulativeLeaderboard } from '@/lib/leaderboard-service';
import { safeFetch } from '@/lib/safe-fetch';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'NTL · Host View',
};

export default async function HostViewPage() {
  const rows = await safeFetch(() => getCumulativeLeaderboard(db), []);

  return (
    <main className="min-h-screen bg-bg-base p-8">
      <h1 className="font-display text-3xl text-chrome">Top 5</h1>
      <div className="mt-4">
        <LeaderboardTable rows={rows} limit={5} />
      </div>
    </main>
  );
}
