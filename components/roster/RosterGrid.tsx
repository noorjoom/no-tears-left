import { Badge } from '@/components/ui/Badge';

interface RosterMember {
  id: string;
  epicUsername: string;
  platform: 'PC' | 'CONSOLE';
  timezone: string;
  discordUsername: string;
  discordAvatar: string | null;
}

export function RosterGrid({ members }: { members: ReadonlyArray<RosterMember> }) {
  if (members.length === 0) {
    return (
      <p className="text-text-muted">No approved roster members yet.</p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <li
          key={m.id}
          className="rounded-lg border border-border bg-bg-surface p-4"
        >
          <div className="flex items-center gap-3">
            {m.discordAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.discordAvatar}
                alt=""
                className="h-10 w-10 rounded-full border border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-bg-elevated" />
            )}
            <div>
              <p className="font-medium text-text-primary">{m.epicUsername}</p>
              <p className="text-xs text-text-muted">@{m.discordUsername}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Badge tone="accent">{m.platform}</Badge>
            <Badge tone="muted">{m.timezone}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
