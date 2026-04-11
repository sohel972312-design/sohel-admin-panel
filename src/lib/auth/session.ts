import { query } from '@/lib/db';
import { sha256, randomToken, randomUUID } from './hash';
import { cookies } from 'next/headers';

const SESSION_HOURS = parseInt(process.env.SESSION_EXPIRES_HOURS || '24');
const COOKIE_NAME = 'admin_session';

export interface SessionUser {
  adminId: string;
  email: string;
  phone: string | null;
}

// Create session in DB and set cookie
export async function createSession(
  adminId: string,
  ip: string,
  userAgent: string
): Promise<string> {
  const token = randomToken();
  const tokenHash = sha256(token);
  const sessionId = randomUUID();

  await query(
    `INSERT INTO admin_sessions (id, admin_id, token_hash, ip_address, user_agent, is_valid, expires_at)
     VALUES (?, ?, ?, ?, ?, 1, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [sessionId, adminId, tokenHash, ip, userAgent, SESSION_HOURS]
  );

  return token; // raw token goes to cookie
}

// Validate session from cookie value
export async function validateSession(token: string): Promise<SessionUser | null> {
  const tokenHash = sha256(token);

  const rows = await query(
    `SELECT s.admin_id, u.email, u.phone
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_id
     WHERE s.token_hash = ? AND s.is_valid = 1 AND s.expires_at > NOW()`,
    [tokenHash]
  ) as { admin_id: string; email: string; phone: string | null }[];

  if (!rows || rows.length === 0) return null;
  return { adminId: rows[0].admin_id, email: rows[0].email, phone: rows[0].phone };
}

// Invalidate session
export async function invalidateSession(token: string): Promise<void> {
  const tokenHash = sha256(token);
  await query(
    `UPDATE admin_sessions SET is_valid = 0 WHERE token_hash = ?`,
    [tokenHash]
  );
}

export { COOKIE_NAME };
