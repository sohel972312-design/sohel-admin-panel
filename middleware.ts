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

// ── JWT verification using Web Crypto (Edge Runtime compatible) ───────────────
// No Node.js crypto, no HTTP calls, no DB — pure signature verification.
function base64urlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function verifySessionJWT(token: string): Promise<boolean> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, sigB64] = parts;

    // Import HMAC-SHA256 key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify signature over "header.payload"
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return false;

    // Decode payload and check expiry
    const payload = JSON.parse(
      new TextDecoder().decode(new Uint8Array(base64urlDecode(payloadB64)))
    );
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return false;

    // Must have session ID (jti) and admin ID (sub)
    return Boolean(payload.jti && payload.sub);
  } catch {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function redirectToSignin(req: NextRequest, clearCookie = false): NextResponse {
  const res = NextResponse.redirect(new URL('/signin', req.url));
  if (clearCookie) {
    res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true });
  }
  return res;
}

// ── Middleware ─────────────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets — skip all checks
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

  // /login/verify-otp — must have step1_token cookie
  if (pathname === '/login/verify-otp') {
    if (!req.cookies.get(STEP1_COOKIE)?.value) {
      return redirectToSignin(req);
    }
    return NextResponse.next();
  }

  // Public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // ── Protected routes: verify JWT in cookie ───────────────────────────────
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectToSignin(req);
  }

  // Verify JWT signature + expiry (no DB call, no network call)
  const valid = await verifySessionJWT(sessionToken);

  if (!valid) {
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true });
      return res;
    }
    return redirectToSignin(req, true);
  }

  // Valid — attach security headers and proceed
  const res = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
