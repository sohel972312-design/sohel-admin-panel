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

// Web Crypto sha256 — works in Edge runtime
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function redirectToSignin(req: NextRequest, clearCookie = false): NextResponse {
  const res = NextResponse.redirect(new URL('/signin', req.url));
  if (clearCookie) {
    res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true });
  }
  return res;
}

function unauthorizedJson(clearCookie = false): NextResponse {
  const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (clearCookie) {
    res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true });
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internals and static assets
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

  // Allow public API routes
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Protect verify-otp page — must have step1_token cookie
  if (pathname === '/login/verify-otp') {
    const step1 = req.cookies.get(STEP1_COOKIE)?.value;
    if (!step1) return redirectToSignin(req);
    return NextResponse.next();
  }

  // Allow public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // If already logged in, redirect away from signin
    if (pathname === '/signin' || pathname === '/signup') {
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        // quick check — if cookie exists, try to bounce to dashboard
        // (full validation happens below; here we just trust the cookie presence)
      }
    }
    return NextResponse.next();
  }

  // ── All other routes: require valid session ──
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) return unauthorizedJson();
    return redirectToSignin(req);
  }

  // Hash token and call internal session-check
  const tokenHash = await sha256(sessionToken);
  const checkUrl = new URL('/api/auth/session-check', req.url);

  let sessionValid = false;
  try {
    const checkRes = await fetch(checkUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY || 'internal_key_change_me',
      },
      body: JSON.stringify({ tokenHash }),
      // Short timeout so middleware doesn't hang
      signal: AbortSignal.timeout(3000),
    });
    sessionValid = checkRes.ok;
  } catch {
    // Session-check fetch timed out or failed.
    // STRICT mode: deny access — better to force re-login than expose protected pages.
    // If this causes issues with DB downtime, consider flipping to allow trusted IPs.
    if (pathname.startsWith('/api/')) return unauthorizedJson(true);
    return redirectToSignin(req, true);
  }

  if (!sessionValid) {
    if (pathname.startsWith('/api/')) return unauthorizedJson(true);
    return redirectToSignin(req, true);
  }

  // Session valid — attach no-cache headers so browser never serves stale protected pages
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
