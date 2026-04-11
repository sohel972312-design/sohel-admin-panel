import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { query } from '@/lib/db';
import { verifyStep1Token } from '@/lib/auth/jwt';
import { createSession, COOKIE_NAME } from '@/lib/auth/session';
import { randomUUID } from '@/lib/auth/hash';
import { resetRateLimit } from '@/lib/auth/ratelimit';
import { sendLoginSuccessAlert } from '@/lib/auth/email';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  // ── Validate step1 token ──
  const step1Token = req.cookies.get('step1_token')?.value;
  if (!step1Token) {
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
  }

  let payload: { adminId: string };
  try {
    payload = verifyStep1Token(step1Token);
  } catch {
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
  }

  const { otp } = await req.json().catch(() => ({ otp: '' }));
  if (!otp || otp.length !== 6) {
    return NextResponse.json({ error: 'Invalid OTP format' }, { status: 400 });
  }

  // ── Get TOTP secret ──
  const rows = await query(
    `SELECT totp_secret FROM admin_users WHERE id = ? AND is_active = 1`,
    [payload.adminId]
  ) as { totp_secret: string }[];

  if (!rows || rows.length === 0 || !rows[0].totp_secret) {
    return NextResponse.json({ error: 'Account not found or 2FA not configured' }, { status: 401 });
  }

  const { totp_secret } = rows[0];

  // ── Verify TOTP ──
  const valid = speakeasy.totp.verify({
    secret: totp_secret,
    encoding: 'base32',
    token: otp,
    window: 1,
  });

  if (!valid) {
    // Log wrong OTP
    await query(
      `INSERT INTO login_logs (id, admin_id, ip_address, user_agent, status, created_at)
       VALUES (?, ?, ?, ?, 'wrong_otp', NOW())`,
      [randomUUID(), payload.adminId, ip, userAgent]
    ).catch(() => {});

    return NextResponse.json({ error: 'Invalid OTP code' }, { status: 401 });
  }

  // ── OTP correct — create real session ──
  const token = await createSession(payload.adminId, ip, userAgent);

  // Update last_login_at
  await query(
    `UPDATE admin_users SET last_login_at = NOW() WHERE id = ?`,
    [payload.adminId]
  ).catch(() => {});

  // Log success
  await query(
    `INSERT INTO login_logs (id, admin_id, ip_address, user_agent, status, created_at)
     VALUES (?, ?, ?, ?, 'success', NOW())`,
    [randomUUID(), payload.adminId, ip, userAgent]
  ).catch(() => {});

  // Reset rate limit for this IP
  resetRateLimit(ip);

  // Send success alert in background
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  sendLoginSuccessAlert(ip, userAgent, time).catch(() => {});

  const res = NextResponse.json({ success: true, redirect: '/' });

  // Set real session cookie
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: parseInt(process.env.SESSION_EXPIRES_HOURS || '24') * 3600,
  });

  // Clear step1 cookie
  res.cookies.set('step1_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return res;
}
