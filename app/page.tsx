import Link from 'next/link';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { PrizePoolProgress } from '@/components/prize-pool/PrizePoolProgress';
import { db } from '@/db';
import { getConfig } from '@/lib/prize-pool-service';
import { safeFetch } from '@/lib/safe-fetch';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const prizePool = await safeFetch(() => getConfig(db), null);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="font-display text-6xl text-chrome md:text-8xl">
          No Tears Left
        </h1>
        <p className="mt-6 text-lg text-text-muted">
          Fortnite Zero Build competitive community.
        </p>
        <p className="mt-2 text-sm text-accent">
          Roster · Tournaments · Leaderboard
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/tournaments"
            className="rounded border border-accent/40 bg-accent/10 px-5 py-2 text-accent hover:bg-accent/20"
          >
            See tournaments
          </Link>
          <Link
            href="/roster"
            className="rounded border border-border bg-bg-surface px-5 py-2 text-text-primary hover:border-accent/40"
          >
            Meet the roster
          </Link>
        </div>
        {prizePool ? (
          <div className="mt-16 text-left">
            <PrizePoolProgress config={prizePool} />
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
