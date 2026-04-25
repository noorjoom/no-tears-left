'use client';

import { useState, useTransition } from 'react';
import type { Notification } from '@/db/schema';

interface NotificationsTabProps {
  initialItems: ReadonlyArray<Notification>;
  initialUnreadCount: number;
}

const ERROR_MESSAGES: Record<string, string> = {
  Unauthorized: 'You must sign in.',
  INVALID_INPUT: 'Invalid request.',
};

function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function NotificationsTab({
  initialItems,
  initialUnreadCount,
}: NotificationsTabProps) {
  const [items, setItems] = useState<ReadonlyArray<Notification>>(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function patchRead(body: { ids?: string[]; markAll?: boolean }) {
    setError(null);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const code = typeof data.error === 'string' ? data.error : 'unknown';
        setError(ERROR_MESSAGES[code] ?? 'Could not update notifications.');
        return false;
      }
      return true;
    } catch {
      setError('Network error. Try again.');
      return false;
    }
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      const ok = await patchRead({ ids: [id] });
      if (!ok) return;
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const ok = await patchRead({ markAll: true });
      if (!ok) return;
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="font-display text-2xl text-chrome">Notifications</h2>
        <p className="mt-2 text-sm text-text-muted">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-chrome">
          Notifications
          {unreadCount > 0 ? (
            <span className="ml-2 text-sm text-accent">({unreadCount} unread)</span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={pending || unreadCount === 0}
          className="text-sm text-accent hover:text-accent-bright disabled:cursor-not-allowed disabled:text-text-muted"
        >
          Mark all as read
        </button>
      </div>
      {error ? (
        <p className="rounded border border-red-900 bg-red-950/30 p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
              n.read
                ? 'border-border bg-bg-surface'
                : 'border-l-4 border-l-accent border-border bg-bg-elevated'
            }`}
          >
            <div className="flex-1">
              <p className="text-sm text-text-primary">{n.message}</p>
              <p className="mt-1 text-xs text-text-muted">
                {relativeTime(n.createdAt)}
              </p>
            </div>
            {!n.read ? (
              <button
                type="button"
                onClick={() => handleMarkOne(n.id)}
                disabled={pending}
                className="text-xs text-accent hover:text-accent-bright disabled:text-text-muted"
              >
                Mark read
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
