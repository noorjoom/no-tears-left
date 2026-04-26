import Link from 'next/link';
import { JoinDiscordButton } from '@/components/layout/JoinDiscordButton';

interface FinalCTAProps {
  isAuthed: boolean;
}

export function FinalCTA({ isAuthed }: FinalCTAProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(168,200,232,0.10),transparent_60%)]" />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="animate-fade-in-up font-display text-4xl text-chrome md:text-6xl">
          Step up. Or step aside.
        </h2>
        <p className="mx-auto mt-5 max-w-xl animate-fade-in-up text-text-muted">
          Join the Discord, get on the roster, and prove it on the leaderboard.
        </p>
        <div className="mt-10 flex animate-fade-in-up flex-wrap items-center justify-center gap-3">
          <JoinDiscordButton />
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
            >
              Go to dashboard
            </Link>
          ) : (
            <Link
              href="/roster/apply"
              className="rounded border border-chrome/40 bg-chrome/10 px-4 py-2 text-sm text-chrome hover:border-chrome hover:bg-chrome/20"
            >
              Apply for roster
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
