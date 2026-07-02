import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/role-guard';
import { SignInButton } from './SignInButton';
import { NavMenu } from './NavMenu';
import { MobileNavMenu } from './MobileNavMenu';

const NAV_LINKS = [
  { href: '/roster', label: 'Roster' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export async function Nav() {
  const session = await auth();
  const user = session?.user;
  const isMod = hasRole(user?.role, 'MOD');
  const isAdmin = hasRole(user?.role, 'ADMIN');

  return (
    <header className="border-b border-border bg-bg-base/90 backdrop-blur">
      <nav className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-4 sm:grid-cols-3 sm:px-6">
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

        <ul className="hidden items-center gap-8 justify-self-center text-sm text-text-muted sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-accent">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 justify-self-end text-sm text-text-muted sm:gap-4">
          <MobileNavMenu links={NAV_LINKS} />
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
