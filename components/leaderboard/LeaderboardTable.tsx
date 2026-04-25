import type { LeaderboardRow } from '@/lib/leaderboard-service';

export function LeaderboardTable({
  rows,
  limit,
}: {
  rows: ReadonlyArray<LeaderboardRow>;
  limit?: number;
}) {
  const data = limit ? rows.slice(0, limit) : rows;
  if (data.length === 0) {
    return <p className="text-text-muted">No verified results yet.</p>;
  }
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-border text-text-muted">
          <th className="py-2 pr-4 font-mono text-xs uppercase">#</th>
          <th className="py-2 pr-4 font-mono text-xs uppercase">Team</th>
          <th className="py-2 pr-4 font-mono text-xs uppercase">Players</th>
          <th className="py-2 pr-4 font-mono text-xs uppercase">Matches</th>
          <th className="py-2 pr-4 text-right font-mono text-xs uppercase">
            Points
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={r.teamId} className="border-b border-border/50">
            <td className="py-3 pr-4 font-mono text-text-muted">{i + 1}</td>
            <td className="py-3 pr-4 text-text-primary">{r.teamName}</td>
            <td className="py-3 pr-4 text-text-muted">
              {r.captainUsername}
              {r.partnerUsername ? ` + ${r.partnerUsername}` : ''}
            </td>
            <td className="py-3 pr-4 font-mono text-text-muted">{r.matches}</td>
            <td className="py-3 pr-4 text-right font-mono text-accent">
              {r.totalPoints}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
