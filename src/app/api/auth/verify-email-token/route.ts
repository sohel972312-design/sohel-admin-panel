import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sha256 } from '@/lib/auth/hash';

// GET /api/auth/verify-email-token?token=xxx
// Called when user clicks the verification link in their email
export async function GET(req: NextRequest) {
  const rawToken = req.nextUrl.searchParams.get('token');
  if (!rawToken) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const tokenHash = sha256(rawToken);

  const rows = await query(
    `SELECT id, admin_id, new_email FROM email_change_requests
     WHERE token_hash = ? AND is_used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [tokenHash]
  ) as { id: string; admin_id: string; new_email: string }[];

  if (!rows[0]) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
  }

  const { id, admin_id, new_email } = rows[0];

  await query(`UPDATE admin_users SET email = ?, updated_at = NOW() WHERE id = ?`, [new_email, admin_id]);
  await query(`UPDATE email_change_requests SET is_used = 1 WHERE id = ?`, [id]);

  return NextResponse.json({ success: true, newEmail: new_email });
}
