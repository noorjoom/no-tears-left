import Link from 'next/link';
import type { ReactNode } from 'react';

interface Feature {
  title: string;
  body: string;
  href: string;
  cta: string;
  icon: ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: 'Official Roster',
    body: 'Mod-verified list of competitive ZB players. Apply, get reviewed, get listed publicly. No pay-to-play. No favouritism.',
    href: '/roster',
    cta: 'View roster',
    icon: <RosterIcon />,
  },
  {
    title: 'Duo Kill Race Tournaments',
    body: 'Register a duo. Play matches. Submit screenshots. Mods verify every score. The grind is real, the wins are real.',
    href: '/tournaments',
    cta: 'See tournaments',
    icon: <TrophyIcon />,
  },
  {
    title: 'Verified Leaderboard',
    body: 'Cumulative scoring across every tournament. Only verified submissions count. Top of the board means top of the scene.',
    href: '/leaderboard',
    cta: 'See standings',
    icon: <ChartIcon />,
  },
];

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">What is NTL</p>
        <h2 className="mt-3 font-display text-4xl text-chrome md:text-5xl">
          Built for the scene
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-text-muted">
          Three pillars. One community. Every score audited.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <article
            key={f.title}
            className="group animate-fade-in-up rounded-lg border border-border bg-bg-surface p-6 transition-colors hover:border-accent/40"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
              {f.icon}
            </div>
            <h3 className="font-display text-2xl text-chrome">{f.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">{f.body}</p>
            <Link
              href={f.href}
              className="mt-5 inline-flex items-center gap-1 text-sm text-accent hover:text-accent-bright"
            >
              {f.cta}
              <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function RosterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-6 4 3 5-8" />
    </svg>
  );
}
