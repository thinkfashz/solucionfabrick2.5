import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { publishCmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Whitelisted setting keys editable from /admin/configuracion. We use the
 * existing `configuracion` table (clave/valor) so no schema change is
 * required.
 */
const SETTING_KEYS = [
  'copyright_text',
  'hero_title',
  'hero_subtitle',
  'hero_cover_url',
  'social_facebook',
  'social_instagram',
  'social_tiktok',
  'whatsapp',
  'email_contacto',
  'direccion',
  'nombre_empresa',
  'slogan',
  'logo_url',
  // Tienda (catálogo)
  'tienda_titulo',
  'tienda_subtitulo',
  'tienda_cover_url',
  'tienda_destacados_titulo',
  'tienda_cta_label',
  'tienda_cta_url',
] as const;
type SettingKey = (typeof SETTING_KEYS)[number];

function isSettingKey(v: unknown): v is SettingKey {
  return typeof v === 'string' && (SETTING_KEYS as readonly string[]).includes(v);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const client = getAdminInsforge();
    const { data, error } = await client.database.from('configuracion').select('clave, valor');
    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'DB_ERROR', hint: 'Crea la tabla configuracion en /admin/setup.' },
        { status: 500 },
      );
    }
    const settings: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ clave?: string; valor?: string }>) {
      if (row.clave && (SETTING_KEYS as readonly string[]).includes(row.clave)) {
        settings[row.clave] = row.valor ?? '';
      }
    }
    return NextResponse.json({ settings });
  } catch (err) {
    return adminError(err, 'SETTINGS_GET_FAILED');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const body = (await request.json().catch(() => ({}))) as { settings?: Record<string, string> };
    const incoming = body.settings ?? {};
    const updates: Array<{ clave: string; valor: string; updated_at: string }> = [];
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(incoming)) {
      if (!isSettingKey(key)) continue;
      if (typeof value !== 'string') continue;
      updates.push({ clave: key, valor: value, updated_at: now });
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay cambios válidos.', code: 'VALIDATION' }, { status: 400 });
    }
    const client = getAdminInsforge();
    const { error } = await client.database.from('configuracion').upsert(updates);
    if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    try {
      revalidatePath('/');
      revalidatePath('/tienda');
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'settings', action: 'update', paths: ['/', '/tienda'] });
    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (err) {
    return adminError(err, 'SETTINGS_PUT_FAILED');
  }
}
