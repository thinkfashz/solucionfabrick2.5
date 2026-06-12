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

function readColor(data: Record<string, unknown> | undefined, key: string, fallback: string) {
  const value = data?.[key];
  return typeof value === 'string' && /^#?[a-z0-9(),.%\s-]+$/i.test(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function boxStyle(width: number, depth: number, height: number, top: string, side: string, z = 0, extra = '') {
  return {
    width,
    height: depth,
    transform: `translate3d(${-width / 2}px, ${-depth / 2}px, ${z}px) ${extra}`,
    '--h': `${height}px`,
    '--top': top,
    '--side': side,
  } as CSSProperties;
}

export default function BudgetScene360({ kind = 'default', title, subtitle, data, compact = false }: BudgetScene360Props) {
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [yaw, setYaw] = useState(36);
  const [pitch, setPitch] = useState(56);
  const [zoom, setZoom] = useState(1);
  const [explode, setExplode] = useState(false);
  const [labels, setLabels] = useState(true);
  const [cutaway, setCutaway] = useState(false);
  const [spin, setSpin] = useState(true);

  const stats = useMemo(() => {
    if (kind === 'radier') return [['Área', `${num.format(readNumber(data, 'area', 24))} m²`], ['Hormigón', `${num.format(readNumber(data, 'hormigon', 2.4))} m³`], ['Perímetro', `${num.format(readNumber(data, 'perimetro', 20))} ml`]];
    if (kind === 'aire') return [['Área', `${num.format(readNumber(data, 'area', 16))} m²`], ['BTU', `${whole.format(readNumber(data, 'btu', 12000))}`], ['Equipo', `${whole.format(readNumber(data, 'seleccionado', 12000))} BTU`]];
    return [['Vista', '3D'], ['Estado', 'Activo'], ['Modo', 'Interactivo']];
  }, [data, kind]);

  const transform = `rotateX(${pitch}deg) rotateZ(${yaw}deg) scale(${zoom})`;

  function start(x: number, y: number) { setSpin(false); drag.current = { x, y, yaw, pitch }; }
  function move(x: number, y: number) { if (!drag.current) return; setYaw(drag.current.yaw + (x - drag.current.x) * 0.45); setPitch(clamp(drag.current.pitch - (y - drag.current.y) * 0.28, 18, 74)); }
  function end() { drag.current = null; }

  return <section className={`sf-budget-3d relative mx-auto w-full max-w-full overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#050505]/95 text-white shadow-[0_30px_90px_rgba(0,0,0,.5)] ${compact ? 'min-h-[430px]' : 'min-h-[560px]'}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,193,7,.18),transparent_22rem),radial-gradient(circle_at_80%_60%,rgba(37,99,235,.16),transparent_24rem),radial-gradient(circle_at_12%_80%,rgba(220,38,38,.12),transparent_18rem)]" />
    <div className="absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
    <style jsx global>{`
      .sf-budget-3d *{box-sizing:border-box}.sf-budget-3d .scene-frame{width:100%;max-width:760px;margin:0 auto;perspective:1100px;perspective-origin:50% 38%;}
      .sf-budget-3d .scene-stage{position:relative;display:grid;place-items:center;min-height:360px;width:100%;overflow:hidden;border-radius:1.65rem;border:1px solid rgba(255,255,255,.10);background:radial-gradient(circle at 50% 45%,rgba(250,204,21,.12),transparent 20rem),rgba(0,0,0,.42);touch-action:none;}
      .sf-budget-3d .scene-root{position:absolute;left:50%;top:52%;width:0;height:0;transform-style:preserve-3d;transition:transform 80ms linear;}
      .sf-budget-3d .scene-root.spin{animation:sf-budget-spin 16s linear infinite;}
      .sf-budget-3d .box3d{position:absolute;left:50%;top:50%;transform-style:preserve-3d;display:block;overflow:visible;}
      .sf-budget-3d .box3d .top{position:absolute;inset:0;background:var(--top);border:1px solid rgba(255,209,102,.42);box-shadow:inset 0 0 26px rgba(255,255,255,.14),0 22px 55px rgba(0,0,0,.30);display:block;}
      .sf-budget-3d .box3d:before{content:'';position:absolute;left:0;right:0;bottom:0;height:var(--h);background:linear-gradient(180deg,var(--side),#120c07);transform:translateY(100%) rotateX(-90deg);transform-origin:top;display:block;filter:brightness(.92)}
      .sf-budget-3d .box3d:after{content:'';position:absolute;top:0;right:0;width:var(--h);height:100%;background:linear-gradient(90deg,var(--side),#050505);transform:translateX(100%) rotateY(90deg);transform-origin:left;display:block;filter:brightness(.76)}
      .sf-budget-3d .label3d{position:absolute;z-index:12;transform:translateZ(108px);padding:7px 10px;border-radius:999px;border:1px solid rgba(255,209,102,.34);background:rgba(0,0,0,.74);backdrop-filter:blur(10px);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#fde68a;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.28)}
      .sf-budget-3d .pipe{position:absolute;height:8px;border-radius:999px;background:var(--pipe);box-shadow:0 0 12px var(--glow),0 0 30px var(--glow);transform-style:preserve-3d;display:block;}
      .sf-budget-3d .pipe.thin{height:4px}.sf-budget-3d .flow-dot{position:absolute;width:12px;height:12px;border-radius:999px;background:var(--dot);box-shadow:0 0 18px var(--dot);animation:sf-flow 2.6s linear infinite;}
      .sf-budget-3d .air-wave{position:absolute;border:1px solid rgba(103,232,249,.34);border-radius:999px;background:rgba(103,232,249,.08);box-shadow:0 0 22px rgba(103,232,249,.24);display:block;}
      .sf-budget-3d .center-glow{position:absolute;left:50%;top:50%;width:min(560px,78vw);height:260px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(250,204,21,.16),transparent 65%);filter:blur(18px)}
      @keyframes sf-budget-spin{from{transform:rotateX(56deg) rotateZ(0deg) scale(var(--sf-zoom,1))}to{transform:rotateX(56deg) rotateZ(360deg) scale(var(--sf-zoom,1))}}
      @keyframes sf-flow{0%{transform:translate3d(0,0,122px) scale(.65);opacity:.2}20%{opacity:1}100%{transform:translate3d(var(--to-x),var(--to-y),122px) scale(1);opacity:.15}}
      @media(max-width:820px){.sf-budget-3d .scene-frame{transform:scale(.86);transform-origin:center}.sf-budget-3d .scene-stage{min-height:330px}.sf-budget-3d .label3d{font-size:8px;padding:5px 7px}}
      @media(max-width:560px){.sf-budget-3d .scene-frame{transform:scale(.72)}.sf-budget-3d .scene-stage{min-height:300px}.sf-budget-3d .scene-root{top:55%}}
    `}</style>
    <div className="relative z-10 flex flex-col gap-4 p-3 sm:p-5">
      <div className="grid gap-3 xl:grid-cols-[1fr_320px] xl:items-start">
        <div className="min-w-0 text-center xl:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">Visor 3D interactivo</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{title || (kind === 'aire' ? 'Cuarto + condensador 3D' : kind === 'radier' ? 'Radier volumétrico 3D' : 'Escena técnica 3D')}</h2>
          <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-zinc-400 xl:mx-0">{subtitle || 'Arrastra para girar, usa zoom, activa capas y cotas.'}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p><b className="mt-1 block text-xs text-amber-200 sm:text-sm">{value}</b></div>)}</div>
      </div>

      <div className="scene-stage" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(e.clientX, e.clientY); }} onPointerMove={(e) => move(e.clientX, e.clientY)} onPointerUp={end} onPointerCancel={end}>
        <div className="center-glow" />
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-amber-300/30 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">Tocar + arrastrar</div>
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${((yaw % 360 + 360) % 360) / 3.6}%` }} /></div>
        <div className="scene-frame relative h-[360px]">
          <div className={`scene-root ${spin ? 'spin' : ''}`} style={{ transform, '--sf-zoom': String(zoom) } as CSSProperties}>
            {kind === 'aire' ? <AirScene data={data} cutaway={cutaway} labels={labels} /> : kind === 'radier' ? <RadierScene data={data} explode={explode} labels={labels} /> : <DefaultScene labels={labels} />}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <ToolButton onClick={() => { setSpin(false); setYaw(0); setPitch(52); }}>Frontal</ToolButton>
        <ToolButton onClick={() => { setSpin(false); setYaw(90); setPitch(54); }}>Lateral</ToolButton>
        <ToolButton onClick={() => { setSpin(false); setYaw(35); setPitch(74); }}>Superior</ToolButton>
        <ToolButton onClick={() => setZoom((z) => clamp(z + 0.12, 0.65, 1.55))}>Zoom +</ToolButton>
        <ToolButton onClick={() => setZoom((z) => clamp(z - 0.12, 0.65, 1.55))}>Zoom -</ToolButton>
        <ToolButton onClick={() => setLabels((v) => !v)}>Cotas</ToolButton>
        {kind === 'radier' && <ToolButton onClick={() => setExplode((v) => !v)}>Capas</ToolButton>}
        {kind === 'aire' && <ToolButton onClick={() => setCutaway((v) => !v)}>Corte muro</ToolButton>}
        <button type="button" onClick={() => setSpin((v) => !v)} className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100">{spin ? 'Pausar giro' : 'Giro 3D'}</button>
        <button type="button" onClick={() => { setSpin(false); setYaw(36); setPitch(56); setZoom(1); }} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black">Reset</button>
      </div>
    </div>
  </section>;
}

function ToolButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15">{children}</button>;
}

function RadierScene({ data, explode, labels }: { data?: Record<string, unknown>; explode: boolean; labels: boolean }) {
  const area = readNumber(data, 'area', 24); const hormigon = readNumber(data, 'hormigon', 2.4); const per = readNumber(data, 'perimetro', 20); const width = clamp(Math.sqrt(area) * 58, 260, 500); const depth = clamp((area / Math.max(1, Math.sqrt(area))) * 44, 150, 310); const z1 = explode ? -70 : -34; const z2 = explode ? 0 : -10; const z3 = explode ? 80 : 24;
  return <>
    <div className="box3d" style={boxStyle(width + 44, depth + 44, 24, 'linear-gradient(135deg,#7c644d,#302317)', '#3a2a1c', z1)}><div className="top" /></div>
    <div className="box3d" style={boxStyle(width + 22, depth + 22, 20, 'linear-gradient(135deg,#a48d70,#5d4a39)', '#4b3626', z2)}><div className="top" /></div>
    <div className="box3d" style={boxStyle(width, depth, 34, 'linear-gradient(135deg,#fff2d1,#bba98f 56%,#806a55)', '#7a5035', z3)}><div className="top"><div className="absolute inset-x-8 top-1/3 h-[2px] bg-black/20" /><div className="absolute inset-x-10 bottom-1/3 h-[2px] bg-black/20" /><div className="absolute left-1/3 top-8 bottom-8 w-[2px] bg-black/15" /><div className="absolute right-1/3 top-8 bottom-8 w-[2px] bg-black/15" /></div></div>
    {labels && <><div className="label3d" style={{ left: -width / 2, top: -depth / 2 - 48 }}>{num.format(area)} m²</div><div className="label3d" style={{ left: width / 2 - 118, top: depth / 2 + 22 }}>{num.format(hormigon)} m³</div><div className="label3d" style={{ left: -80, top: depth / 2 + 58 }}>{num.format(per)} ml</div></>}
  </>;
}

function AirScene({ data, cutaway, labels }: { data?: Record<string, unknown>; cutaway: boolean; labels: boolean }) {
  const area = readNumber(data, 'area', 16); const btu = readNumber(data, 'btu', 12000); const equipo = readNumber(data, 'seleccionado', 12000); const w = clamp(Math.sqrt(area) * 72, 280, 450); const d = clamp((area / Math.max(1, Math.sqrt(area))) * 55, 170, 340); const frio = readColor(data, 'colorLineaFrio', '#66e7ff'); const calor = readColor(data, 'colorLineaCalor', '#fb923c'); const retorno = readColor(data, 'colorRetorno', '#22c55e');
  return <>
    <div className="box3d" style={boxStyle(w, d, 12, 'linear-gradient(135deg,#262221,#0c0c0d)', '#22150d', -18)}><div className="top" /></div>
    {!cutaway && <div className="box3d" style={{ width: w, height: 174, transform: `translate3d(${-w / 2}px, ${-d / 2}px, 0px) rotateX(90deg) translateZ(88px)`, '--h': '8px', '--top': 'linear-gradient(135deg,#111827,#0b1220)', '--side': '#0f172a' } as CSSProperties}><div className="top opacity-80" /></div>}
    <div className="box3d" style={{ width: 154, height: 44, transform: `translate3d(${w / 2 - 214}px, ${-d / 2 - 10}px, 130px)`, '--h': '22px', '--top': 'linear-gradient(135deg,#eefcff,#acefff)', '--side': '#64748b' } as CSSProperties}><div className="top rounded-xl"><div className="absolute left-5 right-5 bottom-2 h-1 rounded-full" style={{ background: frio }} /></div></div>
    <div className="box3d" style={{ width: 96, height: 86, transform: `translate3d(${w / 2 + 64}px, ${-d / 2 + 22}px, 54px)`, '--h': '42px', '--top': 'linear-gradient(135deg,#1f2937,#0f172a)', '--side': '#0b1220' } as CSSProperties}><div className="top rounded-2xl"><div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-cyan-200/80" /></div></div>
    <Pipe color={frio} width={210} x={w / 2 - 98} y={-d / 2 + 6} z={112} label="ida fría" />
    <Pipe color={calor} width={196} x={w / 2 - 92} y={-d / 2 + 26} z={104} label="gas caliente" delay=".65s" />
    <Pipe color={retorno} width={180} x={w / 2 - 86} y={-d / 2 + 46} z={96} label="retorno" delay="1.15s" />
    {[0, 1, 2].map((i) => <div key={i} className="air-wave" style={{ width: 110 + i * 36, height: 50 + i * 20, left: w / 2 - 205 - i * 18, top: -d / 2 + 58 + i * 26, transform: `translateZ(${112 - i * 12}px)` }} />)}
    {labels && <><div className="label3d" style={{ left: -w / 2, top: -d / 2 - 42 }}>{num.format(area)} m² cuarto</div><div className="label3d" style={{ left: w / 2 - 230, top: -d / 2 - 52 }}>{whole.format(btu)} BTU</div><div className="label3d" style={{ left: w / 2 + 42, top: -d / 2 + 126 }}>{whole.format(equipo)} BTU</div></>}
  </>;
}

function Pipe({ color, width, x, y, z, label, delay = '0s' }: { color: string; width: number; x: number; y: number; z: number; label: string; delay?: string }) {
  return <div className="pipe" style={{ width, left: x, top: y, transform: `translateZ(${z}px)`, '--pipe': `linear-gradient(90deg, ${color}, rgba(255,255,255,.86), ${color})`, '--glow': color } as CSSProperties} title={label}><span className="flow-dot" style={{ '--dot': color, '--to-x': `${width - 16}px`, '--to-y': '0px', animationDelay: delay } as CSSProperties} /></div>;
}

function DefaultScene({ labels }: { labels: boolean }) {
  return <>{<div className="box3d" style={boxStyle(420, 220, 42, 'linear-gradient(135deg,#facc15,#7c2d12)', '#431407', 10)}><div className="top" /></div>}{labels && <div className="label3d" style={{ left: -150, top: -150 }}>Escena técnica 3D</div>}</>;
}
