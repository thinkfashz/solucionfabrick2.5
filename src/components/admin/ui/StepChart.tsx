'use client';

import { motion } from 'framer-motion';
import { useId, useMemo } from 'react';

/**
 * Animated stepped (staircase) line chart, trading-terminal style.
 *
 * Renders a SVG `path` with `pathLength` animation 0→1 (Framer Motion) so the
 * line draws itself on mount and on data change. Optionally overlays a pulsing
 * red dot on the most recent point (`livePulse`) for that "live trading"
 * feel asked for in the admin centro de control plan.
 *
 * Mobile-first: scales to 100% of its parent's width, fixed height.
 */

export interface StepChartPoint {
  /** Unix-ms timestamp or any monotonic x label. */
  x: number;
  /** Numeric value at this point. */
  y: number;
}

export interface StepChartProps {
  data: StepChartPoint[];
  /** Pixel height of the chart. Defaults to 140. */
  height?: number;
  /** Stroke colour. Defaults to yellow accent. */
  color?: string;
  /** Fill the area under the line with a soft gradient. */
  area?: boolean;
  /** Show the pulsing red live dot on the latest point. */
  livePulse?: boolean;
  /** Optional className for the wrapper. */
  className?: string;
  /** Force a fixed Y range. Otherwise inferred from data with 10% padding. */
  yRange?: [number, number];
}

export function StepChart({
  data,
  height = 140,
  color = '#facc15',
  area = true,
  livePulse = false,
  className,
  yRange,
}: StepChartProps) {
  const gradId = useId().replace(/[:#]/g, '');

  const { d, areaPath, lastX, lastY, viewBox } = useMemo(() => {
    if (data.length === 0) {
      return { d: '', areaPath: '', lastX: 0, lastY: 0, viewBox: '0 0 100 100' };
    }
    const W = 1000;
    const H = 1000;
    const xs = data.map((p) => p.x);
    const ys = data.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = yRange?.[0] ?? Math.min(...ys);
    const yMaxRaw = yRange?.[1] ?? Math.max(...ys);
    const yMax = yMaxRaw === yMin ? yMin + 1 : yMaxRaw;
    const padTop = 40;
    const padBot = 40;
    const padX = 20;
    const fx = (x: number) =>
      xMax === xMin ? padX : padX + ((x - xMin) / (xMax - xMin)) * (W - padX * 2);
    const fy = (y: number) =>
      H - padBot - ((y - yMin) / (yMax - yMin)) * (H - padTop - padBot);

    // Step-after path: hold each y until the next x, then jump.
    let path = '';
    let areaP = '';
    data.forEach((p, i) => {
      const x = fx(p.x);
      const y = fy(p.y);
      if (i === 0) {
        path += `M ${x} ${y}`;
        areaP += `M ${x} ${H - padBot} L ${x} ${y}`;
      } else {
        const prevY = fy(data[i - 1].y);
        path += ` L ${x} ${prevY} L ${x} ${y}`;
        areaP += ` L ${x} ${prevY} L ${x} ${y}`;
      }
    });
    const last = data[data.length - 1];
    const lx = fx(last.x);
    const ly = fy(last.y);
    areaP += ` L ${lx} ${H - padBot} Z`;

    return {
      d: path,
      areaPath: areaP,
      lastX: lx,
      lastY: ly,
      viewBox: `0 0 ${W} ${H}`,
    };
  }, [data, yRange]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-white/5 bg-black/30 text-[11px] text-zinc-600 ${className ?? ''}`}
        style={{ height }}
      >
        Sin datos
      </div>
    );
  }

  return (
    <div className={className} style={{ height, width: '100%' }}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        role="img"
        aria-label="Gráfica de tiempo escalonada"
      >
        <defs>
          <linearGradient id={`grad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && (
          <motion.path
            d={areaPath}
            fill={`url(#grad-${gradId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
        {livePulse && (
          <>
            <motion.circle
              cx={lastX}
              cy={lastY}
              r={28}
              fill="#ef4444"
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 2.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              style={{ transformOrigin: `${lastX}px ${lastY}px` }}
            />
            <circle
              cx={lastX}
              cy={lastY}
              r={14}
              fill="#ef4444"
              style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

export default StepChart;
