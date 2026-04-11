import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';
import { sha256 } from '@/lib/auth/hash';

const SESSION_MINUTES = parseInt(process.env.SESSION_EXPIRE_MINUTES || '30');

// PUT /api/auth/renew
// Called by the admin layout heartbeat to extend session on activity.
// Returns 200 with remaining minutes, or 401 if session is gone.
export async function PUT(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tokenHash = sha256(token);

  // Extend session by SESSION_MINUTES from now
  await query(
    `UPDATE admin_sessions
     SET expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
     WHERE token_hash = ? AND is_valid = 1`,
    [SESSION_MINUTES, tokenHash]
  );

  return NextResponse.json({ ok: true, expiresInMinutes: SESSION_MINUTES });
}
