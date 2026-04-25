import type { Team } from '@/db/schema';

export function TeamList({ teams }: { teams: ReadonlyArray<Team> }) {
  if (teams.length === 0) {
    return <p className="text-text-muted">No teams registered yet.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-bg-surface">
      {teams.map((t) => (
        <li key={t.id} className="flex items-center justify-between px-4 py-3">
          <span className="text-text-primary">{t.name}</span>
          <span className="font-mono text-xs text-text-muted">
            {t.partnerId ? 'Full' : 'Open seat'}
          </span>
        </li>
      ))}
    </ul>
  );
}
