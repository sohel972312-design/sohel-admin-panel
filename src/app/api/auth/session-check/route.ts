import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Internal endpoint used only by middleware to validate sessions
// Protected by a shared secret header

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-internal-key');
  if (key !== (process.env.INTERNAL_API_KEY || 'internal_key_change_me')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tokenHash } = await req.json().catch(() => ({ tokenHash: null }));
  if (!tokenHash) {
    return NextResponse.json({ error: 'No token' }, { status: 400 });
  }

  const rows = await query(
    `SELECT id FROM admin_sessions
     WHERE token_hash = ? AND is_valid = 1 AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  ) as { id: string }[];

  if (!rows || rows.length === 0) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
