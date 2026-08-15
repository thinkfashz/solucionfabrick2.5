import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { load } from 'cheerio';
import { insforgeAdmin } from '@/lib/insforge';
import { evaluateIntelligenceAction } from '@/lib/fabrickIntelligencePolicy';
import { appendAudit, saveProposal, type IntelligenceProposal } from '@/lib/fabrickIntelligenceStore';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;
const MAX_TARGETS_PER_RUN = 35;
const MAX_HTML_BYTES = 1_500_000;
const MIN_CHANGE_TO_PROPOSE = 3;
const MIN_MARGIN = 25;

type WatchTarget = {
  id: string;
  tenant_id: string;
  product_id: string;
  source?: string | null;
  source_url: string;
  enabled?: boolean | null;
  check_interval_minutes?: number | null;
  last_checked_at?: string | null;
};

type Product = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  supplier_price?: number | string | null;
};

type Observation = {
  price: number;
  currency: string;
  inStock: boolean | null;
  finalUrl: string;
  extractor: string;
};

function numeric(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function isPrivateIpv6(ip: string) {
  const value = ip.toLowerCase();
  return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:') || value.startsWith('::ffff:127.') || value.startsWith('::ffff:10.') || value.startsWith('::ffff:192.168.');
}

async function assertSafeUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL de proveedor debe usar http/https.');
  if (url.username || url.password) throw new Error('URL de proveedor con credenciales embebidas bloqueada.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Host local bloqueado.');

  const literal = isIP(host);
  if (literal === 4 && isPrivateIpv4(host)) throw new Error('IP privada bloqueada.');
  if (literal === 6 && isPrivateIpv6(host)) throw new Error('IPv6 privada bloqueada.');
  if (!literal) {
    const resolved = await lookup(host, { all: true, verbatim: true });
    if (!resolved.length) throw new Error('Proveedor sin DNS resoluble.');
    for (const item of resolved) {
      if ((item.family === 4 && isPrivateIpv4(item.address)) || (item.family === 6 && isPrivateIpv6(item.address))) {
        throw new Error('Proveedor resuelve a una red privada bloqueada.');
      }
    }
  }
  return url;
}

async function fetchSafe(raw: string): Promise<{ html: string; finalUrl: string; contentType: string }> {
  let current = await assertSafeUrl(raw);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'user-agent': 'SolucionesFabrick-PriceWatch/2.0 (+https://www.solucionesfabrick.com)',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.6',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Redirección HTTP ${response.status} sin Location.`);
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Proveedor respondió HTTP ${response.status}.`);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_HTML_BYTES) throw new Error('Respuesta del proveedor demasiado grande.');
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_HTML_BYTES) throw new Error('Respuesta del proveedor excede el límite de análisis.');
    return { html: text, finalUrl: current.toString(), contentType: response.headers.get('content-type') || '' };
  }
  throw new Error('Demasiadas redirecciones del proveedor.');
}

function parsePrice(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
  const raw = String(value ?? '').trim().replace(/\s+/g, '');
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return 0;
  let normalized = cleaned;
  const dots = (cleaned.match(/\./g) || []).length;
  const commas = (cleaned.match(/,/g) || []).length;
  if (dots && commas) {
    const decimal = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.';
    const thousand = decimal === ',' ? '.' : ',';
    normalized = cleaned.split(thousand).join('').replace(decimal, '.');
  } else if (commas === 1) {
    const tail = cleaned.split(',')[1]?.length || 0;
    normalized = tail === 2 ? cleaned.replace(',', '.') : cleaned.replace(',', '');
  } else if (dots >= 1) {
    const tail = cleaned.split('.').at(-1)?.length || 0;
    normalized = dots === 1 && tail === 2 ? cleaned : cleaned.replace(/\./g, '');
  }
  const result = Number(normalized);
  return Number.isFinite(result) && result > 0 ? result : 0;
}

function deepProductOffers(value: unknown): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const row = node as Record<string, unknown>;
    const type = String(row['@type'] || '').toLowerCase();
    if (type === 'product' && row.offers) {
      const offers = Array.isArray(row.offers) ? row.offers : [row.offers];
      for (const offer of offers) if (offer && typeof offer === 'object') found.push(offer as Record<string, unknown>);
    }
    for (const child of Object.values(row)) visit(child);
  };
  visit(value);
  return found;
}

function extractObservation(html: string, contentType: string, finalUrl: string): Observation {
  if (contentType.includes('application/json')) {
    const json = JSON.parse(html) as Record<string, unknown>;
    const price = parsePrice(json.price ?? json.supplier_price ?? json.sale_price);
    if (price > 0) return { price, currency: String(json.currency || 'CLP').toUpperCase().slice(0, 8), inStock: typeof json.in_stock === 'boolean' ? json.in_stock : null, finalUrl, extractor: 'json' };
  }

  const $ = load(html);
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(element).text();
    if (!raw.trim()) continue;
    try {
      const offers = deepProductOffers(JSON.parse(raw));
      for (const offer of offers) {
        const price = parsePrice(offer.price ?? offer.lowPrice ?? offer.highPrice);
        if (!price) continue;
        const availability = String(offer.availability || '').toLowerCase();
        return {
          price,
          currency: String(offer.priceCurrency || 'CLP').toUpperCase().slice(0, 8),
          inStock: availability ? !/(outofstock|soldout|discontinued)/i.test(availability) : null,
          finalUrl,
          extractor: 'json-ld',
        };
      }
    } catch { /* ignore malformed third-party JSON-LD */ }
  }

  const selectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[itemprop="price"]',
    '[itemprop="price"]',
    '[data-price]',
  ];
  for (const selector of selectors) {
    const node = $(selector).first();
    if (!node.length) continue;
    const price = parsePrice(node.attr('content') ?? node.attr('data-price') ?? node.attr('value') ?? node.text());
    if (!price) continue;
    const currency = $('meta[property="product:price:currency"], meta[itemprop="priceCurrency"]').first().attr('content') || 'CLP';
    return { price, currency: String(currency).toUpperCase().slice(0, 8), inStock: null, finalUrl, extractor: selector };
  }
  throw new Error('No se pudo detectar un precio estructurado en la página del proveedor.');
}

function isDue(target: WatchTarget, now: number) {
  if (target.enabled === false) return false;
  if (!target.last_checked_at) return true;
  const interval = Math.max(60, Number(target.check_interval_minutes || 1440)) * 60_000;
  const checked = Date.parse(target.last_checked_at);
  return !Number.isFinite(checked) || checked + interval <= now;
}

function roundCommercial(value: number) {
  if (value <= 0) return 0;
  if (value < 10_000) return Math.ceil(value / 100) * 100;
  return Math.ceil(value / 1000) * 1000 - 10;
}

async function proposalForChange(input: {
  target: WatchTarget;
  product: Product;
  previousPrice: number;
  observedPrice: number;
  currency: string;
  changePercent: number;
}) {
  const currentSell = numeric(input.product.price);
  if (currentSell <= 0) return null;
  const currentMargin = input.previousPrice > 0 ? Math.max(MIN_MARGIN, Math.min(70, ((currentSell - input.previousPrice) / currentSell) * 100)) : MIN_MARGIN;
  const observedMargin = ((currentSell - input.observedPrice) / currentSell) * 100;
  if (Math.abs(input.changePercent) < MIN_CHANGE_TO_PROPOSE && observedMargin >= MIN_MARGIN) return null;

  const suggested = roundCommercial(input.observedPrice / (1 - currentMargin / 100));
  const action = {
    type: 'price.propose' as const,
    resourceId: input.product.id,
    payload: {
      price: suggested,
      supplierPrice: input.observedPrice,
      source: input.target.source || null,
      sourceUrl: input.target.source_url,
      reason: `Price Watch detectó cambio de costo ${input.changePercent.toFixed(1)}%.`,
      observedCurrency: input.currency,
    },
  };
  const decision = evaluateIntelligenceAction('superadmin', action, {
    currentPrice: currentSell,
    supplierPrice: input.observedPrice,
    minMarginPercent: MIN_MARGIN,
    priceChangeApprovalPercent: 10,
  });
  if (!decision.allowed) return null;

  const proposal: IntelligenceProposal = {
    id: crypto.randomUUID(),
    tenantId: input.target.tenant_id,
    actorEmail: 'fabrick-price-watch@system',
    actorRole: 'superadmin',
    status: 'pending',
    action: { ...action, payload: decision.normalizedPayload },
    decision: { ...decision, requiresApproval: true },
    createdAt: new Date().toISOString(),
  };
  await saveProposal(proposal);
  await appendAudit({
    tenantId: input.target.tenant_id,
    actorEmail: proposal.actorEmail,
    actorRole: 'superadmin',
    proposalId: proposal.id,
    action: action.type,
    status: 'proposal_created_by_price_watch',
    detail: { productId: input.product.id, previousPrice: input.previousPrice, observedPrice: input.observedPrice, changePercent: input.changePercent },
  });
  return proposal.id;
}

export async function runSupplierPriceWatch() {
  const now = Date.now();
  const { data, error } = await insforgeAdmin.database
    .from('supplier_watch_targets')
    .select('id,tenant_id,product_id,source,source_url,enabled,check_interval_minutes,last_checked_at')
    .eq('enabled', true)
    .limit(500);
  if (error) throw new Error(error.message);

  const targets = ((Array.isArray(data) ? data : []) as WatchTarget[]).filter((t) => isDue(t, now)).slice(0, MAX_TARGETS_PER_RUN);
  const results: Array<Record<string, unknown>> = [];

  for (const target of targets) {
    const checkedAt = new Date().toISOString();
    try {
      const { data: products, error: productError } = await insforgeAdmin.database
        .from('products')
        .select('id,name,price,supplier_price')
        .eq('tenant_id', target.tenant_id)
        .eq('id', target.product_id)
        .limit(1);
      if (productError) throw new Error(productError.message);
      const product = Array.isArray(products) ? products[0] as Product : null;
      if (!product) throw new Error('Producto asociado no existe en el tenant.');

      const { data: previousRows, error: previousError } = await insforgeAdmin.database
        .from('supplier_price_history')
        .select('supplier_price,currency,in_stock,observed_at')
        .eq('tenant_id', target.tenant_id)
        .eq('product_id', target.product_id)
        .order('observed_at', { ascending: false })
        .limit(1);
      if (previousError) throw new Error(previousError.message);
      const previous = Array.isArray(previousRows) ? previousRows[0] as any : null;
      const previousPrice = previous ? numeric(previous.supplier_price) : numeric(product.supplier_price);

      const fetched = await fetchSafe(target.source_url);
      const observation = extractObservation(fetched.html, fetched.contentType, fetched.finalUrl);
      const { error: historyError } = await insforgeAdmin.database.from('supplier_price_history').insert([{
        tenant_id: target.tenant_id,
        product_id: target.product_id,
        watch_target_id: target.id,
        source: target.source || null,
        source_url: observation.finalUrl,
        supplier_price: observation.price,
        currency: observation.currency,
        in_stock: observation.inStock,
        raw: { extractor: observation.extractor },
        observed_at: checkedAt,
      }]);
      if (historyError) throw new Error(historyError.message);

      const changePercent = previousPrice > 0 ? ((observation.price - previousPrice) / previousPrice) * 100 : 0;
      const proposalId = previous ? await proposalForChange({ target, product, previousPrice, observedPrice: observation.price, currency: observation.currency, changePercent }) : null;

      const { error: updateError } = await insforgeAdmin.database.from('supplier_watch_targets').update({
        last_checked_at: checkedAt,
        last_status: 'ok',
        last_error: null,
        updated_at: checkedAt,
      }).eq('id', target.id).eq('tenant_id', target.tenant_id);
      if (updateError) throw new Error(updateError.message);
      results.push({ targetId: target.id, productId: target.product_id, ok: true, price: observation.price, currency: observation.currency, changePercent: Math.round(changePercent * 10) / 10, proposalId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await insforgeAdmin.database.from('supplier_watch_targets').update({
        last_checked_at: checkedAt,
        last_status: 'error',
        last_error: message.slice(0, 1000),
        updated_at: checkedAt,
      }).eq('id', target.id).eq('tenant_id', target.tenant_id).catch(() => null);
      results.push({ targetId: target.id, productId: target.product_id, ok: false, error: message });
    }
  }

  return {
    checked: results.length,
    ok: results.filter((r) => r.ok === true).length,
    failed: results.filter((r) => r.ok !== true).length,
    proposals: results.filter((r) => Boolean(r.proposalId)).length,
    results,
    runAt: new Date().toISOString(),
  };
}
