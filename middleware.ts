import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_session';
const STEP1_COOKIE = 'step1_token';

const PUBLIC_PATHS = ['/signin', '/signup', '/login/verify-otp', '/verify-email'];
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/verify-otp',
  '/api/auth/signout',
  '/api/auth/session-check',
  '/api/auth/verify-email-token',
];

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets — skip
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/blog-banners') ||
    pathname.startsWith('/blog-images') ||
    pathname.startsWith('/blog-innerimg') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public API routes
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // /login/verify-otp — needs step1_token cookie
  if (pathname === '/login/verify-otp') {
    if (!req.cookies.get(STEP1_COOKIE)?.value) {
      return NextResponse.redirect(new URL('/signin', req.url));
    }
    return NextResponse.next();
  }

  // Public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // ── Protected routes — check cookie exists ──────────────────────────────
  // Full JWT + DB validation happens in:
  //   1. Each API route via validateSession()
  //   2. Admin layout client-side via /api/auth/me
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  // Cookie exists — attach security headers and proceed
  const res = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
