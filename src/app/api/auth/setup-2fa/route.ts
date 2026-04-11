import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';

// GET — generate secret + QR code
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Generate new TOTP secret
  const secret = speakeasy.generateSecret({
    name: `Admin Panel (${session.email})`,
    issuer: 'Admin Panel',
  });

  // Temporarily store secret in DB (not yet activated)
  await query(
    `UPDATE admin_users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?`,
    [secret.base32, session.adminId]
  );

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

  return NextResponse.json({
    secret: secret.base32,
    qrCode: qrDataUrl,
  });
}

// POST — verify first OTP and activate 2FA
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { otp } = await req.json().catch(() => ({ otp: '' }));
  if (!otp || otp.length !== 6) {
    return NextResponse.json({ error: 'Invalid OTP format' }, { status: 400 });
  }

  // Get the stored secret
  const rows = await query(
    `SELECT totp_secret FROM admin_users WHERE id = ?`,
    [session.adminId]
  ) as { totp_secret: string }[];

  if (!rows[0]?.totp_secret) {
    return NextResponse.json({ error: 'No secret found. Please refresh and try again.' }, { status: 400 });
  }

  const valid = speakeasy.totp.verify({
    secret: rows[0].totp_secret,
    encoding: 'base32',
    token: otp,
    window: 1,
  });

  if (!valid) {
    return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 401 });
  }

  // Activate 2FA
  await query(
    `UPDATE admin_users SET totp_enabled = 1 WHERE id = ?`,
    [session.adminId]
  );

  return NextResponse.json({ success: true });
}
