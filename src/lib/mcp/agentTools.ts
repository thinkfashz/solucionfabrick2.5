import 'server-only';

import { z } from 'zod';
import type { McpAccess } from '@/lib/mcp/access';
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
import { requireAgentScope } from '@/lib/mcp/agentProfile';
import { buildFabrickDailyBrief } from '@/lib/fabrickDailyBrief';

export type HarnessToolTrace = {
  tool: string;
  phase: 'read' | 'preview' | 'commit';
  ok: boolean;
  detail: string;
};

export type HarnessToolExecution = {
  value: unknown;
  trace: HarnessToolTrace;
};

type JsonSchemaTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const productsSearchSchema = z.object({
  query: z.string().max(180).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  activeOnly: z.boolean().optional().default(false),
  stock: z.enum(['any', 'low', 'out']).optional().default('any'),
});

const productGetSchema = z.object({
  id: z.string().max(120).optional(),
  sku: z.string().max(128).optional(),
  ean: z.string().max(128).optional(),
  code: z.string().max(512).optional(),
}).refine((value) => Boolean(value.id || value.sku || value.ean || value.code), { message: 'Indica id, sku, ean o code.' });

const catalogAuditSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(80),
  lowStockThreshold: z.number().int().min(0).max(10000).optional().default(5),
});

const intelligenceSchema = z.object({
  days: z.number().int().min(1).max(30).optional().default(7),
});

const marketSearchSchema = z.object({
  query: z.string().min(2).max(180),
  limit: z.number().int().min(1).max(30).optional().default(12),
});

const marketStageSchema = z.object({
  sourceId: z.string().min(1).max(240),
  title: z.string().min(1).max(180),
  price: z.number().min(0).max(999999999).optional(),
  currency: z.string().max(12).optional().default('CLP'),
  url: z.string().min(1).max(2000),
  image: z.string().max(2000).optional(),
  description: z.string().max(5000).optional(),
  specifications: z.record(z.string(), z.unknown()).optional(),
  commit: z.boolean().optional().default(false),
});

const productCreateSchema = z.object({
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
});

const productUpdateSchema = z.object({
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
});

const inventorySchema = z.object({
  productId: z.string().min(1).max(120),
  type: z.enum(['in', 'out', 'adjustment', 'return']),
  quantity: z.number().int().min(0).max(999999999),
  referenceId: z.string().min(3).max(240),
  barcode: z.string().max(512).optional(),
  note: z.string().max(500).optional(),
  approvalId: z.string().uuid().optional(),
  commit: z.boolean().optional().default(false),
});

export const HARNESS_AGENT_TOOLS: JsonSchemaTool[] = [
  {
    type: 'function',
    function: {
      name: 'products_search',
      description: 'Busca productos del catálogo del tenant por nombre, SKU, EAN o código y permite detectar stock bajo o agotado.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          activeOnly: { type: 'boolean' },
          stock: { type: 'string', enum: ['any', 'low', 'out'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'product_get',
      description: 'Obtiene la ficha completa de un producto por id, sku, ean o código.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, code: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'catalog_supervise',
      description: 'Audita el catálogo y detecta fichas incompletas, stock bajo, productos sin imagen, sin SKU o inactivos.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 100 }, lowStockThreshold: { type: 'integer', minimum: 0, maximum: 10000 } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'site_intelligence',
      description: 'Analiza visitas, embudo, pedidos, ingresos, stock, margen y fichas incompletas del tenant y devuelve prioridades accionables.',
      parameters: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 30 } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'market_search',
      description: 'Busca referencias públicas actuales en Mercado Libre Chile para comparar precio, disponibilidad y señales comerciales.',
      parameters: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 30 } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'market_product_stage',
      description: 'Prepara o incorpora una referencia de Mercado Libre como borrador inactivo y stock 0. Usa commit=false primero.',
      parameters: {
        type: 'object',
        required: ['sourceId', 'title', 'url'],
        properties: {
          sourceId: { type: 'string' }, title: { type: 'string' }, price: { type: 'number' }, currency: { type: 'string' },
          url: { type: 'string' }, image: { type: 'string' }, description: { type: 'string' }, specifications: { type: 'object' }, commit: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'product_create',
      description: 'Prepara o crea un producto. El stock inicial queda en 0. Para publicar activo=true se requiere permiso de publicación y puede requerir aprobación humana.',
      parameters: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' }, description: { type: 'string' }, tagline: { type: 'string' }, price: { type: 'number' }, image_url: { type: 'string' },
          category_id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, scan_code: { type: 'string' }, scan_format: { type: 'string' },
          activo: { type: 'boolean' }, featured: { type: 'boolean' }, supplier_price: { type: 'number' }, supplier_currency: { type: 'string' }, specifications: { type: 'object' },
          source_url: { type: 'string' }, source_id: { type: 'string' }, shipping_mode: { type: 'string' }, shipping_fee: { type: 'number' },
          shipping_weight_kg: { type: 'number' }, shipping_dimensions: { type: 'string' }, approvalId: { type: 'string' }, commit: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'product_update',
      description: 'Prepara o aplica cambios sobre un producto. No cambia stock directamente. Cambiar activo requiere permiso de publicación y puede requerir aprobación humana.',
      parameters: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, tagline: { type: 'string' }, price: { type: 'number' }, image_url: { type: 'string' },
          category_id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, scan_code: { type: 'string' }, scan_format: { type: 'string' }, activo: { type: 'boolean' },
          featured: { type: 'boolean' }, supplier_price: { type: 'number' }, supplier_currency: { type: 'string' }, specifications: { type: 'object' }, approvalId: { type: 'string' }, commit: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inventory_move',
      description: 'Prepara o registra entrada, salida, devolución o ajuste de stock con Inventario V2. adjustment usa quantity como stock final absoluto y normalmente requiere aprobación humana.',
      parameters: {
        type: 'object',
        required: ['productId', 'type', 'quantity', 'referenceId'],
        properties: {
          productId: { type: 'string' }, type: { type: 'string', enum: ['in', 'out', 'adjustment', 'return'] }, quantity: { type: 'integer', minimum: 0 },
          referenceId: { type: 'string' }, barcode: { type: 'string' }, note: { type: 'string' }, approvalId: { type: 'string' }, commit: { type: 'boolean' },
        },
      },
    },
  },
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'Error desconocido');
}

function auditOutcome(error: unknown): 'denied' | 'error' {
  const message = errorMessage(error);
  return /^(MCP_|AGENT_)/.test(message) ? 'denied' : 'error';
}

function inventoryPreview(stock: number, type: 'in' | 'out' | 'adjustment' | 'return', quantity: number) {
  if (type === 'adjustment') return quantity;
  if (type === 'out') return stock - quantity;
  return stock + quantity;
}

async function auditedTool(
  access: McpAccess,
  tool: string,
  phase: 'read' | 'preview' | 'commit',
  payload: unknown,
  operation: () => Promise<unknown>,
  countWrite = false,
): Promise<HarnessToolExecution> {
  try {
    if (countWrite) await claimMcpRateLimit(access, 'write');
    const value = await operation();
    await auditMcpAction({ access, toolName: tool, phase, outcome: 'ok', payload, result: value });
    return { value, trace: { tool, phase, ok: true, detail: phase === 'commit' ? 'Cambio ejecutado.' : phase === 'preview' ? 'Vista previa preparada.' : 'Lectura completada.' } };
  } catch (error) {
    await auditMcpAction({ access, toolName: tool, phase, outcome: auditOutcome(error), payload, result: { error: errorMessage(error) } });
    throw error;
  }
}

function effectiveCommit(requested: boolean, allowCommit: boolean) {
  return requested === true && allowCommit === true;
}

export async function executeHarnessAgentTool(input: {
  access: McpAccess;
  toolName: string;
  args: unknown;
  allowCommit: boolean;
}): Promise<HarnessToolExecution> {
  const { access, toolName, allowCommit } = input;

  if (toolName === 'products_search') {
    const args = productsSearchSchema.parse(input.args);
    return auditedTool(access, toolName, 'read', args, async () => {
      requireAgentScope(access, 'products:read');
      return mcpSearchProducts(access.tenantId, args);
    });
  }

  if (toolName === 'product_get') {
    const args = productGetSchema.parse(input.args);
    return auditedTool(access, toolName, 'read', args, async () => {
      requireAgentScope(access, 'products:read');
      const product = await mcpGetProduct(access.tenantId, args);
      return product ? { found: true, product } : { found: false };
    });
  }

  if (toolName === 'catalog_supervise') {
    const args = catalogAuditSchema.parse(input.args);
    return auditedTool(access, toolName, 'read', args, async () => {
      requireAgentScope(access, 'products:read');
      return mcpCatalogAudit(access.tenantId, args);
    });
  }

  if (toolName === 'site_intelligence') {
    const args = intelligenceSchema.parse(input.args);
    return auditedTool(access, toolName, 'read', args, async () => {
      requireAgentScope(access, 'analytics:read');
      return buildFabrickDailyBrief(access.tenantId, args.days);
    });
  }

  if (toolName === 'market_search') {
    const args = marketSearchSchema.parse(input.args);
    return auditedTool(access, toolName, 'read', args, async () => {
      requireAgentScope(access, 'products:read');
      return mcpSearchMarket(args);
    });
  }

  if (toolName === 'market_product_stage') {
    const args = marketStageSchema.parse(input.args);
    const commit = effectiveCommit(args.commit, allowCommit);
    const payload = { ...args, commit };
    return auditedTool(access, toolName, commit ? 'commit' : 'preview', payload, async () => {
      requireAgentScope(access, 'products:write');
      const result = await mcpStageMarketProduct(access.tenantId, payload);
      if (args.commit && !allowCommit) return { ...result, commitBlocked: true, message: 'El modelo pidió commit, pero este mensaje no tenía habilitado Permitir cambios.' };
      return result;
    }, commit);
  }

  if (toolName === 'product_create') {
    const parsed = productCreateSchema.parse(input.args);
    const { approvalId, commit: requestedCommit, ...payload } = parsed;
    const commit = effectiveCommit(requestedCommit, allowCommit);
    return auditedTool(access, toolName, commit ? 'commit' : 'preview', payload, async () => {
      requireAgentScope(access, 'products:write');
      const publishing = payload.activo === true;
      if (publishing) requireAgentScope(access, 'products:publish');
      const needsApproval = publishing && await policyRequiresApproval(access, 'publish');

      if (!commit) {
        const approval = needsApproval ? await requestMcpApproval({ access, toolName, payload, summary: `Publicar producto nuevo: ${payload.name}` }) : null;
        return {
          ok: true,
          preview: { ...payload, stock: 0, source: 'mcp' },
          commitBlocked: requestedCommit && !allowCommit,
          approvalRequired: needsApproval,
          approvalId: approval?.id ?? null,
          approvalStatus: approval?.status ?? null,
          approvalExpiresAt: approval?.expiresAt ?? null,
          message: requestedCommit && !allowCommit
            ? 'Vista previa creada. El commit quedó bloqueado porque Permitir cambios estaba apagado.'
            : needsApproval
              ? 'Vista previa creada. Requiere aprobación humana antes del commit.'
              : 'Vista previa creada. Para ejecutar, el usuario debe habilitar Permitir cambios en este mensaje.',
        };
      }

      if (needsApproval) await consumeMcpApproval({ access, toolName, payload, approvalId });
      return { ok: true, product: await mcpCreateProduct(access.tenantId, payload) };
    }, commit);
  }

  if (toolName === 'product_update') {
    const parsed = productUpdateSchema.parse(input.args);
    const { productId, approvalId, commit: requestedCommit, ...patch } = parsed;
    const payload = { productId, ...patch };
    const commit = effectiveCommit(requestedCommit, allowCommit);
    return auditedTool(access, toolName, commit ? 'commit' : 'preview', payload, async () => {
      requireAgentScope(access, 'products:write');
      const publishingChange = patch.activo !== undefined;
      if (publishingChange) requireAgentScope(access, 'products:publish');
      const needsApproval = publishingChange && await policyRequiresApproval(access, 'publish');

      if (!commit) {
        const before = await mcpGetProduct(access.tenantId, { id: productId });
        if (!before) throw new Error('Producto no encontrado.');
        const approval = needsApproval ? await requestMcpApproval({
          access,
          toolName,
          payload,
          summary: `${patch.activo ? 'Activar' : 'Desactivar'} producto: ${String(before.name || productId)}`,
        }) : null;
        return {
          ok: true,
          productId,
          before,
          proposedChanges: patch,
          commitBlocked: requestedCommit && !allowCommit,
          approvalRequired: needsApproval,
          approvalId: approval?.id ?? null,
          approvalStatus: approval?.status ?? null,
          approvalExpiresAt: approval?.expiresAt ?? null,
          message: requestedCommit && !allowCommit
            ? 'Vista previa creada. El commit quedó bloqueado porque Permitir cambios estaba apagado.'
            : needsApproval
              ? 'Vista previa creada. Requiere aprobación humana antes del commit.'
              : 'Vista previa creada. Para ejecutar, el usuario debe habilitar Permitir cambios en este mensaje.',
        };
      }

      if (needsApproval) await consumeMcpApproval({ access, toolName, payload, approvalId });
      return { ok: true, product: await mcpUpdateProduct(access.tenantId, productId, patch) };
    }, commit);
  }

  if (toolName === 'inventory_move') {
    const parsed = inventorySchema.parse(input.args);
    const { approvalId, commit: requestedCommit, ...payload } = parsed;
    const commit = effectiveCommit(requestedCommit, allowCommit);
    return auditedTool(access, toolName, commit ? 'commit' : 'preview', payload, async () => {
      requireAgentScope(access, 'inventory:write');
      const needsApproval = await policyRequiresApproval(access, 'inventory');

      if (!commit) {
        const product = await mcpGetProduct(access.tenantId, { id: payload.productId });
        if (!product) throw new Error('Producto no encontrado.');
        const stockBefore = Math.max(0, Number(product.stock ?? 0));
        const stockAfter = inventoryPreview(stockBefore, payload.type, payload.quantity);
        const approval = needsApproval && stockAfter >= 0 ? await requestMcpApproval({
          access,
          toolName,
          payload,
          summary: `Stock ${String(product.name || payload.productId)}: ${stockBefore} → ${stockAfter}`,
        }) : null;
        return {
          ok: stockAfter >= 0,
          preview: { ...payload, stockBefore, stockAfter, quantityMeaning: payload.type === 'adjustment' ? 'stock_final_absoluto' : 'movimiento' },
          commitBlocked: requestedCommit && !allowCommit,
          approvalRequired: needsApproval,
          approvalId: approval?.id ?? null,
          approvalStatus: approval?.status ?? null,
          approvalExpiresAt: approval?.expiresAt ?? null,
          warning: stockAfter < 0 ? 'La operación dejaría stock negativo y será rechazada.' : null,
          message: needsApproval ? 'Vista previa creada. Requiere aprobación humana antes del commit.' : 'Vista previa creada.',
        };
      }

      if (needsApproval) await consumeMcpApproval({ access, toolName, payload, approvalId });
      return mcpMoveInventory(access.tenantId, payload);
    }, commit);
  }

  throw new Error(`AGENT_TOOL_UNKNOWN:${toolName}`);
}
