'use client';

import { useMemo, useRef, useState } from 'react';

type SceneKind = 'radier' | 'aire' | 'default';

type BudgetScene360Props = {
  kind?: SceneKind;
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>;
  compact?: boolean;
};

const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function readNumber(data: Record<string, unknown> | undefined, key: string, fallback = 0) {
  const value = data?.[key];
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function BudgetScene360({ kind = 'default', title, subtitle, data, compact = false }: BudgetScene360Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [yaw, setYaw] = useState(28);
  const [pitch, setPitch] = useState(14);
  const [zoom, setZoom] = useState(1);

  const transform = useMemo(() => {
    const rotate = `rotateX(${pitch}deg) rotateZ(${yaw}deg)`;
    const scale = `scale(${zoom})`;
    return `${rotate} ${scale}`;
  }, [pitch, yaw, zoom]);

  const stats = useMemo(() => {
    if (kind === 'radier') {
      return [
        ['Área', `${num.format(readNumber(data, 'area'))} m²`],
        ['Hormigón', `${num.format(readNumber(data, 'hormigon'))} m³`],
        ['Sacos', `${whole.format(readNumber(data, 'sacos'))}`],
      ];
    }
    if (kind === 'aire') {
      return [
        ['Área', `${num.format(readNumber(data, 'area'))} m²`],
        ['BTU', `${whole.format(readNumber(data, 'btu'))}`],
        ['Equipo', `${whole.format(readNumber(data, 'seleccionado'))} BTU`],
      ];
    }
    return [['Vista', '360°'], ['Modo', 'Cliente'], ['Estado', 'Interactivo']];
  }, [data, kind]);

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { x: clientX, y: clientY, yaw, pitch };
  }

  function moveDrag(clientX: number, clientY: number) {
    const start = dragRef.current;
    if (!start) return;
    setYaw(start.yaw + (clientX - start.x) * 0.45);
    setPitch(clamp(start.pitch - (clientY - start.y) * 0.28, -32, 38));
  }

  function endDrag() {
    dragRef.current = null;
  }

  const baseHeight = compact ? 'min-h-[420px]' : 'min-h-[560px]';

  return (
    <section className={`relative overflow-hidden rounded-[2rem] border border-amber-300/25 bg-[#050505] text-white shadow-[0_30px_90px_rgba(0,0,0,.5)] ${baseHeight}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,193,7,.18),transparent_24rem),radial-gradient(circle_at_80%_60%,rgba(249,115,22,.10),transparent_28rem)]" />
      <div className="absolute inset-0 opacity-[.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">Visor 360 interactivo</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{title || (kind === 'aire' ? 'Cuarto + condensador' : kind === 'radier' ? 'Radier volumétrico' : 'Escena técnica')}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">{subtitle || 'Arrastra con el dedo para girar. Usa los controles para mostrar la propuesta desde cualquier ángulo.'}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[300px]">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
                <b className="mt-1 block text-sm text-amber-200 sm:text-base">{value}</b>
              </div>
            ))}
          </div>
        </div>

        <div
          ref={wrapRef}
          className={`relative grid select-none place-items-center overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/45 ${compact ? 'min-h-[300px]' : 'min-h-[430px]'} touch-none`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startDrag(e.clientX, e.clientY); }}
          onPointerMove={(e) => moveDrag(e.clientX, e.clientY)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-amber-300/30 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">Tocar + arrastrar</div>
          <div className="absolute bottom-4 left-4 right-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${((yaw % 360 + 360) % 360) / 3.6}%` }} /></div>

          <div className="relative h-[320px] w-[620px] max-w-[92vw]" style={{ perspective: 980 }}>
            <div className="absolute inset-0 transition-transform duration-75 ease-out" style={{ transform, transformOrigin: '50% 58%', transformStyle: 'preserve-3d' }}>
              {kind === 'aire' ? <AirScene /> : kind === 'radier' ? <RadierScene /> : <DefaultScene />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setYaw(0); setPitch(10); }} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Frontal</button>
          <button type="button" onClick={() => { setYaw(85); setPitch(12); }} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Lateral</button>
          <button type="button" onClick={() => { setYaw(35); setPitch(34); }} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Superior</button>
          <button type="button" onClick={() => setZoom((z) => clamp(z + 0.12, 0.75, 1.55))} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Zoom +</button>
          <button type="button" onClick={() => setZoom((z) => clamp(z - 0.12, 0.75, 1.55))} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Zoom -</button>
          <button type="button" onClick={() => { setYaw(28); setPitch(14); setZoom(1); }} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black">Reset</button>
        </div>
      </div>
    </section>
  );
}

function RadierScene() {
  return (
    <svg viewBox="0 0 620 320" className="h-full w-full drop-shadow-[0_30px_50px_rgba(0,0,0,.55)]">
      <defs>
        <linearGradient id="slabTop" x1="0" x2="1"><stop offset="0" stopColor="#fff2d1"/><stop offset="0.55" stopColor="#b7a28a"/><stop offset="1" stopColor="#77614f"/></linearGradient>
        <linearGradient id="slabSide" x1="0" x2="1"><stop offset="0" stopColor="#7a5035"/><stop offset="1" stopColor="#2d2119"/></linearGradient>
      </defs>
      <ellipse cx="315" cy="252" rx="240" ry="38" fill="#000" opacity=".35" />
      <polygon points="88,88 488,76 540,198 156,236" fill="url(#slabSide)" transform="translate(0 34)" />
      <polygon points="88,88 488,76 540,198 156,236" fill="url(#slabTop)" stroke="#ffd166" strokeWidth="4" />
      <path d="M120 103 L492 90 M145 144 L510 127 M170 190 L527 169" stroke="#3b2b1f" strokeWidth="2" opacity=".28" />
      <path d="M155 236 L155 270 M540 198 L540 228 M488 76 L488 108" stroke="#ffd166" strokeWidth="3" opacity=".85" />
      <rect x="212" y="111" width="92" height="50" rx="10" fill="#6b5d50" opacity=".24" />
      <rect x="330" y="103" width="112" height="66" rx="12" fill="#fff" opacity=".11" />
      <text x="95" y="300" fill="#fff4df" fontSize="17" fontWeight="900">Radier técnico · volumen, perímetro y materiales</text>
    </svg>
  );
}

function AirScene() {
  return (
    <svg viewBox="0 0 650 330" className="h-full w-full drop-shadow-[0_30px_50px_rgba(0,0,0,.55)]">
      <defs>
        <linearGradient id="wall" x1="0" x2="1"><stop offset="0" stopColor="#0f172a"/><stop offset="1" stopColor="#111827"/></linearGradient>
        <linearGradient id="floor" x1="0" x2="1"><stop offset="0" stopColor="#2f241b"/><stop offset="1" stopColor="#0b0b0b"/></linearGradient>
      </defs>
      <ellipse cx="325" cy="270" rx="250" ry="38" fill="#000" opacity=".36" />
      <polygon points="95,86 410,88 515,226 170,254" fill="url(#floor)" stroke="#ffd166" strokeWidth="3" />
      <polygon points="95,86 170,254 170,130 95,45" fill="url(#wall)" stroke="#2d3748" />
      <polygon points="410,88 515,226 515,124 410,42" fill="#09111f" stroke="#2d3748" />
      <rect x="226" y="201" width="116" height="50" rx="14" fill="#3a2a1d" />
      <rect x="288" y="58" width="160" height="42" rx="16" fill="#e0f7ff" stroke="#ffffff" strokeWidth="2" />
      <path d="M333 107 C308 146, 349 164, 321 210 M382 107 C355 146, 401 167, 372 214 M426 107 C398 145, 444 168, 420 204" stroke="#66e7ff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".9" />
      <path d="M448 78 L494 78 L494 139 L562 139" stroke="#c98347" strokeWidth="8" fill="none" strokeLinejoin="round" />
      <path d="M452 95 L485 95 L485 160 L560 160" stroke="#e5e7eb" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <rect x="560" y="111" width="76" height="76" rx="14" fill="#1f2937" stroke="#ffd166" strokeWidth="3" />
      <circle cx="598" cy="149" r="25" fill="none" stroke="#85dfff" strokeWidth="6" />
      <circle cx="598" cy="149" r="12" fill="#0b1220" />
      <text x="112" y="303" fill="#fff4df" fontSize="17" fontWeight="900">Cuarto equipado · evaporador, tubería, cableado y condensador</text>
    </svg>
  );
}

function DefaultScene() {
  return (
    <svg viewBox="0 0 620 320" className="h-full w-full drop-shadow-[0_30px_50px_rgba(0,0,0,.55)]">
      <ellipse cx="310" cy="252" rx="230" ry="38" fill="#000" opacity=".35" />
      <polygon points="120,80 480,80 520,220 160,240" fill="#111827" stroke="#ffd166" strokeWidth="4" />
      <rect x="220" y="118" width="180" height="80" rx="18" fill="#f59e0b" opacity=".82" />
      <text x="142" y="292" fill="#fff4df" fontSize="17" fontWeight="900">Vista técnica interactiva para cliente</text>
    </svg>
  );
}
