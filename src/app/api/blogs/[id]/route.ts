import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const TABLE_NAME = 'blog_posts';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const fetchBlog = async (withJoin: boolean) => {
    const sql = withJoin
      ? `SELECT b.*, c.name AS category, c.catcolor, c.catBg
         FROM ${TABLE_NAME} b
         LEFT JOIN categories c ON b.category_id = c.id
         WHERE b.id = ?`
      : `SELECT * FROM ${TABLE_NAME} WHERE id = ?`;
    const rows = await query(sql, [id]);
    return (rows as Record<string, unknown>[])[0];
  };

  try {
    let blog = await fetchBlog(true).catch(async () => fetchBlog(false));

    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }
    return NextResponse.json(blog);

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  const body = await request.json();

  // Try UPDATE with category_id; fall back without it if column doesn't exist
  const tryUpdate = async (withCategoryId: boolean) => {
    if (withCategoryId) {
      await query(
        `UPDATE ${TABLE_NAME} SET
           slug=?, title=?, excerpt=?,
           category_id=?, category=?, catBg=?,
           metatitle=?, metadescription=?,
           date=?, readtime=?, bannerimage=?, thumbbg=?,
           author=?, authoravatar=?, tags=?, content=?, status=?, images=?
         WHERE id=?`,
        [
          body.slug, body.title, body.excerpt || null,
          body.category_id || null, body.category || null, body.catBg || null,
          body.metatitle || null, body.metadescription || null,
          body.date || null, body.readtime || '5 min read',
          body.bannerimage || null, body.thumbbg || null,
          body.author || 'Sohel Malek', body.authoravatar || null,
          JSON.stringify(body.tags || []), body.content || '',
          body.status || 'draft', JSON.stringify(body.images || []),
          id,
        ]
      );
    } else {
      await query(
        `UPDATE ${TABLE_NAME} SET
           slug=?, title=?, excerpt=?,
           category=?, catBg=?,
           metatitle=?, metadescription=?,
           date=?, readtime=?, bannerimage=?, thumbbg=?,
           author=?, authoravatar=?, tags=?, content=?, status=?, images=?
         WHERE id=?`,
        [
          body.slug, body.title, body.excerpt || null,
          body.category || null, body.catBg || null,
          body.metatitle || null, body.metadescription || null,
          body.date || null, body.readtime || '5 min read',
          body.bannerimage || null, body.thumbbg || null,
          body.author || 'Sohel Malek', body.authoravatar || null,
          JSON.stringify(body.tags || []), body.content || '',
          body.status || 'draft', JSON.stringify(body.images || []),
          id,
        ]
      );
    }
  };

  try {
    await tryUpdate(true).catch(() => tryUpdate(false));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const { status } = await request.json();

    await query(
      `UPDATE ${TABLE_NAME} SET status = ? WHERE id = ?`,
      [status, id]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    await query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
