'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { signOut } from 'next-auth/react';

interface NavMenuProps {
  user: {
    name?: string | null;
    image?: string | null;
  };
  isMod: boolean;
  isAdmin: boolean;
}

export function NavMenu({ user, isMod, isAdmin }: NavMenuProps) {
  const initial = (user.name ?? '?').charAt(0).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-2 py-1 text-text-muted outline-none transition hover:border-accent/40 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 rounded-full"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-bg-base text-xs">
            {initial}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className="opacity-70"
        >
          <path
            d="M3 4.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[180px] rounded-md border border-border bg-bg-base/95 p-1 text-sm text-text-muted shadow-lg backdrop-blur"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard"
              className="block rounded px-3 py-2 text-accent outline-none hover:bg-bg-elevated focus:bg-bg-elevated"
            >
              Dashboard
            </Link>
          </DropdownMenu.Item>

          {isMod ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item asChild>
                <Link
                  href="/mod"
                  className="block rounded px-3 py-2 outline-none hover:bg-bg-elevated hover:text-accent focus:bg-bg-elevated focus:text-accent"
                >
                  Mod
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/mod/tournaments"
                  className="block rounded px-3 py-2 outline-none hover:bg-bg-elevated hover:text-accent focus:bg-bg-elevated focus:text-accent"
                >
                  Mod Tournaments
                </Link>
              </DropdownMenu.Item>
            </>
          ) : null}

          {isAdmin ? (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/settings"
                className="block rounded px-3 py-2 outline-none hover:bg-bg-elevated hover:text-accent focus:bg-bg-elevated focus:text-accent"
              >
                Settings
              </Link>
            </DropdownMenu.Item>
          ) : null}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={(event) => {
              event.preventDefault();
              void signOut({ callbackUrl: '/' });
            }}
            className="cursor-pointer rounded px-3 py-2 outline-none hover:bg-bg-elevated hover:text-accent focus:bg-bg-elevated focus:text-accent"
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
