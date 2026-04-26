import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';

export async function Nav() {
  const session = await auth();
  const user = session?.user;
  const isMod = hasRole(user?.role, 'MOD');

  return (
    <header className="border-b border-border bg-bg-base/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl text-chrome">
          No Tears Left
        </Link>
        <ul className="flex items-center gap-6 text-sm text-text-muted">
          <li>
            <Link href="/roster" className="hover:text-accent">
              Roster
            </Link>
          </li>
          <li>
            <Link href="/tournaments" className="hover:text-accent">
              Tournaments
            </Link>
          </li>
          <li>
            <Link href="/leaderboard" className="hover:text-accent">
              Leaderboard
            </Link>
          </li>
          {user ? (
            <>
              {isMod ? (
                <li>
                  <Link href="/mod" className="hover:text-accent">
                    Mod
                  </Link>
                </li>
              ) : null}
              <li>
                <Link href="/dashboard" className="text-accent hover:text-accent-bright">
                  Dashboard
                </Link>
              </li>
              <li>
                <SignOutButton />
              </li>
            </>
          ) : (
            <li>
              <SignInButton />
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
