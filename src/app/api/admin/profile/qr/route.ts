import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const { searchParams } = new URL(request.url);
    const value = searchParams.get('value')?.trim();
    if (!value) {
      return NextResponse.json({ error: 'Falta value para generar QR.' }, { status: 400 });
    }

    const dataUrl = await QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 720,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });

    return NextResponse.json({ ok: true, qr: dataUrl, value, type: 'iso-qr' });
  } catch (err) {
    return adminError(err, 'PROFILE_QR_GENERATION_FAILED');
  }
}
