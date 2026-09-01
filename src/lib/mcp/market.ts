import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import { computeStats, searchMercadoLibrePublic } from '@/lib/marketIntel';

const STAGED_SELECT = 'id,name,description,price,stock,image_url,activo,source,source_url,source_id,supplier_price,supplier_currency,specifications,created_at';

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export async function mcpSearchMarket(input: { query: string; limit?: number }) {
  const query = cleanText(input.query, 180);
  if (!query) throw new Error('Consulta requerida.');
  const limit = Math.max(1, Math.min(30, Math.trunc(Number(input.limit ?? 12)) || 12));
  const refs = await searchMercadoLibrePublic(query, { site: 'MLC', limit });
  const stats = computeStats(refs);

  return {
    query,
    source: 'mercadolibre',
    site: 'MLC',
    stats,
    products: refs.map((ref) => {
      const raw = ref.raw as { sold_quantity?: unknown; available_quantity?: unknown; condition?: unknown; shipping?: { free_shipping?: unknown } };
      return {
        sourceId: ref.sourceId,
        title: ref.title,
        price: ref.price,
        currency: ref.currency,
        url: ref.url,
        image: ref.image,
        position: ref.position,
        soldQuantity: Number(raw.sold_quantity ?? 0) || 0,
        availableQuantity: Number(raw.available_quantity ?? 0) || 0,
        condition: cleanText(raw.condition, 40) || null,
        freeShipping: raw.shipping?.free_shipping === true,
      };
    }),
    note: 'Los precios y cantidades provienen de resultados públicos de Mercado Libre y pueden cambiar. Verifica el producto antes de publicarlo.',
  };
}

export async function mcpStageMarketProduct(tenantId: string, input: {
  sourceId: string;
  title: string;
  price?: number;
  currency?: string;
  url: string;
  image?: string;
  description?: string;
  specifications?: Record<string, unknown>;
  commit?: boolean;
}) {
  const sourceId = cleanText(input.sourceId, 240);
  const title = cleanText(input.title, 180);
  const url = cleanText(input.url, 2000);
  if (!sourceId || !title || !url) throw new Error('sourceId, title y url son requeridos.');

  const { data: existing } = await insforgeAdmin.database.from('products')
    .select(STAGED_SELECT)
    .eq('tenant_id', tenantId)
    .eq('source', 'mercadolibre')
    .eq('source_id', sourceId)
    .limit(1);
  if (existing?.[0]) {
    return {
      ok: true,
      created: false,
      duplicate: true,
      product: existing[0],
      message: 'Este producto de Mercado Libre ya fue incorporado al catálogo.',
    };
  }

  const payload = {
    tenant_id: tenantId,
    name: title,
    description: cleanText(input.description, 5000) || null,
    price: money(input.price),
    stock: 0,
    image_url: cleanText(input.image, 2000) || null,
    activo: false,
    featured: false,
    source: 'mercadolibre',
    source_url: url,
    source_id: sourceId,
    supplier_price: money(input.price) || null,
    supplier_currency: cleanText(input.currency, 12) || 'CLP',
    specifications: {
      ...(input.specifications && typeof input.specifications === 'object' && !Array.isArray(input.specifications) ? input.specifications : {}),
      staged_by: 'mcp',
      staged_at: new Date().toISOString(),
    },
  };

  if (input.commit !== true) {
    return {
      ok: true,
      created: false,
      duplicate: false,
      preview: payload,
      message: 'Vista previa solamente. Vuelve a llamar con commit=true después de confirmar con el usuario.',
    };
  }

  const { data, error } = await insforgeAdmin.database.from('products').insert([payload]).select(STAGED_SELECT).single();
  if (error) throw new Error(error.message || 'No se pudo importar el borrador.');
  return {
    ok: true,
    created: true,
    duplicate: false,
    product: data,
    message: 'Producto incorporado como borrador inactivo y stock 0. Revísalo antes de activarlo.',
  };
}
