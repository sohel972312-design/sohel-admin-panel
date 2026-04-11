import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword, confirmPassword } = await req.json().catch(() => ({}));

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  // Get current hash
  const rows = await query(
    `SELECT password_hash FROM admin_users WHERE id = ?`,
    [session.adminId]
  ) as { password_hash: string }[];

  if (!rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await query(
    `UPDATE admin_users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
    [newHash, session.adminId]
  );

  return NextResponse.json({ success: true });
}
