'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';

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

function depthStyle(width: number, depth: number, height: number, colorTop: string, colorSide: string, z = 0) {
  return {
    width,
    height: depth,
    transform: `translate3d(${-width / 2}px, ${-depth / 2}px, ${z}px)`,
    '--h': `${height}px`,
    '--top': colorTop,
    '--side': colorSide,
  } as CSSProperties;
}

export default function BudgetScene360({ kind = 'default', title, subtitle, data, compact = false }: BudgetScene360Props) {
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [yaw, setYaw] = useState(38);
  const [pitch, setPitch] = useState(55);
  const [zoom, setZoom] = useState(1);
  const [explode, setExplode] = useState(false);
  const [labels, setLabels] = useState(true);
  const [cutaway, setCutaway] = useState(false);
  const [spin, setSpin] = useState(true);

  const transform = useMemo(() => `rotateX(${pitch}deg) rotateZ(${yaw}deg) scale(${zoom})`, [pitch, yaw, zoom]);
  const stats = useMemo(() => {
    if (kind === 'radier') return [['Área', `${num.format(readNumber(data, 'area', 24))} m²`], ['Hormigón', `${num.format(readNumber(data, 'hormigon', 2.4))} m³`], ['Sacos', `${whole.format(readNumber(data, 'sacos', 18))}`]];
    if (kind === 'aire') return [['Área', `${num.format(readNumber(data, 'area', 16))} m²`], ['BTU', `${whole.format(readNumber(data, 'btu', 12000))}`], ['Equipo', `${whole.format(readNumber(data, 'seleccionado', 12000))} BTU`]];
    return [['Vista', '3D'], ['Modo', 'Cliente'], ['Estado', 'Interactivo']];
  }, [data, kind]);

  function startDrag(clientX: number, clientY: number) {
    setSpin(false);
    dragRef.current = { x: clientX, y: clientY, yaw, pitch };
  }
  function moveDrag(clientX: number, clientY: number) {
    const s = dragRef.current;
    if (!s) return;
    setYaw(s.yaw + (clientX - s.x) * 0.48);
    setPitch(clamp(s.pitch - (clientY - s.y) * 0.32, 18, 76));
  }
  function endDrag() { dragRef.current = null; }

  return <section className={`sf-budget-3d relative overflow-hidden rounded-[2rem] border border-amber-300/25 bg-[#050505] text-white shadow-[0_30px_90px_rgba(0,0,0,.5)] ${compact ? 'min-h-[460px]' : 'min-h-[620px]'}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,193,7,.18),transparent_24rem),radial-gradient(circle_at_80%_60%,rgba(249,115,22,.10),transparent_28rem)]" />
    <div className="absolute inset-0 opacity-[.13] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
    <style jsx global>{`
      .sf-budget-3d .scene-shell{perspective:1050px;perspective-origin:50% 38%;}
      .sf-budget-3d .scene-root{transform-style:preserve-3d;transition:transform 80ms linear;}
      .sf-budget-3d .scene-root.spin{animation:sf-budget-spin 14s linear infinite;}
      .sf-budget-3d .box3d{position:absolute;left:50%;top:50%;transform-style:preserve-3d;display:block;overflow:visible;}
      .sf-budget-3d .box3d .top{position:absolute;inset:0;background:var(--top);border:1px solid rgba(255,209,102,.45);box-shadow:inset 0 0 28px rgba(255,255,255,.12),0 22px 55px rgba(0,0,0,.28);display:block;}
      .sf-budget-3d .box3d:before{content:'';position:absolute;left:0;right:0;bottom:0;height:var(--h);background:linear-gradient(180deg,var(--side),#17100a);transform:translateY(100%) rotateX(-90deg);transform-origin:top;filter:brightness(.9);display:block;}
      .sf-budget-3d .box3d:after{content:'';position:absolute;top:0;right:0;width:var(--h);height:100%;background:linear-gradient(90deg,var(--side),#070604);transform:translateX(100%) rotateY(90deg);transform-origin:left;filter:brightness(.72);display:block;}
      .sf-budget-3d .label3d{position:absolute;z-index:12;transform:translateZ(95px);padding:7px 10px;border-radius:999px;border:1px solid rgba(255,209,102,.36);background:rgba(0,0,0,.7);backdrop-filter:blur(10px);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:#fde68a;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.28);}
      .sf-budget-3d .pipe{position:absolute;height:8px;border-radius:999px;background:linear-gradient(90deg,#c98347,#f6c28b);box-shadow:0 0 16px rgba(245,158,11,.42);transform-style:preserve-3d;display:block;}
      .sf-budget-3d .pipe.cable{height:4px;background:#e5e7eb;box-shadow:0 0 12px rgba(255,255,255,.2)}
      .sf-budget-3d .air{position:absolute;border:1px solid rgba(103,232,249,.32);border-radius:999px;background:rgba(103,232,249,.10);box-shadow:0 0 22px rgba(103,232,249,.22);display:block;}
      .sf-budget-3d .fallback-glow{position:absolute;left:50%;top:50%;width:520px;height:280px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(250,204,21,.16),transparent 65%);filter:blur(18px);}
      @keyframes sf-budget-spin{from{transform:rotateX(55deg) rotateZ(0deg) scale(var(--sf-zoom,1))}to{transform:rotateX(55deg) rotateZ(360deg) scale(var(--sf-zoom,1))}}
      @media(max-width:680px){.sf-budget-3d .scene-shell{transform:scale(.72);}.sf-budget-3d .label3d{font-size:8px;padding:5px 7px}}
    `}</style>
    <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">Visor 3D interactivo</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{title || (kind === 'aire' ? 'Cuarto + condensador 3D' : kind === 'radier' ? 'Radier volumétrico 3D' : 'Escena técnica 3D')}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">{subtitle || 'Arrastra para girar, usa zoom, activa capas y cotas. La escena se arma desde los datos/JTree del motor.'}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[300px]">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p><b className="mt-1 block text-sm text-amber-200 sm:text-base">{value}</b></div>)}</div>
      </div>
      <div className={`relative grid select-none place-items-center overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/45 ${compact ? 'min-h-[340px]' : 'min-h-[470px]'} touch-none`} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startDrag(e.clientX, e.clientY); }} onPointerMove={(e) => moveDrag(e.clientX, e.clientY)} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="fallback-glow" />
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-amber-300/30 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">Tocar + arrastrar</div>
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${((yaw % 360 + 360) % 360) / 3.6}%` }} /></div>
        <div className="scene-shell relative h-[360px] w-[660px] max-w-[94vw]">
          <div className={`scene-root absolute left-1/2 top-1/2 h-0 w-0 ${spin ? 'spin' : ''}`} style={{ transform, '--sf-zoom': String(zoom) } as CSSProperties}>
            {kind === 'aire' ? <AirScene data={data} cutaway={cutaway} labels={labels} /> : kind === 'radier' ? <RadierScene data={data} explode={explode} labels={labels} /> : <DefaultScene labels={labels} />}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setSpin(false); setYaw(0); setPitch(52); }} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Frontal</button>
        <button type="button" onClick={() => { setSpin(false); setYaw(90); setPitch(54); }} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Lateral</button>
        <button type="button" onClick={() => { setSpin(false); setYaw(35); setPitch(76); }} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Superior</button>
        <button type="button" onClick={() => setZoom((z) => clamp(z + 0.12, 0.65, 1.65))} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Zoom +</button>
        <button type="button" onClick={() => setZoom((z) => clamp(z - 0.12, 0.65, 1.65))} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Zoom -</button>
        <button type="button" onClick={() => setLabels((v) => !v)} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Cotas</button>
        {kind === 'radier' && <button type="button" onClick={() => setExplode((v) => !v)} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Capas</button>}
        {kind === 'aire' && <button type="button" onClick={() => setCutaway((v) => !v)} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">Corte muro</button>}
        <button type="button" onClick={() => setSpin((v) => !v)} className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100">{spin ? 'Pausar giro' : 'Giro 3D'}</button>
        <button type="button" onClick={() => { setSpin(false); setYaw(38); setPitch(55); setZoom(1); }} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black">Reset</button>
      </div>
    </div>
  </section>;
}

function RadierScene({ data, explode, labels }: { data?: Record<string, unknown>; explode: boolean; labels: boolean }) {
  const area = readNumber(data, 'area', 24); const hormigon = readNumber(data, 'hormigon', 2.4); const per = readNumber(data, 'perimetro', 20); const width = clamp(Math.sqrt(area) * 58, 260, 520); const depth = clamp((area / Math.max(1, Math.sqrt(area))) * 44, 150, 330); const z1 = explode ? -62 : -34; const z2 = explode ? 8 : -10; const z3 = explode ? 82 : 24;
  return <>
    <div className="box3d" style={depthStyle(width + 44, depth + 44, 24, 'linear-gradient(135deg,#8a7057,#3e3024)', '#3a2a1c', z1)}><div className="top" /></div>
    <div className="box3d" style={depthStyle(width + 22, depth + 22, 20, 'linear-gradient(135deg,#a48d70,#5d4a39)', '#4b3626', z2)}><div className="top" /></div>
    <div className="box3d" style={depthStyle(width, depth, 34, 'linear-gradient(135deg,#fff2d1,#bba98f 56%,#806a55)', '#7a5035', z3)}><div className="top"><div className="absolute inset-x-8 top-1/3 h-[2px] bg-black/20" /><div className="absolute inset-x-10 bottom-1/3 h-[2px] bg-black/20" /><div className="absolute left-1/3 top-8 bottom-8 w-[2px] bg-black/15" /><div className="absolute right-1/3 top-8 bottom-8 w-[2px] bg-black/15" /></div></div>
    {labels && <><div className="label3d" style={{ left: -width / 2, top: -depth / 2 - 48 }}>{num.format(area)} m² superficie</div><div className="label3d" style={{ left: width / 2 - 100, top: depth / 2 + 22 }}>{num.format(hormigon)} m³ hormigón</div><div className="label3d" style={{ left: -80, top: depth / 2 + 58 }}>{num.format(per)} ml perímetro</div></>}
  </>;
}

function AirScene({ data, cutaway, labels }: { data?: Record<string, unknown>; cutaway: boolean; labels: boolean }) {
  const area = readNumber(data, 'area', 16); const btu = readNumber(data, 'btu', 12000); const equipo = readNumber(data, 'seleccionado', 12000); const w = clamp(Math.sqrt(area) * 72, 280, 470); const d = clamp((area / Math.max(1, Math.sqrt(area))) * 55, 170, 360);
  return <>
    <div className="box3d" style={depthStyle(w, d, 12, 'linear-gradient(135deg,#3b2b1f,#12100d)', '#271a10', -18)}><div className="top" /></div>
    {!cutaway && <div className="box3d" style={{ width: w, height: 180, transform: `translate3d(${-w / 2}px, ${-d / 2}px, 0px) rotateX(90deg) translateZ(90px)`, '--h': '8px', '--top': 'linear-gradient(135deg,#111827,#0b1220)', '--side': '#0f172a' } as CSSProperties}><div className="top opacity-80" /></div>}
    <div className="box3d" style={{ width: 150, height: 42, transform: `translate3d(${w / 2 - 210}px, ${-d / 2 - 8}px, 130px)`, '--h': '22px', '--top': 'linear-gradient(135deg,#e0f7ff,#bdefff)', '--side': '#64748b' } as CSSProperties}><div className="top rounded-xl"><div className="absolute left-5 right-5 bottom-2 h-1 rounded-full bg-cyan-300" /></div></div>
    <div className="pipe" style={{ width: 175, left: w / 2 - 70, top: -d / 2 + 4, transform: 'translateZ(104px) rotateZ(0deg)' }} />
    <div className="pipe cable" style={{ width: 160, left: w / 2 - 70, top: -d / 2 + 22, transform: 'translateZ(96px)' }} />
    <div className="box3d" style={{ width: 92, height: 82, transform: `translate3d(${w / 2 + 70}px, ${-d / 2 + 26}px, 54px)`, '--h': '42px', '--top': 'linear-gradient(135deg,#1f2937,#0f172a)', '--side': '#0b1220' } as CSSProperties}><div className="top rounded-2xl border-amber-300/80"><div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-cyan-200/80" /></div></div>
    {[0, 1, 2].map((i) => <div key={i} className="air" style={{ width: 110 + i * 36, height: 50 + i * 20, left: w / 2 - 205 - i * 18, top: -d / 2 + 48 + i * 28, transform: `translateZ(${112 - i * 12}px)` }} />)}
    {labels && <><div className="label3d" style={{ left: -w / 2, top: -d / 2 - 42 }}>{num.format(area)} m² cuarto</div><div className="label3d" style={{ left: w / 2 - 220, top: -d / 2 - 50 }}>{whole.format(btu)} BTU requeridos</div><div className="label3d" style={{ left: w / 2 + 48, top: -d / 2 + 130 }}>{whole.format(equipo)} BTU equipo</div></>}
  </>;
}

function DefaultScene({ labels }: { labels: boolean }) {
  return <>{<div className="box3d" style={depthStyle(420, 220, 42, 'linear-gradient(135deg,#facc15,#7c2d12)', '#431407', 10)}><div className="top" /></div>}{labels && <div className="label3d" style={{ left: -150, top: -150 }}>Escena técnica 3D</div>}</>;
}
