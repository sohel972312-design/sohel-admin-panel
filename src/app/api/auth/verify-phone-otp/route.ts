import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { otp } = await req.json().catch(() => ({}));
  if (!otp) return NextResponse.json({ error: 'OTP is required' }, { status: 400 });

  // Find valid pending request
  const rows = await query(
    `SELECT id, new_phone, attempts FROM phone_change_requests
     WHERE admin_id = ? AND is_used = 0 AND expires_at > NOW() AND attempts < 3
     ORDER BY created_at DESC LIMIT 1`,
    [session.adminId]
  ) as { id: string; new_phone: string; attempts: number }[];

  if (!rows[0]) {
    return NextResponse.json({ error: 'No active OTP request found or too many attempts' }, { status: 400 });
  }

  const row = rows[0];

  // Verify OTP matches
  const match = await query(
    `SELECT id FROM phone_change_requests WHERE id = ? AND otp_code = ?`,
    [row.id, otp]
  ) as { id: string }[];

  if (!match[0]) {
    // Increment attempt count
    await query(
      `UPDATE phone_change_requests SET attempts = attempts + 1 WHERE id = ?`,
      [row.id]
    );
    const remaining = 2 - row.attempts;
    return NextResponse.json(
      { error: remaining > 0 ? `Invalid OTP. ${remaining} attempt(s) remaining.` : 'Too many failed attempts' },
      { status: 400 }
    );
  }

  await query(`UPDATE admin_users SET phone = ?, updated_at = NOW() WHERE id = ?`, [row.new_phone, session.adminId]);
  await query(`UPDATE phone_change_requests SET is_used = 1 WHERE id = ?`, [row.id]);

  return NextResponse.json({ success: true, newPhone: row.new_phone });
}
