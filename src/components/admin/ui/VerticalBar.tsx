'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Animated vertical bar used by the system monitor and the admin dashboard
 * to visualise a single metric (latency, count, percentage).
 *
 * The visual height animates with a Framer Motion spring, while a "breathing"
 * pulse sits on top of the bar when status is `ok`. On error the bar pulses
 * red and a small triangle marker appears at the top.
 *
 * Designed mobile-first: each instance occupies ~56-72px width and stretches
 * vertically inside the parent container.
 */

export type BarStatus = 'ok' | 'warn' | 'error' | 'idle';

const STATUS_COLOR: Record<BarStatus, { bar: string; glow: string; text: string }> = {
  ok: { bar: '#22c55e', glow: 'rgba(34,197,94,0.5)', text: 'text-emerald-300' },
  warn: { bar: '#f59e0b', glow: 'rgba(245,158,11,0.5)', text: 'text-amber-300' },
  error: { bar: '#ef4444', glow: 'rgba(239,68,68,0.6)', text: 'text-rose-300' },
  idle: { bar: '#52525b', glow: 'rgba(82,82,91,0.3)', text: 'text-zinc-400' },
};

export interface VerticalBarProps {
  /** Metric value 0-100. Caller is responsible for normalising. */
  value: number;
  /** Status that drives the colour and pulse animation. */
  status: BarStatus;
  /** Short label rendered under the bar (e.g. "DB", "MP"). */
  label: string;
  /** Optional sub-label rendered below the main label (e.g. "120ms"). */
  sublabel?: ReactNode;
  /** Click handler — the whole bar becomes a button when set. */
  onClick?: () => void;
  /** Total height of the bar gauge in pixels (default 160). */
  height?: number;
}

export function VerticalBar({
  value,
  status,
  label,
  sublabel,
  onClick,
  height = 160,
}: VerticalBarProps) {
  const safe = Math.max(0, Math.min(100, value));
  const color = STATUS_COLOR[status];
  const pulseAnim =
    status === 'error'
      ? { scale: [1, 1.04, 1], opacity: [1, 0.7, 1] }
      : status === 'ok'
      ? { opacity: [1, 0.85, 1] }
      : {};

  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.03 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-zinc-950/70 px-2.5 py-3 text-left"
      style={{ minWidth: 56 }}
    >
      <div
        className="relative w-3 overflow-hidden rounded-full bg-white/5"
        style={{ height }}
      >
        <motion.div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 rounded-full"
          initial={{ height: 0 }}
          animate={{ height: `${safe}%`, ...pulseAnim }}
          transition={{
            height: { type: 'spring', stiffness: 180, damping: 22 },
            opacity: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{
            background: `linear-gradient(180deg, ${color.bar}, ${color.bar}cc)`,
            boxShadow: `0 0 12px ${color.glow}`,
          }}
        />
        {/* Top marker */}
        {status !== 'idle' && (
          <motion.div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            initial={{ bottom: 0 }}
            animate={{ bottom: `calc(${safe}% - 4px)` }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            style={{
              width: 8,
              height: 8,
              background: color.bar,
              boxShadow: `0 0 8px ${color.glow}`,
            }}
          />
        )}
      </div>
      <span className="mt-1 max-w-[64px] truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
        {label}
      </span>
      {sublabel !== undefined && (
        <span className={`text-[10px] font-mono ${color.text}`}>{sublabel}</span>
      )}
    </Wrapper>
  );
}

export default VerticalBar;
