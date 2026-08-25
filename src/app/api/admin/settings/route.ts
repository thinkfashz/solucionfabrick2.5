import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminError, getAdminInsforge, getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { publishCmsEvent } from '@/lib/cmsBus';
import { CMS_CACHE_TAGS } from '@/lib/cms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

/**
 * Whitelisted setting keys editable from /admin/configuracion. We use the
 * existing tenant-aware `configuracion` table (clave/valor).
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
  'rut_empresa',
  'ciudad',
  'sitio_web',
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

async function applyLegacyBusinessFallback(client: ReturnType<typeof getAdminInsforge>, tenantId: string, settings: Record<string, string>) {
  if (tenantId !== DEFAULT_TENANT) return;
  const missingBusinessField = !settings.nombre_empresa || !settings.rut_empresa || !settings.direccion || !settings.ciudad || !settings.whatsapp || !settings.email_contacto || !settings.sitio_web;
  if (!missingBusinessField) return;

  try {
    const { data } = await client.database
      .from('business_config')
      .select('id,nombre,rut,direccion,ciudad,whatsapp,email_contacto,sitio_web')
      .eq('id', 'main')
      .limit(1);
    const legacy = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
    if (!legacy) return;
    const map: Record<string, string> = {
      nombre_empresa: String(legacy.nombre ?? ''),
      rut_empresa: String(legacy.rut ?? ''),
      direccion: String(legacy.direccion ?? ''),
      ciudad: String(legacy.ciudad ?? ''),
      whatsapp: String(legacy.whatsapp ?? ''),
      email_contacto: String(legacy.email_contacto ?? ''),
      sitio_web: String(legacy.sitio_web ?? ''),
    };
    for (const [key, value] of Object.entries(map)) {
      if (!settings[key] && value) settings[key] = value;
    }
  } catch {
    // Legacy table is optional. Tenant settings remain the canonical source.
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminPermission(request, { resource: 'settings', action: 'read' });
    if (!auth.ok) return auth.response;
    const tenantId = await getAdminTenantId(request);
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('configuracion').select('clave, valor').eq('tenant_id', tenantId);
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
    await applyLegacyBusinessFallback(client, tenantId, settings);
    return NextResponse.json({ settings });
  } catch (err) {
    return adminError(err, 'SETTINGS_GET_FAILED');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminPermission(request, { resource: 'settings', action: 'update' });
    if (!auth.ok) return auth.response;
    const tenantId = await getAdminTenantId(request);
    const body = (await request.json().catch(() => ({}))) as { settings?: Record<string, string> };
    const incoming = body.settings ?? {};
    const updates: Array<{ clave: string; valor: string; tenant_id: string; updated_at: string }> = [];
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(incoming)) {
      if (!isSettingKey(key)) continue;
      if (typeof value !== 'string') continue;
      updates.push({ clave: key, valor: value, tenant_id: tenantId, updated_at: now });
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay cambios válidos.', code: 'VALIDATION' }, { status: 400 });
    }
    const client = getAdminInsforge();
    const { error } = await client.database
      .from('configuracion')
      .upsert(updates, { onConflict: 'clave,tenant_id' });
    if (error) return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
    try {
      revalidatePath('/');
      revalidatePath('/tienda');
      revalidateTag(CMS_CACHE_TAGS.settings);
    } catch {
      /* best effort */
    }
    publishCmsEvent({ topic: 'settings', action: 'update', paths: ['/', '/tienda'] });
    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (err) {
    return adminError(err, 'SETTINGS_PUT_FAILED');
  }
}
