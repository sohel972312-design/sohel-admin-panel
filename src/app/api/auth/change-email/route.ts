import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';
import { randomToken, sha256, randomUUID, random6Digit } from '@/lib/auth/hash';
import { sendEmailChangeVerification } from '@/lib/auth/email';

// POST — initiate email change
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { newEmail } = await req.json().catch(() => ({}));
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  // Check email not already taken
  const existing = await query(
    `SELECT id FROM admin_users WHERE email = ? AND id != ?`,
    [newEmail, session.adminId]
  ) as { id: string }[];
  if (existing.length > 0) {
    return NextResponse.json({ error: 'This email is already in use' }, { status: 409 });
  }

  // Invalidate previous pending requests
  await query(
    `UPDATE email_change_requests SET is_used = 1 WHERE admin_id = ? AND is_used = 0`,
    [session.adminId]
  ).catch(() => {});

  const rawToken = randomToken();
  const tokenHash = sha256(rawToken);
  const otp = random6Digit();
  const requestId = randomUUID();

  await query(
    `INSERT INTO email_change_requests (id, admin_id, new_email, token_hash, otp_code, is_used, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())`,
    [requestId, session.adminId, newEmail, tokenHash, otp]
  );

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const verifyLink = `${appUrl}/verify-email?token=${rawToken}`;

  try {
    await sendEmailChangeVerification(newEmail, verifyLink, otp);
  } catch (err) {
    console.error('[change-email] Failed to send email:', err);
    // Delete the DB record we just inserted since email failed
    await query(`UPDATE email_change_requests SET is_used = 1 WHERE id = ?`, [requestId]).catch(() => {});
    return NextResponse.json({ error: 'Failed to send verification email. Check your SMTP settings.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET — verify email change via OTP code (from profile page)
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { otp } = await req.json().catch(() => ({}));
  if (!otp) return NextResponse.json({ error: 'OTP is required' }, { status: 400 });

  const rows = await query(
    `SELECT id, new_email FROM email_change_requests
     WHERE admin_id = ? AND otp_code = ? AND is_used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [session.adminId, otp]
  ) as { id: string; new_email: string }[];

  if (!rows[0]) {
    return NextResponse.json({ error: 'Invalid or expired OTP code' }, { status: 400 });
  }

  await query(`UPDATE admin_users SET email = ?, updated_at = NOW() WHERE id = ?`, [rows[0].new_email, session.adminId]);
  await query(`UPDATE email_change_requests SET is_used = 1 WHERE id = ?`, [rows[0].id]);

  return NextResponse.json({ success: true, newEmail: rows[0].new_email });
}
