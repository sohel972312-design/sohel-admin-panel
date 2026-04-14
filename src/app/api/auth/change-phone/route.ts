import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';
import { random6Digit, randomUUID } from '@/lib/auth/hash';
import twilio from 'twilio';

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !token || !from) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER.');
  }

  return { client: twilio(sid, token), from };
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { newPhone } = await req.json().catch(() => ({}));

  const normalised = typeof newPhone === 'string' ? newPhone.replace(/[\s\-()]/g, '') : '';
  if (!normalised || !/^\+[1-9]\d{6,14}$/.test(normalised)) {
    return NextResponse.json(
      { error: 'A valid phone number in international format is required (e.g. +919876543210)' },
      { status: 400 }
    );
  }

  // Check number not already taken by another admin
  const existing = await query(
    `SELECT id FROM admin_users WHERE phone = ? AND id != ?`,
    [normalised, session.adminId]
  ) as { id: string }[];
  if (existing.length > 0) {
    return NextResponse.json({ error: 'This phone number is already in use' }, { status: 409 });
  }

  // Invalidate previous pending requests for this admin
  await query(
    `UPDATE phone_change_requests SET is_used = 1 WHERE admin_id = ? AND is_used = 0`,
    [session.adminId]
  ).catch(() => {});

  const otp = random6Digit();
  const requestId = randomUUID();

  await query(
    `INSERT INTO phone_change_requests
       (id, admin_id, new_phone, otp_code, channel, attempts, is_used, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'whatsapp', 0, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())`,
    [requestId, session.adminId, normalised, otp]
  );

  // Send OTP via Twilio WhatsApp
  try {
    const { client, from } = getTwilioClient();
    await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${normalised}`,
      body: `Your Admin Panel verification code is: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`,
    });
  } catch (err) {
    console.error('[change-phone] Twilio send failed:', err);
    // Clean up the DB row so it doesn't leave a dangling pending request
    await query(`UPDATE phone_change_requests SET is_used = 1 WHERE id = ?`, [requestId]).catch(() => {});
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message. Check Twilio configuration.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
