import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { sha256, randomUUID } from './hash';

const SESSION_MINUTES = parseInt(process.env.SESSION_EXPIRE_MINUTES || '30');
export const COOKIE_NAME = 'admin_session';

export interface SessionUser {
  adminId: string;
  email: string;
  phone: string | null;
  sessionId: string;
}

// ── Create session ──────────────────────────────────────────────────────────
// Stores session in DB, returns a signed JWT containing the session ID.
// The JWT is what goes in the cookie — middleware can verify it with Web Crypto
// without any network call.
export async function createSession(
  adminId: string,
  ip: string,
  userAgent: string
): Promise<string> {
  const sessionId = randomUUID();
  const tokenHash = sha256(sessionId); // store hash of sessionId, not the JWT

  await query(
    `INSERT INTO admin_sessions (id, admin_id, token_hash, ip_address, user_agent, is_valid, expires_at)
     VALUES (?, ?, ?, ?, ?, 1, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [sessionId, adminId, tokenHash, ip, userAgent, SESSION_MINUTES]
  );

  // JWT payload — jti = session ID (for DB lookup), sub = admin ID
  return jwt.sign(
    { jti: sessionId, sub: adminId },
    process.env.JWT_SECRET!,
    { expiresIn: SESSION_MINUTES * 60 }
  );
}

// ── Validate session ────────────────────────────────────────────────────────
// Verifies JWT signature, extracts session ID, checks DB record is still valid.
export async function validateSession(token: string): Promise<SessionUser | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      jti: string;
      sub: string;
    };
    if (!decoded.jti || !decoded.sub) return null;

    const tokenHash = sha256(decoded.jti);

    const rows = await query(
      `SELECT s.id, u.email, u.phone
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_id
       WHERE s.token_hash = ? AND s.is_valid = 1 AND s.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    ) as { id: string; email: string; phone: string | null }[];

    if (!rows || rows.length === 0) return null;

    return {
      adminId: decoded.sub,
      email: rows[0].email,
      phone: rows[0].phone,
      sessionId: decoded.jti,
    };
  } catch {
    return null;
  }
}

// ── Invalidate session ──────────────────────────────────────────────────────
export async function invalidateSession(token: string): Promise<void> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      ignoreExpiration: true,
    }) as { jti: string };
    if (!decoded.jti) return;
    const tokenHash = sha256(decoded.jti);
    await query(
      `UPDATE admin_sessions SET is_valid = 0 WHERE token_hash = ?`,
      [tokenHash]
    );
  } catch {
    // Invalid token — nothing to invalidate
  }
}
