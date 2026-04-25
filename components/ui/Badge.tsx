interface BadgeProps {
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'muted' | 'warn';
}

const TONE: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'border-border bg-bg-elevated text-text-primary',
  accent: 'border-accent/40 bg-accent/10 text-accent-bright',
  muted: 'border-border bg-bg-elevated text-text-muted',
  warn: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
};

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
