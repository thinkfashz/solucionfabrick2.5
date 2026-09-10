import { NextResponse, type NextRequest } from 'next/server';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { safePublicId, uploadDataUrlToCloudinary } from '@/lib/cloudinaryUpload';
import { requireCurrentCustomerConsent, saveCustomerAvatar } from '@/lib/customerData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const MAX_DATA_URL_LENGTH = 3_600_000;

export async function POST(request: NextRequest) {
  const user = await getInsforgeUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers: NO_STORE });

  try {
    await requireCurrentCustomerConsent(user.id, user.email);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'CONSENT_REQUIRED') return NextResponse.json({ error: 'Acepta los Términos y la Política de Privacidad antes de guardar una foto.', code: 'CONSENT_REQUIRED' }, { status: 428, headers: NO_STORE });
    return NextResponse.json({ error: 'La base privada de clientes todavía no está preparada.' }, { status: 503, headers: NO_STORE });
  }

  const body = await request.json().catch(() => null) as { dataUrl?: unknown } | null;
  const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl : '';
  if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(dataUrl)) {
    return NextResponse.json({ error: 'Formato de imagen no permitido.' }, { status: 400, headers: NO_STORE });
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: 'La imagen es demasiado grande.' }, { status: 413, headers: NO_STORE });
  }

  const result = await uploadDataUrlToCloudinary({
    dataUrl,
    folder: 'soluciones-fabrick/clientes/avatares',
    publicId: `avatar-${safePublicId(user.id)}`,
  });
  if (!result.ready) return NextResponse.json({ error: result.error }, { status: 503, headers: NO_STORE });

  try {
    await saveCustomerAvatar(user.id, user.email, result.url);
  } catch {
    return NextResponse.json({ error: 'La imagen se subió, pero no se pudo asociar al perfil privado. Intenta nuevamente.' }, { status: 503, headers: NO_STORE });
  }

  return NextResponse.json({ url: result.url }, { headers: NO_STORE });
}
