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

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? 'Error desconocido');
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
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
        async (input) => {
          try {
            requireMcpScope(access, 'products:read');
            return textResult(await mcpSearchProducts(access.tenantId, input));
          } catch (error) {
            return errorResult(error);
          }
        },
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
        async (input) => {
          try {
            requireMcpScope(access, 'products:read');
            const product = await mcpGetProduct(access.tenantId, input);
            return textResult(product ? { found: true, product } : { found: false });
          } catch (error) {
            return errorResult(error);
          }
        },
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
        async (input) => {
          try {
            requireMcpScope(access, 'products:read');
            return textResult(await mcpCatalogAudit(access.tenantId, input));
          } catch (error) {
            return errorResult(error);
          }
        },
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
        async (input) => {
          try {
            requireMcpScope(access, 'products:read');
            return textResult(await mcpSearchMarket(input));
          } catch (error) {
            return errorResult(error);
          }
        },
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
        async (input) => {
          try {
            requireMcpScope(access, 'products:write');
            return textResult(await mcpStageMarketProduct(access.tenantId, input));
          } catch (error) {
            return errorResult(error);
          }
        },
      );

      server.registerTool(
        'product_create',
        {
          title: 'Crear producto',
          description: 'Prepara o crea una ficha nueva. El stock inicial siempre queda en 0. Por defecto commit=false devuelve una vista previa; ejecuta commit=true solo tras confirmación.',
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
            commit: z.boolean().optional().default(false),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
          },
        },
        async ({ commit, ...input }) => {
          try {
            requireMcpScope(access, 'products:write');
            if (!commit) {
              return textResult({
                ok: true,
                preview: { ...input, stock: 0, source: 'mcp' },
                message: 'Vista previa solamente. Confirma con el usuario y repite con commit=true para crear.',
              });
            }
            return textResult({ ok: true, product: await mcpCreateProduct(access.tenantId, input) });
          } catch (error) {
            return errorResult(error);
          }
        },
      );

      server.registerTool(
        'product_update',
        {
          title: 'Actualizar producto',
          description: 'Prepara o aplica cambios sobre la ficha comercial/técnica. No permite cambiar stock directamente. Por defecto devuelve la diferencia propuesta; usa commit=true tras confirmación.',
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
            commit: z.boolean().optional().default(false),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ productId, commit, ...patch }) => {
          try {
            requireMcpScope(access, 'products:write');
            if (!commit) {
              const before = await mcpGetProduct(access.tenantId, { id: productId });
              if (!before) throw new Error('Producto no encontrado.');
              return textResult({
                ok: true,
                productId,
                before,
                proposedChanges: patch,
                message: 'Vista previa solamente. Confirma con el usuario y repite con commit=true para aplicar.',
              });
            }
            return textResult({ ok: true, product: await mcpUpdateProduct(access.tenantId, productId, patch) });
          } catch (error) {
            return errorResult(error);
          }
        },
      );

      server.registerTool(
        'inventory_move',
        {
          title: 'Mover stock',
          description: 'Prepara o registra entrada, salida, devolución o ajuste mediante el ledger atómico de Inventario V2. Para adjustment, quantity es el STOCK FINAL ABSOLUTO, no la diferencia. referenceId es obligatorio e idempotente. Por defecto commit=false.',
          inputSchema: z.object({
            productId: z.string().min(1).max(120),
            type: z.enum(['in', 'out', 'adjustment', 'return']),
            quantity: z.number().int().min(0).max(999999999),
            referenceId: z.string().min(3).max(240).describe('ID único y estable de la operación, por ejemplo ai:pedido:123:linea:2'),
            barcode: z.string().max(512).optional(),
            note: z.string().max(500).optional(),
            commit: z.boolean().optional().default(false),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ commit, ...input }) => {
          try {
            requireMcpScope(access, 'inventory:write');
            if (!commit) {
              const product = await mcpGetProduct(access.tenantId, { id: input.productId });
              if (!product) throw new Error('Producto no encontrado.');
              const stockBefore = Math.max(0, Number(product.stock ?? 0));
              const stockAfter = inventoryPreview(stockBefore, input.type, input.quantity);
              return textResult({
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
                warning: stockAfter < 0 ? 'La operación dejaría stock negativo y será rechazada.' : null,
                message: 'Vista previa solamente. Confirma con el usuario y repite con commit=true para registrar el movimiento.',
              });
            }
            return textResult(await mcpMoveInventory(access.tenantId, input));
          } catch (error) {
            return errorResult(error);
          }
        },
      );
    },
    {
      serverInfo: { name: 'soluciones-fabrick', version: '1.2.0' },
      instructions: [
        'Servidor MCP oficial de Soluciones Fabrick para catálogo, inteligencia de mercado e Inventario V2.',
        'Usa primero products_search/product_get antes de crear para evitar duplicados.',
        'Para investigar referencias externas usa market_search. Los datos externos son referencias y deben verificarse antes de publicar.',
        'Las herramientas de escritura trabajan en dos fases: primero commit=false para mostrar la vista previa; solo después de confirmación explícita usa commit=true.',
        'Nunca inventes stock: consulta el producto y usa inventory_move. En adjustment la cantidad significa stock final absoluto.',
        'Los productos traídos desde mercado se incorporan inactivos y con stock 0 para revisión humana.',
      ].join(' '),
    },
  );
}

export async function handleFabrickMcpRequest(request: Request, pathToken?: string) {
  const access = await authenticateMcpRequest(request, pathToken);
  if (!access) {
    return new Response(JSON.stringify({ error: 'MCP_UNAUTHORIZED', message: 'Token MCP inválido o revocado.' }), {
      status: 401,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'www-authenticate': 'Bearer realm="Soluciones Fabrick MCP"',
        'cache-control': 'no-store',
      },
    });
  }

  return registerFabrickTools(access)(request);
}
