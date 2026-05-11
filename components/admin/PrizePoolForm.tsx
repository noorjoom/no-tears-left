'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface PrizePoolFormProps {
  initial: {
    goalAmount: number;
    currentAmount: number;
    koFiUrl: string | null;
  } | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  NEGATIVE_AMOUNT: 'Amounts cannot be negative.',
  INVALID_URL: 'Ko-fi URL must be a valid URL.',
};

export function PrizePoolForm({ initial }: PrizePoolFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goalAmount, setGoalAmount] = useState(String(initial?.goalAmount ?? 0));
  const [currentAmount, setCurrentAmount] = useState(String(initial?.currentAmount ?? 0));
  const [koFiUrl, setKoFiUrl] = useState(initial?.koFiUrl ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    const goalNum = goalAmount.trim() !== '' ? parseInt(goalAmount, 10) : null;
    const currentNum = currentAmount.trim() !== '' ? parseInt(currentAmount, 10) : null;

    if (goalNum !== null && (isNaN(goalNum) || goalNum < 0)) {
      setError('Goal amount must be a valid non-negative number.');
      return;
    }
    if (currentNum !== null && (isNaN(currentNum) || currentNum < 0)) {
      setError('Current amount must be a valid non-negative number.');
      return;
    }

    const body: Record<string, unknown> = {};
    if (goalNum !== null) body.goalAmount = goalNum;
    if (currentNum !== null) body.currentAmount = currentNum;
    body.koFiUrl = koFiUrl.trim() !== '' ? koFiUrl.trim() : null;

    if (Object.keys(body).length === 0) {
      setError('At least one field is required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/prize-pool', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        const code = data?.error ?? 'UNKNOWN';
        setError(ERROR_MESSAGES[code] ?? code);
        return;
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } catch {
      setError('Network error.');
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="max-w-md space-y-4">
      <div>
        <label htmlFor="goal-amount" className="mb-1 block text-sm text-text-muted">
          Goal amount ($)
        </label>
        <input
          id="goal-amount"
          type="number"
          min={0}
          value={goalAmount}
          onChange={(e) => setGoalAmount(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="current-amount" className="mb-1 block text-sm text-text-muted">
          Current amount ($)
        </label>
        <input
          id="current-amount"
          type="number"
          min={0}
          value={currentAmount}
          onChange={(e) => setCurrentAmount(e.target.value)}
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="kofi-url" className="mb-1 block text-sm text-text-muted">
          Ko-fi URL (optional)
        </label>
        <input
          id="kofi-url"
          type="url"
          value={koFiUrl}
          onChange={(e) => setKoFiUrl(e.target.value)}
          placeholder="https://ko-fi.com/..."
          className="w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
          Prize pool updated.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}
