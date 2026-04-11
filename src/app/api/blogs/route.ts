import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const TABLE_NAME = 'blog_posts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const statusParam = status && status !== 'all' ? status : null;

  // Try with categories JOIN first; fall back to plain SELECT if JOIN fails
  // (handles case where category_id column hasn't been added yet)
  const buildSql = (withJoin: boolean) => {
    const select = withJoin
      ? `SELECT b.*, c.name AS category, c.catcolor, c.catBg
         FROM ${TABLE_NAME} b
         LEFT JOIN categories c ON b.category_id = c.id`
      : `SELECT * FROM ${TABLE_NAME} b`;

    return statusParam
      ? `${select} WHERE b.status = ? ORDER BY b.created_at DESC`
      : `${select} ORDER BY b.created_at DESC`;
  };

  const params = statusParam ? [statusParam] : [];

  try {
    const blogs = await query(buildSql(true), params);
    return NextResponse.json(Array.isArray(blogs) ? blogs : []);
  } catch (joinError) {
    console.warn('JOIN query failed, falling back to simple query:', joinError instanceof Error ? joinError.message : joinError);

    try {
      const blogs = await query(buildSql(false), params);
      return NextResponse.json(Array.isArray(blogs) ? blogs : []);
    } catch (fallbackError) {
      console.error('Database error:', fallbackError);
      return NextResponse.json(
        { error: 'Database error', details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  // Try INSERT with category_id column; fall back without it if column doesn't exist yet
  const tryInsert = async (withCategoryId: boolean) => {
    if (withCategoryId) {
      return await query(
        `INSERT INTO ${TABLE_NAME}
          (slug, title, excerpt, category_id, category, catBg,
           metatitle, metadescription, date, readtime,
           bannerimage, thumbbg, author, authoravatar,
           tags, content, status, images)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.slug,
          body.title,
          body.excerpt || null,
          body.category_id || null,
          body.category || null,
          body.catBg || null,
          body.metatitle || null,
          body.metadescription || null,
          body.date || new Date().toISOString().split('T')[0],
          body.readtime || '5 min read',
          body.bannerimage || null,
          body.thumbbg || null,
          body.author || 'Sohel Malek',
          body.authoravatar || null,
          JSON.stringify(body.tags || []),
          body.content || '',
          body.status || 'draft',
          JSON.stringify(body.images || []),
        ]
      ) as { insertId: number };
    } else {
      return await query(
        `INSERT INTO ${TABLE_NAME}
          (slug, title, excerpt, category, catBg,
           metatitle, metadescription, date, readtime,
           bannerimage, thumbbg, author, authoravatar,
           tags, content, status, images)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.slug,
          body.title,
          body.excerpt || null,
          body.category || null,
          body.catBg || null,
          body.metatitle || null,
          body.metadescription || null,
          body.date || new Date().toISOString().split('T')[0],
          body.readtime || '5 min read',
          body.bannerimage || null,
          body.thumbbg || null,
          body.author || 'Sohel Malek',
          body.authoravatar || null,
          JSON.stringify(body.tags || []),
          body.content || '',
          body.status || 'draft',
          JSON.stringify(body.images || []),
        ]
      ) as { insertId: number };
    }
  };

  try {
    const result = await tryInsert(true).catch(() => tryInsert(false));
    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
