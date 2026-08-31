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
        'product_create',
        {
          title: 'Crear producto',
          description: 'Crea una ficha nueva. El stock inicial siempre queda en 0; para ingresar existencias usa inventory_move después de crear el producto.',
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
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
          },
        },
        async (input) => {
          try {
            requireMcpScope(access, 'products:write');
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
          description: 'Actualiza la ficha comercial/técnica de un producto. No permite cambiar stock directamente.',
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
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async ({ productId, ...patch }) => {
          try {
            requireMcpScope(access, 'products:write');
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
          description: 'Registra una entrada, salida, devolución o ajuste mediante el ledger atómico de Inventario V2. referenceId es obligatorio para que repetir la misma operación sea idempotente.',
          inputSchema: z.object({
            productId: z.string().min(1).max(120),
            type: z.enum(['in', 'out', 'adjustment', 'return']),
            quantity: z.number().int().min(0).max(999999999),
            referenceId: z.string().min(3).max(240).describe('ID único y estable de la operación, por ejemplo ai:pedido:123:linea:2'),
            barcode: z.string().max(512).optional(),
            note: z.string().max(500).optional(),
          }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (input) => {
          try {
            requireMcpScope(access, 'inventory:write');
            return textResult(await mcpMoveInventory(access.tenantId, input));
          } catch (error) {
            return errorResult(error);
          }
        },
      );
    },
    {
      serverInfo: { name: 'soluciones-fabrick', version: '1.0.0' },
      instructions: [
        'Servidor MCP oficial de Soluciones Fabrick para catálogo e Inventario V2.',
        'Usa primero products_search/product_get antes de crear para evitar duplicados.',
        'Nunca inventes stock: consulta el producto y usa inventory_move para cualquier cambio.',
        'Antes de ejecutar herramientas de escritura, explica al usuario qué vas a cambiar y respeta las confirmaciones del cliente MCP.',
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