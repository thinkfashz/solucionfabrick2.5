import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { probeMercadoPago } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/estado
 *
 * Self-diagnostic for the CMS and supporting infrastructure. Runs a battery of
 * cheap probes and surfaces issues with concrete suggestions. Designed to be
 * polled from `/admin/estado` every 30s and on demand.
 *
 * Each check returns:
 *   { id, label, group, severity: 'ok'|'warn'|'error'|'info', detail?, suggestion?, latencyMs? }
 *
 * Groups: 'db', 'schema', 'storage', 'content', 'env', 'integrations'.
 *
 * IMPORTANT: every probe is wrapped so a single failure never breaks the
 * overall response — the dashboard must always render, even on a half-broken
 * backend.
 */

type Severity = 'ok' | 'warn' | 'error' | 'info';
interface Check {
  id: string;
  label: string;
  group: 'db' | 'schema' | 'storage' | 'content' | 'env' | 'integrations' | 'payments';
  severity: Severity;
  detail?: string;
  suggestion?: string;
  latencyMs?: number;
}

const REQUIRED_TABLES: Array<{ name: string; columns: string[]; hint: string }> = [
  {
    name: 'blog_posts',
    columns: ['id', 'slug', 'title', 'body_md', 'published', 'updated_at'],
    hint: 'Crea las tablas en /admin/setup → "Crear tablas ahora".',
  },
  {
    name: 'home_sections',
    columns: ['id', 'kind', 'title', 'position', 'visible', 'updated_at'],
    hint: 'Crea las tablas en /admin/setup → "Crear tablas ahora".',
  },
  {
    name: 'media_assets',
    columns: ['id', 'bucket', 'path', 'url', 'folder', 'created_at'],
    hint: 'Crea las tablas en /admin/setup → "Crear tablas ahora".',
  },
  {
    name: 'configuracion',
    columns: ['clave', 'valor'],
    hint: 'Crea las tablas en /admin/setup → "Crear tablas ahora".',
  },
  {
    name: 'products',
    columns: ['id', 'name', 'price', 'stock'],
    hint: 'Tabla principal de catálogo. Crea en /admin/setup.',
  },
  {
    name: 'orders',
    columns: ['id', 'status', 'total'],
    hint: 'Tabla de pedidos requerida por checkout. Crea en /admin/setup.',
  },
];

const REQUIRED_SETTINGS = [
  'copyright_text',
  'nombre_empresa',
  'whatsapp',
  'email_contacto',
] as const;

async function safeRun<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const client = getAdminInsforge();
    const checks: Check[] = [];

    // ---- DB / SCHEMA ----------------------------------------------------
    for (const t of REQUIRED_TABLES) {
      const start = Date.now();
      const result = await safeRun(async () => {
        const { error: countErr, count } = await client.database
          .from(t.name)
          .select('*', { count: 'exact', head: true });
        if (countErr) {
          return { ok: false, message: countErr.message ?? 'unknown', rows: 0 };
        }
        const { error: selErr } = await client.database
          .from(t.name)
          .select(t.columns.join(', '))
          .limit(1);
        return {
          ok: !selErr,
          rows: count ?? 0,
          message: selErr ? selErr.message : null,
        } as { ok: boolean; rows: number; message: string | null };
      }, { ok: false, message: 'no se pudo conectar', rows: 0 });
      const latencyMs = Date.now() - start;

      if (!result.ok) {
        const missingCol =
          typeof result.message === 'string' && /column|does not exist/i.test(result.message);
        checks.push({
          id: `db.${t.name}`,
          label: `Tabla ${t.name}`,
          group: missingCol ? 'schema' : 'db',
          severity: 'error',
          detail: result.message ?? undefined,
          suggestion: missingCol
            ? `Falta una columna requerida (${t.columns.join(', ')}). Ejecuta el bloque "${t.name}-migrate" desde /admin/setup.`
            : t.hint,
          latencyMs,
        });
      } else {
        checks.push({
          id: `db.${t.name}`,
          label: `Tabla ${t.name}`,
          group: 'db',
          severity: 'ok',
          detail: `${result.rows} fila${result.rows === 1 ? '' : 's'}`,
          latencyMs,
        });
      }
    }

    // ---- STORAGE --------------------------------------------------------
    {
      const start = Date.now();
      const sampleAsset = await safeRun(async () => {
        const { data } = await client.database
          .from('media_assets')
          .select('url')
          .order('created_at', { ascending: false })
          .limit(1);
        return Array.isArray(data) && data.length > 0 ? (data[0] as { url?: string }).url ?? null : null;
      }, null);

      if (!sampleAsset) {
        checks.push({
          id: 'storage.media',
          label: 'Bucket media',
          group: 'storage',
          severity: 'info',
          detail: 'Aún no se han subido imágenes.',
          suggestion: 'Sube una imagen desde /admin/medios para validar el bucket.',
          latencyMs: Date.now() - start,
        });
      } else {
        const ok = await safeRun(async () => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 4000);
          try {
            const res = await fetch(sampleAsset, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
            return res.ok;
          } finally {
            clearTimeout(timer);
          }
        }, false);
        checks.push({
          id: 'storage.media',
          label: 'Bucket media (acceso público)',
          group: 'storage',
          severity: ok ? 'ok' : 'error',
          detail: ok ? 'Última imagen accesible vía HTTPS.' : 'La última imagen no responde con 200.',
          suggestion: ok
            ? undefined
            : 'Verifica permisos del bucket en InsForge Storage o que la URL pública siga vigente.',
          latencyMs: Date.now() - start,
        });
      }
    }

    // ---- CONTENT QUALITY -----------------------------------------------
    {
      const start = Date.now();
      const stats = await safeRun(async () => {
        const [posts, sections, settings, mediaNoAlt] = await Promise.all([
          client.database
            .from('blog_posts')
            .select('slug, title, description, cover_url, published, body_md', { count: 'exact' })
            .limit(500),
          client.database
            .from('home_sections')
            .select('id, kind, title, image_url, visible', { count: 'exact' })
            .limit(500),
          client.database.from('configuracion').select('clave, valor').limit(500),
          client.database.from('media_assets').select('id, alt', { count: 'exact' }).limit(500),
        ]);
        return { posts, sections, settings, mediaNoAlt };
      }, null);

      if (stats?.posts && !stats.posts.error) {
        const rows = (stats.posts.data ?? []) as Array<{
          published?: boolean;
          description?: string;
          cover_url?: string | null;
          body_md?: string;
          title?: string;
        }>;
        const total = rows.length;
        const published = rows.filter((p) => p.published).length;
        const noDescription = rows.filter((p) => !(p.description ?? '').trim()).length;
        const noCover = rows.filter((p) => !(p.cover_url ?? '').trim()).length;
        const shortBody = rows.filter((p) => (p.body_md ?? '').length < 280).length;
        checks.push({
          id: 'content.blog',
          label: 'Contenido del blog',
          group: 'content',
          severity: total === 0 ? 'info' : noDescription > 0 || noCover > 0 ? 'warn' : 'ok',
          detail:
            total === 0
              ? 'Sin entradas en la base. Aún se sirven los .md como fallback.'
              : `${published}/${total} publicadas. ${noCover} sin portada, ${noDescription} sin descripción, ${shortBody} con cuerpo corto.`,
          suggestion:
            total === 0
              ? 'Importa los .md desde /admin/blog → "Importar .md".'
              : noCover > 0 || noDescription > 0
                ? 'Completa portada y descripción en cada entrada para mejorar SEO y compartibilidad.'
                : undefined,
        });
      }

      if (stats?.sections && !stats.sections.error) {
        const rows = (stats.sections.data ?? []) as Array<{
          visible?: boolean;
          title?: string | null;
          image_url?: string | null;
          kind?: string;
        }>;
        const total = rows.length;
        const visible = rows.filter((s) => s.visible).length;
        const noTitle = rows.filter((s) => !(s.title ?? '').trim()).length;
        const visualKinds = new Set(['banner', 'hero', 'cta']);
        const visualMissingImage = rows.filter(
          (s) => visualKinds.has(s.kind ?? '') && !(s.image_url ?? '').trim(),
        ).length;
        checks.push({
          id: 'content.home',
          label: 'Secciones de la pantalla principal',
          group: 'content',
          severity:
            total === 0 ? 'info' : visualMissingImage > 0 || noTitle > 0 ? 'warn' : 'ok',
          detail:
            total === 0
              ? 'No hay secciones dinámicas creadas. Se renderiza la home estática.'
              : `${visible}/${total} visibles. ${noTitle} sin título, ${visualMissingImage} banners/hero/CTA sin imagen.`,
          suggestion:
            total === 0
              ? 'Crea tu primera sección desde /admin/home.'
              : visualMissingImage > 0
                ? 'Asigna una imagen a cada banner/hero/CTA visible.'
                : undefined,
        });
      }

      if (stats?.settings && !stats.settings.error) {
        const map = new Map<string, string>();
        for (const row of (stats.settings.data ?? []) as Array<{ clave?: string; valor?: string }>) {
          if (row.clave) map.set(row.clave, row.valor ?? '');
        }
        const missing = REQUIRED_SETTINGS.filter((k) => !(map.get(k) ?? '').trim());
        checks.push({
          id: 'content.settings',
          label: 'Ajustes globales',
          group: 'content',
          severity: missing.length === 0 ? 'ok' : 'warn',
          detail:
            missing.length === 0
              ? 'Todas las claves recomendadas están configuradas.'
              : `Faltan: ${missing.join(', ')}.`,
          suggestion:
            missing.length === 0
              ? undefined
              : 'Completa estas claves en /admin/home (sección Hero/Footer/Redes).',
        });
      }

      if (stats?.mediaNoAlt && !stats.mediaNoAlt.error) {
        const rows = (stats.mediaNoAlt.data ?? []) as Array<{ alt?: string | null }>;
        const total = rows.length;
        const noAlt = rows.filter((m) => !(m.alt ?? '').trim()).length;
        if (total > 0) {
          checks.push({
            id: 'content.media-alt',
            label: 'Texto alternativo de imágenes',
            group: 'content',
            severity: noAlt === 0 ? 'ok' : 'warn',
            detail: `${total - noAlt}/${total} con descripción (alt).`,
            suggestion:
              noAlt === 0
                ? undefined
                : 'Añade alt-text desde /admin/medios para mejorar accesibilidad y SEO.',
          });
        }
      }

      checks.push({
        id: 'content.duration',
        label: 'Tiempo de chequeo de contenido',
        group: 'content',
        severity: 'info',
        detail: `${Date.now() - start} ms`,
      });
    }

    // ---- ENV VARS -------------------------------------------------------
    const envExpected: Array<{ name: string; required: boolean; suggestion: string }> = [
      {
        name: 'ADMIN_SESSION_SECRET',
        required: process.env.NODE_ENV === 'production',
        suggestion: 'Genera un secreto largo (≥32 bytes) y configúralo en Vercel para firmar la cookie de admin.',
      },
      {
        name: 'NEXT_PUBLIC_INSFORGE_URL',
        required: true,
        suggestion: 'URL base del backend InsForge. Sin esto se usa un fallback hardcodeado.',
      },
      {
        name: 'NEXT_PUBLIC_INSFORGE_ANON_KEY',
        required: true,
        suggestion: 'Clave anónima de InsForge. Sin esto se usa un fallback hardcodeado.',
      },
      {
        name: 'INSFORGE_API_KEY',
        required: false,
        suggestion: 'Clave privada con permisos elevados — opcional pero recomendado para escrituras admin.',
      },
      {
        name: 'ADMIN_PASSWORD',
        required: false,
        suggestion: 'Necesario para el login fallback de /admin/login si no usas usuarios en DB.',
      },
      {
        name: 'MERCADOPAGO_ACCESS_TOKEN',
        required: false,
        suggestion: 'Sin esto el checkout MP responderá 503. Configúralo en Vercel → Environment Variables.',
      },
    ];

    for (const e of envExpected) {
      const present = !!process.env[e.name];
      checks.push({
        id: `env.${e.name}`,
        label: e.name,
        group: 'env',
        severity: present ? 'ok' : e.required ? 'error' : 'warn',
        detail: present ? 'configurada' : 'no configurada',
        suggestion: present ? undefined : e.suggestion,
      });
    }

    // ---- INTEGRATIONS (light HEAD probes) -------------------------------
    // Diagnostics intentionally avoid the project-wide hardcoded fallback URL:
    // when NEXT_PUBLIC_INSFORGE_URL is missing we want the report to surface
    // that misconfiguration explicitly instead of silently probing a default
    // host that may be wrong for this deployment.
    const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? '';
    const externals: Array<{ id: string; url: string; label: string }> = [
      ...(insforgeUrl ? [{ id: 'int.insforge', url: insforgeUrl, label: 'InsForge' }] : []),
      { id: 'int.cloudflare', url: 'https://challenges.cloudflare.com', label: 'Cloudflare Turnstile' },
    ];
    if (!insforgeUrl) {
      checks.push({
        id: 'int.insforge',
        label: 'InsForge',
        group: 'integrations',
        severity: 'error',
        detail: 'NEXT_PUBLIC_INSFORGE_URL no está configurada — no se puede probar conectividad.',
        suggestion: 'Define NEXT_PUBLIC_INSFORGE_URL en Vercel y redeploya.',
      });
    }
    await Promise.all(
      externals.map(async (e) => {
        const start = Date.now();
        const ok = await safeRun(async () => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          try {
            const res = await fetch(e.url, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
            return res.ok || res.status < 500;
          } finally {
            clearTimeout(timer);
          }
        }, false);
        const latencyMs = Date.now() - start;
        checks.push({
          id: e.id,
          label: e.label,
          group: 'integrations',
          severity: ok ? (latencyMs > 1500 ? 'warn' : 'ok') : 'error',
          detail: `${latencyMs} ms`,
          suggestion: ok ? undefined : 'Servicio inalcanzable desde el servidor. Verifica DNS/firewall o la URL configurada.',
          latencyMs,
        });
      }),
    );

    // ---- PAYMENTS (Mercado Pago dedicated) ------------------------------
    // Replaces the generic HEAD probe with the authenticated probe in
    // src/lib/mercadopago.ts so we can distinguish "API alive but token
    // wrong" from "API unreachable" — the HEAD probe couldn't tell.
    await safeRun(async () => {
      const probe = await probeMercadoPago({ timeoutMs: 6000 });
      const latencyMs = probe.latencyMs ?? undefined;

      // Latency check
      let latSeverity: Severity = 'info';
      if (probe.status === 'ok') {
        if (probe.latencyMs == null) latSeverity = 'info';
        else if (probe.latencyMs < 500) latSeverity = 'ok';
        else if (probe.latencyMs < 1500) latSeverity = 'warn';
        else latSeverity = 'error';
      } else if (probe.status === 'unreachable') {
        latSeverity = 'error';
      } else if (probe.status === 'invalid_token') {
        latSeverity = 'error';
      } else if (probe.status === 'unconfigured') {
        latSeverity = 'warn';
      }
      checks.push({
        id: 'pay.mp.latency',
        label: 'Latencia API MercadoPago',
        group: 'payments',
        severity: latSeverity,
        detail: probe.message,
        suggestion:
          latSeverity === 'error'
            ? 'Revisa estado en /admin/pagos. Si persiste, contactar soporte de MP.'
            : latSeverity === 'warn'
              ? 'Latencia elevada. Considera reintentar más tarde o revisar /admin/pagos.'
              : undefined,
        latencyMs,
      });

      // Mode check (production / sandbox / unknown)
      const modeSeverity: Severity =
        probe.mode === 'production' ? 'ok' : probe.mode === 'sandbox' ? 'warn' : 'info';
      const modeLabel =
        probe.mode === 'production'
          ? 'Producción'
          : probe.mode === 'sandbox'
            ? 'Demo / Sandbox'
            : 'Desconocido';
      checks.push({
        id: 'pay.mp.mode',
        label: `Modo MercadoPago: ${modeLabel}`,
        group: 'payments',
        severity: modeSeverity,
        detail:
          probe.mode === 'sandbox'
            ? 'Token con prefijo TEST-: ningún cobro será real.'
            : probe.mode === 'production'
              ? 'Token APP_USR-: cobros reales.'
              : 'Sin token o prefijo no reconocido.',
        suggestion:
          probe.mode === 'sandbox'
            ? 'Cuando estés listo para cobrar de verdad, reemplaza por un token APP_USR- en Vercel.'
            : probe.mode === 'unknown' && !probe.hasAccessToken
              ? 'Define MERCADO_PAGO_ACCESS_TOKEN en Vercel para habilitar cobros.'
              : undefined,
      });
    }, undefined);

    // ---- SUMMARY --------------------------------------------------------
    const counts = checks.reduce(
      (acc, c) => {
        acc[c.severity] = (acc[c.severity] ?? 0) + 1;
        return acc;
      },
      { ok: 0, warn: 0, error: 0, info: 0 } as Record<Severity, number>,
    );
    const overall: Severity = counts.error > 0 ? 'error' : counts.warn > 0 ? 'warn' : 'ok';

    return NextResponse.json(
      {
        overall,
        counts,
        checks,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return adminError(err, 'ESTADO_FAILED');
  }
}
