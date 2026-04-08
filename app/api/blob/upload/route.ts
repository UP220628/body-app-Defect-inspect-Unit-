import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'BLOB_READ_WRITE_TOKEN is not configured' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'File is required' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: 'Only JPG, PNG, or WEBP images are allowed' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Image must be smaller than 5MB' },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(file.name || 'defect-photo.jpg');
    const blobPath = `unit-defects/${Date.now()}-${safeName}`;

    const uploaded = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({
      ok: true,
      data: {
        url: uploaded.url,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to upload image' }, { status: 500 });
  }
}
