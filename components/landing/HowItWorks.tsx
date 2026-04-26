interface Step {
  n: number;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Sign in with Discord',
    body: 'One click. No email, no password. Your Discord identity is your account.',
  },
  {
    n: 2,
    title: 'Apply or join a duo',
    body: 'Apply to the official roster, or register a team for an active tournament.',
  },
  {
    n: 3,
    title: 'Play and submit',
    body: 'Drop into matches. Captain submits eliminations, placement, and a screenshot.',
  },
  {
    n: 4,
    title: 'Mods verify, you climb',
    body: 'Every submission is reviewed. Verified scores count toward the cumulative leaderboard.',
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">How it works</p>
          <h2 className="mt-3 font-display text-4xl text-chrome md:text-5xl">
            From login to leaderboard
          </h2>
        </div>
        <ol className="grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="relative animate-fade-in-up rounded-lg border border-border bg-bg-base p-6"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="font-display text-5xl text-accent/30">
                {String(s.n).padStart(2, '0')}
              </div>
              <h3 className="mt-2 font-display text-xl text-chrome">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
