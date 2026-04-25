'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { MAX_PLACEMENT, MIN_PLACEMENT } from '@/lib/constants';

interface SubmissionUploadFormProps {
  tournamentId: string;
  teamId: string;
  teamName: string;
}

const HARD_MAX_BYTES = 5 * 1024 * 1024;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

function isAllowed(t: string): t is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(t);
}

const ERROR_MESSAGES: Record<string, string> = {
  TEAM_NOT_FOUND: 'Team not found.',
  NOT_CAPTAIN: 'Only the captain can submit.',
  TOURNAMENT_NOT_FOUND: 'Tournament not found.',
  TOURNAMENT_NOT_OPEN: 'Tournament is not accepting submissions.',
  WINDOW_CLOSED: 'Submission window is closed.',
  DUPLICATE_MATCH: 'This match has already been submitted for your team.',
  STORAGE_ERROR: 'Storage upload failed. Try again.',
  BAD_CONTENT_TYPE: 'Unsupported image format.',
};

type Stage = 'idle' | 'compressing' | 'uploading' | 'submitting';

export function SubmissionUploadForm({
  tournamentId,
  teamId,
  teamName,
}: SubmissionUploadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Screenshot is required.');
      return;
    }
    if (!isAllowed(file.type)) {
      setError('Use PNG, JPEG, or WebP.');
      return;
    }
    if (file.size > HARD_MAX_BYTES) {
      setError('File exceeds 5 MB hard limit.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const matchId = String(formData.get('matchId') ?? '').trim();
    const eliminations = Number(formData.get('eliminations'));
    const placement = Number(formData.get('placement'));

    if (!matchId) {
      setError('Match ID is required.');
      return;
    }

    try {
      setStage('compressing');
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      const contentType = isAllowed(compressed.type) ? compressed.type : file.type;

      setStage('uploading');
      const uploadUrlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'submission',
          tournamentId,
          teamId,
          matchId,
          contentType,
        }),
      });
      if (!uploadUrlRes.ok) {
        const body = (await uploadUrlRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? 'UNKNOWN';
        throw new Error(ERROR_MESSAGES[code] ?? code);
      }
      const uploadBody = (await uploadUrlRes.json()) as {
        data: { signedUrl: string; publicUrl: string };
      };
      const { signedUrl, publicUrl } = uploadBody.data;

      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: compressed,
      });
      if (!putRes.ok) {
        throw new Error('Upload to storage failed.');
      }

      setStage('submitting');
      const submitRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          matchId,
          eliminations,
          placement,
          screenshotUrl: publicUrl,
        }),
      });
      if (!submitRes.ok) {
        const body = (await submitRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? 'UNKNOWN';
        throw new Error(ERROR_MESSAGES[code] ?? code);
      }

      startTransition(() => {
        router.refresh();
        router.push('/dashboard?tab=teams');
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStage('idle');
    }
  }

  const busy = stage !== 'idle' || isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-border bg-bg-surface p-6"
    >
      <p className="text-xs font-mono uppercase text-text-muted">
        Submitting for: <span className="text-accent">{teamName}</span>
      </p>

      <div>
        <label
          htmlFor="matchId"
          className="block font-mono text-xs uppercase text-text-muted"
        >
          Match ID
        </label>
        <input
          id="matchId"
          name="matchId"
          type="text"
          required
          maxLength={64}
          placeholder="e.g. fortnite-match-uuid-from-replay"
          className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
        />
        <p className="mt-1 text-xs text-text-muted">
          One submission per match per team.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="eliminations"
            className="block font-mono text-xs uppercase text-text-muted"
          >
            Eliminations
          </label>
          <input
            id="eliminations"
            name="eliminations"
            type="number"
            required
            min={0}
            max={100}
            defaultValue={0}
            className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="placement"
            className="block font-mono text-xs uppercase text-text-muted"
          >
            Placement
          </label>
          <input
            id="placement"
            name="placement"
            type="number"
            required
            min={MIN_PLACEMENT}
            max={MAX_PLACEMENT}
            defaultValue={1}
            className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="screenshot"
          className="block font-mono text-xs uppercase text-text-muted"
        >
          Screenshot (PNG/JPEG/WebP, max 5 MB)
        </label>
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          className="mt-1 w-full rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary file:mr-3 file:rounded file:border-0 file:bg-accent/10 file:px-3 file:py-1 file:text-accent"
        />
        {file ? (
          <p className="mt-1 text-xs text-text-muted">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded border border-accent/40 bg-accent/10 px-4 py-2 text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {stage === 'compressing'
          ? 'Compressing image…'
          : stage === 'uploading'
            ? 'Uploading…'
            : stage === 'submitting'
              ? 'Submitting…'
              : 'Submit result'}
      </button>
    </form>
  );
}
