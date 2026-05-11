'use client';

import { useState, useTransition, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UserResult {
  id: string;
  discordUsername: string;
  role: 'MEMBER' | 'MOD' | 'ADMIN';
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'User not found.',
  CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role.',
  CANNOT_CHANGE_ADMIN: 'Admin roles cannot be changed via this interface.',
  INVALID_ROLE_TRANSITION: 'Invalid role transition.',
};

export function RoleManager() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&limit=20`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setSearchError(body?.error ?? 'Search failed.');
        setResults([]);
        return;
      }
      const body = (await res.json()) as { data?: UserResult[] };
      setResults(body.data ?? []);
    } catch {
      setSearchError('Network error.');
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(value), 300);
  }

  async function updateRole(userId: string, newRole: 'MEMBER' | 'MOD') {
    setSubmitting(userId);
    setActionErrors((prev) => ({ ...prev, [userId]: '' }));
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        const code = body?.error ?? 'UNKNOWN';
        setActionErrors((prev) => ({
          ...prev,
          [userId]: ERROR_MESSAGES[code] ?? code,
        }));
        return;
      }
      startTransition(() => router.refresh());
      void search(query);
    } catch {
      setActionErrors((prev) => ({ ...prev, [userId]: 'Network error.' }));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="user-search" className="mb-1 block text-sm text-text-muted">
          Search by Discord username
        </label>
        <input
          id="user-search"
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Type at least 2 characters…"
          className="w-full max-w-md rounded border border-border bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        />
      </div>

      {searching && <p className="text-sm text-text-muted">Searching…</p>}
      {searchError && (
        <p className="text-sm text-red-300">{searchError}</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded border border-border bg-bg-surface px-4 py-3"
            >
              <div>
                <span className="text-sm text-text-primary">{u.discordUsername}</span>
                <span className="ml-2 text-xs text-text-muted">{u.role}</span>
              </div>
              <div className="flex items-center gap-2">
                {actionErrors[u.id] && (
                  <span className="text-xs text-red-300">{actionErrors[u.id]}</span>
                )}
                {u.role === 'MEMBER' && (
                  <button
                    type="button"
                    disabled={submitting === u.id || isPending}
                    onClick={() => void updateRole(u.id, 'MOD')}
                    className="rounded border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent hover:bg-accent/20 disabled:opacity-50"
                  >
                    {submitting === u.id ? 'Saving…' : 'Promote to MOD'}
                  </button>
                )}
                {u.role === 'MOD' && (
                  <button
                    type="button"
                    disabled={submitting === u.id || isPending}
                    onClick={() => void updateRole(u.id, 'MEMBER')}
                    className="rounded border border-border bg-bg-elevated px-3 py-1 text-xs text-text-primary hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                  >
                    {submitting === u.id ? 'Saving…' : 'Demote to MEMBER'}
                  </button>
                )}
                {u.role === 'ADMIN' && (
                  <span className="text-xs text-text-muted">Admin (immutable)</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && !searching && results.length === 0 && !searchError && (
        <p className="text-sm text-text-muted">No users found for &ldquo;{query}&rdquo;.</p>
      )}
    </div>
  );
}
