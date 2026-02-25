import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/blob/cleanup
 * Body: { urls: string[] }
 * Deletes the provided blob URLs from Vercel Blob storage.
 * Called after a unit is sent to Body to free up temporary evidence photos.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];

    if (urls.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    await Promise.all(
      urls.map((url) =>
        del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch((e) =>
          console.warn('[blob/cleanup] Could not delete', url, e?.message)
        )
      )
    );

    return NextResponse.json({ ok: true, deleted: urls.length });
  } catch (err: any) {
    console.error('[blob/cleanup]', err);
    return NextResponse.json({ error: err.message ?? 'Error al eliminar archivos' }, { status: 500 });
  }
}
