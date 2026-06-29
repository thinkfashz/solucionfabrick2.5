'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';

type SceneKind = 'radier' | 'aire' | 'default';
type BudgetScene360Props = { kind?: SceneKind; title?: string; subtitle?: string; data?: Record<string, unknown>; compact?: boolean };

const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function readNumber(data: Record<string, unknown> | undefined, key: string, fallback = 0) {
  const v = data?.[key];
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export default function BudgetScene360({ kind = 'default', title, subtitle, data, compact = false }: BudgetScene360Props) {
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const [yaw, setYaw] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [labels, setLabels] = useState(true);
  const [spin, setSpin] = useState(false);
  const [tarifa, setTarifa] = useState(210);
  const [horasNormal, setHorasNormal] = useState(6);
  const [horasIntenso, setHorasIntenso] = useState(10);

  const stats = useMemo(() => {
    if (kind === 'aire') return [['Área', `${num.format(readNumber(data, 'area', 16))} m²`], ['BTU', `${whole.format(readNumber(data, 'btu', 12000))}`], ['Equipo', `${whole.format(readNumber(data, 'seleccionado', 12000))} BTU`]];
    if (kind === 'radier') return [['Área', `${num.format(readNumber(data, 'area', 24))} m²`], ['Hormigón', `${num.format(readNumber(data, 'hormigon', 2.4))} m³`], ['Perímetro', `${num.format(readNumber(data, 'perimetro', 20))} ml`]];
    return [['Vista', '3D'], ['Estado', 'Activo'], ['Modo', 'Interactivo']];
  }, [data, kind]);

  const btuEquipo = readNumber(data, 'seleccionado', 12000);
  const kwApprox = Math.max(0.55, btuEquipo / 12000 * 0.82);
  const kwhNormal = kwApprox * horasNormal * 30;
  const kwhIntenso = kwApprox * horasIntenso * 30;
  const costoNormal = Math.round(kwhNormal * tarifa);
  const costoIntenso = Math.round(kwhIntenso * tarifa);

  function start(x: number) { drag.current = { x, yaw }; setSpin(false); }
  function move(x: number) { if (!drag.current) return; setYaw(clamp(drag.current.yaw + (x - drag.current.x) * 0.18, -38, 38)); }
  function end() { drag.current = null; }

  return <section className={`sf-air-viewer relative mx-auto w-full overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#070504] text-white shadow-[0_30px_90px_rgba(0,0,0,.55)] ${compact ? 'min-h-[520px]' : 'min-h-[650px]'}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,193,7,.16),transparent_24rem),radial-gradient(circle_at_85%_58%,rgba(37,99,235,.13),transparent_24rem)]" />
    <style jsx global>{`
      .sf-air-viewer *{box-sizing:border-box}.sf-air-viewer .room-card{position:relative;overflow:hidden;border-radius:1.6rem;border:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(0,0,0,.62));touch-action:none}.sf-air-viewer .room-wrap{position:relative;margin:auto;width:min(100%,920px);height:clamp(420px,64vw,620px)}.sf-air-viewer svg{display:block;width:100%;height:100%;overflow:visible}.sf-air-viewer .air-dot{animation:sf-air-move 2.2s ease-in-out infinite}.sf-air-viewer .air-dot:nth-child(2){animation-delay:.25s}.sf-air-viewer .air-dot:nth-child(3){animation-delay:.5s}.sf-air-viewer .air-dot:nth-child(4){animation-delay:.75s}@keyframes sf-air-move{0%{transform:translateX(0);opacity:.2}35%{opacity:1}100%{transform:translateX(-135px);opacity:.1}}.sf-air-viewer .fan{transform-origin:750px 258px;animation:sf-fan .9s linear infinite}@keyframes sf-fan{to{transform:rotate(360deg)}}@media(max-width:640px){.sf-air-viewer .room-wrap{height:470px}.sf-air-viewer .viewer-title{font-size:1.65rem}.sf-air-viewer .mini-label{font-size:8px}}
    `}</style>

    <div className="relative z-10 grid gap-4 p-3 sm:p-5">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">Visor 3D interactivo</p>
        <h2 className="viewer-title mt-2 text-3xl font-black tracking-tight sm:text-5xl">{title || (kind === 'aire' ? 'Habitación climatizada 360' : kind === 'radier' ? 'Radier volumétrico 3D' : 'Escena técnica 3D')}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{subtitle || 'Vista clara y responsive para que el cliente entienda el espacio, el equipo, la instalación y el consumo.'}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.06] p-3 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p><b className="mt-1 block text-sm text-amber-200">{value}</b></div>)}</div>

      {kind === 'aire' && <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="room-card" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(e.clientX); }} onPointerMove={(e) => move(e.clientX)} onPointerUp={end} onPointerCancel={end}>
          <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-amber-300/30 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">Arrastra para girar</div>
          <div className="room-wrap" style={{ transform: `scale(${zoom}) rotateY(${yaw}deg)`, transformOrigin: 'center center', transition: drag.current ? 'none' : 'transform 180ms ease' }}>
            <AirRoomSvg data={data} labels={labels} />
          </div>
        </div>

        <div className="grid content-start gap-3 rounded-[1.6rem] border border-white/10 bg-white/[.045] p-4">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Consumo estimado</p>
          <EnergyControl label="Precio luz kWh" value={tarifa} min={80} max={450} step={10} onChange={setTarifa} suffix="$/kWh" />
          <EnergyControl label="Modo normal" value={horasNormal} min={1} max={12} step={1} onChange={setHorasNormal} suffix="h/día" />
          <EnergyControl label="Modo intenso" value={horasIntenso} min={4} max={18} step={1} onChange={setHorasIntenso} suffix="h/día" />
          <div className="grid grid-cols-2 gap-2">
            <EnergyCard label="Normal" kwh={kwhNormal} cost={costoNormal} />
            <EnergyCard label="Intenso" kwh={kwhIntenso} cost={costoIntenso} />
          </div>
          <p className="text-xs leading-5 text-zinc-400">Estimación referencial inverter. El gasto real depende de aislación, temperatura exterior, setpoint y uso.</p>
        </div>
      </div>}

      {kind !== 'aire' && <div className="room-card"><div className="room-wrap"><RadierSvg data={data} labels={labels} /></div></div>}

      <div className="flex flex-wrap justify-center gap-2">
        <Tool onClick={() => { setYaw(0); setSpin(false); }}>Frontal</Tool>
        <Tool onClick={() => { setYaw(26); setSpin(false); }}>Esquina</Tool>
        <Tool onClick={() => { setYaw(-28); setSpin(false); }}>Lateral</Tool>
        <Tool onClick={() => setZoom((z) => clamp(z + .08, .82, 1.25))}>Zoom +</Tool>
        <Tool onClick={() => setZoom((z) => clamp(z - .08, .82, 1.25))}>Zoom -</Tool>
        <Tool onClick={() => setLabels((v) => !v)}>Cotas</Tool>
        <button type="button" onClick={() => { setSpin((v) => !v); setYaw(spin ? 0 : 28); }} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black">{spin ? 'Pausar' : 'Giro suave'}</button>
      </div>
    </div>
  </section>;
}

function AirRoomSvg({ data, labels }: { data?: Record<string, unknown>; labels: boolean }) {
  const area = readNumber(data, 'area', 16);
  const btu = readNumber(data, 'btu', 12000);
  const equipo = readNumber(data, 'seleccionado', 12000);
  return <svg viewBox="0 0 920 620" role="img" aria-label="Habitación con aire acondicionado, paredes, puerta, ventana, cama, lámpara y condensador exterior">
    <defs>
      <linearGradient id="floor" x1="0" x2="1"><stop offset="0" stopColor="#7c5639"/><stop offset="1" stopColor="#2b1a10"/></linearGradient>
      <linearGradient id="wall" x1="0" x2="1"><stop offset="0" stopColor="#f1dcc0"/><stop offset="1" stopColor="#b98c59"/></linearGradient>
      <linearGradient id="rightWall" x1="0" x2="1"><stop offset="0" stopColor="#6f4b2e"/><stop offset="1" stopColor="#2a160d"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="920" height="620" rx="28" fill="#070b12" />
    <polygon points="150,118 665,78 807,238 265,280" fill="url(#wall)" stroke="rgba(255,255,255,.38)" strokeWidth="3"/>
    <polygon points="265,280 807,238 777,510 185,560" fill="url(#floor)" stroke="rgba(255,255,255,.28)" strokeWidth="3"/>
    <polygon points="665,78 807,238 777,510 650,365" fill="url(#rightWall)" stroke="rgba(255,255,255,.18)" strokeWidth="3"/>
    <polygon points="150,118 265,280 185,560 80,385" fill="#4b321f" opacity=".95" stroke="rgba(255,255,255,.16)" strokeWidth="3"/>

    <g id="window"><polygon points="260,142 390,130 390,222 260,234" fill="#103047" stroke="#e0f2fe" strokeWidth="8"/><line x1="325" y1="136" x2="325" y2="228" stroke="#e0f2fe" strokeWidth="5"/><line x1="260" y1="186" x2="390" y2="174" stroke="#e0f2fe" strokeWidth="5"/></g>
    <g id="door"><polygon points="105,245 183,264 166,475 86,430" fill="#3b2112" stroke="#facc15" strokeOpacity=".35" strokeWidth="4"/><circle cx="154" cy="363" r="7" fill="#facc15"/></g>

    <g id="split"><rect x="500" y="135" width="160" height="48" rx="16" fill="#f8fafc" stroke="#bae6fd" strokeWidth="4"/><rect x="525" y="171" width="108" height="7" rx="4" fill="#67e8f9" filter="url(#glow)"/><text x="580" y="126" textAnchor="middle" fill="#fde68a" fontSize="13" fontWeight="800">SPLIT {whole.format(equipo)} BTU</text></g>

    <g id="air-flow" opacity=".9">
      <path d="M512 190 C450 230 395 238 335 265" fill="none" stroke="#67e8f9" strokeWidth="3" strokeDasharray="10 10" filter="url(#glow)"/>
      <path d="M548 192 C480 260 420 285 350 340" fill="none" stroke="#67e8f9" strokeWidth="3" strokeDasharray="10 10" filter="url(#glow)"/>
      <path d="M592 192 C510 300 450 355 355 430" fill="none" stroke="#67e8f9" strokeWidth="3" strokeDasharray="10 10" filter="url(#glow)"/>
      <circle className="air-dot" cx="500" cy="210" r="7" fill="#67e8f9"/><circle className="air-dot" cx="560" cy="235" r="6" fill="#67e8f9"/><circle className="air-dot" cx="610" cy="285" r="5" fill="#67e8f9"/><circle className="air-dot" cx="645" cy="350" r="4" fill="#67e8f9"/>
    </g>

    <g id="bed"><polygon points="312,356 520,336 595,410 372,445" fill="#412819" stroke="rgba(255,255,255,.2)" strokeWidth="3"/><polygon points="335,330 508,314 580,366 390,392" fill="#f6e8d4" stroke="#fff7ed" strokeWidth="3"/><polygon points="338,304 430,298 465,328 368,338" fill="#fef3c7"/></g>
    <g id="lamp"><line x1="470" y1="80" x2="470" y2="170" stroke="#fef3c7" strokeWidth="4"/><ellipse cx="470" cy="188" rx="36" ry="21" fill="#facc15" filter="url(#glow)"/><circle cx="470" cy="190" r="11" fill="#fff7cc"/></g>

    <g id="pipe"><path d="M660 158 C730 162 756 184 788 228" fill="none" stroke="#facc15" strokeWidth="8" strokeLinecap="round"/><path d="M660 172 C720 182 746 205 775 252" fill="none" stroke="#67e8f9" strokeWidth="5" strokeLinecap="round"/></g>
    <g id="condenser"><rect x="718" y="230" width="112" height="86" rx="12" fill="#e5e7eb" stroke="#94a3b8" strokeWidth="4"/><circle cx="774" cy="273" r="28" fill="#0f172a"/><g className="fan"><path d="M774 250 L785 273 L774 296 L763 273 Z" fill="#67e8f9" opacity=".85"/><path d="M751 273 L774 262 L797 273 L774 284 Z" fill="#67e8f9" opacity=".65"/></g><text x="774" y="335" textAnchor="middle" fill="#fde68a" fontSize="12" fontWeight="900">CONDENSADOR</text></g>

    {labels && <g className="mini-label" fontSize="12" fontWeight="900" fill="#fde68a"><LabelSvg x={178} y={105}>Pared principal</LabelSvg><LabelSvg x={304} y={258}>{num.format(area)} m²</LabelSvg><LabelSvg x={258} y={128}>Ventana</LabelSvg><LabelSvg x={83} y={238}>Puerta</LabelSvg><LabelSvg x={426} y={73}>Lámpara central</LabelSvg><LabelSvg x={500} y={112}>{whole.format(btu)} BTU calculado</LabelSvg><LabelSvg x={680} y={145}>Tubería</LabelSvg><LabelSvg x={715} y={222}>Unidad exterior</LabelSvg></g>}
  </svg>;
}

function LabelSvg({ x, y, children }: { x: number; y: number; children: ReactNode }) { return <g><rect x={x - 8} y={y - 17} width={String(children).length * 8 + 18} height="24" rx="12" fill="rgba(0,0,0,.68)" stroke="rgba(250,204,21,.35)"/><text x={x} y={y} fill="#fde68a">{children}</text></g>; }

function RadierSvg({ data, labels }: { data?: Record<string, unknown>; labels: boolean }) {
  const area = readNumber(data, 'area', 24);
  return <svg viewBox="0 0 900 520"><rect width="900" height="520" rx="28" fill="#090909"/><polygon points="180,150 680,120 760,330 250,390" fill="#cbb89f" stroke="#facc15" strokeWidth="4"/><polygon points="250,390 760,330 720,395 230,455" fill="#7a5035"/><text x="450" y="265" textAnchor="middle" fill="#111827" fontSize="44" fontWeight="900">{num.format(area)} m²</text>{labels && <text x="450" y="90" textAnchor="middle" fill="#fde68a" fontSize="22" fontWeight="900">Radier volumétrico</text>}</svg>;
}

function EnergyControl({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return <label className="grid gap-2 rounded-2xl border border-white/10 bg-black/35 p-3"><span className="flex justify-between text-[10px] font-black uppercase tracking-[.18em] text-zinc-500"><span>{label}</span><b className="text-amber-200">{value} {suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
function EnergyCard({ label, kwh, cost }: { label: string; kwh: number; cost: number }) { return <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-amber-200">{label}</p><b className="mt-1 block text-lg text-white">{money.format(cost)}</b><span className="text-xs text-zinc-400">{num.format(kwh)} kWh/mes</span></div>; }
function Tool({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15">{children}</button>; }
