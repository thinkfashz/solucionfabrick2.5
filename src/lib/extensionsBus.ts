import 'server-only';
import crypto from 'node:crypto';
import { getAdminInsforge } from '@/lib/adminApi';

/**
 * Marketplace extensions runtime.
 *
 * Cuando una extensión queda instalada en `app_extensions`, sus
 * `extension_hooks` se evalúan cada vez que el sistema dispara un
 * evento (`order.created`, `product.after_create`, etc). Este módulo
 * expone:
 *
 *   dispatchHook(event, payload)
 *     → Lee los hooks habilitados para el evento, los ordena por
 *       `priority` (ascendente: menor = corre antes) y dispara cada
 *       handler. El despacho es siempre fire-and-forget desde el
 *       caller — la función nunca lanza para no romper el flujo
 *       principal del negocio.
 *
 * Cada hook tiene `handler` con uno de estos formatos:
 *   - `https://...`           → webhook saliente firmado HMAC-SHA256 con
 *                                config.secret en `x-fabrick-signature`
 *                                (formato `sha256=<hex>`).
 *   - `internal:<name>`       → función registrada en INTERNAL_HANDLERS.
 *
 * Errores individuales NO abortan el resto: cada hook se aísla en su
 * propio try/catch para que una extensión rota no derribe a las demás.
 */

const FETCH_TIMEOUT_MS = 8_000;

export type HookEvent =
  | 'order.created'
  | 'order.paid'
  | 'order.cancelled'
  | 'product.after_create'
  | 'product.after_update'
  | 'checkout.before_pay'
  | 'customer.signup';

interface HookRow {
  id: string;
  extension_id: string;
  hook: string;
  handler: string;
  enabled: boolean | null;
  priority: number | null;
  config: Record<string, unknown> | null;
}

type InternalHandler = (payload: unknown, config: Record<string, unknown>) => Promise<void>;

/**
 * Registry of server-side internal handlers. Marketplace extensions can
 * register a `handler: 'internal:<name>'` and the runtime will look it
 * up here. We expose `registerInternalHandler` so other modules can
 * extend the registry without touching this file.
 */
const INTERNAL_HANDLERS = new Map<string, InternalHandler>();

export function registerInternalHandler(name: string, fn: InternalHandler): void {
  INTERNAL_HANDLERS.set(name, fn);
}

async function fetchHooks(event: HookEvent): Promise<HookRow[]> {
  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('extension_hooks')
      .select('id, extension_id, hook, handler, enabled, priority, config')
      .eq('hook', event)
      .eq('enabled', true);
    if (error || !Array.isArray(data)) return [];
    return (data as HookRow[]).sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  } catch {
    return [];
  }
}

async function callWebhook(
  url: string,
  event: HookEvent,
  payload: unknown,
  config: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ event, payload, ts: new Date().toISOString() });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'fabrick-extensions/1.0',
    'x-fabrick-event': event,
  };
  // HMAC signature is opt-in per hook (config.secret). When absent we
  // still POST but without a signature — the receiver is expected to
  // require one anyway.
  const secret = typeof config.secret === 'string' ? (config.secret as string) : null;
  if (secret) {
    const sig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    headers['x-fabrick-signature'] = `sha256=${sig}`;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    await fetch(url, { method: 'POST', headers, body, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dispatches an event to every enabled hook. Returns the count of
 * handlers that completed without throwing. This function is
 * fire-and-forget from the caller's perspective: it only resolves
 * once all hooks have settled (or timed out), but never rejects.
 */
export async function dispatchHook(event: HookEvent, payload: unknown): Promise<number> {
  const hooks = await fetchHooks(event);
  if (hooks.length === 0) return 0;

  let ok = 0;
  await Promise.all(
    hooks.map(async (h) => {
      const config = (h.config && typeof h.config === 'object' ? h.config : {}) as Record<string, unknown>;
      try {
        if (h.handler.startsWith('http://') || h.handler.startsWith('https://')) {
          await callWebhook(h.handler, event, payload, config);
          ok += 1;
          return;
        }
        if (h.handler.startsWith('internal:')) {
          const name = h.handler.slice('internal:'.length);
          const fn = INTERNAL_HANDLERS.get(name);
          if (fn) {
            await fn(payload, config);
            ok += 1;
          }
          return;
        }
        // Unknown handler shape — ignore to avoid breaking existing extensions.
      } catch {
        /* isolate failure per-hook */
      }
    }),
  );
  return ok;
}

/**
 * Helper for callers that want fire-and-forget semantics without
 * awaiting. Catches the (impossible) rejection silently.
 */
export function dispatchHookAsync(event: HookEvent, payload: unknown): void {
  void dispatchHook(event, payload).catch(() => {});
}
