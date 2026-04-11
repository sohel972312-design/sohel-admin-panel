import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';
import { random6Digit, randomUUID } from '@/lib/auth/hash';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { newPhone, channel } = await req.json().catch(() => ({}));

  if (!newPhone || !/^\+?[1-9]\d{6,14}$/.test(newPhone.replace(/[\s\-()]/g, ''))) {
    return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
  }
  if (!channel || !['sms', 'whatsapp'].includes(channel)) {
    return NextResponse.json({ error: 'Channel must be sms or whatsapp' }, { status: 400 });
  }

  // Check phone not already taken
  const existing = await query(
    `SELECT id FROM admin_users WHERE phone = ? AND id != ?`,
    [newPhone, session.adminId]
  ) as { id: string }[];
  if (existing.length > 0) {
    return NextResponse.json({ error: 'This phone number is already in use' }, { status: 409 });
  }

  // Invalidate previous pending requests
  await query(
    `UPDATE phone_change_requests SET is_used = 1 WHERE admin_id = ? AND is_used = 0`,
    [session.adminId]
  ).catch(() => {});

  const otp = random6Digit();
  const requestId = randomUUID();

  await query(
    `INSERT INTO phone_change_requests (id, admin_id, new_phone, otp_code, channel, attempts, is_used, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())`,
    [requestId, session.adminId, newPhone, otp, channel]
  );

  // Send OTP via Twilio
  const toNumber = channel === 'whatsapp'
    ? `whatsapp:${newPhone}`
    : newPhone;
  const fromNumber = channel === 'whatsapp'
    ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
    : process.env.TWILIO_PHONE_NUMBER;

  await twilioClient.messages.create({
    body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
    from: fromNumber,
    to: toNumber,
  });

  return NextResponse.json({ success: true });
}
