'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="rounded border border-border bg-bg-elevated px-3 py-1 text-text-muted hover:border-accent/40 hover:text-accent"
    >
      Sign out
    </button>
  );
}
