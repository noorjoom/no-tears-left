import Image from 'next/image';
import Link from 'next/link';
import { JoinDiscordButton } from '@/components/layout/JoinDiscordButton';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,200,232,0.08),transparent_60%)]" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center md:py-32">
        <Image
          src="/n1.svg"
          alt="No Tears Left monogram"
          width={160}
          height={160}
          priority
          unoptimized
          className="h-32 w-32 animate-fade-in opacity-90 md:h-40 md:w-40"
        />
        <h1 className="sr-only">No Tears Left</h1>
        <p className="mt-8 max-w-2xl animate-fade-in-up text-lg text-text-primary md:text-xl">
          The competitive home of <span className="text-accent">Fortnite Zero Build</span>.
          Roster. Tournaments. Verified leaderboard. No filler.
        </p>
        <p className="mt-3 animate-fade-in-up text-sm uppercase tracking-[0.2em] text-text-muted">
          Compete · Submit · Climb
        </p>
        <div className="mt-10 flex animate-fade-in-up flex-wrap items-center justify-center gap-3">
          <JoinDiscordButton />
          <Link
            href="/tournaments"
            className="rounded border border-chrome/40 bg-chrome/10 px-4 py-2 text-sm text-chrome hover:border-chrome hover:bg-chrome/20"
          >
            Browse Tournaments
          </Link>
        </div>
        <p className="mt-6 animate-fade-in text-xs text-text-muted">
          Discord login only. No email. No fluff.
        </p>
      </div>
    </section>
  );
}
