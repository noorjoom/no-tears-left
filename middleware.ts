import { NextResponse } from 'next/server';
import { edgeAuth } from '@/lib/auth-edge';
import { hasRole } from '@/lib/role-guard';

const ADMIN_PREFIXES = ['/admin', '/api/admin'];

const MOD_PREFIXES = ['/mod'];

// MOD-required on non-GET requests; GETs are public.
const MOD_WRITE_PREFIXES = ['/api/tournaments'];

const AUTHED_PREFIXES = [
  '/dashboard',
  '/roster/apply',
  '/api/roster',
  '/api/teams',
  '/api/tournaments',
  '/api/submissions',
  '/api/upload-url',
  '/api/notifications',
];

const PUBLIC_API_GETS = new Set([
  '/api/roster',
  '/api/tournaments',
]);

function matchesPrefix(prefixes: readonly string[], pathname: string): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function apiUnauthorized(pathname: string, origin: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/', origin));
}

function apiForbidden(pathname: string, origin: string) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.redirect(new URL('/', origin));
}

export default edgeAuth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const origin = req.nextUrl.origin;

  // Public GET pass-throughs.
  if (req.method === 'GET') {
    if (PUBLIC_API_GETS.has(pathname)) return NextResponse.next();
    if (matchesPrefix(MOD_WRITE_PREFIXES, pathname)) return NextResponse.next();
  }

  // Admin-only paths, with one exception: GET /api/admin/prize-pool is MOD+.
  if (matchesPrefix(ADMIN_PREFIXES, pathname)) {
    if (!session?.user) return apiUnauthorized(pathname, origin);
    const isPrizePoolGet =
      req.method === 'GET' && pathname === '/api/admin/prize-pool';
    const requiredRole = isPrizePoolGet ? 'MOD' : 'ADMIN';
    if (!hasRole(session.user.role, requiredRole)) {
      return apiForbidden(pathname, origin);
    }
    return NextResponse.next();
  }

  // Mod-only paths.
  if (matchesPrefix(MOD_PREFIXES, pathname)) {
    if (!session?.user) return apiUnauthorized(pathname, origin);
    if (!hasRole(session.user.role, 'MOD')) return apiForbidden(pathname, origin);
    return NextResponse.next();
  }

  // MOD-required writes.
  if (matchesPrefix(MOD_WRITE_PREFIXES, pathname) && req.method !== 'GET') {
    if (!session?.user) return apiUnauthorized(pathname, origin);
    if (!hasRole(session.user.role, 'MOD')) return apiForbidden(pathname, origin);
    return NextResponse.next();
  }

  // Authed paths.
  if (matchesPrefix(AUTHED_PREFIXES, pathname)) {
    if (!session?.user) return apiUnauthorized(pathname, origin);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/mod/:path*',
    '/dashboard/:path*',
    '/roster/apply',
    '/api/admin/:path*',
    '/api/roster',
    '/api/roster/:path*',
    '/api/teams/:path*',
    '/api/tournaments',
    '/api/tournaments/:path*',
    '/api/submissions',
    '/api/submissions/:path*',
    '/api/upload-url',
    '/api/notifications',
  ],
};
