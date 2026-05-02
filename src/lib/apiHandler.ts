import 'server-only';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminInsforge } from './adminApi';

/**
 * Monitor de Errores — wrapper para rutas /api/*.
 *
 * Envuelve el handler de una API route. Si el handler lanza una excepción:
 *   1. Persiste el error en la tabla `admin_error_logs` (best-effort: si la
 *      escritura a InsForge también falla, sólo se hace `console.error`).
 *   2. Devuelve un JSON limpio con `status` 500 — esto evita que el cliente
 *      reciba HTML (`<!DOCTYPE …>`) y obtenga el clásico "Unexpected token '<'"
 *      al hacer `res.json()`.
 *
 * Uso:
 *
 *   // src/app/api/algo/route.ts
 *   export const POST = withErrorLogging(async (request) => {
 *     const body = await request.json();
 *     // ... lógica que puede tirar
 *     return NextResponse.json({ ok: true });
 *   });
 *
 * También puede envolverse manualmente sobre un handler existente:
 *
 *   async function handler(req: NextRequest) { ... }
 *   export const GET = withErrorLogging(handler);
 *
 * El wrapper sólo intercepta excepciones no controladas. Si tu handler ya
 * devuelve `NextResponse.json({error}, {status: 500})` por su cuenta, ese
 * caso NO se registra (es un error "manejado").
 */

type RouteHandler<Ctx = unknown> = (
  request: NextRequest,
  context: Ctx,
) => Promise<Response> | Response;

interface LogPayload {
  endpoint: string;
  method: string;
  payload: unknown;
  error_message: string;
  status_code: number;
}

/**
 * Lee el body de la request de forma segura para incluirlo en el log.
 * Sólo se intenta para métodos con body (POST/PUT/PATCH/DELETE) y nunca
 * lanza — devuelve `null` si no se puede leer (por ejemplo, ya consumido
 * o no es JSON parseable).
 */
async function safeReadBody(request: NextRequest): Promise<unknown> {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method === 'GET' || method === 'HEAD') return null;
  try {
    const cloned = request.clone();
    const text = await cloned.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // Devuelve el texto truncado para evitar guardar payloads gigantes.
      return text.length > 2000 ? text.slice(0, 2000) + '…' : text;
    }
  } catch {
    return null;
  }
}

async function persistErrorLog(entry: LogPayload): Promise<void> {
  try {
    const client = getAdminInsforge();
    const { error } = await client.database.from('admin_error_logs').insert([
      {
        endpoint: entry.endpoint,
        method: entry.method,
        payload: entry.payload,
        error_message: entry.error_message,
        status_code: entry.status_code,
      },
    ]);
    if (error) {
      // No tirar — la tabla puede no existir todavía en deployments
      // antiguos. Sólo registrar a la consola para Vercel.
      console.error('[withErrorLogging] failed to persist error log', error);
    }
  } catch (err) {
    console.error('[withErrorLogging] persistence threw', err);
  }
}

export function withErrorLogging<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
): RouteHandler<Ctx> {
  return async function wrapped(request: NextRequest, context: Ctx) {
    try {
      return await handler(request, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error && error.stack ? `\n${error.stack}` : '';

      // Always log to server console for Vercel.
      console.error(
        `[withErrorLogging] ${request.method} ${request.url} → ${message}${stack}`,
      );

      const payload = await safeReadBody(request);
      const url = new URL(request.url);
      // Best-effort persistence; never let it block the response.
      await persistErrorLog({
        endpoint: url.pathname + url.search,
        method: request.method ?? 'UNKNOWN',
        payload,
        error_message: message,
        status_code: 500,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Error interno. Ha sido reportado al panel de administración.',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 },
      );
    }
  };
}
