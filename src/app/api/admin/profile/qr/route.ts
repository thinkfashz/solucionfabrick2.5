import { NextRequest, NextResponse } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

function pseudoQrDataUrl(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  const size = 29;
  const cell = 16;
  const padding = 16;
  const total = size * cell + padding * 2;
  const cells: string[] = [];

  function finder(x: number, y: number) {
    cells.push(`<rect x="${padding + x * cell}" y="${padding + y * cell}" width="${cell * 7}" height="${cell * 7}" fill="#020617"/>`);
    cells.push(`<rect x="${padding + (x + 1) * cell}" y="${padding + (y + 1) * cell}" width="${cell * 5}" height="${cell * 5}" fill="#fff"/>`);
    cells.push(`<rect x="${padding + (x + 2) * cell}" y="${padding + (y + 2) * cell}" width="${cell * 3}" height="${cell * 3}" fill="#020617"/>`);
  }

  finder(0, 0); finder(22, 0); finder(0, 22);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinder = (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
      if (inFinder) continue;
      const bit = Math.abs(Math.sin((x + 1) * 13.37 + (y + 1) * 7.91 + hash) * 10000) % 1 > 0.54;
      if (bit) cells.push(`<rect x="${padding + x * cell}" y="${padding + y * cell}" width="${cell}" height="${cell}" rx="3" fill="#020617"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}"><rect width="100%" height="100%" rx="28" fill="#fff"/>${cells.join('')}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const { searchParams } = new URL(request.url);
    const value = searchParams.get('value')?.trim();
    if (!value) return NextResponse.json({ error: 'Falta value para generar QR.' }, { status: 400 });

    return NextResponse.json({ ok: true, qr: pseudoQrDataUrl(value), value, note: 'QR visual interno. Para QR ISO escaneable instala qrcode y actualiza pnpm-lock.yaml.' });
  } catch (err) {
    return adminError(err, 'PROFILE_QR_GENERATION_FAILED');
  }
}
