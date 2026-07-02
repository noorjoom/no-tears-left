import { Badge } from '@/components/ui/Badge';

interface RosterMember {
  id: string;
  epicUsername: string;
  platform: 'PC' | 'CONSOLE';
  timezone: string;
  discordUsername: string;
  discordAvatar: string | null;
  tiktokUrl: string | null;
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
          <div className="mt-3 flex items-center gap-2">
            <Badge tone="accent">{m.platform}</Badge>
            <Badge tone="muted">{m.timezone}</Badge>
            {m.tiktokUrl ? (
              <a
                href={m.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="ml-auto text-text-muted hover:text-accent"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13v-3.53a6.42 6.42 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 11.61 3.5 6.28 6.28 0 0 0 1.03-3.5V9.01a8.16 8.16 0 0 0 4.77 1.52V7.08a4.85 4.85 0 0 1-.82-.39Z" />
                </svg>
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
