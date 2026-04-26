import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/landing/Hero';
import { FeatureCards } from '@/components/landing/FeatureCards';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { PrizePoolProgress } from '@/components/prize-pool/PrizePoolProgress';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { getConfig } from '@/lib/prize-pool-service';
import { safeFetch } from '@/lib/safe-fetch';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [session, prizePool] = await Promise.all([
    auth(),
    safeFetch(() => getConfig(db), null),
  ]);
  const isAuthed = Boolean(session?.user);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FeatureCards />
        <HowItWorks />
        {prizePool ? (
          <section className="mx-auto max-w-4xl px-6 py-24">
            <PrizePoolProgress config={prizePool} />
          </section>
        ) : null}
        <FinalCTA isAuthed={isAuthed} />
      </main>
      <Footer />
    </>
  );
}
