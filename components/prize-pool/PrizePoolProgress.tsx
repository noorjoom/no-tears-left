import type { PrizePoolConfig } from '@/db/schema';

interface PrizePoolProgressProps {
  config: PrizePoolConfig | null;
}

export function PrizePoolProgress({ config }: PrizePoolProgressProps) {
  if (!config || config.goalAmount <= 0) return null;

  const pct = Math.min(
    100,
    Math.round((config.currentAmount / config.goalAmount) * 100),
  );

  const inner = (
    <div className="rounded-lg border border-border bg-bg-surface p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl text-chrome">Prize Pool</h2>
        <p className="font-mono text-sm text-accent">
          ${config.currentAmount} / ${config.goalAmount}
        </p>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-text-muted">{pct}% funded</p>
    </div>
  );

  if (config.koFiUrl) {
    return (
      <a
        href={config.koFiUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition hover:opacity-90"
      >
        {inner}
      </a>
    );
  }
  return inner;
}
