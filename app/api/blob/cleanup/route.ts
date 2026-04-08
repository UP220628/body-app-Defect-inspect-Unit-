import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

function normalizeBlobUrls(rawUrls: unknown): string[] {
  if (!Array.isArray(rawUrls)) {
    return [];
  }

  const unique = new Set<string>();

  for (const rawUrl of rawUrls) {
    if (typeof rawUrl !== 'string') {
      continue;
    }

    const url = rawUrl.trim();
    if (!url) {
      continue;
    }

    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
        continue;
      }
      unique.add(url);
    } catch {
      continue;
    }
  }

  return Array.from(unique);
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'BLOB_READ_WRITE_TOKEN is not configured' },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => null);
    const urls = normalizeBlobUrls(body?.urls);

    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'At least one valid blob URL is required' },
        { status: 400 },
      );
    }

    await del(urls, { token: process.env.BLOB_READ_WRITE_TOKEN });

    return NextResponse.json({
      ok: true,
      data: {
        deletedCount: urls.length,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to delete image(s)' }, { status: 500 });
  }
}
