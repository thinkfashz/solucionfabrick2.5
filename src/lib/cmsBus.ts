import 'server-only';
import { EventEmitter } from 'node:events';

/**
 * In-process pub/sub for CMS change events.
 *
 * Lives on the server so that admin save endpoints can `publish()` and the SSE
 * route (`/api/cms/events`) can `subscribe()` and forward to connected clients.
 *
 * Scope intentionally tiny:
 *   - single Node process (works on Vercel per-instance; multi-instance is fine
 *     because each public client is connected to one instance and the same
 *     instance handles its admin saves *or* the client just reconnects after
 *     `router.refresh()` and picks up the new content from the DB anyway).
 *   - no persistence, no replay; events are advisory triggers for refresh.
 *
 * If the app ever moves to multi-region SSE delivery, swap this for a Redis
 * pub/sub or InsForge realtime channel without changing any callers.
 */

export type CmsTopic = 'blog' | 'home' | 'settings' | 'media';

export interface CmsEvent {
  topic: CmsTopic;
  /** Free-form action label, useful for client logging only. */
  action: string;
  /** Optional opaque id of the affected row. */
  id?: string;
  /** Optional path(s) the public site should refresh. Defaults to '/'. */
  paths?: string[];
  /** Server-issued event timestamp (ms since epoch). */
  ts: number;
}

type Listener = (event: CmsEvent) => void;

// Reuse the emitter across HMR reloads in dev so subscribers don't get orphaned.
const GLOBAL_KEY = '__insforge_cms_bus__';
type GlobalWithBus = typeof globalThis & { [GLOBAL_KEY]?: EventEmitter };

function getEmitter(): EventEmitter {
  const g = globalThis as GlobalWithBus;
  if (!g[GLOBAL_KEY]) {
    const emitter = new EventEmitter();
    // Allow many concurrent SSE subscribers without a noisy warning. The
    // listener count is naturally bounded by connected admin/public clients.
    emitter.setMaxListeners(0);
    g[GLOBAL_KEY] = emitter;
  }
  return g[GLOBAL_KEY]!;
}

/** Publish a CMS change. Never throws. */
export function publishCmsEvent(input: Omit<CmsEvent, 'ts'>): void {
  try {
    const ev: CmsEvent = { ...input, ts: Date.now() };
    getEmitter().emit('event', ev);
  } catch {
    // best effort — pub/sub is advisory.
  }
}

/** Subscribe to all CMS events. Returns an unsubscribe function. */
export function subscribeCmsEvents(listener: Listener): () => void {
  const emitter = getEmitter();
  emitter.on('event', listener);
  return () => {
    try {
      emitter.off('event', listener);
    } catch {
      /* noop */
    }
  };
}
