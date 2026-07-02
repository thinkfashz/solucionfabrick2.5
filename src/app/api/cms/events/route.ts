import type { NextRequest } from 'next/server';
import { subscribeCmsEvents, type CmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cmsSseEnabled() {
  return process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_CMS_SSE === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_CMS_REALTIME === 'true';
}

/**
 * GET /api/cms/events — Server-Sent Events stream of CMS change notifications.
 *
 * Public endpoint (no auth): events are advisory "something changed, refresh"
 * triggers and contain no sensitive data. In production this route is disabled
 * by default because SSE keeps a Vercel serverless function open and can create
 * timeout noise. Re-enable intentionally with ENABLE_CMS_SSE=true or
 * NEXT_PUBLIC_ENABLE_CMS_REALTIME=true.
 *
 * Protocol when enabled:
 *   event: hello       \n data: {"ts": <ms>}                       \n\n
 *   event: cms-change  \n data: {"topic": "blog", "action": "...", "ts": <ms>}  \n\n
 *   : keep-alive ping every 25s (comment line, ignored by EventSource)
 */
export async function GET(request: NextRequest) {
  if (!cmsSseEnabled()) {
    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream already closed; no-op.
        }
      };

      // Initial hello so the client knows the connection is open.
      send('hello', { ts: Date.now() });

      unsubscribe = subscribeCmsEvents((ev: CmsEvent) => send('cms-change', ev));

      // Keep-alive comment line every 25s — defeats proxy idle timeouts.
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          // Stream closed.
        }
      }, 25_000);

      // Close the stream when the client disconnects.
      const onAbort = () => {
        if (unsubscribe) unsubscribe();
        if (pingInterval) clearInterval(pingInterval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener('abort', onAbort, { once: true });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (pingInterval) clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
