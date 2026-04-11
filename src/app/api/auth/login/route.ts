import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signStep1Token } from '@/lib/auth/jwt';
import { checkRateLimit } from '@/lib/auth/ratelimit';
import { randomUUID } from '@/lib/auth/hash';
import { sendWrongPasswordAlert } from '@/lib/auth/email';

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

  // ── Rate limit check ──
  const rl = checkRateLimit(ip);
  if (rl.blocked) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Please try again after 10 minutes.' },
      { status: 429 }
    );
  }

  let body: { identifier?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { identifier, password } = body;
  if (!identifier || !password) {
    return NextResponse.json({ error: 'Email/phone and password are required' }, { status: 400 });
  }

  // ── Find admin by email OR phone ──
  const rows = await query(
    `SELECT id, email, phone, password_hash, totp_secret, totp_enabled, is_active
     FROM admin_users
     WHERE (email = ? OR phone = ?) AND is_active = 1
     LIMIT 1`,
    [identifier, identifier]
  ) as {
    id: string;
    email: string;
    phone: string | null;
    password_hash: string;
    totp_secret: string | null;
    totp_enabled: number;
    is_active: number;
  }[];

  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Wrong credentials — log + alert
  const logFail = async (status: 'wrong_password' | 'blocked') => {
    await query(
      `INSERT INTO login_logs (id, admin_id, ip_address, user_agent, status, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [randomUUID(), rows[0]?.id || null, ip, userAgent, status]
    ).catch(() => {}); // don't fail request on log error
  };

  if (!rows || rows.length === 0) {
    await logFail('wrong_password').catch(() => {});
    // Don't reveal whether email exists
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const admin = rows[0];

  const passwordMatch = await bcrypt.compare(password, admin.password_hash);
  if (!passwordMatch) {
    await logFail('wrong_password');
    // Fire email alert in background — don't await so response is fast
    sendWrongPasswordAlert(ip, userAgent, time).catch(() => {});

    const rlAfter = checkRateLimit(ip);
    if (rlAfter.blocked) {
      await query(
        `INSERT INTO login_logs (id, admin_id, ip_address, user_agent, status, created_at)
         VALUES (?, ?, ?, ?, 'blocked', NOW())`,
        [randomUUID(), admin.id, ip, userAgent]
      ).catch(() => {});
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again after 10 minutes.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // ── Password correct ──
  // If 2FA not enabled yet, redirect to setup-2fa directly (skip OTP page)
  if (!admin.totp_enabled || !admin.totp_secret) {
    const { createSession, COOKIE_NAME } = await import('@/lib/auth/session');
    const { resetRateLimit } = await import('@/lib/auth/ratelimit');
    const { sendLoginSuccessAlert } = await import('@/lib/auth/email');

    const token = await createSession(admin.id, ip, userAgent);
    await query(`UPDATE admin_users SET last_login_at = NOW() WHERE id = ?`, [admin.id]).catch(() => {});
    await query(
      `INSERT INTO login_logs (id, admin_id, ip_address, user_agent, status, created_at) VALUES (?, ?, ?, ?, 'success', NOW())`,
      [randomUUID(), admin.id, ip, userAgent]
    ).catch(() => {});
    resetRateLimit(ip);
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    sendLoginSuccessAlert(ip, userAgent, time).catch(() => {});

    const res = NextResponse.json({ redirect: '/setup-2fa' });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: parseInt(process.env.SESSION_EXPIRES_HOURS || '24') * 3600,
    });
    return res;
  }

  // 2FA enabled — issue step1 token, redirect to OTP page
  const step1Token = signStep1Token(admin.id);
  const res = NextResponse.json({ redirect: '/login/verify-otp' });
  res.cookies.set('step1_token', step1Token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 5 * 60,
  });
  return res;
}
