'use client';

/**
 * Isometric Network Observatory
 * ------------------------------------------------------------------
 * Canvas-based isometric "industrial dashboard" view of the Fabrick
 * network. Each external service (Vercel, InsForge, GitHub, Cloudflare,
 * Meta, MercadoPago, TikTok, Google) is drawn as a tiny isometric cube
 * on a dotted-grid board, connected by energy lines with traveling
 * light pulses.
 *
 * Sizing is responsive (driven by the wrapper's `--iso-map-h` CSS variable
 * and the canvas `layout()` helper):
 *   - Desktop (>=1024px) : 500px tall, full-size cubes
 *   - Tablet  (>=768px)  : 400px tall, full-size cubes
 *   - Mobile             : 360px tall, cubes drawn at ~60% size
 *
 * Only the visual layer lives here — the caller is responsible for
 * running the health-check polling and passing down per-node statuses.
 */

import { useEffect, useRef } from 'react';

// ── public types ─────────────────────────────────────────────────────────────

export type IsoNodeStatus = 'online' | 'slow' | 'offline' | 'unconfigured' | 'unknown';

export type IsoNodeId =
  | 'vercel'
  | 'insforge'
  | 'github'
  | 'cloudflare'
  | 'meta'
  | 'mercadopago'
  | 'tiktok'
  | 'google';

export interface IsometricMapProps {
  /** Current status per node. Missing nodes default to "unknown". */
  statuses: Partial<Record<IsoNodeId, IsoNodeStatus>>;
}

// ── node catalogue ───────────────────────────────────────────────────────────

interface NodeDef {
  id: IsoNodeId;
  label: string;
  /** Single-glyph icon drawn above the cube. */
  icon: string;
  /** Grid position (column, row) on a virtual 7×5 board; centred around origin. */
  gx: number;
  gy: number;
  /** Accent color for the top face of the cube. */
  color: string;
}

const NODES: NodeDef[] = [
  { id: 'tiktok',      label: 'TIKTOK',      icon: '♪', gx: -3, gy:  0, color: '#101010' },
  { id: 'github',      label: 'GITHUB',      icon: '⎇', gx: -1.5, gy: -1, color: '#8a8a8a' },
  { id: 'vercel',      label: 'VERCEL',      icon: '▲', gx:  0,   gy: -2, color: '#e6f0ff' },
  { id: 'cloudflare',  label: 'CLOUDFLARE',  icon: '☁', gx:  0,   gy:  0, color: '#ff8a2b' },
  { id: 'insforge',    label: 'INSFORGE',    icon: '⬢', gx:  1.5, gy: -1, color: '#14c38e' },
  { id: 'meta',        label: 'META',        icon: '∞', gx: -1.5, gy:  1.5, color: '#1a4fd9' },
  { id: 'mercadopago', label: 'MERCADOPAGO', icon: '$', gx:  1.5, gy:  1.5, color: '#3ab5ff' },
  { id: 'google',      label: 'GOOGLE',      icon: 'G', gx:  3,   gy:  0, color: '#4285f4' },
];

const EDGES: Array<[IsoNodeId, IsoNodeId]> = [
  ['vercel', 'cloudflare'],
  ['vercel', 'github'],
  ['vercel', 'insforge'],
  ['cloudflare', 'insforge'],
  ['cloudflare', 'github'],
  ['cloudflare', 'meta'],
  ['cloudflare', 'mercadopago'],
  ['github', 'tiktok'],
  ['insforge', 'google'],
  ['meta', 'mercadopago'],
  ['tiktok', 'meta'],
  ['mercadopago', 'google'],
];

// ── colors ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<IsoNodeStatus, string> = {
  online:       '#00ff88',
  slow:         '#f5c800',
  offline:      '#ff3344',
  unconfigured: '#333333',
  unknown:      '#4a5568',
};

/** Darken a hex color by a 0..1 factor (0 = unchanged, 1 = black). */
function darken(hex: string, factor: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((v >> 16) & 255) * (1 - factor)));
  const g = Math.max(0, Math.round(((v >> 8) & 255) * (1 - factor)));
  const b = Math.max(0, Math.round((v & 255) * (1 - factor)));
  return `rgb(${r},${g},${b})`;
}

function hex2rgba(hex: string, alpha: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

// ── isometric projection ─────────────────────────────────────────────────────

/** Convert grid (gx, gy) coordinates to on-canvas (x, y) pixels. */
function iso(gx: number, gy: number, originX: number, originY: number, tile: number) {
  const x = originX + (gx - gy) * tile;
  const y = originY + (gx + gy) * (tile * 0.5);
  return { x, y };
}

// ── drawing helpers ──────────────────────────────────────────────────────────

function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
) {
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const step = 18;
  for (let y = (H % step) / 2; y < H; y += step) {
    for (let x = (W % step) / 2; x < W; x += step) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

interface CubeGeom {
  top: [number, number][];
  left: [number, number][];
  right: [number, number][];
  /** Top-centre point (for icon placement). */
  topCenter: { x: number; y: number };
  /** Front-bottom point (for label placement). */
  frontBottom: { x: number; y: number };
}

function cubeGeometry(
  centerX: number,
  centerY: number,
  tile: number,
  height: number,
): CubeGeom {
  // Diamond top (iso square) around (centerX, centerY)
  const dx = tile;        // horizontal half-width
  const dy = tile * 0.5;  // vertical half-height

  // Top face vertices (top / right / bottom / left corners of diamond)
  const tTop:    [number, number] = [centerX,       centerY - dy];
  const tRight:  [number, number] = [centerX + dx,  centerY     ];
  const tBottom: [number, number] = [centerX,       centerY + dy];
  const tLeft:   [number, number] = [centerX - dx,  centerY     ];

  // Bottom face vertices (dropped by `height`)
  const bRight:  [number, number] = [centerX + dx,  centerY + height];
  const bBottom: [number, number] = [centerX,       centerY + dy + height];
  const bLeft:   [number, number] = [centerX - dx,  centerY + height];

  return {
    top:   [tTop, tRight, tBottom, tLeft],
    right: [tRight, tBottom, bBottom, bRight],
    left:  [tLeft, tBottom, bBottom, bLeft],
    topCenter: { x: centerX, y: centerY - dy },
    frontBottom: { x: centerX, y: centerY + dy + height },
  };
}

function fillPolygon(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokePolygon(ctx: CanvasRenderingContext2D, pts: [number, number][], stroke: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ── component ────────────────────────────────────────────────────────────────

export default function IsometricMap({ statuses }: IsometricMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusesRef = useRef(statuses);
  // Per-edge "pulse" events (fired when an edge lights up). We keep a ring of
  // recent activations so the line width / gradient can animate smoothly.
  const edgeFlashRef = useRef<number[]>(EDGES.map(() => 0));

  // Keep status ref in sync without tearing down the rAF loop.
  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  // Occasionally flash random online→online edges so the board feels "alive".
  useEffect(() => {
    const id = setInterval(() => {
      const s = statusesRef.current;
      const candidates: number[] = [];
      for (let i = 0; i < EDGES.length; i++) {
        const [a, b] = EDGES[i];
        if ((s[a] ?? 'unknown') === 'online' && (s[b] ?? 'unknown') === 'online') {
          candidates.push(i);
        }
      }
      if (candidates.length > 0) {
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        edgeFlashRef.current[idx] = performance.now();
      }
    }, 600);
    return () => clearInterval(id);
  }, []);

  // Main render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function layout() {
      if (!canvas || !wrap || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      const cssW = Math.max(240, Math.floor(rect.width));
      const cssH = Math.max(220, Math.floor(rect.height));
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ro = new ResizeObserver(layout);
    ro.observe(wrap);
    layout();

    // Traveling pulses along each edge (8-frame trail).
    const edgePhases = EDGES.map((_, i) => (i * 0.17) % 1);

    function frame(t: number) {
      if (!canvas || !ctx) return;
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;

      // Background
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, cssW, cssH);
      drawDotGrid(ctx, cssW, cssH);

      // Responsive tile / cube sizing.
      const isMobile = cssW < 560;
      const tile = isMobile ? 22 : 36;
      const cubeH = isMobile ? 14 : 22;

      const originX = cssW * 0.5;
      const originY = cssH * 0.5 + (isMobile ? 10 : 20);

      const positions = new Map<IsoNodeId, { x: number; y: number }>();
      for (const n of NODES) {
        positions.set(n.id, iso(n.gx, n.gy, originX, originY, tile));
      }

      const s = statusesRef.current;

      // ── edges ──────────────────────────────────────────────────────────────
      EDGES.forEach(([a, b], i) => {
        const pa = positions.get(a);
        const pb = positions.get(b);
        if (!pa || !pb) return;

        const sa = s[a] ?? 'unknown';
        const sb = s[b] ?? 'unknown';
        const bothOnline = sa === 'online' && sb === 'online';
        const destColor = STATUS_COLOR[sb === 'unknown' ? 'unknown' : sb];

        // Base line (always drawn) — 1px @ 20% opacity.
        ctx.lineWidth = 1;
        ctx.strokeStyle = hex2rgba(destColor, 0.2);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();

        // Energy flash — 2px for ~400ms after activation, with gradient.
        const flashedAt = edgeFlashRef.current[i];
        const flashDur = 400;
        if (bothOnline && flashedAt > 0 && t - flashedAt < flashDur) {
          const k = 1 - (t - flashedAt) / flashDur;
          const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
          grad.addColorStop(0, hex2rgba(destColor, 0));
          grad.addColorStop(0.5, hex2rgba(destColor, 0.9 * k));
          grad.addColorStop(1, hex2rgba(destColor, 0.2 * k));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }

        // Traveling pulses (only when both endpoints online).
        if (bothOnline) {
          const speed = 0.00035; // fraction of edge per ms
          const base = (edgePhases[i] + t * speed) % 1;

          // 8-frame trail (≈ 133ms @ 60fps). Each trail dot is smaller/fainter.
          const TRAIL = 8;
          for (let k = 0; k < TRAIL; k++) {
            const phase = (base - k * 0.015 + 1) % 1;
            const x = pa.x + (pb.x - pa.x) * phase;
            const y = pa.y + (pb.y - pa.y) * phase;
            const alpha = (1 - k / TRAIL) * 0.9;
            const radius = (k === 0 ? 2 : 2 - k * 0.18);
            if (radius <= 0) continue;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(0.3, radius), 0, Math.PI * 2);
            ctx.fillStyle = hex2rgba(destColor, alpha);
            ctx.fill();
          }
        }
      });

      // ── nodes ──────────────────────────────────────────────────────────────
      // Draw in screen-Y order so "front" cubes overlap "back" ones.
      const ordered = [...NODES].sort((n1, n2) => {
        const p1 = positions.get(n1.id)!;
        const p2 = positions.get(n2.id)!;
        return p1.y - p2.y;
      });

      for (const n of ordered) {
        const p = positions.get(n.id)!;
        const status: IsoNodeStatus = s[n.id] ?? 'unknown';
        const color = STATUS_COLOR[status];

        // Online pulsing halo — radial gradient under the cube.
        if (status === 'online') {
          const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t / 400 + n.gx + n.gy));
          const R = tile * 2.2;
          const grd = ctx.createRadialGradient(p.x, p.y + cubeH * 0.3, 0, p.x, p.y + cubeH * 0.3, R);
          grd.addColorStop(0, hex2rgba(color, 0.35 * pulse));
          grd.addColorStop(1, hex2rgba(color, 0));
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y + cubeH * 0.3, R, 0, Math.PI * 2);
          ctx.fill();
        }

        // Cube geometry
        const cube = cubeGeometry(p.x, p.y, tile * 0.75, cubeH);

        // Top face uses the status color directly when the node has a
        // meaningful health signal; otherwise we fall back to the node's
        // brand color (unknown) or the grey "unconfigured" swatch.
        const topFill =
          status === 'unconfigured' ? STATUS_COLOR.unconfigured
          : status === 'unknown'    ? n.color
          : color;

        fillPolygon(ctx, cube.left,  darken(topFill, 0.55));
        fillPolygon(ctx, cube.right, darken(topFill, 0.35));
        fillPolygon(ctx, cube.top,   topFill);

        // Subtle face outlines so small cubes read well on #080808.
        const outline = hex2rgba(color, 0.5);
        strokePolygon(ctx, cube.left,  outline);
        strokePolygon(ctx, cube.right, outline);
        strokePolygon(ctx, cube.top,   outline);

        // Unconfigured cross (red X floating on the top face)
        if (status === 'unconfigured') {
          const ox = p.x;
          const oy = p.y;
          const sz = tile * 0.35;
          ctx.strokeStyle = '#ff3344';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox - sz, oy - sz * 0.5);
          ctx.lineTo(ox + sz, oy + sz * 0.5);
          ctx.moveTo(ox + sz, oy - sz * 0.5);
          ctx.lineTo(ox - sz, oy + sz * 0.5);
          ctx.stroke();
        }

        // Icon floating above the cube
        const iconY = cube.topCenter.y - (isMobile ? 10 : 14);
        ctx.font = `bold ${isMobile ? 12 : 16}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = status === 'online' ? color : '#e8e8e8';
        ctx.fillText(n.icon, p.x, iconY);

        // Label below the cube
        const labelY = cube.frontBottom.y + (isMobile ? 8 : 10);
        ctx.font = `${isMobile ? 8 : 9}px ui-monospace, monospace`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = hex2rgba(color, 0.95);
        ctx.fillText(n.label, p.x, labelY);
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        background: '#080808',
        border: '1px solid rgba(250,204,21,0.08)',
        height: 'var(--iso-map-h, 360px)',
      }}
    >
      <style jsx>{`
        @media (min-width: 768px) {
          div { --iso-map-h: 400px; }
        }
        @media (min-width: 1024px) {
          div { --iso-map-h: 500px; }
        }
      `}</style>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
