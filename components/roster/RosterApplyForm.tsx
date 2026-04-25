'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PLATFORMS, WHY_TEXT_MAX_LENGTH } from '@/lib/constants';

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_HAS_PENDING: 'You already have a pending application.',
  ALREADY_APPROVED: 'You are already on the roster.',
  COOLDOWN_ACTIVE: 'You must wait before re-applying.',
  WHY_TEXT_TOO_LONG: 'Why-text exceeds the maximum length.',
};

export function RosterApplyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [whyLen, setWhyLen] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      epicUsername: String(formData.get('epicUsername') ?? '').trim(),
      platform: String(formData.get('platform') ?? ''),
      timezone: String(formData.get('timezone') ?? '').trim(),
      whyText: String(formData.get('whyText') ?? '').trim(),
      vodUrl: String(formData.get('vodUrl') ?? '').trim() || null,
    };

    try {
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? 'UNKNOWN';
        setError(ERROR_MESSAGES[code] ?? code);
        return;
      }
      startTransition(() => {
        router.refresh();
        router.push('/dashboard?tab=application');
      });
    } catch {
      setError('Network error. Try again.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-border bg-bg-surface p-6"
    >
      <div>
        <label
          htmlFor="epicUsername"
          className="block font-mono text-xs uppercase text-text-muted"
        >
          Epic username
        </label>
        <input
          id="epicUsername"
          name="epicUsername"
          type="text"
          required
          maxLength={64}
          className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="platform"
          className="block font-mono text-xs uppercase text-text-muted"
        >
          Platform
        </label>
        <select
          id="platform"
          name="platform"
          required
          className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="timezone"
          className="block font-mono text-xs uppercase text-text-muted"
        >
          Timezone
        </label>
        <input
          id="timezone"
          name="timezone"
          type="text"
          required
          maxLength={64}
          placeholder="e.g. America/New_York"
          className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="whyText"
          className="block font-mono text-xs uppercase text-text-muted"
        >
          Why join? ({whyLen}/{WHY_TEXT_MAX_LENGTH})
        </label>
        <textarea
          id="whyText"
          name="whyText"
          required
          rows={5}
          maxLength={WHY_TEXT_MAX_LENGTH}
          onChange={(e) => setWhyLen(e.currentTarget.value.length)}
          className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="vodUrl"
          className="block font-mono text-xs uppercase text-text-muted"
        >
          VOD URL (optional)
        </label>
        <input
          id="vodUrl"
          name="vodUrl"
          type="url"
          maxLength={500}
          className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded border border-accent/40 bg-accent/10 px-4 py-2 text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}
