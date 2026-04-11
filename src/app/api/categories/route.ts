import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const categories = await query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    return NextResponse.json(Array.isArray(categories) ? categories : []);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO categories (name, catcolor, catBg) VALUES (?, ?, ?)',
      [body.name.trim(), body.catcolor || '#3B82F6', body.catBg || '#EFF6FF']
    ) as { insertId: number };

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
