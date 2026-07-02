import { db } from '@/db';
import { listApprovedRoster } from '@/lib/roster-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { RosterGrid } from '@/components/roster/RosterGrid';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const members = await safeFetch(() => listApprovedRoster(db), []);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-chrome">Roster</h1>
            <p className="mt-2 text-text-muted">
              Approved community members.
            </p>
          </div>
          <Link
            href="/roster/apply"
            className="shrink-0 rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
          >
            Apply to join roster
          </Link>
        </div>
        <div className="mt-8">
          <RosterGrid members={members} />
        </div>
      </main>
      <Footer />
    </>
  );
}
