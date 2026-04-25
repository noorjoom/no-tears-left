import { db } from '@/db';
import { listApprovedRoster } from '@/lib/roster-service';
import { safeFetch } from '@/lib/safe-fetch';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { RosterGrid } from '@/components/roster/RosterGrid';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const members = await safeFetch(() => listApprovedRoster(db), []);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl text-chrome">Roster</h1>
        <p className="mt-2 text-text-muted">
          Approved community members.
        </p>
        <div className="mt-8">
          <RosterGrid members={members} />
        </div>
      </main>
      <Footer />
    </>
  );
}
