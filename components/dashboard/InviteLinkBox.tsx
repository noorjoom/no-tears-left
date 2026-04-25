'use client';

import { useState } from 'react';

interface InviteLinkBoxProps {
  token: string;
  expiresAt: Date | string | null;
}

export function InviteLinkBox({ token, expiresAt }: InviteLinkBoxProps) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/teams/join?token=${token}`
      : `/teams/join?token=${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mt-4 rounded border border-border bg-bg-elevated p-4">
      <p className="text-xs uppercase font-mono text-text-muted">Invite link</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-bg-base px-3 py-2 font-mono text-xs text-text-primary">
          {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent hover:bg-accent/20"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {expiry ? (
        <p className="mt-2 text-xs text-text-muted">Expires {expiry}</p>
      ) : null}
    </div>
  );
}
