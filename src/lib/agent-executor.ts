/**
 * agent-executor.ts
 * All tool execution logic for the AI Agent.
 * Exported `executeTool` is used by the route handler.
 */

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
  data?: {
    rows?: Record<string, unknown>[];
  };
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

/* ─── Allowed tables for modificar_bd ────────────────────────────────── */
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
    const { browsePage } = await import('@/lib/playwright-agent');
    const url = String(input.url ?? '');
    const result = await browsePage(url);
    if (result.error) return { content: `Error al navegar a ${url}: ${result.error}` };
    return { content: `# ${result.title}\n\n${result.text}` };
  }

  /* ── capturar_pantalla ───────────────────────────────────────────────── */
  if (name === 'capturar_pantalla') {
    const { browsePage } = await import('@/lib/playwright-agent');
    const url = String(input.url ?? '');
    const result = await browsePage(url);
    if (result.error) return { content: `Error al capturar ${url}: ${result.error}` };
    return {
      content: `Captura tomada de: ${result.title} (${result.url})`,
      screenshot: result.screenshot || undefined,
    };
  }

  /* ── consultar_bd ────────────────────────────────────────────────────── */
  if (name === 'consultar_bd') {
    const query = String(input.query ?? '').trim();
    if (!query.toLowerCase().startsWith('select')) {
      return { content: 'Error: consultar_bd solo permite consultas SELECT. Para modificar datos usa modificar_bd.' };
    }
    const result = await rawsql(query);
    if (!result) return { content: 'Error: no se pudo ejecutar la consulta.' };
    const rows = result.data?.rows ?? [];
    if (rows.length === 0) return { content: 'La consulta no retornó filas.' };
    return {
      content: `Se encontraron ${rows.length} fila(s):\n\n${JSON.stringify(rows, null, 2)}`,
      data: rows,
    };
  }

  /* ── modificar_bd ────────────────────────────────────────────────────── */
  if (name === 'modificar_bd') {
    const sql = String(input.sql ?? '').trim();
    const tabla = String(input.tabla ?? '').toLowerCase().trim();

    if (!ALLOWED_MODIFY_TABLES.has(tabla)) {
      return {
        content: `Error: tabla '${tabla}' no permitida. Tablas permitidas: ${[...ALLOWED_MODIFY_TABLES].join(', ')}.`,
      };
    }

    const sqlLower = sql.toLowerCase();
    if (sqlLower.startsWith('select')) {
      return { content: 'Error: usa consultar_bd para SELECT. modificar_bd es para INSERT/UPDATE/DELETE.' };
    }

    const result = await rawsql(sql);
    if (!result) return { content: 'Error al ejecutar la modificación.' };
    return { content: `Modificación ejecutada exitosamente en tabla ${tabla}.`, data: result };
  }

  /* ── crear_producto ──────────────────────────────────────────────────── */
  if (name === 'crear_producto') {
    const nombre = String(input.nombre ?? '').trim();
    if (!nombre) return { content: 'Error: se requiere el campo nombre.' };

    const descripcion = input.descripcion ? `'${String(input.descripcion).replace(/'/g, "''")}'` : 'NULL';
    const categoria = input.categoria ? `'${String(input.categoria).replace(/'/g, "''")}'` : 'NULL';
    const precio_base = input.precio_base ? String(Number(input.precio_base)) : 'NULL';
    const unidad = input.unidad ? `'${String(input.unidad).replace(/'/g, "''")}'` : "'unidad'";
    const materiales = input.materiales ? `'${String(input.materiales).replace(/'/g, "''")}'` : 'NULL';
    const tiempo_instalacion = input.tiempo_instalacion
      ? `'${String(input.tiempo_instalacion).replace(/'/g, "''")}'`
      : 'NULL';
    const nombreEsc = nombre.replace(/'/g, "''");

    const sql = `
      INSERT INTO catalogo_productos (nombre, descripcion, categoria, precio_base, unidad, materiales, tiempo_instalacion)
      VALUES ('${nombreEsc}', ${descripcion}, ${categoria}, ${precio_base}, ${unidad}, ${materiales}, ${tiempo_instalacion})
      RETURNING id, nombre, categoria, precio_base;
    `;

    const result = await rawsql(sql);
    if (!result) return { content: 'Error al crear el producto.' };
    const row = result.data?.rows?.[0];
    return {
      content: `Producto creado exitosamente: ${JSON.stringify(row)}`,
      data: row,
    };
  }

  /* ── listar_productos ────────────────────────────────────────────────── */
  if (name === 'listar_productos') {
    const conditions: string[] = [];
    if (input.categoria) {
      const cat = String(input.categoria).replace(/'/g, "''");
      conditions.push(`categoria = '${cat}'`);
    }
    if (input.activo !== undefined && input.activo !== '') {
      const activoVal = String(input.activo).toLowerCase() === 'false' ? 'FALSE' : 'TRUE';
      conditions.push(`activo = ${activoVal}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT id, nombre, descripcion, categoria, precio_base, unidad, activo FROM catalogo_productos ${where} ORDER BY created_at DESC LIMIT 50;`;

    const result = await rawsql(sql);
    if (!result) return { content: 'Error al listar productos.' };
    const rows = result.data?.rows ?? [];
    if (rows.length === 0) return { content: 'No hay productos en el catálogo.', data: [] };
    return {
      content: `Se encontraron ${rows.length} producto(s):\n\n${JSON.stringify(rows, null, 2)}`,
      data: rows,
    };
  }

  /* ── guardar_hallazgo ────────────────────────────────────────────────── */
  if (name === 'guardar_hallazgo') {
    const tipo = String(input.tipo ?? 'hallazgo').replace(/'/g, "''");
    const titulo = String(input.titulo ?? '').replace(/'/g, "''");
    const contenido = String(input.contenido ?? '').replace(/'/g, "''");
    const fuente = input.fuente ? `'${String(input.fuente).replace(/'/g, "''")}'` : 'NULL';

    if (!titulo || !contenido) {
      return { content: 'Error: se requieren titulo y contenido.' };
    }

    const sql = `
      INSERT INTO agente_memoria (tipo, titulo, contenido, fuente)
      VALUES ('${tipo}', '${titulo}', '${contenido}', ${fuente})
      RETURNING id, tipo, titulo;
    `;

    const result = await rawsql(sql);
    if (!result) return { content: 'Error al guardar el hallazgo.' };
    const row = result.data?.rows?.[0];
    return {
      content: `Hallazgo guardado en memoria: ${JSON.stringify(row)}`,
      data: row,
    };
  }

  /* ── leer_memoria ────────────────────────────────────────────────────── */
  if (name === 'leer_memoria') {
    const conditions: string[] = [];
    if (input.tipo) {
      const tipo = String(input.tipo).replace(/'/g, "''");
      conditions.push(`tipo = '${tipo}'`);
    }
    const limite = Math.min(Number(input.limite ?? 20), 50);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT id, tipo, titulo, contenido, fuente, created_at FROM agente_memoria ${where} ORDER BY created_at DESC LIMIT ${limite};`;

    const result = await rawsql(sql);
    if (!result) return { content: 'Error al leer la memoria.' };
    const rows = result.data?.rows ?? [];
    if (rows.length === 0) return { content: 'No hay entradas en memoria.', data: [] };
    return {
      content: `Se encontraron ${rows.length} entradas en memoria:\n\n${JSON.stringify(rows, null, 2)}`,
      data: rows,
    };
  }

  /* ── enviar_whatsapp ─────────────────────────────────────────────────── */
  if (name === 'enviar_whatsapp') {
    const creds = await getIntegrationCreds('whatsapp');
    const accessToken = creds.access_token ?? creds.token ?? '';
    const phoneNumberId = creds.phone_number_id ?? creds.phone_id ?? '';

    if (!accessToken || !phoneNumberId) {
      return {
        content:
          'Error: WhatsApp no está configurado. Ve a Admin → Integraciones → WhatsApp y agrega access_token y phone_number_id.',
      };
    }

    const telefono = String(input.telefono ?? '').trim();
    const mensaje = String(input.mensaje ?? '').trim();

    if (!telefono || !mensaje) {
      return { content: 'Error: se requieren telefono y mensaje.' };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefono,
            type: 'text',
            text: { body: mensaje },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );

      const body = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        return { content: `Error al enviar WhatsApp (${res.status}): ${JSON.stringify(body)}` };
      }
      return { content: `Mensaje WhatsApp enviado exitosamente a ${telefono}. ID: ${JSON.stringify(body)}` };
    } catch (err) {
      return { content: `Error de red al enviar WhatsApp: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /* ── enviar_email ────────────────────────────────────────────────────── */
  if (name === 'enviar_email') {
    const creds = await getIntegrationCreds('resend');
    const apiKey = creds.api_key ?? creds.key ?? '';
    const fromEmail = creds.from_email ?? creds.from ?? 'noreply@resend.dev';

    if (!apiKey) {
      return {
        content:
          'Error: Resend no está configurado. Ve a Admin → Integraciones → Resend y agrega tu api_key.',
      };
    }

    const para = String(input.para ?? '').trim();
    const asunto = String(input.asunto ?? '').trim();
    const cuerpo_html = String(input.cuerpo_html ?? '').trim();

    if (!para || !asunto || !cuerpo_html) {
      return { content: 'Error: se requieren para, asunto y cuerpo_html.' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [para],
          subject: asunto,
          html: cuerpo_html,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const body = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        return { content: `Error al enviar email (${res.status}): ${JSON.stringify(body)}` };
      }
      return { content: `Email enviado exitosamente a ${para}. ID: ${String(body.id ?? '')}` };
    } catch (err) {
      return { content: `Error de red al enviar email: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /* ── buscar_ml ───────────────────────────────────────────────────────── */
  if (name === 'buscar_ml') {
    const query = String(input.query ?? '').trim();
    const limite = Math.min(Number(input.limite ?? 6), 10);

    if (!query) return { content: 'Error: se requiere el campo query.' };

    try {
      const url = `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=${limite}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        return { content: `Error al buscar en MercadoLibre (${res.status})` };
      }

      const data = await res.json() as {
        results?: Array<{
          title?: string;
          price?: number;
          currency_id?: string;
          permalink?: string;
          condition?: string;
          available_quantity?: number;
        }>;
        paging?: { total?: number };
      };

      const items = data.results ?? [];
      if (items.length === 0) return { content: `No se encontraron resultados para "${query}" en MercadoLibre Chile.` };

      const formatted = items
        .map(
          (item, i) =>
            `${i + 1}. **${item.title ?? 'Sin título'}**\n   Precio: ${item.currency_id ?? 'CLP'} ${item.price?.toLocaleString('es-CL') ?? 'N/A'}\n   Condición: ${item.condition ?? 'N/A'}\n   Link: ${item.permalink ?? 'N/A'}`,
        )
        .join('\n\n');

      return {
        content: `Se encontraron ${data.paging?.total ?? items.length} resultados en MercadoLibre Chile. Mostrando ${items.length}:\n\n${formatted}`,
        data: items,
      };
    } catch (err) {
      return { content: `Error al buscar en MercadoLibre: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /* ── probar_integracion ──────────────────────────────────────────────── */
  if (name === 'probar_integracion') {
    const provider = String(input.provider ?? '').trim();
    if (!provider) return { content: 'Error: se requiere el campo provider.' };

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000';
      const res = await fetch(
        `${baseUrl}/api/admin/integrations/test?provider=${encodeURIComponent(provider)}`,
        { signal: AbortSignal.timeout(20_000) },
      );

      const body = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        return { content: `Error al probar ${provider} (${res.status}): ${JSON.stringify(body)}` };
      }
      return {
        content: `Resultado de prueba para ${provider}:\n\n${JSON.stringify(body, null, 2)}`,
        data: body,
      };
    } catch (err) {
      return {
        content: `Error al probar integración ${provider}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { content: `Herramienta '${name}' no reconocida.` };
}
