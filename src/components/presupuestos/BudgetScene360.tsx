'use client';

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type SceneKind = 'radier' | 'aire' | 'default';
type BudgetScene360Props = { kind?: SceneKind; title?: string; subtitle?: string; data?: Record<string, unknown>; compact?: boolean };

const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function readNumber(data: Record<string, unknown> | undefined, key: string, fallback = 0) { const v = data?.[key]; const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? n : fallback; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function box(w: number, h: number, z = 0, extra = '') { return { width: w, height: h, transform: `translate3d(${-w / 2}px, ${-h / 2}px, ${z}px) ${extra}` } as CSSProperties; }

export default function BudgetScene360({ kind = 'default', title, subtitle, data, compact = false }: BudgetScene360Props) {
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [yaw, setYaw] = useState(kind === 'aire' ? 18 : 34);
  const [pitch, setPitch] = useState(kind === 'aire' ? 50 : 56);
  const [zoom, setZoom] = useState(kind === 'aire' ? 0.9 : 1);
  const [spin, setSpin] = useState(false);
  const [labels, setLabels] = useState(true);
  const [cutaway, setCutaway] = useState(false);

  const stats = useMemo(() => {
    if (kind === 'aire') return [['Área', `${num.format(readNumber(data, 'area', 16))} m²`], ['BTU', `${whole.format(readNumber(data, 'btu', 12000))}`], ['Equipo', `${whole.format(readNumber(data, 'seleccionado', 12000))} BTU`]];
    if (kind === 'radier') return [['Área', `${num.format(readNumber(data, 'area', 24))} m²`], ['Hormigón', `${num.format(readNumber(data, 'hormigon', 2.4))} m³`], ['Perímetro', `${num.format(readNumber(data, 'perimetro', 20))} ml`]];
    return [['Vista', '3D'], ['Estado', 'Activo'], ['Modo', 'Interactivo']];
  }, [data, kind]);

  function start(x: number, y: number) { setSpin(false); drag.current = { x, y, yaw, pitch }; }
  function move(x: number, y: number) { if (!drag.current) return; setYaw(drag.current.yaw + (x - drag.current.x) * 0.35); setPitch(clamp(drag.current.pitch - (y - drag.current.y) * 0.22, 24, 66)); }
  function end() { drag.current = null; }

  const transform = `rotateX(${pitch}deg) rotateZ(${yaw}deg) scale(${zoom})`;

  return <section className={`sf-budget-3d relative mx-auto w-full overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#070504] text-white shadow-[0_30px_90px_rgba(0,0,0,.55)] ${compact ? 'min-h-[440px]' : 'min-h-[610px]'}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,193,7,.2),transparent_22rem),radial-gradient(circle_at_80%_60%,rgba(37,99,235,.12),transparent_24rem)]" />
    <style jsx global>{`
      .sf-budget-3d *{box-sizing:border-box}.sf-budget-3d .scene-stage{position:relative;display:grid;place-items:center;min-height:420px;overflow:hidden;border-radius:1.65rem;border:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.72));perspective:1050px;touch-action:none}.sf-budget-3d .scene-frame{position:relative;width:100%;height:430px;max-width:760px;margin:0 auto;transform-style:preserve-3d}.sf-budget-3d .scene-root{position:absolute;left:50%;top:54%;width:0;height:0;transform-style:preserve-3d;transition:transform 90ms linear}.sf-budget-3d .scene-root.spin{animation:sf-spin 18s linear infinite}.sf-budget-3d .plane,.sf-budget-3d .block,.sf-budget-3d .label3d,.sf-budget-3d .pipe,.sf-budget-3d .air-wave{position:absolute;left:50%;top:50%;transform-style:preserve-3d}.sf-budget-3d .plane{border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 0 32px rgba(255,255,255,.08),0 22px 60px rgba(0,0,0,.32)}.sf-budget-3d .block{border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 0 18px rgba(255,255,255,.12),0 18px 45px rgba(0,0,0,.4)}.sf-budget-3d .label3d{z-index:15;transform:translateZ(160px);padding:6px 9px;border-radius:999px;border:1px solid rgba(255,209,102,.36);background:rgba(0,0,0,.75);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#fde68a;white-space:nowrap}.sf-budget-3d .pipe{height:7px;border-radius:999px;background:linear-gradient(90deg,#67e8f9,#fff,#fb923c);box-shadow:0 0 16px rgba(103,232,249,.55)}.sf-budget-3d .air-wave{border:1px solid rgba(103,232,249,.45);border-radius:999px;background:rgba(103,232,249,.08);box-shadow:0 0 26px rgba(103,232,249,.25);animation:sf-air 2.4s ease-in-out infinite}.sf-budget-3d .lamp{position:absolute;left:50%;top:50%;width:72px;height:72px;border-radius:999px;background:radial-gradient(circle,#fff7cd,#facc15 45%,rgba(250,204,21,.25) 70%,transparent);box-shadow:0 0 55px rgba(250,204,21,.85);transform:translate3d(-36px,-36px,190px)}@keyframes sf-spin{from{transform:rotateX(50deg) rotateZ(0deg) scale(.9)}to{transform:rotateX(50deg) rotateZ(360deg) scale(.9)}}@keyframes sf-air{50%{transform:translateZ(130px) translateX(18px) scale(1.04);opacity:.75}}@media(max-width:560px){.sf-budget-3d .scene-stage{min-height:390px}.sf-budget-3d .scene-frame{height:400px;transform:scale(.84);transform-origin:center}.sf-budget-3d .scene-root{top:56%}.sf-budget-3d .label3d{font-size:7px;padding:4px 6px}}
    `}</style>

    <div className="relative z-10 flex flex-col gap-4 p-3 sm:p-5">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">Visor 3D interactivo</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{title || (kind === 'aire' ? 'Habitación climatizada 360' : kind === 'radier' ? 'Radier volumétrico 3D' : 'Escena técnica 3D')}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{subtitle || 'Arrastra para girar. Vista completa con paredes, ventana, puerta, lámpara, aire y condensador.'}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.06] p-3 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p><b className="mt-1 block text-sm text-amber-200">{value}</b></div>)}</div>

      <div className="scene-stage" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(e.clientX, e.clientY); }} onPointerMove={(e) => move(e.clientX, e.clientY)} onPointerUp={end} onPointerCancel={end}>
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-amber-300/30 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">Tocar + arrastrar</div>
        <div className="scene-frame"><div className={`scene-root ${spin ? 'spin' : ''}`} style={{ transform } as CSSProperties}>{kind === 'aire' ? <AirScene data={data} cutaway={cutaway} labels={labels} /> : kind === 'radier' ? <RadierScene data={data} labels={labels} /> : <DefaultScene labels={labels} />}</div></div>
      </div>

      <div className="flex flex-wrap justify-center gap-2"><Tool onClick={() => { setYaw(0); setPitch(48); setSpin(false); }}>Frontal</Tool><Tool onClick={() => { setYaw(55); setPitch(50); setSpin(false); }}>Esquina</Tool><Tool onClick={() => { setYaw(90); setPitch(52); setSpin(false); }}>Lateral</Tool><Tool onClick={() => setZoom((z) => clamp(z + .1, .7, 1.35))}>Zoom +</Tool><Tool onClick={() => setZoom((z) => clamp(z - .1, .7, 1.35))}>Zoom -</Tool><Tool onClick={() => setLabels((v) => !v)}>Cotas</Tool>{kind === 'aire' && <Tool onClick={() => setCutaway((v) => !v)}>Ver muro</Tool>}<button type="button" onClick={() => setSpin((v) => !v)} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black">{spin ? 'Pausar' : 'Giro 360'}</button></div>
    </div>
  </section>;
}

function AirScene({ data, cutaway, labels }: { data?: Record<string, unknown>; cutaway: boolean; labels: boolean }) {
  const area = readNumber(data, 'area', 16); const btu = readNumber(data, 'btu', 12000); const equipo = readNumber(data, 'seleccionado', 12000);
  const w = clamp(Math.sqrt(area) * 82, 330, 520); const d = clamp((area / Math.max(1, Math.sqrt(area))) * 66, 220, 390); const h = 178;
  return <>
    <div className="plane" style={{ ...box(w, d, 0, 'rotateX(0deg)'), background: 'linear-gradient(135deg,#806145,#2b1d14)' }} />
    <div className="plane" style={{ ...box(w, h, 92, 'translateY(-' + d / 2 + 'px) rotateX(90deg)'), background: 'linear-gradient(135deg,#f3e2c7,#b99468)' }}><Window x={-w * .25} y={-35} /><Split x={w * .22} y={-44} /></div>
    <div className="plane" style={{ ...box(d, h, 92, 'translateX(-' + w / 2 + 'px) rotateY(90deg)'), background: 'linear-gradient(135deg,#e6d0ac,#7b5939)' }}><Door x={-12} y={4} /></div>
    {!cutaway && <div className="plane" style={{ ...box(d, h, 92, 'translateX(' + w / 2 + 'px) rotateY(90deg)'), background: 'linear-gradient(135deg,#dbc19b,#5b3e27)', opacity: .45 }} />}
    <div className="lamp" />
    <Block w={120} h={70} x={-70} y={45} z={35} color="linear-gradient(135deg,#f8ead2,#a88d6f)" label="cama" />
    <Block w={70} h={55} x={w / 2 + 72} y={-d / 2 + 40} z={42} color="linear-gradient(135deg,#e5e7eb,#111827)" label="condensador" />
    <div className="pipe" style={{ width: 190, left: w / 2 - 70, top: -d / 2 + 18, transform: 'translateZ(120px) rotateZ(8deg)' }} />
    {[0, 1, 2, 3].map((i) => <div key={i} className="air-wave" style={{ width: 110 + i * 34, height: 44 + i * 12, left: w * .22 - 120 - i * 16, top: -d / 2 + 82 + i * 24, transform: `translateZ(${118 - i * 10}px)`, animationDelay: `${i * .18}s` }} />)}
    {labels && <><Label x={-w / 2 + 8} y={-d / 2 - 32}>{num.format(area)} m² habitación</Label><Label x={w * .2} y={-d / 2 - 48}>{whole.format(btu)} BTU calculado</Label><Label x={w / 2 + 26} y={-d / 2 + 110}>condensador exterior</Label><Label x={-w / 2 - 28} y={d / 2 - 34}>puerta</Label><Label x={-w * .28} y={-d / 2 + 8}>ventana</Label><Label x={-42} y={-24}>lámpara central</Label><Label x={w * .2} y={-d / 2 + 38}>split {whole.format(equipo)} BTU</Label></>}
  </>;
}

function Split({ x, y }: { x: number; y: number }) { return <div className="block" style={{ ...box(118, 28, 25), left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, background: 'linear-gradient(135deg,#f8fafc,#9fd8e8)', borderRadius: 12 }}><div className="absolute bottom-1 left-5 right-5 h-1 rounded-full bg-cyan-300" /></div>; }
function Window({ x, y }: { x: number; y: number }) { return <div className="block" style={{ ...box(92, 62, 18), left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, background: 'linear-gradient(135deg,#93c5fd,#0f172a)', border: '5px solid rgba(255,255,255,.55)' }} />; }
function Door({ x, y }: { x: number; y: number }) { return <div className="block" style={{ ...box(66, 118, 14), left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, background: 'linear-gradient(135deg,#6b3f1e,#1c120b)', borderRadius: 6 }}><span className="absolute right-2 top-1/2 h-2 w-2 rounded-full bg-amber-300" /></div>; }
function Block({ w, h, x, y, z, color }: { w: number; h: number; x: number; y: number; z: number; color: string; label?: string }) { return <div className="block" style={{ ...box(w, h, z), left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, background: color, borderRadius: 14 }} />; }
function Label({ x, y, children }: { x: number; y: number; children: ReactNode }) { return <div className="label3d" style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}>{children}</div>; }

function RadierScene({ data, labels }: { data?: Record<string, unknown>; labels: boolean }) { const area = readNumber(data, 'area', 24); const w = clamp(Math.sqrt(area) * 58, 260, 500); const d = clamp((area / Math.max(1, Math.sqrt(area))) * 44, 150, 310); return <><div className="plane" style={{ ...box(w, d, 12), background: 'linear-gradient(135deg,#fff2d1,#806a55)' }} />{labels && <Label x={-w / 2} y={-d / 2 - 42}>{num.format(area)} m² radier</Label>}</>; }
function DefaultScene({ labels }: { labels: boolean }) { return <><div className="plane" style={{ ...box(420, 220, 20), background: 'linear-gradient(135deg,#facc15,#7c2d12)' }} />{labels && <Label x={-120} y={-130}>Escena técnica 3D</Label>}</>; }
function Tool({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15">{children}</button>; }
