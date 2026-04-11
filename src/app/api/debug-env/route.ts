import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY debug endpoint — DELETE after fixing env vars on Hostinger
// Access: GET /api/debug-env?key=debug123
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (key !== 'debug123') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Test DB connection
  let dbStatus = 'untested';
  let dbError = '';
  try {
    const { query } = await import('@/lib/db');
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (e: unknown) {
    dbStatus = 'FAILED';
    dbError = e instanceof Error ? e.message : String(e);
  }

  // Check env vars (only presence, not values)
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    db: {
      status: dbStatus,
      error: dbError,
      host: process.env.HOSTINGER_HOST || process.env.DB_HOST_PROD || '(not set)',
      database: process.env.HOSTINGER_DATABASE || process.env.DB_NAME_PROD || '(not set)',
      user: process.env.HOSTINGER_USER || process.env.DB_USER_PROD || '(not set)',
      passwordSet: !!(process.env.HOSTINGER_PASSWORD || process.env.DB_PASSWORD_PROD),
    },
    auth: {
      JWT_SECRET: process.env.JWT_SECRET ? `set (${process.env.JWT_SECRET.length} chars)` : 'NOT SET ❌',
      JWT_STEP1_SECRET: process.env.JWT_STEP1_SECRET ? `set (${process.env.JWT_STEP1_SECRET.length} chars)` : 'NOT SET ❌',
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY ? 'set' : 'NOT SET ❌',
      SESSION_EXPIRE_MINUTES: process.env.SESSION_EXPIRE_MINUTES || '(not set, default 30)',
      APP_URL: process.env.APP_URL || '(not set)',
    },
  });
}
