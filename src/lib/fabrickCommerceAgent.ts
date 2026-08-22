export type CommerceCandidate = {
  name: string;
  description?: string | null;
  supplier?: string | null;
  supplierUrl?: string | null;
  supplierPrice: number;
  marketPrice?: number | null;
  stock?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  specifications?: Record<string, unknown> | null;
};

export type ExistingCatalogProduct = {
  id: string;
  name?: string | null;
  supplier_price?: number | string | null;
  price?: number | string | null;
};

export type RankedCommerceCandidate = CommerceCandidate & {
  suggestedPrice: number;
  marginPercent: number;
  score: number;
  duplicateRisk: 'low' | 'medium' | 'high';
  reasons: string[];
};

const normalize = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const finite = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function tokenSimilarity(a: string, b: string) {
  const aa = new Set(normalize(a).split(' ').filter((token) => token.length > 2));
  const bb = new Set(normalize(b).split(' ').filter((token) => token.length > 2));
  if (!aa.size || !bb.size) return 0;
  let intersection = 0;
  for (const token of aa) if (bb.has(token)) intersection += 1;
  return intersection / Math.max(aa.size, bb.size);
}

function duplicateRisk(candidate: CommerceCandidate, catalog: ExistingCatalogProduct[]) {
  const similarities = catalog.map((product) => tokenSimilarity(candidate.name, product.name || ''));
  const max = similarities.length ? Math.max(...similarities) : 0;
  if (max >= 0.75) return 'high' as const;
  if (max >= 0.45) return 'medium' as const;
  return 'low' as const;
}

export function rankCommerceCandidates(
  candidates: CommerceCandidate[],
  catalog: ExistingCatalogProduct[],
  options: { markupPercent?: number; minimumMarginPercent?: number } = {},
): RankedCommerceCandidate[] {
  const markup = Math.max(0, Math.min(300, finite(options.markupPercent ?? 30)));
  const minimumMargin = Math.max(0, Math.min(90, finite(options.minimumMarginPercent ?? 25)));

  return candidates
    .filter((candidate) => candidate && normalize(candidate.name) && finite(candidate.supplierPrice) > 0)
    .map((candidate) => {
      const supplierPrice = Math.round(finite(candidate.supplierPrice));
      const marketPrice = Math.round(finite(candidate.marketPrice));
      const markupPrice = Math.round(supplierPrice * (1 + markup / 100));
      const marketAware = marketPrice > 0 ? Math.min(markupPrice, marketPrice) : markupPrice;
      const floorForMargin = minimumMargin >= 100 ? markupPrice : Math.ceil(supplierPrice / (1 - minimumMargin / 100));
      const suggestedPrice = Math.max(floorForMargin, marketAware);
      const marginPercent = suggestedPrice > 0 ? ((suggestedPrice - supplierPrice) / suggestedPrice) * 100 : 0;
      const duplicate = duplicateRisk(candidate, catalog);
      const reasons: string[] = [];
      let score = 45;

      if (marginPercent >= 35) { score += 20; reasons.push(`Margen proyectado ${marginPercent.toFixed(1)}%.`); }
      else if (marginPercent >= minimumMargin) { score += 12; reasons.push(`Margen cumple el mínimo (${marginPercent.toFixed(1)}%).`); }
      else { score -= 25; reasons.push(`Margen bajo (${marginPercent.toFixed(1)}%).`); }

      const stock = finite(candidate.stock);
      if (stock >= 10) { score += 10; reasons.push('Buena disponibilidad del proveedor.'); }
      else if (stock > 0) { score += 5; reasons.push('Disponibilidad limitada.'); }
      else reasons.push('Stock del proveedor no confirmado.');

      if (candidate.description?.trim()) score += 5;
      if (candidate.imageUrl?.trim()) score += 5;
      if (candidate.supplierUrl?.trim()) score += 5;
      if (candidate.specifications && Object.keys(candidate.specifications).length) score += 5;

      if (duplicate === 'high') { score -= 30; reasons.push('Producto muy parecido a uno que ya existe en catálogo.'); }
      else if (duplicate === 'medium') { score -= 12; reasons.push('Posible solapamiento con el catálogo actual.'); }
      else { score += 8; reasons.push('Bajo riesgo de duplicar el catálogo.'); }

      if (marketPrice > 0) {
        const gap = ((marketPrice - suggestedPrice) / marketPrice) * 100;
        if (gap >= 5) { score += 7; reasons.push(`Precio sugerido ${gap.toFixed(1)}% bajo referencia de mercado.`); }
        else if (gap < -5) { score -= 8; reasons.push('Precio sugerido supera la referencia de mercado.'); }
      }

      return {
        ...candidate,
        supplierPrice,
        marketPrice: marketPrice || null,
        suggestedPrice,
        marginPercent: Number(marginPercent.toFixed(1)),
        score: Math.max(0, Math.min(100, Math.round(score))),
        duplicateRisk: duplicate,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || b.marginPercent - a.marginPercent)
    .slice(0, 12);
}
