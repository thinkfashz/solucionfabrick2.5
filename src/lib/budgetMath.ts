/**
 * budgetMath
 * ----------
 * Pure, isomorphic helpers for the Cotizador. Safe to import from both server
 * and client code (no `server-only`, no DB access).
 *
 *   - Tax rate constants (Chile)
 *   - `computeTotals` aggregates a cart with optional shipping/installation
 *   - `buildProposal` converts a finalized cart into a structured object
 *     suitable for printing or persisting as a "Propuesta Técnica"
 */

/** Chilean VAT rate (IVA). */
export const IVA_RATE = 0.19;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface QuoteLine {
  /** Stable id of the material (DB UUID or catalog id). */
  materialId: string;
  /** Display name at the time of quoting (frozen). */
  name: string;
  /** Optional category label. */
  category?: string;
  /** Cobro unit ("m²", "ml", "u", etc.). */
  unit?: string;
  /** Unit price in CLP at the time of quoting (frozen). */
  unitPrice: number;
  /** Quantity selected. */
  quantity: number;
  /** Optional image URL (frozen). */
  imageUrl?: string;
}

export interface TotalsOptions {
  /** Override IVA rate (defaults to 0.19). */
  ivaRate?: number;
  /** Optional shipping/despacho fee in CLP (added to subtotal pre-IVA). */
  shippingCost?: number;
  /** Optional installation fee in CLP (added to subtotal pre-IVA). */
  installationCost?: number;
}

export interface Totals {
  itemsSubtotal: number;
  shippingCost: number;
  installationCost: number;
  /** itemsSubtotal + shipping + installation. */
  subtotal: number;
  ivaRate: number;
  iva: number;
  total: number;
  /** Total quantity of items (for badges). */
  itemCount: number;
}

/* -------------------------------------------------------------------------- */
/*  Aggregation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Aggregates a list of quote lines into commercial totals.
 *
 * Rounds CLP amounts to integers (Chile has no cents in retail) and clamps
 * negative quantities to 0 so corrupted input can't produce nonsense totals.
 */
export function computeTotals(lines: QuoteLine[], opts: TotalsOptions = {}): Totals {
  const ivaRate = Number.isFinite(opts.ivaRate) ? Number(opts.ivaRate) : IVA_RATE;
  const shippingCost = clampNonNegative(opts.shippingCost ?? 0);
  const installationCost = clampNonNegative(opts.installationCost ?? 0);

  let itemsSubtotal = 0;
  let itemCount = 0;
  for (const l of lines) {
    const qty = clampNonNegative(l.quantity);
    const price = clampNonNegative(l.unitPrice);
    itemsSubtotal += qty * price;
    itemCount += qty;
  }

  const subtotal = itemsSubtotal + shippingCost + installationCost;
  const iva = subtotal * ivaRate;
  const total = subtotal + iva;

  return {
    itemsSubtotal: roundCLP(itemsSubtotal),
    shippingCost: roundCLP(shippingCost),
    installationCost: roundCLP(installationCost),
    subtotal: roundCLP(subtotal),
    ivaRate,
    iva: roundCLP(iva),
    total: roundCLP(total),
    itemCount,
  };
}

/* -------------------------------------------------------------------------- */
/*  Proposal generator                                                        */
/* -------------------------------------------------------------------------- */

export interface ProposalCustomer {
  name?: string;
  email?: string;
  phone?: string;
  region?: string;
  notes?: string;
}

export interface ProposalSection {
  category: string;
  label: string;
  lines: Array<QuoteLine & { lineTotal: number }>;
  subtotal: number;
}

export interface Proposal {
  /** Quote DB id (or empty string if not yet persisted). */
  id: string;
  /** ISO timestamp of generation. */
  issuedAt: string;
  /** Document number (human-friendly, e.g. "FAB-2026-0001"). */
  docNumber: string;
  customer: ProposalCustomer;
  sections: ProposalSection[];
  totals: Totals;
  /**
   * Validity in days for the price guarantee. Useful for legal copy on the
   * printable proposal.
   */
  validityDays: number;
  /** Free-form summary line for the cover. */
  summary: string;
}

/** Stable, predictable category labels for the proposal. */
const CATEGORY_LABELS: Record<string, string> = {
  'obra-gruesa': 'Obra Gruesa',
  terminaciones: 'Terminaciones',
  especialidades: 'Especialidades',
  servicios: 'Servicios',
  electricidad: 'Electricidad',
  gasfiteria: 'Gasfitería',
  climatizacion: 'Climatización',
  conectividad: 'Conectividad',
  seguridad: 'Seguridad',
};

/**
 * Converts a finalized cart into a structured Proposal object.
 *
 * The result is JSON-serializable so it can be persisted in `quotes.totals`,
 * sent to a PDF renderer, or attached to an email without further massaging.
 */
export function buildProposal(input: {
  id?: string;
  lines: QuoteLine[];
  totals?: Totals;
  customer?: ProposalCustomer;
  totalsOptions?: TotalsOptions;
  issuedAt?: Date;
  validityDays?: number;
}): Proposal {
  const issuedAt = input.issuedAt ?? new Date();
  const totals = input.totals ?? computeTotals(input.lines, input.totalsOptions);

  const grouped = new Map<string, ProposalSection>();
  for (const l of input.lines) {
    const key = (l.category || 'servicios').toLowerCase();
    const label = CATEGORY_LABELS[key] || titleCase(key);
    let section = grouped.get(key);
    if (!section) {
      section = { category: key, label, lines: [], subtotal: 0 };
      grouped.set(key, section);
    }
    const lineTotal = roundCLP(clampNonNegative(l.unitPrice) * clampNonNegative(l.quantity));
    section.lines.push({ ...l, lineTotal });
    section.subtotal += lineTotal;
  }
  for (const s of grouped.values()) s.subtotal = roundCLP(s.subtotal);

  return {
    id: input.id ?? '',
    issuedAt: issuedAt.toISOString(),
    docNumber: makeDocNumber(input.id, issuedAt),
    customer: input.customer ?? {},
    sections: Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label, 'es')),
    totals,
    validityDays: input.validityDays ?? 15,
    summary: buildSummary(input.lines, totals),
  };
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                */
/* -------------------------------------------------------------------------- */

/** Format a CLP amount the Chilean way. */
export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(value) ? value : 0));
}

/* -------------------------------------------------------------------------- */
/*  Internals                                                                 */
/* -------------------------------------------------------------------------- */

function clampNonNegative(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

function roundCLP(n: number): number {
  return Math.round(n);
}

function titleCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function makeDocNumber(id: string | undefined, issuedAt: Date): string {
  const year = issuedAt.getFullYear();
  // Use the last 6 chars of the UUID (or a short timestamp fallback) so the
  // doc number is human-friendly without leaking the full DB id.
  const tail = (id ?? Math.random().toString(36).slice(2)).replace(/-/g, '').slice(-6).toUpperCase();
  return `FAB-${year}-${tail}`;
}

function buildSummary(lines: QuoteLine[], totals: Totals): string {
  const distinctCats = new Set(lines.map((l) => l.category || 'servicios')).size;
  const itemsLabel = totals.itemCount === 1 ? '1 ítem' : `${totals.itemCount} ítems`;
  const catsLabel = distinctCats <= 1 ? '1 categoría' : `${distinctCats} categorías`;
  return `Propuesta técnica con ${itemsLabel} en ${catsLabel}, total estimado ${formatCLP(
    totals.total,
  )} (IVA incluido).`;
}
