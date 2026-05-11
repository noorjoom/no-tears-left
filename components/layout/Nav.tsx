import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { JoinDiscordButton } from './JoinDiscordButton';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';

export async function Nav() {
  const session = await auth();
  const user = session?.user;
  const isMod = hasRole(user?.role, 'MOD');
  const isAdmin = hasRole(user?.role, 'ADMIN');

  return (
    <header className="border-b border-border bg-bg-base/90 backdrop-blur">
      <nav className="mx-auto grid max-w-6xl grid-cols-3 items-center px-6 py-4">
        <div className="justify-self-start">
          <Link href="/" aria-label="No Tears Left — home" className="block">
            <Image
              src="/ntl.svg"
              alt="No Tears Left"
              width={48}
              height={48}
              priority
              unoptimized
              className="h-10 w-10"
            />
          </Link>
        </div>

        <ul className="flex items-center gap-8 justify-self-center text-sm text-text-muted">
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
        </ul>

        <ul className="flex items-center gap-4 justify-self-end text-sm text-text-muted">
          <li>
            <JoinDiscordButton />
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
              {isMod ? (
                <li>
                  <Link href="/mod/tournaments" className="hover:text-accent">
                    Tournaments
                  </Link>
                </li>
              ) : null}
              {isAdmin ? (
                <li>
                  <Link href="/admin/settings" className="hover:text-accent">
                    Settings
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
