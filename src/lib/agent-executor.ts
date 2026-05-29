/**
 * agent-executor.ts
 * All tool execution logic for the AI Agent.
 * Accepts an optional BrowserSession for persistent navigation across tool calls.
 */

import type { BrowserSession, EmitFn } from '@/lib/agent-browser';

/* ─── InsForge DB helpers ─────────────────────────────────────────────── */
const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return (
    process.env.INSFORGE_API_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'ik_7e23032539c2dc64d5d27ca29d07b928'
  );
}

interface RawSqlResult {
  data?: { rows?: Record<string, unknown>[] };
}

async function rawsql(query: string): Promise<RawSqlResult | null> {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<RawSqlResult>;
  } catch {
    return null;
  }
}

async function getIntegrationCreds(provider: string): Promise<Record<string, string>> {
  const data = await rawsql(
    `SELECT credentials FROM integrations WHERE provider = '${provider}' LIMIT 1;`,
  );
  const row = data?.data?.rows?.[0] as { credentials?: Record<string, string> } | undefined;
  return row?.credentials ?? {};
}

/* ─── Table bootstrap ─────────────────────────────────────────────────── */
export async function ensureAgentTables(): Promise<void> {
  await rawsql(`
    CREATE TABLE IF NOT EXISTS catalogo_productos (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT,
      precio_base NUMERIC(12,2),
      unidad TEXT DEFAULT 'unidad',
      materiales TEXT,
      tiempo_instalacion TEXT,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await rawsql(`
    CREATE TABLE IF NOT EXISTS agente_memoria (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL DEFAULT 'hallazgo',
      titulo TEXT NOT NULL,
      contenido TEXT NOT NULL,
      fuente TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

/* ─── Tool result type ────────────────────────────────────────────────── */
export interface ToolResult {
  content: string;
  screenshot?: string;
  data?: unknown;
}

const ALLOWED_MODIFY_TABLES = new Set([
  'catalogo_productos',
  'agente_memoria',
  'presupuesto_registros',
]);

/* ─── Main tool executor ──────────────────────────────────────────────── */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  serperKey: string | undefined,
  browser?: BrowserSession,
  emit?: EmitFn,
): Promise<ToolResult> {

  /* ── buscar_web ─────────────────────────────────────────────────────── */
  if (name === 'buscar_web') {
    const { searchWeb } = await import('@/lib/playwright-agent');
    const query = String(input.query ?? '');
    const pais = String(input.pais ?? 'cl');
    const result = await searchWeb(query, serperKey, pais);
    if (!result.ok) return { content: `Error al buscar: ${result.error ?? 'desconocido'}` };
    let out = result.answerBox ? `Respuesta directa: ${result.answerBox}\n\n` : '';
    out += result.results
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
      .join('\n\n');
    return { content: out || 'Sin resultados.' };
  }

  /* ── navegar_url ─────────────────────────────────────────────────────── */
  if (name === 'navegar_url') {
    const url = String(input.url ?? '');
    if (browser && emit) {
      let title = '';
      let text = '';
      await browser.withFrames(emit, `Navegando a ${url}`, async () => {
        const result = await browser.navigate(url);
        title = result.title;
        text = result.text;
      });
      return { content: `# ${title}\nURL: ${browser.url}\n\n${text}` };
    }
    // Fallback: stateless
    const { browsePage } = await import('@/lib/playwright-agent');
    const result = await browsePage(url);
    if (result.error) return { content: `Error al navegar a ${url}: ${result.error}` };
    return { content: `# ${result.title}\n\n${result.text}`, screenshot: result.screenshot || undefined };
  }

  /* ── capturar_pantalla ───────────────────────────────────────────────── */
  if (name === 'capturar_pantalla') {
    const url = String(input.url ?? '');
    if (browser && emit) {
      let screenshot = '';
      await browser.withFrames(emit, `Capturando pantalla de ${url}`, async () => {
        await browser.navigate(url);
        screenshot = await browser.screenshot();
      });
      return {
        content: `Captura tomada de: ${url}`,
        screenshot,
      };
    }
    const { browsePage } = await import('@/lib/playwright-agent');
    const result = await browsePage(url);
    if (result.error) return { content: `Error al capturar ${url}: ${result.error}` };
    return { content: `Captura tomada de: ${result.title} (${url})`, screenshot: result.screenshot || undefined };
  }

  /* ── hacer_clic ──────────────────────────────────────────────────────── */
  if (name === 'hacer_clic') {
    if (!browser) return { content: 'Error: hacer_clic requiere tener una página abierta primero. Usa navegar_url.' };
    const target = String(input.objetivo ?? input.selector ?? '');
    if (!target) return { content: 'Error: se requiere objetivo (texto o selector CSS).' };
    let result = '';
    if (emit) {
      await browser.withFrames(emit, `Clic en "${target}"`, async () => {
        result = await browser.click(target);
      });
    } else {
      result = await browser.click(target);
    }
    const text = await browser.getContent();
    return { content: `${result}\n\nContenido tras el clic:\n${text.slice(0, 2000)}` };
  }

  /* ── escribir_en ─────────────────────────────────────────────────────── */
  if (name === 'escribir_en') {
    if (!browser) return { content: 'Error: escribir_en requiere tener una página abierta primero.' };
    const selector = String(input.selector ?? '');
    const texto = String(input.texto ?? '');
    if (!selector || !texto) return { content: 'Error: se requieren selector y texto.' };
    let result = '';
    if (emit) {
      await browser.withFrames(emit, `Escribiendo "${texto}"`, async () => {
        result = await browser.fill(selector, texto);
      });
    } else {
      result = await browser.fill(selector, texto);
    }
    return { content: result };
  }

  /* ── presionar_tecla ─────────────────────────────────────────────────── */
  if (name === 'presionar_tecla') {
    if (!browser) return { content: 'Error: presionar_tecla requiere tener una página abierta primero.' };
    const tecla = String(input.tecla ?? 'Enter');
    let result = '';
    if (emit) {
      await browser.withFrames(emit, `Tecla ${tecla}`, async () => {
        result = await browser.pressKey(tecla);
      });
    } else {
      result = await browser.pressKey(tecla);
    }
    const text = await browser.getContent();
    return { content: `${result}\n\nContenido actual:\n${text.slice(0, 2000)}` };
  }

  /* ── desplazar_pagina ────────────────────────────────────────────────── */
  if (name === 'desplazar_pagina') {
    if (!browser) return { content: 'Error: desplazar_pagina requiere tener una página abierta.' };
    const dir = (String(input.direccion ?? 'abajo') as 'arriba' | 'abajo');
    const px = Number(input.pixeles ?? 600);
    const result = await browser.scroll(dir, px);
    if (emit) {
      const data = await browser.screenshot();
      emit({ type: 'frame', url: browser.url, data, action: result, final: true });
    }
    const text = await browser.getContent();
    return { content: `${result}\n\nContenido visible:\n${text.slice(0, 2000)}` };
  }

  /* ── leer_pagina_actual ──────────────────────────────────────────────── */
  if (name === 'leer_pagina_actual') {
    if (!browser || browser.url === 'about:blank') {
      return { content: 'No hay página abierta. Usa navegar_url primero.' };
    }
    const text = await browser.getContent();
    return { content: `Contenido actual de ${browser.url}:\n\n${text}` };
  }

  /* ── consultar_bd ────────────────────────────────────────────────────── */
  if (name === 'consultar_bd') {
    const query = String(input.query ?? '').trim();
    if (!query.toLowerCase().startsWith('select')) {
      return { content: 'Error: consultar_bd solo permite SELECT. Para modificar datos usa modificar_bd.' };
    }
    const result = await rawsql(query);
    if (!result) return { content: 'Error: no se pudo ejecutar la consulta.' };
    const rows = result.data?.rows ?? [];
    if (rows.length === 0) return { content: 'La consulta no retornó filas.' };
    return { content: `${rows.length} fila(s):\n\n${JSON.stringify(rows, null, 2)}`, data: rows };
  }

  /* ── modificar_bd ────────────────────────────────────────────────────── */
  if (name === 'modificar_bd') {
    const sql = String(input.sql ?? '').trim();
    const tabla = String(input.tabla ?? '').toLowerCase().trim();
    if (!ALLOWED_MODIFY_TABLES.has(tabla)) {
      return { content: `Error: tabla '${tabla}' no permitida. Permitidas: ${[...ALLOWED_MODIFY_TABLES].join(', ')}.` };
    }
    if (sql.toLowerCase().startsWith('select')) {
      return { content: 'Error: usa consultar_bd para SELECT.' };
    }
    const result = await rawsql(sql);
    if (!result) return { content: 'Error al ejecutar la modificación.' };
    return { content: `Modificación ejecutada en tabla ${tabla}.`, data: result };
  }

  /* ── crear_producto ──────────────────────────────────────────────────── */
  if (name === 'crear_producto') {
    const nombre = String(input.nombre ?? '').trim();
    if (!nombre) return { content: 'Error: se requiere nombre.' };
    const esc = (v: unknown) => v ? `'${String(v).replace(/'/g, "''")}'` : 'NULL';
    const sql = `
      INSERT INTO catalogo_productos (nombre, descripcion, categoria, precio_base, unidad, materiales, tiempo_instalacion)
      VALUES (${esc(nombre)}, ${esc(input.descripcion)}, ${esc(input.categoria)},
              ${input.precio_base ? Number(input.precio_base) : 'NULL'},
              ${esc(input.unidad ?? 'unidad')}, ${esc(input.materiales)}, ${esc(input.tiempo_instalacion)})
      RETURNING id, nombre, categoria, precio_base;
    `;
    const result = await rawsql(sql);
    if (!result) return { content: 'Error al crear el producto.' };
    return { content: `Producto creado: ${JSON.stringify(result.data?.rows?.[0])}`, data: result.data?.rows?.[0] };
  }

  /* ── listar_productos ────────────────────────────────────────────────── */
  if (name === 'listar_productos') {
    const conds: string[] = [];
    if (input.categoria) conds.push(`categoria = '${String(input.categoria).replace(/'/g, "''")}'`);
    if (input.activo !== undefined && input.activo !== '') {
      conds.push(`activo = ${String(input.activo).toLowerCase() === 'false' ? 'FALSE' : 'TRUE'}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const result = await rawsql(
      `SELECT id, nombre, descripcion, categoria, precio_base, unidad, activo FROM catalogo_productos ${where} ORDER BY created_at DESC LIMIT 50;`
    );
    if (!result) return { content: 'Error al listar productos.' };
    const rows = result.data?.rows ?? [];
    return { content: rows.length ? `${rows.length} producto(s):\n\n${JSON.stringify(rows, null, 2)}` : 'Catálogo vacío.', data: rows };
  }

  /* ── guardar_hallazgo ────────────────────────────────────────────────── */
  if (name === 'guardar_hallazgo') {
    const tipo = String(input.tipo ?? 'hallazgo').replace(/'/g, "''");
    const titulo = String(input.titulo ?? '').replace(/'/g, "''");
    const contenido = String(input.contenido ?? '').replace(/'/g, "''");
    const fuente = input.fuente ? `'${String(input.fuente).replace(/'/g, "''")}'` : 'NULL';
    if (!titulo || !contenido) return { content: 'Error: se requieren titulo y contenido.' };
    const result = await rawsql(
      `INSERT INTO agente_memoria (tipo, titulo, contenido, fuente) VALUES ('${tipo}', '${titulo}', '${contenido}', ${fuente}) RETURNING id, tipo, titulo;`
    );
    if (!result) return { content: 'Error al guardar.' };
    return { content: `Guardado en memoria: ${JSON.stringify(result.data?.rows?.[0])}`, data: result.data?.rows?.[0] };
  }

  /* ── leer_memoria ────────────────────────────────────────────────────── */
  if (name === 'leer_memoria') {
    const conds: string[] = [];
    if (input.tipo) conds.push(`tipo = '${String(input.tipo).replace(/'/g, "''")}'`);
    const limite = Math.min(Number(input.limite ?? 20), 50);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const result = await rawsql(
      `SELECT id, tipo, titulo, contenido, fuente, created_at FROM agente_memoria ${where} ORDER BY created_at DESC LIMIT ${limite};`
    );
    if (!result) return { content: 'Error al leer memoria.' };
    const rows = result.data?.rows ?? [];
    return { content: rows.length ? `${rows.length} entrada(s):\n\n${JSON.stringify(rows, null, 2)}` : 'Memoria vacía.', data: rows };
  }

  /* ── enviar_whatsapp ─────────────────────────────────────────────────── */
  if (name === 'enviar_whatsapp') {
    const creds = await getIntegrationCreds('whatsapp');
    const accessToken = creds.access_token ?? creds.token ?? '';
    const phoneNumberId = creds.phone_number_id ?? creds.phone_id ?? '';
    if (!accessToken || !phoneNumberId) {
      return { content: 'Error: WhatsApp no configurado. Ve a Integraciones → WhatsApp.' };
    }
    const telefono = String(input.telefono ?? '').trim();
    const mensaje = String(input.mensaje ?? '').trim();
    if (!telefono || !mensaje) return { content: 'Error: se requieren telefono y mensaje.' };
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: telefono, type: 'text', text: { body: mensaje } }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.json() as Record<string, unknown>;
      if (!res.ok) return { content: `Error WhatsApp (${res.status}): ${JSON.stringify(body)}` };
      return { content: `Mensaje enviado a ${telefono}. Respuesta: ${JSON.stringify(body)}` };
    } catch (err) {
      return { content: `Error de red WhatsApp: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /* ── enviar_email ────────────────────────────────────────────────────── */
  if (name === 'enviar_email') {
    const creds = await getIntegrationCreds('resend');
    const apiKey = creds.api_key ?? creds.key ?? '';
    const fromEmail = creds.from_email ?? creds.from ?? 'noreply@resend.dev';
    if (!apiKey) return { content: 'Error: Resend no configurado. Ve a Integraciones → Resend.' };
    const para = String(input.para ?? '').trim();
    const asunto = String(input.asunto ?? '').trim();
    const cuerpo_html = String(input.cuerpo_html ?? '').trim();
    if (!para || !asunto || !cuerpo_html) return { content: 'Error: se requieren para, asunto y cuerpo_html.' };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: [para], subject: asunto, html: cuerpo_html }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.json() as Record<string, unknown>;
      if (!res.ok) return { content: `Error Resend (${res.status}): ${JSON.stringify(body)}` };
      return { content: `Email enviado a ${para}. ID: ${String(body.id ?? '')}` };
    } catch (err) {
      return { content: `Error de red Resend: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /* ── buscar_ml ───────────────────────────────────────────────────────── */
  if (name === 'buscar_ml') {
    const query = String(input.query ?? '').trim();
    const limite = Math.min(Number(input.limite ?? 6), 10);
    if (!query) return { content: 'Error: se requiere query.' };
    try {
      const res = await fetch(
        `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=${limite}`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) return { content: `Error MercadoLibre (${res.status})` };
      const data = await res.json() as {
        results?: Array<{ title?: string; price?: number; currency_id?: string; permalink?: string; condition?: string }>;
        paging?: { total?: number };
      };
      const items = data.results ?? [];
      if (!items.length) return { content: `Sin resultados para "${query}" en MercadoLibre Chile.` };
      const formatted = items.map((item, i) =>
        `${i + 1}. **${item.title ?? 'Sin título'}**\n   Precio: ${item.currency_id ?? 'CLP'} ${item.price?.toLocaleString('es-CL') ?? 'N/A'}\n   Condición: ${item.condition ?? 'N/A'}\n   ${item.permalink ?? ''}`
      ).join('\n\n');
      return { content: `${data.paging?.total ?? items.length} resultados en MercadoLibre Chile:\n\n${formatted}`, data: items };
    } catch (err) {
      return { content: `Error MercadoLibre: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /* ── probar_integracion ──────────────────────────────────────────────── */
  if (name === 'probar_integracion') {
    const provider = String(input.provider ?? '').trim();
    if (!provider) return { content: 'Error: se requiere provider.' };
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/admin/integrations/test?provider=${encodeURIComponent(provider)}`, {
        signal: AbortSignal.timeout(20_000),
      });
      const body = await res.json() as Record<string, unknown>;
      return { content: `Test ${provider}:\n\n${JSON.stringify(body, null, 2)}`, data: body };
    } catch (err) {
      return { content: `Error al probar ${provider}: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  return { content: `Herramienta '${name}' no reconocida.` };
}
