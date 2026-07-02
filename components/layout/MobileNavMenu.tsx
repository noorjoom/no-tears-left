'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface MobileNavMenuProps {
  links: Array<{ href: string; label: string }>;
}

export function MobileNavMenu({ links }: MobileNavMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Open navigation menu"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg-elevated text-text-muted outline-none transition hover:border-accent/40 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 sm:hidden"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-[180px] rounded-md border border-border bg-bg-base/95 p-1 text-sm text-text-muted shadow-lg backdrop-blur"
        >
          {links.map((link) => (
            <DropdownMenu.Item key={link.href} asChild>
              <Link
                href={link.href}
                className="block rounded px-3 py-2 outline-none hover:bg-bg-elevated hover:text-accent focus:bg-bg-elevated focus:text-accent"
              >
                {link.label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
