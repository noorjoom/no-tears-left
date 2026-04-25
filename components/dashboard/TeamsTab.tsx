import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { InviteLinkBox } from './InviteLinkBox';

interface TeamRow {
  id: string;
  name: string;
  tournamentId: string;
  captainId: string;
  partnerId: string | null;
  inviteToken: string | null;
  inviteExpiresAt: Date | null;
  tournamentName: string;
  tournamentStatus: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
}

interface TeamsTabProps {
  teams: ReadonlyArray<TeamRow>;
}

export function TeamsTab({ teams }: TeamsTabProps) {
  if (teams.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="font-display text-2xl text-chrome">No teams yet</h2>
        <p className="mt-2 text-sm text-text-muted">
          Join an open tournament to create or join a team.
        </p>
        <Link
          href="/tournaments"
          className="mt-4 inline-block text-sm text-accent hover:text-accent-bright"
        >
          Browse tournaments →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {teams.map((t) => (
        <li
          key={t.id}
          className="rounded-lg border border-border bg-bg-surface p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-chrome">{t.name}</h2>
              <Link
                href={`/tournaments/${t.tournamentId}`}
                className="text-sm text-accent hover:text-accent-bright"
              >
                {t.tournamentName}
              </Link>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone="accent">{t.tournamentStatus}</Badge>
              <Badge tone={t.partnerId ? 'default' : 'warn'}>
                {t.partnerId ? 'Full' : 'Open seat'}
              </Badge>
            </div>
          </div>
          {!t.partnerId && t.inviteToken ? (
            <InviteLinkBox
              token={t.inviteToken}
              expiresAt={t.inviteExpiresAt}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
