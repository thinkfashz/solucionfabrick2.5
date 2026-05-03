import type { ReactNode } from 'react';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  normalizeOrderStatus,
  type OrderStatus,
} from '@/lib/commerce';

/**
 * Unified status pill used by all order-adjacent screens (`/admin/pedidos`,
 * `/admin/pedidos/[id]`, `/admin/entregas`, `/admin/facturas`). Backed by the
 * canonical `ORDER_STATUS_COLORS` from `@/lib/commerce` so the colour
 * vocabulary stays consistent across the admin.
 */
export interface StatusBadgeProps {
  status: OrderStatus | string | null | undefined;
  /** Override the displayed label (defaults to the i18n label). */
  label?: ReactNode;
  /** Visual density. */
  size?: 'sm' | 'md';
  /** Adds a "halo" ring for emphasis. */
  halo?: boolean;
}

export function StatusBadge({ status, label, size = 'sm', halo = false }: StatusBadgeProps) {
  const norm = normalizeOrderStatus(typeof status === 'string' ? status : status ?? undefined);
  const color = ORDER_STATUS_COLORS[norm];
  const text = label ?? ORDER_STATUS_LABELS[norm];
  const padding = size === 'md' ? 'px-3.5 py-1.5 text-[11px]' : 'px-2.5 py-1 text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-[0.18em] ${padding}`}
      style={{
        background: `${color}1f`,
        color,
        border: `1px solid ${color}55`,
        boxShadow: halo ? `0 0 0 4px ${color}1a, 0 0 16px ${color}55` : undefined,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {text}
    </span>
  );
}

export default StatusBadge;
