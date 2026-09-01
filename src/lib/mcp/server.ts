import 'server-only';

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { authenticateMcpRequest, requireMcpScope, type McpAccess } from '@/lib/mcp/access';
import {
  mcpCatalogAudit,
  mcpCreateProduct,
  mcpGetProduct,
  mcpMoveInventory,
  mcpSearchProducts,
  mcpUpdateProduct,
} from '@/lib/mcp/catalog';
import { mcpSearchMarket, mcpStageMarketProduct } from '@/lib/mcp/market';
import {
  auditMcpAction,
  claimMcpRateLimit,
  consumeMcpApproval,
  policyRequiresApproval,
  requestMcpApproval,
} from '@/lib/mcp/governance';

function textResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'Error desconocido');
}

function errorResult(error: unknown) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: errorMessage(error) }],
  };
}

function auditOutcome(error: unknown): 'denied' | 'error' {
  const message = errorMessage(error);
  return message.startsWith('MCP_') ? 'denied' : 'error';
}

async function runTool(
  access: McpAccess,
  toolName: string,
  phase: 'read' | 'preview' | 'commit',
  payload: unknown,
  operation: () => Promise<unknown>,
  options?: { countWrite?: boolean },
) {
  try {
    if (options?.countWrite) await claimMcpRateLimit(access, 'write');
    const result = await operation();
    await auditMcpAction({ access, toolName, phase, outcome: 'ok', payload, result });
    return textResult(result);
  } catch (error) {
    await auditMcpAction({ access, toolName, phase, outcome: auditOutcome(error), payload, result: { error: errorMessage(error) } });
    return errorResult(error);
  }
}

function inventoryPreview(stock: number, type: 'in' | 'out' | 'adjustment' | 'return', quantity: number) {
  if (type === 'adjustment') return quantity;
  if (type === 'out') return stock - quantity;
  return stock + quantity;
}

function registerFabrickTools(access: McpAccess) {
  return createMcpHandler(
    (server) => {
      server.registerTool(
        'products_search',
        {
          title: 'Buscar productos',
          description: 'Busca productos de Soluciones Fabrick por nombre, SKU, EAN o código de escaneo. También permite filtrar stock bajo o agotado.',
          inputSchema: z.object({
            query: z.string().max(180).optional().describe('Nombre, SKU, EAN o código. Vacío devuelve un listado.'),
            limit: z.number().int().min(1).max(100).optional().default(20),
            activeOnly: z.boolean().optional().default(false),
            stock: z.enum(['any', 'low', 'out']).optional().default('any'),
          }),
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (input) => runTool(access, 'products_search', 'read', input, async () => {
          requireMcpScope(access, 'products:read');
          return mcpSearchProducts(access.tenantId, input);
        }),
      );

      server.registerTool(
        'product_get',
        {
          title: 'Ver producto',
          description: 'Obtiene la ficha completa de un producto por ID, SKU, EAN o código de escaneo.',
          inputSchema: z.object({
            id: z.string().max(120).optional(),
            sku: z.string().max(128).optional(),
            ean: z.string().max(128).optional(),
            code: z.string().max(512).optional(),
          }).refine((value) => Boolean(value.id || value.sku || value.ean || value.code), {
            message: 'Indica id, sku, ean o code.',
          }),
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (input) => runTool(access, 'product_get', 'read', input, async () => {
          requireMcpScope(access, 'products:read');
          const product = await mcpGetProduct(access.tenantId, input);
          return product ? { found: true, product } : { found: false };
        }),
      );

      server.registerTool(
        'catalog_supervise',
        {
          title: 'Supervisar catálogo',
          description: 'Audita productos recientes y detecta faltantes de descripción, imagen, SKU/código, precio, stock e inactividad. No modifica datos.',
          inputSchema: z.object({
            limit: z.number().int().min(1).max(100).optional().default(80),
            lowStockThreshold: z.number().int().min(0).max(10000).optional().default(5),
          }),
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (input) => runTool(access, 'catalog_supervise', 'read', input, async () => {
          requireMcpScope(access, 'products:read');
          return mcpCatalogAudit(access.tenantId, input);
        }),
      );

      server.registerTool(
        'market_search',
        {
          title: 'Buscar mercado',
          description: 'Busca referentes públicos actuales en Mercado Libre Chile para comparar títulos, precios, disponibilidad y señales de venta. No modifica el catálogo.',
          inputSchema: z.object({
            query: z.string().min(2).max(180),
            limit: z.number().int().min(1).max(30).optional().default(12),
          }),
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        async (input) => runTool(access, 'market_search', 'read', input, async () => {
          requireMcpScope(access, 'products:read');
          return mcpSearchMarket(input);
        }),
      );

      server.registerTool(
        'market_product_stage',
        {
          title: 'Preparar producto desde mercado',
          description: 'Prepara o incorpora un referente de Mercado Libre como borrador inactivo con stock 0, conservando su fuente. Por defecto solo muestra vista previa; usa commit=true únicamente después de confirmación.',
          inputSchema: z.object({
            sourceId: z.string().min(1).max(240),
            title: z.string().min(1).max(180),
            price: z.number().min(0).max(999999999).optional(),
            currency: z.string().max(12).optional().default('CLP'),
            url: z.string().min(1).max(2000),
            image: z.string().max(2000).optional(),
            description: z.string().max(5000).optional(),
            specifications: z.record(z.string(), z.unknown()).optional(),
            commit: z.boolean().optional().default(false),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
          },
        },
        async (input) => runTool(access, 'market_product_stage', input.commit ? 'commit' : 'preview', input, async () => {
          requireMcpScope(access, 'products:write');
          return mcpStageMarketProduct(access.tenantId, input);
        }, { countWrite: input.commit }),
      );

      server.registerTool(
        'product_create',
        {
          title: 'Crear producto',
          description: 'Prepara o crea una ficha nueva. El stock inicial siempre queda en 0. Por defecto commit=false devuelve una vista previa. Activarlo requiere products:publish y puede exigir aprobación humana del panel.',
          inputSchema: z.object({
            name: z.string().min(1).max(180),
            description: z.string().max(5000).optional(),
            tagline: z.string().max(240).optional(),
            price: z.number().min(0).max(999999999).optional().default(0),
            image_url: z.string().max(2000).optional(),
            category_id: z.string().max(120).optional(),
            sku: z.string().max(128).optional(),
            ean: z.string().max(128).optional(),
            scan_code: z.string().max(512).optional(),
            scan_format: z.string().max(40).optional(),
            activo: z.boolean().optional().default(false),
            featured: z.boolean().optional().default(false),
            supplier_price: z.number().min(0).max(999999999).optional(),
            supplier_currency: z.string().max(12).optional().default('CLP'),
            specifications: z.record(z.string(), z.unknown()).optional(),
            source_url: z.string().max(2000).optional(),
            source_id: z.string().max(240).optional(),
            shipping_mode: z.string().max(40).optional(),
            shipping_fee: z.number().min(0).max(999999999).optional(),
            shipping_weight_kg: z.number().min(0).max(999999).optional(),
            shipping_dimensions: z.string().max(240).optional(),
            approvalId: z.string().uuid().optional(),
            commit: z.boolean().optional().default(false),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
          },
        },
        async ({ approvalId, commit, ...input }) => runTool(access, 'product_create', commit ? 'commit' : 'preview', input, async () => {
          requireMcpScope(access, 'products:write');
          const publishing = input.activo === true;
          if (publishing) requireMcpScope(access, 'products:publish');
          const needsApproval = publishing && await policyRequiresApproval(access, 'publish');

          if (!commit) {
            const approval = needsApproval
              ? await requestMcpApproval({
                access,
                toolName: 'product_create',
                payload: input,
                summary: `Publicar producto nuevo: ${input.name}`,
              })
              : null;
            return {
              ok: true,
              preview: { ...input, stock: 0, source: 'mcp' },
              approvalRequired: needsApproval,
              approvalId: approval?.id ?? null,
              approvalStatus: approval?.status ?? null,
              approvalExpiresAt: approval?.expiresAt ?? null,
              message: needsApproval
                ? 'Vista previa creada. Aprueba la solicitud en /admin/mcp/gobernanza y repite exactamente el mismo payload con commit=true y approvalId.'
                : 'Vista previa solamente. Confirma con el usuario y repite con commit=true para crear.',
            };
          }

          if (needsApproval) await consumeMcpApproval({ access, toolName: 'product_create', payload: input, approvalId });
          return { ok: true, product: await mcpCreateProduct(access.tenantId, input) };
        }, { countWrite: commit }),
      );

      server.registerTool(
        'product_update',
        {
          title: 'Actualizar producto',
          description: 'Prepara o aplica cambios sobre la ficha comercial/técnica. No permite cambiar stock directamente. Cambiar activo requiere products:publish y puede exigir aprobación humana.',
          inputSchema: z.object({
            productId: z.string().min(1).max(120),
            name: z.string().min(1).max(180).optional(),
            description: z.string().max(5000).optional(),
            tagline: z.string().max(240).optional(),
            price: z.number().min(0).max(999999999).optional(),
            image_url: z.string().max(2000).optional(),
            category_id: z.string().max(120).optional(),
            sku: z.string().max(128).optional(),
            ean: z.string().max(128).optional(),
            scan_code: z.string().max(512).optional(),
            scan_format: z.string().max(40).optional(),
            activo: z.boolean().optional(),
            featured: z.boolean().optional(),
            supplier_price: z.number().min(0).max(999999999).optional(),
            supplier_currency: z.string().max(12).optional(),
            specifications: z.record(z.string(), z.unknown()).optional(),
            approvalId: z.string().uuid().optional(),
            commit: z.boolean().optional().default(false),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ productId, approvalId, commit, ...patch }) => {
          const payload = { productId, ...patch };
          return runTool(access, 'product_update', commit ? 'commit' : 'preview', payload, async () => {
            requireMcpScope(access, 'products:write');
            const publishingChange = patch.activo !== undefined;
            if (publishingChange) requireMcpScope(access, 'products:publish');
            const needsApproval = publishingChange && await policyRequiresApproval(access, 'publish');

            if (!commit) {
              const before = await mcpGetProduct(access.tenantId, { id: productId });
              if (!before) throw new Error('Producto no encontrado.');
              const approval = needsApproval
                ? await requestMcpApproval({
                  access,
                  toolName: 'product_update',
                  payload,
                  summary: `${patch.activo ? 'Activar' : 'Desactivar'} producto: ${before.name || productId}`,
                })
                : null;
              return {
                ok: true,
                productId,
                before,
                proposedChanges: patch,
                approvalRequired: needsApproval,
                approvalId: approval?.id ?? null,
                approvalStatus: approval?.status ?? null,
                approvalExpiresAt: approval?.expiresAt ?? null,
                message: needsApproval
                  ? 'Vista previa creada. Aprueba la solicitud en /admin/mcp/gobernanza y repite exactamente el mismo payload con commit=true y approvalId.'
                  : 'Vista previa solamente. Confirma con el usuario y repite con commit=true para aplicar.',
              };
            }

            if (needsApproval) await consumeMcpApproval({ access, toolName: 'product_update', payload, approvalId });
            return { ok: true, product: await mcpUpdateProduct(access.tenantId, productId, patch) };
          }, { countWrite: commit });
        },
      );

      server.registerTool(
        'inventory_move',
        {
          title: 'Mover stock',
          description: 'Prepara o registra entrada, salida, devolución o ajuste mediante el ledger atómico de Inventario V2. Para adjustment, quantity es el STOCK FINAL ABSOLUTO. Por política puede exigir aprobación humana de un solo uso.',
          inputSchema: z.object({
            productId: z.string().min(1).max(120),
            type: z.enum(['in', 'out', 'adjustment', 'return']),
            quantity: z.number().int().min(0).max(999999999),
            referenceId: z.string().min(3).max(240).describe('ID único y estable de la operación, por ejemplo ai:pedido:123:linea:2'),
            barcode: z.string().max(512).optional(),
            note: z.string().max(500).optional(),
            approvalId: z.string().uuid().optional(),
            commit: z.boolean().optional().default(false),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ approvalId, commit, ...input }) => runTool(access, 'inventory_move', commit ? 'commit' : 'preview', input, async () => {
          requireMcpScope(access, 'inventory:write');
          const needsApproval = await policyRequiresApproval(access, 'inventory');

          if (!commit) {
            const product = await mcpGetProduct(access.tenantId, { id: input.productId });
            if (!product) throw new Error('Producto no encontrado.');
            const stockBefore = Math.max(0, Number(product.stock ?? 0));
            const stockAfter = inventoryPreview(stockBefore, input.type, input.quantity);
            const approval = needsApproval && stockAfter >= 0
              ? await requestMcpApproval({
                access,
                toolName: 'inventory_move',
                payload: input,
                summary: `Stock ${product.name || input.productId}: ${stockBefore} → ${stockAfter}`,
              })
              : null;
            return {
              ok: stockAfter >= 0,
              preview: {
                productId: input.productId,
                productName: product.name,
                type: input.type,
                quantity: input.quantity,
                quantityMeaning: input.type === 'adjustment' ? 'stock_final_absoluto' : 'movimiento',
                stockBefore,
                stockAfter,
                referenceId: input.referenceId,
              },
              approvalRequired: needsApproval,
              approvalId: approval?.id ?? null,
              approvalStatus: approval?.status ?? null,
              approvalExpiresAt: approval?.expiresAt ?? null,
              warning: stockAfter < 0 ? 'La operación dejaría stock negativo y será rechazada.' : null,
              message: needsApproval
                ? 'Vista previa creada. Aprueba la solicitud en /admin/mcp/gobernanza y repite exactamente el mismo payload con commit=true y approvalId.'
                : 'Vista previa solamente. Confirma con el usuario y repite con commit=true para registrar el movimiento.',
            };
          }

          if (needsApproval) await consumeMcpApproval({ access, toolName: 'inventory_move', payload: input, approvalId });
          return mcpMoveInventory(access.tenantId, input);
        }, { countWrite: commit }),
      );
    },
    {
      serverInfo: { name: 'soluciones-fabrick', version: '1.4.0' },
      instructions: [
        'Servidor MCP oficial de Soluciones Fabrick para catálogo, inteligencia de mercado e Inventario V2.',
        'Usa primero products_search/product_get antes de crear para evitar duplicados.',
        'Para investigar referencias externas usa market_search. Los datos externos son referencias y deben verificarse antes de publicar.',
        'Las herramientas de escritura trabajan en dos fases: primero commit=false para mostrar la vista previa; solo después de confirmación usa commit=true.',
        'products:write permite crear/editar borradores; activar o desactivar productos requiere además products:publish.',
        'Publicación y movimientos de inventario pueden requerir aprobación humana. Cuando la vista previa entregue approvalId, espera aprobación en /admin/mcp/gobernanza y reenvía exactamente el mismo payload con ese approvalId.',
        'Las aprobaciones expiran, están ligadas al cliente, herramienta y payload y solo pueden consumirse una vez.',
        'Nunca inventes stock: consulta el producto y usa inventory_move. En adjustment la cantidad significa stock final absoluto.',
        'Los productos traídos desde mercado se incorporan inactivos y con stock 0 para revisión humana.',
      ].join(' '),
    },
  );
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'MCP_UNAUTHORIZED', message: 'Token MCP inválido o revocado.' }), {
    status: 401,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'www-authenticate': 'Bearer realm="Soluciones Fabrick MCP"',
      'cache-control': 'no-store',
    },
  });
}

export async function handleFabrickMcpRequest(request: Request, pathToken?: string) {
  const access = await authenticateMcpRequest(request, pathToken);
  if (!access) return unauthorizedResponse();

  try {
    const rate = await claimMcpRateLimit(access, 'request');
    await auditMcpAction({
      access,
      toolName: '__mcp_request__',
      phase: 'request',
      outcome: 'ok',
      payload: { method: request.method },
      result: { count: rate.requestCount },
      requestId: request.headers.get('x-request-id') || request.headers.get('x-vercel-id'),
    });
  } catch (error) {
    const message = errorMessage(error);
    await auditMcpAction({ access, toolName: '__mcp_request__', phase: 'request', outcome: 'denied', payload: { method: request.method }, result: { error: message } });
    if (message === 'MCP_CONNECTION_DISABLED') {
      return new Response(JSON.stringify({ error: 'MCP_CONNECTION_DISABLED' }), {
        status: 403,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    if (message.startsWith('MCP_RATE_LIMITED:')) {
      const retryAfter = message.split(':')[1] || '60';
      return new Response(JSON.stringify({ error: 'MCP_RATE_LIMITED', retryAfter: Number(retryAfter) || 60 }), {
        status: 429,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'retry-after': retryAfter,
        },
      });
    }
    return new Response(JSON.stringify({ error: 'MCP_GOVERNANCE_UNAVAILABLE' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  return registerFabrickTools(access)(request);
}
