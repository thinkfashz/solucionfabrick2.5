'use client';
import { useState } from 'react';
import { MMI_COLORS, MMI_LEVELS } from './mmiScale';

type Props = { activeMmi: number; liveMmi: number; onSelect?: (mmi: number) => void; selectable?: boolean };

export default function MercalliScaleChart({ activeMmi, liveMmi, onSelect, selectable = true }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const focus = MMI_LEVELS[(hover ?? activeMmi) - 1] ?? MMI_LEVELS[6];
  const COL = 17, GAP = 3, LABEL_H = 11, H = 86;
  const W = MMI_LEVELS.length * COL;
  const livePct = Math.min(100, Math.max(0, (liveMmi / 12) * 100));
  return (
    <div className="rounded-xl border border-white/8 bg-white/[.02] p-2.5" data-testid="mmi-chart">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[8px] uppercase text-white/38">Escala Mercalli (MMI)</span>
        <span className="text-[8px] font-black text-[#FFE600]">actual {liveMmi.toFixed(1)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Escala de intensidad sísmica Mercalli modificada">
        {MMI_LEVELS.map((l) => {
          const h = 8 + (l.mmi / 12) * (H - LABEL_H - 8);
          const x = (l.mmi - 1) * COL;
          const active = l.mmi === activeMmi;
          const hot = hover === l.mmi;
          return (
            <g
              key={l.mmi}
              onClick={selectable && onSelect ? () => onSelect(l.mmi) : undefined}
              onMouseEnter={() => setHover(l.mmi)}
              onMouseLeave={() => setHover(null)}
              className={selectable && onSelect ? 'cursor-pointer' : 'cursor-default'}
            >
              <rect
                x={x + 0.5}
                y={H - LABEL_H - h}
                width={COL - GAP}
                height={h}
                rx={2}
                fill={MMI_COLORS[l.mmi - 1]}
                opacity={active ? 1 : hot ? 0.9 : 0.58}
                stroke={active ? '#FFE600' : 'rgba(255,255,255,.12)'}
                strokeWidth={active ? 1.4 : 0.5}
              />
              <text x={x + (COL - GAP) / 2} y={H - 2.5} textAnchor="middle" fontSize={6.2} fontWeight={900} fill={active ? '#FFE600' : 'rgba(255,255,255,.55)'}>
                {l.roman}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#2f9e44,#7cb518,#FFE600,#ff8c1a,#e8442a,#6a040f)] transition-[width] duration-700 ease-out"
          style={{ width: `${livePct}%` }}
        />
      </div>
      <p className="mt-1.5 min-h-[22px] text-[8px] leading-[11px] text-white/45">
        <b className="text-white/70">{focus.label}:</b> {focus.effect}
      </p>
    </div>
  );
}
