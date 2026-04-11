import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession, COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (token) {
    await invalidateSession(token).catch(() => {});
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
