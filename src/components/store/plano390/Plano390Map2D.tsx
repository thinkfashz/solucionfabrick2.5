'use client';
/*
 * Plano390Map2D — plano 2D (vista desde arriba) generado con el MISMO contrato
 * de datos que la escena 3D: ROOMS, WALLS, OPENINGS, FURNITURE_2D y CCTV_CAMERAS.
 * Se usa como panel "Plano 2D" y como miniatura en el panel de cámaras.
 */
import { CCTV_CAMERAS, FURNITURE_2D, OPENINGS, QUINCHO, ROOMS, WALLS } from '@/lib/plano390Data';
import type { Furniture2D, Opening } from '@/lib/plano390Data';

const FLOOR_FILL: Record<string, string> = {
  porcelain: '#1a2a31',
  wood: '#2b2419',
  tile: '#1d2c31',
  concrete: '#1b2023',
  terrace: '#2a261f',
};

const FURNITURE_STROKE = '#7d97a3';

function doorGlyph(o: Opening) {
  const w = o.kind === 'double' ? o.width / 2 : o.width;
  const swing = o.swing ?? 1;
  const hingeSign = o.hinge === 'right' ? 1 : -1;

  if (o.axis === 'z') {
    const hx = o.x + (hingeSign * o.width) / 2;
    const freeSign = hingeSign > 0 ? -1 : 1;
    const pts: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(`${hx + freeSign * w * Math.cos(a)},${o.z + swing * w * Math.sin(a)}`);
    }
    return (
      <g>
        <polyline points={pts.join(' ')} fill="none" stroke="#f0c46a" strokeWidth="0.035" strokeDasharray="0.12 0.1" />
        <line x1={hx} y1={o.z} x2={hx} y2={o.z + swing * w} stroke="#f0c46a" strokeWidth="0.09" strokeLinecap="round" />
      </g>
    );
  }
  const hz = o.z + (hingeSign * o.width) / 2;
  const freeSign = hingeSign > 0 ? -1 : 1;
  const pts: string[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(`${o.x + swing * w * Math.sin(a)},${hz + freeSign * w * Math.cos(a)}`);
  }
  return (
    <g>
      <polyline points={pts.join(' ')} fill="none" stroke="#f0c46a" strokeWidth="0.035" strokeDasharray="0.12 0.1" />
      <line x1={o.x} y1={hz} x2={o.x + swing * w} y2={hz} stroke="#f0c46a" strokeWidth="0.09" strokeLinecap="round" />
    </g>
  );
}

function Furniture({ f }: { f: Furniture2D }) {
  // El quincho se dibuja aparte, con su propia pérgola y etiqueta.
  if (f.kind === 'quincho') return null;
  const isRug = f.kind === 'rug';
  return (
    <rect
      x={f.x0}
      y={f.z0}
      width={f.x1 - f.x0}
      height={f.z1 - f.z0}
      rx={0.06}
      fill={isRug ? 'rgba(240,196,106,.06)' : 'rgba(125,151,163,.13)'}
      stroke={isRug ? 'rgba(240,196,106,.35)' : FURNITURE_STROKE}
      strokeWidth="0.045"
      strokeDasharray={isRug ? '0.12 0.1' : undefined}
    />
  );
}

export default function Plano390Map2D({
  compact = false,
  selectedCam = -1,
  onSelectCam,
  focus,
  onlyCam,
  className,
  marker,
  showCams = true,
}: {
  compact?: boolean;
  selectedCam?: number;
  onSelectCam?: (i: number) => void;
  /** Centro [x,z] para una miniatura enfocada en una zona. */
  focus?: [number, number];
  /** En miniaturas: dibujar solo el cono de esta cámara (menos nodos). */
  onlyCam?: number;
  className?: string;
  /** Posición [x,z] de la cámara del recorrido en la miniatura. */
  marker?: [number, number];
  /** Las fichas de recorrido usan un plano limpio, sin 14 conos. */
  showCams?: boolean;
}) {
  const allCams = typeof onlyCam === 'number' ? CCTV_CAMERAS.slice(onlyCam, onlyCam + 1) : CCTV_CAMERAS;
  const cams = showCams ? allCams : [];
  const labelSize = compact ? 0.42 : 0.3;
  const vb =
    compact && focus
      ? `${focus[0] - 3.1} ${focus[1] - 2.5} 6.2 5`
      : compact
        ? '-0.6 -0.6 15.8 12.2'
        : '-1.5 -1.5 17.6 15.2';
  return (
    <svg
      viewBox={vb}
      className={className}
      role="img"
      aria-label="Plano 2D de la casa Fabrick, vista desde arriba"
    >
      <rect x="-1.5" y="-1.5" width="17.6" height="15.2" fill="#081014" />

      {/* ── Terreno / porche / adoquín ── */}
      {!compact ? (
        <>
          <rect x="-1.5" y="-1.5" width="17.6" height="15.2" fill="#0a1418" />
          <rect x="0" y="0" width="14.6" height="11" fill="#0e171b" />
          <rect x="5.65" y="11" width="3.4" height="1.8" fill="#2a261f" stroke="#6b6354" strokeWidth="0.05" />
          <rect x="9.2" y="11" width="4.9" height="5.2" fill="#151b1d" stroke="#3d474b" strokeWidth="0.04" />
          <text x="7.35" y="11.9" textAnchor="middle" fontSize="0.24" fill="#c9bfa9">
            PORCHE
          </text>
          <text x="11.65" y="12.15" textAnchor="middle" fontSize="0.24" fill="#6f7c81">
            ADOQUÍN
          </text>
          <rect
            x={QUINCHO.x0}
            y={QUINCHO.z0}
            width={QUINCHO.x1 - QUINCHO.x0}
            height={QUINCHO.z1 - QUINCHO.z0}
            rx="0.12"
            fill="rgba(198,136,74,.16)"
            stroke="#c6884a"
            strokeWidth="0.045"
          />
          <text x={(QUINCHO.x0 + QUINCHO.x1) / 2} y={QUINCHO.z0 + 0.42} textAnchor="middle" fontSize="0.24" fill="#e0b07c">
            QUINCHO
          </text>
        </>
      ) : null}

      {/* ── Pisos ── */}
      {ROOMS.map((r) => (
        <rect
          key={r.id}
          x={r.x0}
          y={r.z0}
          width={r.x1 - r.x0}
          height={r.z1 - r.z0}
          fill={FLOOR_FILL[r.floor] ?? '#1a2a31'}
        />
      ))}

      {/* ── Muros ── */}
      {WALLS.map((w, i) => {
        const x = Math.min(w.x0, w.x1);
        const z = Math.min(w.z0, w.z1);
        const ww = Math.abs(w.x1 - w.x0) || 0.02;
        const hh = Math.abs(w.z1 - w.z0) || 0.02;
        return (
          <rect
            key={`w${i}`}
            x={x}
            y={z}
            width={ww}
            height={hh}
            fill={w.window ? 'rgba(201,239,99,.18)' : '#c9ef63'}
          />
        );
      })}

      {/* ── Ventanas y puertas ── */}
      {OPENINGS.map((o) => {
        const alongZ = o.axis === 'z';
        if (o.kind === 'slider' || o.kind === 'window') {
          return (
            <g key={o.id}>
              <line
                x1={alongZ ? o.x - o.width / 2 : o.x}
                y1={alongZ ? o.z : o.z - o.width / 2}
                x2={alongZ ? o.x + o.width / 2 : o.x}
                y2={alongZ ? o.z : o.z + o.width / 2}
                stroke="#7fd3ff"
                strokeWidth="0.11"
              />
              <line
                x1={alongZ ? o.x - o.width / 2 : o.x - 0.06}
                y1={alongZ ? o.z - 0.06 : o.z - o.width / 2}
                x2={alongZ ? o.x + o.width / 2 : o.x - 0.06}
                y2={alongZ ? o.z - 0.06 : o.z + o.width / 2}
                stroke="rgba(127,211,255,.45)"
                strokeWidth="0.04"
              />
            </g>
          );
        }
        if (o.kind === 'garage') {
          return (
            <line
              key={o.id}
              x1={o.x - o.width / 2}
              y1={o.z}
              x2={o.x + o.width / 2}
              y2={o.z}
              stroke="#f0c46a"
              strokeWidth="0.13"
              strokeDasharray="0.22 0.14"
            />
          );
        }
        return <g key={o.id}>{doorGlyph(o)}</g>;
      })}

      {/* ── Mobiliario ── */}
      {FURNITURE_2D.map((f, i) => (
        <Furniture key={`f${i}`} f={f} />
      ))}

      {/* ── Cámaras + cono de visión ── */}
      {cams.map((cam, i) => {
        const a = Math.atan2(cam.look[2] - cam.pos[2], cam.look[0] - cam.pos[0]);
        const half = Math.min((cam.fov * Math.PI) / 360, 0.9);
        const r = 2.6;
        const x0 = cam.pos[0] + r * Math.cos(a - half);
        const z0 = cam.pos[2] + r * Math.sin(a - half);
        const x1 = cam.pos[0] + r * Math.cos(a + half);
        const z1 = cam.pos[2] + r * Math.sin(a + half);
        const idx = typeof onlyCam === 'number' ? onlyCam : i;
        const on = selectedCam === idx;
        return (
          <g key={cam.id} onClick={() => onSelectCam?.(idx)} style={onSelectCam ? { cursor: 'pointer' } : undefined}>
            <path
              d={`M ${cam.pos[0]} ${cam.pos[2]} L ${x0} ${z0} A ${r} ${r} 0 0 1 ${x1} ${z1} Z`}
              fill={on ? 'rgba(246,198,74,.22)' : 'rgba(246,198,74,.07)'}
              stroke={on ? '#F6C64A' : 'rgba(246,198,74,.45)'}
              strokeWidth={on ? 0.05 : 0.03}
            />
            <circle cx={cam.pos[0]} cy={cam.pos[2]} r={compact ? 0.24 : 0.16} fill={on ? '#F6C64A' : '#f6e6bb'} />
            <circle cx={cam.pos[0]} cy={cam.pos[2]} r={compact ? 0.55 : 0.42} fill="transparent" />
            {!compact ? (
              <text x={cam.pos[0]} y={cam.pos[2] - 0.32} textAnchor="middle" fontSize="0.2" fill="#F6C64A" opacity={on ? 1 : 0.7}>
                {cam.id.replace('CAM-', '')}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* ── Etiquetas de ambientes ── */}
      {!compact
        ? ROOMS.map((r) => {
            const w = r.x1 - r.x0;
            const h = r.z1 - r.z0;
            const big = w * h > 8;
            return (
              <g key={`l${r.id}`} pointerEvents="none">
                <text
                  x={(r.x0 + r.x1) / 2}
                  y={(r.z0 + r.z1) / 2 - (big ? 0.12 : 0)}
                  textAnchor="middle"
                  fontSize={labelSize}
                  fontWeight="700"
                  fill="#f4efe4"
                  opacity="0.92"
                >
                  {r.name}
                </text>
                {big ? (
                  <text
                    x={(r.x0 + r.x1) / 2}
                    y={(r.z0 + r.z1) / 2 + 0.32}
                    textAnchor="middle"
                    fontSize="0.23"
                    fill="#c9bfa9"
                    opacity="0.8"
                  >
                    {`${w.toFixed(2)} × ${h.toFixed(2)} m · ${r.areaM2.toFixed(1)} m²`}
                  </text>
                ) : null}
              </g>
            );
          })
        : null}

      {/* ── Posición de la cámara del recorrido ── */}
      {marker ? (
        <g pointerEvents="none">
          <circle cx={marker[0]} cy={marker[1]} r={compact ? 0.62 : 0.48} fill="rgba(201,239,99,.16)" />
          <circle cx={marker[0]} cy={marker[1]} r={compact ? 0.3 : 0.24} fill="#c9ef63" stroke="#071017" strokeWidth="0.06" />
          <circle cx={marker[0]} cy={marker[1]} r={compact ? 0.12 : 0.09} fill="#071017" />
        </g>
      ) : null}

      {/* ── Cotas generales ── */}
      {!compact ? (
        <g stroke="#F6C64A" fill="#F6C64A" opacity="0.85">
          <line x1="0" y1="-0.72" x2="14.6" y2="-0.72" strokeWidth="0.03" />
          <line x1="0" y1="-0.88" x2="0" y2="-0.56" strokeWidth="0.03" />
          <line x1="14.6" y1="-0.88" x2="14.6" y2="-0.56" strokeWidth="0.03" />
          <text x="7.3" y="-0.86" textAnchor="middle" fontSize="0.3" stroke="none">
            14,60 m
          </text>
          <line x1="-0.72" y1="0" x2="-0.72" y2="11" strokeWidth="0.03" />
          <line x1="-0.9" y1="0" x2="-0.54" y2="0" strokeWidth="0.03" />
          <line x1="-0.9" y1="11" x2="-0.54" y2="11" strokeWidth="0.03" />
          <text
            x="-0.86"
            y="5.5"
            textAnchor="middle"
            fontSize="0.3"
            stroke="none"
            transform="rotate(-90 -0.86 5.5)"
          >
            11,00 m
          </text>
          {/* escala 1 m */}
          <line x1="0.3" y1="13.4" x2="1.3" y2="13.4" strokeWidth="0.05" />
          <line x1="0.3" y1="13.25" x2="0.3" y2="13.55" strokeWidth="0.04" />
          <line x1="1.3" y1="13.25" x2="1.3" y2="13.55" strokeWidth="0.04" />
          <text x="0.8" y="13.9" textAnchor="middle" fontSize="0.24" stroke="none">
            1 m
          </text>
          {/* norte */}
          <g transform="translate(14.9 -0.1)">
            <circle r="0.28" fill="none" stroke="#F6C64A" strokeWidth="0.03" />
            <path d="M 0 0.2 L 0 -0.2 L -0.12 -0.02 L 0 -0.2 L 0.12 -0.02" fill="none" stroke="#F6C64A" strokeWidth="0.045" />
            <text y="-0.38" textAnchor="middle" fontSize="0.2" stroke="none">
              N
            </text>
          </g>
        </g>
      ) : null}
    </svg>
  );
}
