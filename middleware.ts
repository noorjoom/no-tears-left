import { NextResponse } from 'next/server';
import { edgeAuth } from '@/lib/auth-edge';
import { hasRole } from '@/lib/role-guard';

const ADMIN_PREFIXES = ['/admin', '/api/admin'];
const AUTHED_PREFIXES = [
  '/dashboard',
  '/roster/apply',
  '/api/roster',
  '/api/teams',
  '/api/submissions',
  '/api/upload-url',
  '/api/notifications',
];

const PUBLIC_API_GETS = new Set([
  '/api/roster',
  '/api/tournaments',
]);

function requiresMod(pathname: string): boolean {
  return ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function requiresAuth(pathname: string): boolean {
  return AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default edgeAuth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public GET pass-throughs (e.g. listing roster / tournaments)
  if (req.method === 'GET' && PUBLIC_API_GETS.has(pathname)) {
    return NextResponse.next();
  }

  if (requiresMod(pathname)) {
    if (!session?.user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    }
    if (!hasRole(session.user.role, 'MOD')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (requiresAuth(pathname)) {
    if (!session?.user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/roster/apply',
    '/api/admin/:path*',
    '/api/roster',
    '/api/roster/:path*',
    '/api/teams/:path*',
    '/api/submissions/:path*',
    '/api/upload-url',
    '/api/notifications',
  ],
};
