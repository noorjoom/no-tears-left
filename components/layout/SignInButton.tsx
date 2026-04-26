'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
  return (
    <button
      onClick={() => signIn('discord')}
      className="rounded border border-accent/40 bg-accent/10 px-3 py-1 text-accent hover:bg-accent/20"
    >
      Sign in
    </button>
  );
}
