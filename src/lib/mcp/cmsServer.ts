import 'server-only';

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { authenticateMcpRequest, requireMcpScope, type McpAccess } from '@/lib/mcp/access';
import { auditMcpAction, claimMcpRateLimit } from '@/lib/mcp/governance';
import { getSiteSectionFresh, setSiteSection } from '@/lib/siteStructure';
import { normalizeHomePage } from '@/lib/homeVisualCms';

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'Error desconocido');
}

function errorResult(error: unknown) {
  return { isError: true, content: [{ type: 'text' as const, text: errorMessage(error) }] };
}

async function runTool(access: McpAccess, toolName: string, phase: 'read' | 'preview' | 'commit', payload: unknown, operation: () => Promise<unknown>, write = false) {
  try {
    if (write) await claimMcpRateLimit(access, 'write');
    const result = await operation();
    await auditMcpAction({ access, toolName, phase, outcome: 'ok', payload, result });
    return textResult(result);
  } catch (error) {
    await auditMcpAction({ access, toolName, phase, outcome: errorMessage(error).startsWith('MCP_') ? 'denied' : 'error', payload, result: { error: errorMessage(error) } });
    return errorResult(error);
  }
}

function cmsHandler(access: McpAccess) {
  return createMcpHandler(
    (server) => {
      server.registerTool(
        'cms_home_get',
        {
          title: 'Leer Home CMS',
          description: 'Lee la estructura actualmente publicada de la página principal de Soluciones Fabrick. No modifica nada.',
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async () => runTool(access, 'cms_home_get', 'read', {}, async () => {
          requireMcpScope(access, 'site:read');
          const current = await getSiteSectionFresh('home-page');
          return { key: 'home-page', content: normalizeHomePage(current) };
        }),
      );

      server.registerTool(
        'cms_home_update',
        {
          title: 'Proponer o publicar Home CMS',
          description: 'Normaliza una estructura Home completa. Con commit=false devuelve vista previa y no guarda. Con commit=true publica exactamente esa estructura. Usa commit=true solo después de mostrar la vista previa y recibir confirmación explícita.',
          inputSchema: z.object({
            content: z.unknown().describe('Objeto HomePageContent completo, normalmente obtenido primero con cms_home_get.'),
            commit: z.boolean().optional().default(false),
            reason: z.string().max(500).optional(),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ content, commit, reason }) => runTool(access, 'cms_home_update', commit ? 'commit' : 'preview', { content, commit, reason }, async () => {
          requireMcpScope(access, 'site:read');
          const normalized = normalizeHomePage(content);
          const current = normalizeHomePage(await getSiteSectionFresh('home-page'));
          if (!commit) {
            return {
              ok: true,
              commit: false,
              before: current,
              proposed: normalized,
              changed: JSON.stringify(current) !== JSON.stringify(normalized),
              message: 'Vista previa solamente. Muestra los cambios al usuario y usa commit=true únicamente después de su confirmación.',
            };
          }

          requireMcpScope(access, 'automation:run');
          const saved = normalizeHomePage(await setSiteSection('home-page', normalized));
          return {
            ok: true,
            commit: true,
            verified: JSON.stringify(saved) === JSON.stringify(normalized),
            content: saved,
            reason: reason || null,
          };
        }, commit),
      );

      server.registerTool(
        'cms_editor_capabilities',
        {
          title: 'Capacidades del CMS',
          description: 'Describe qué puede editar el CMS, cómo tratar imágenes y qué reglas de publicación debe respetar un agente.',
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async () => runTool(access, 'cms_editor_capabilities', 'read', {}, async () => {
          requireMcpScope(access, 'site:read');
          return {
            canonicalEditor: '/admin/editor/home-structure',
            mcpEndpoint: '/api/mcp/cms',
            media: ['Insforge', 'Cloudinary'],
            responsive: ['mobile', 'tablet', 'desktop'],
            workflow: ['cms_home_get', 'cms_home_update(commit=false)', 'confirmación humana', 'cms_home_update(commit=true)'],
            writeScope: 'automation:run',
            notes: [
              'No publiques cambios sin vista previa y confirmación explícita.',
              'Las URLs de imágenes pueden provenir de Insforge o Cloudinary.',
              'El Home estructurado es la fuente canónica; no uses visual-overrides para modificar la portada.',
            ],
          };
        }),
      );
    },
    {
      serverInfo: { name: 'soluciones-fabrick-cms', version: '1.0.0' },
      instructions: 'MCP del CMS de Soluciones Fabrick. Lee primero cms_home_get. Para cambios usa cms_home_update con commit=false, explica la diferencia al usuario y publica con commit=true solo tras confirmación. Mantén el estilo Fabrick y no superpongas copy extenso sobre fotografías.',
    },
  );
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'MCP_UNAUTHORIZED', message: 'Token MCP inválido o revocado.' }), {
    status: 401,
    headers: { 'content-type': 'application/json; charset=utf-8', 'www-authenticate': 'Bearer realm="Soluciones Fabrick CMS MCP"', 'cache-control': 'no-store' },
  });
}

export async function handleFabrickCmsMcpRequest(request: Request) {
  const access = await authenticateMcpRequest(request);
  if (!access) return unauthorizedResponse();

  try {
    const rate = await claimMcpRateLimit(access, 'request');
    await auditMcpAction({ access, toolName: '__cms_mcp_request__', phase: 'request', outcome: 'ok', payload: { method: request.method }, result: { count: rate.requestCount }, requestId: request.headers.get('x-request-id') || request.headers.get('x-vercel-id') });
  } catch (error) {
    const message = errorMessage(error);
    const status = message.startsWith('MCP_RATE_LIMITED:') ? 429 : message === 'MCP_CONNECTION_DISABLED' ? 403 : 503;
    return new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }

  return cmsHandler(access)(request);
}
