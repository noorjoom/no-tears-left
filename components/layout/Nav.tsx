import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { SignInButton } from './SignInButton';
import { NavMenu } from './NavMenu';

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

        <div className="flex items-center gap-4 justify-self-end text-sm text-text-muted">
          {user ? (
            <NavMenu
              user={{ name: user.name, image: user.image }}
              isMod={isMod}
              isAdmin={isAdmin}
            />
          ) : (
            <SignInButton />
          )}
        </div>
      </nav>
    </header>
  );
}
