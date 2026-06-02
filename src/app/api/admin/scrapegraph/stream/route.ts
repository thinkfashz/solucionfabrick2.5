export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { smartScrape, searchAndScrape, batchScrape, resolveAiConfig, resolveSerperKey } from '@/lib/scrapegraph';
import { resolveProviderConfig } from '@/lib/resolveAiConfig';
import type { AiProvider } from '@/lib/resolveAiConfig';

type SseEvent =
  | { type: 'progress'; step: string }
  | { type: 'screenshot'; b64: string; url: string }
  | { type: 'result'; data: unknown; provider: string; modelo: string; duration_ms: number }
  | { type: 'error'; message: string }
  | { type: 'done' };

interface StreamBody {
  mode: 'smart' | 'search' | 'batch';
  url?: string;
  urls?: string[];
  query?: string;
  prompt: string;
  outputSchema?: string;
  provider?: string;
  modelo?: string;
  maxPages?: number;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  let body: StreamBody;
  try {
    body = (await request.json()) as StreamBody;
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'Body inválido' })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
    );
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(evt: SseEvent) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(evt)}\n\n`));
      }

      try {
        send({ type: 'progress', step: 'Resolviendo proveedor de IA…' });

        let aiConfig = null;
        if (body.provider && body.provider !== 'auto') {
          aiConfig = await resolveProviderConfig(body.provider as AiProvider, body.modelo ?? '');
        }
        if (!aiConfig) {
          aiConfig = await resolveAiConfig();
        }
        if (!aiConfig) {
          send({ type: 'error', message: 'Sin API key de IA configurada. Ve a Centro de Integraciones.' });
          send({ type: 'done' });
          controller.close();
          return;
        }

        send({ type: 'progress', step: `Proveedor: ${aiConfig.provider} · ${aiConfig.modelo}` });
        send({ type: 'progress', step: 'Iniciando navegador web rápido (Cheerio/Edge)…' });

        const onProgress = (msg: string) => send({ type: 'progress', step: msg });
        const onScreenshot = (b64: string, url: string) => send({ type: 'screenshot', b64, url });

        const t0 = Date.now();
        let result: unknown = null;

        if (body.mode === 'smart') {
          if (!body.url) { send({ type: 'error', message: 'Falta URL' }); send({ type: 'done' }); controller.close(); return; }
          const r = await smartScrape({ url: body.url, prompt: body.prompt, outputSchema: body.outputSchema, aiConfig, onProgress, onScreenshot });
          result = r.data;
        } else if (body.mode === 'search') {
          if (!body.query) { send({ type: 'error', message: 'Falta query' }); send({ type: 'done' }); controller.close(); return; }
          const serperKey = await resolveSerperKey();
          const r = await searchAndScrape({ query: body.query, prompt: body.prompt, maxPages: body.maxPages ?? 3, serperKey, aiConfig, onProgress, onScreenshot });
          result = r.results;
        } else if (body.mode === 'batch') {
          if (!body.urls?.length) { send({ type: 'error', message: 'Falta URLs' }); send({ type: 'done' }); controller.close(); return; }
          const r = await batchScrape({ urls: body.urls, prompt: body.prompt, aiConfig, onProgress, onScreenshot });
          result = r.results;
        } else {
          send({ type: 'error', message: 'Modo inválido' }); send({ type: 'done' }); controller.close(); return;
        }

        const duration_ms = Date.now() - t0;
        send({ type: 'progress', step: `✓ Completado en ${(duration_ms / 1000).toFixed(1)}s` });
        send({ type: 'result', data: result, provider: aiConfig.provider, modelo: aiConfig.modelo, duration_ms });
        send({ type: 'done' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ type: 'error', message: msg });
        send({ type: 'done' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
