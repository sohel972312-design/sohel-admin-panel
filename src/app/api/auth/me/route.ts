import { NextRequest, NextResponse } from 'next/server';
import { validateSession, COOKIE_NAME } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    id: session.adminId,
    email: session.email,
    phone: session.phone,
  });
}
