'use client';

import { motion } from 'framer-motion';

/**
 * Pulsing live indicator. Used in headers ("● Live"), connection pulses, and
 * step charts to highlight a freshly-arrived value. Pure-CSS would suffice
 * but Framer Motion lets us co-ordinate with the rest of the admin animations
 * and pause when reduced-motion is preferred.
 */
export type LiveDotStatus = 'ok' | 'warn' | 'error' | 'idle';

const COLOR: Record<LiveDotStatus, string> = {
  ok: '#22c55e',
  warn: '#f59e0b',
  error: '#ef4444',
  idle: '#52525b',
};

export function LiveDot({
  status = 'ok',
  size = 8,
  label,
}: {
  status?: LiveDotStatus;
  size?: number;
  label?: string;
}) {
  const c = COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 align-middle"
      role="status"
      aria-label={label ?? `Estado: ${status}`}
    >
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          style={{ background: c }}
        />
        <span
          className="relative inline-block rounded-full"
          style={{ width: size, height: size, background: c, boxShadow: `0 0 6px ${c}aa` }}
        />
      </span>
      {label && <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>}
    </span>
  );
}

export default LiveDot;
