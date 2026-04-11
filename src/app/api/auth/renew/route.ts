import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';
import { sha256 } from '@/lib/auth/hash';

const SESSION_MINUTES = parseInt(process.env.SESSION_EXPIRE_MINUTES || '30');

// PUT /api/auth/renew
// Called by admin layout every 5 min when user is active.
// Extends session in DB AND issues a fresh JWT cookie so middleware stays happy.
export async function PUT(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Extend DB session
  const tokenHash = sha256(session.sessionId);
  await query(
    `UPDATE admin_sessions
     SET expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
     WHERE token_hash = ? AND is_valid = 1`,
    [SESSION_MINUTES, tokenHash]
  );

  // Issue new JWT with fresh expiry
  const newJwt = jwt.sign(
    { jti: session.sessionId, sub: session.adminId },
    process.env.JWT_SECRET!,
    { expiresIn: SESSION_MINUTES * 60 }
  );

  const res = NextResponse.json({ ok: true, expiresInMinutes: SESSION_MINUTES });
  res.cookies.set(COOKIE_NAME, newJwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MINUTES * 60,
  });

  return res;
}
