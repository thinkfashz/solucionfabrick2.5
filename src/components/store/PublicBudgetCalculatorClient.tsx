'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, Home, Snowflake, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

type Kind = 'aire' | 'radier';
type Capacity = 9000 | 12000 | 18000 | 24000;
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const prices: Record<Capacity, number> = { 9000: 289000, 12000: 349000, 18000: 529000, 24000: 749000 };
const capacities: Capacity[] = [9000, 12000, 18000, 24000];

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return <label className="grid gap-1 rounded-2xl border border-white/10 bg-white/[0.045] p-3"><span className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{label}</span><div className="flex items-center gap-2"><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1 bg-transparent text-lg font-black text-white outline-none" />{suffix && <span className="text-xs font-bold text-zinc-500">{suffix}</span>}</div></label>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <label className="grid gap-1 rounded-2xl border border-white/10 bg-white/[0.045] p-3"><span className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-base font-black text-white outline-none">{options.map(([v, label]) => <option key={v} value={v} className="bg-zinc-950 text-white">{label}</option>)}</select></label>;
}
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? 'border-orange-300/30 bg-gradient-to-br from-yellow-300 to-orange-500 text-black' : 'border-white/10 bg-white/[0.055] text-white'}`}><p className={`text-[10px] font-black uppercase tracking-[.2em] ${accent ? 'text-black/60' : 'text-zinc-500'}`}>{label}</p><p className="mt-1 text-2xl font-black tracking-[-.04em]">{value}</p></div>;
}
function Rows({ rows }: { rows: [string, number][] }) {
  return <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/35">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 last:border-b-0"><span className="text-sm text-zinc-400">{label}</span><b className="text-sm text-white">{money.format(value)}</b></div>)}</div>;
}
function Receipt({ title, rows, neto, iva, total, note }: { title: string; rows: [string, number][]; neto: number; iva: number; total: number; note: string }) {
  return <aside className="overflow-hidden rounded-[2rem] border border-orange-300/20 bg-[#f8f3e8] text-black shadow-[0_24px_80px_rgba(0,0,0,.35)]">
    <div className="flex items-center justify-between bg-[#2a2721] px-5 py-4 text-white"><span className="text-xs font-black uppercase tracking-[.26em]">Boleta digital</span><ClipboardList className="h-5 w-5 text-orange-300" /></div>
    <div className="p-5">
      <p className="text-[10px] font-black uppercase tracking-[.24em] text-black/40">Soluciones Fabrick</p>
      <h3 className="mt-2 text-2xl font-black tracking-[-.05em]">{title}</h3>
      <div className="my-5 border-y border-dashed border-black/15 py-3">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 py-2 text-sm"><span className="max-w-[62%] text-black/62">{label}</span><b>{money.format(value)}</b></div>)}</div>
      <div className="space-y-2 text-sm"><div className="flex justify-between text-black/55"><span>Neto estimado</span><b>{money.format(neto)}</b></div><div className="flex justify-between text-black/55"><span>IVA referencial</span><b>{money.format(iva)}</b></div><div className="mt-3 flex items-end justify-between rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-500 p-4"><span className="text-xs font-black uppercase tracking-[.18em] text-black/60">Total visible</span><b className="text-3xl font-black tracking-[-.05em]">{money.format(total)}</b></div></div>
      <p className="mt-4 text-xs leading-5 text-black/50">{note}</p>
    </div>
  </aside>;
}

function Budget3DViewer({ kind, area, total, cap, btu, volumen, sacos }: { kind: Kind; area: number; total: number; cap?: Capacity; btu?: number; volumen?: number; sacos?: number }) {
  const isAire = kind === 'aire';
  return <section className="mt-8 overflow-hidden rounded-[2.2rem] border border-orange-300/15 bg-[radial-gradient(circle_at_78%_8%,rgba(251,146,60,.22),transparent_22rem),linear-gradient(135deg,#0f0d09,#050403)] p-5 text-white shadow-[0_28px_100px_rgba(0,0,0,.42)] md:p-8">
    <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div><p className="text-[10px] font-black uppercase tracking-[.32em] text-orange-300">Visor 3D referencial</p><h2 className="mt-2 text-3xl font-black tracking-[-.06em] md:text-5xl">{isAire ? 'Simulación de instalación interior/exterior' : 'Corte 3D del radier y capas'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Vista rápida para que el cliente entienda qué se está presupuestando antes de pedir visita técnica.</p></div>
      <div className="rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-500 px-4 py-3 text-black"><p className="text-[10px] font-black uppercase tracking-[.18em] text-black/60">Total ref.</p><b className="text-2xl font-black tracking-[-.04em]">{money.format(total)}</b></div>
    </div>

    {isAire ? <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#1b1a17,#080706)] p-4">
        <div className="absolute inset-x-8 top-10 h-44 rounded-t-[2rem] border border-white/10 bg-white/[0.035]" />
        <div className="absolute bottom-8 left-8 right-8 h-44 rounded-[1.6rem] border border-orange-300/15 bg-[linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))]" style={{ transform: 'perspective(700px) rotateX(58deg) rotateZ(-22deg)', transformOrigin: 'center bottom' }} />
        <div className="absolute left-14 top-20 h-20 w-36 rounded-2xl border border-white/15 bg-[#f8f3e8] p-3 text-black shadow-[0_20px_45px_rgba(0,0,0,.38)]"><span className="block h-2 rounded-full bg-zinc-300" /><span className="mt-3 block text-center text-[10px] font-black uppercase tracking-[.18em] text-black/45">Split interior</span></div>
        <div className="absolute left-[11rem] top-[7.6rem] h-1 w-44 origin-left bg-gradient-to-r from-orange-300 to-transparent" style={{ transform: 'rotate(14deg)' }} />
        <div className="absolute right-10 top-36 h-28 w-28 rounded-[1.4rem] border border-orange-300/25 bg-black/65 p-3 shadow-[0_18px_50px_rgba(249,115,22,.20)]"><div className="grid h-full place-items-center rounded-full border-4 border-orange-300/50 text-[10px] font-black uppercase tracking-[.16em] text-orange-200">Condensador</div></div>
        <div className="absolute bottom-20 left-16 flex gap-4 opacity-90"><span className="h-16 w-28 rounded-full border border-cyan-200/30 bg-cyan-300/10 blur-[1px]" /><span className="h-16 w-28 rounded-full border border-cyan-200/25 bg-cyan-300/10 blur-[1px]" /><span className="h-16 w-28 rounded-full border border-cyan-200/20 bg-cyan-300/10 blur-[1px]" /></div>
        <div className="absolute bottom-7 left-8 rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100 ring-1 ring-cyan-200/20">Flujo frío</div>
      </div>
      <div className="grid content-start gap-3"><Metric label="Equipo sugerido" value={`${(cap || 9000).toLocaleString('es-CL')} BTU`} accent /><Metric label="BTU requeridos" value={(btu || 0).toLocaleString('es-CL')} /><Metric label="Área estimada" value={`${num.format(area)} m²`} /><div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-zinc-400">Incluye equipo interior, salida de tubería, unidad exterior y flujo de aire referencial. La ubicación real depende del muro, distancia de cañería y punto eléctrico.</div></div>
    </div> : <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#15130f,#070604)] p-4">
        <div className="absolute left-1/2 top-1/2 h-40 w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[1.4rem] bg-gradient-to-br from-zinc-200 to-zinc-400 shadow-[0_28px_80px_rgba(0,0,0,.42)]" style={{ transform: 'translate(-50%,-50%) perspective(800px) rotateX(58deg) rotateZ(-24deg)' }} />
        <div className="absolute left-1/2 top-[58%] h-10 w-[72%] -translate-x-1/2 rounded-b-[1.4rem] bg-zinc-500/70" style={{ transform: 'translateX(-50%) perspective(800px) rotateX(58deg) rotateZ(-24deg)' }} />
        <div className="absolute left-[17%] top-[64%] h-9 w-[64%] rounded-b-[1.2rem] bg-yellow-700/45" style={{ transform: 'perspective(800px) rotateX(58deg) rotateZ(-24deg)' }} />
        <div className="absolute left-[22%] top-[70%] h-8 w-[56%] rounded-b-[1rem] bg-orange-950/60" style={{ transform: 'perspective(800px) rotateX(58deg) rotateZ(-24deg)' }} />
        <div className="absolute left-[18%] top-[37%] grid h-32 w-[66%] grid-cols-6 grid-rows-4 opacity-35" style={{ transform: 'perspective(800px) rotateX(58deg) rotateZ(-24deg)' }}>{Array.from({ length: 24 }).map((_, i) => <span key={i} className="border border-black/35" />)}</div>
        <div className="absolute left-8 bottom-8 rounded-2xl border border-white/10 bg-black/55 p-3 text-xs text-zinc-300"><b className="block text-orange-300">Capas</b> Hormigón · estabilizado · terreno compacto</div>
        <div className="absolute right-8 top-8 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-3 text-xs text-orange-100"><b className="block text-lg text-white">{num.format(volumen || 0)} m³</b> hormigón con merma</div>
      </div>
      <div className="grid content-start gap-3"><Metric label="Área radier" value={`${num.format(area)} m²`} accent /><Metric label="Hormigón" value={`${num.format(volumen || 0)} m³`} /><Metric label="Cemento 25kg" value={`${sacos || 0} sacos`} /><div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-zinc-400">El visor representa una losa con capa superior de hormigón, base estabilizada y terreno. Sirve para explicar espesores y cubicación al cliente.</div></div>
    </div>}
  </section>;
}

export default function PublicBudgetCalculatorClient({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [largo, setLargo] = useState(kind === 'aire' ? 5 : 4);
  const [ancho, setAncho] = useState(kind === 'aire' ? 4 : 3);
  const [alto, setAlto] = useState(2.6);
  const [personas, setPersonas] = useState(2);
  const [watts, setWatts] = useState(350);
  const [grosor, setGrosor] = useState(10);
  const [forma, setForma] = useState('rectangular');
  const [servicio, setServicio] = useState('equipo_instalacion');

  const aire = useMemo(() => {
    const area = largo * ancho;
    const volumen = area * alto;
    const btu = Math.ceil(area * 600 + volumen * 55 + personas * 600 + watts * 3.412);
    const cap = capacities.find((c) => c >= btu) || 24000;
    const equipo = servicio !== 'solo_instalacion' ? prices[cap] : 0;
    const instalacion = servicio !== 'solo_equipo' ? 180000 : 0;
    const materiales = servicio !== 'solo_equipo' ? 65000 : 0;
    const visita = servicio !== 'solo_equipo' ? 25000 : 0;
    const envio = servicio !== 'solo_equipo' ? 25000 : 0;
    const subtotal = equipo + instalacion + materiales + visita + envio;
    const neto = Math.round(subtotal * 1.12);
    const iva = Math.round(neto * 0.19);
    const total = neto + iva;
    const kwhMes = (cap === 9000 ? 0.82 : cap === 12000 ? 1.08 : cap === 18000 ? 1.58 : 2.2) * 6 * 30;
    const rows: [string, number][] = [[`Equipo ${cap.toLocaleString('es-CL')} BTU`, equipo], ['Instalación estándar', instalacion], ['Materiales', materiales], ['Envío / traslado', envio], ['Visita técnica', visita]];
    return { area, volumen, btu, cap, equipo, instalacion, materiales, visita, envio, neto, iva, total, kwhMes, mensual: Math.round(kwhMes * 210 * 0.72), rows };
  }, [alto, ancho, largo, personas, servicio, watts]);

  const radier = useMemo(() => {
    const factor = forma === 'l' ? 0.82 : forma === 'u' ? 0.72 : 1;
    const area = largo * ancho * factor;
    const volumen = area * (grosor / 100) * 1.08;
    const sacos = Math.ceil(volumen * 7.2);
    const estabilizado = area * 0.07;
    const materiales = Math.round(volumen * 92000 + sacos * 5600 + estabilizado * 28000);
    const manoObra = Math.round(area * 18500);
    const transporte = Math.max(35000, Math.round(area * 1200));
    const neto = materiales + manoObra + transporte;
    const iva = Math.round(neto * 0.19);
    const total = neto + iva;
    const rows: [string, number][] = [['Materiales + cemento', materiales], ['Mano de obra', manoObra], ['Transporte', transporte], ['Base estabilizada', Math.round(estabilizado * 28000)]];
    return { area, volumen, sacos, estabilizado, materiales, manoObra, transporte, neto, iva, total, rows };
  }, [ancho, forma, grosor, largo]);

  const isAire = kind === 'aire';
  const total = isAire ? aire.total : radier.total;
  const title = isAire ? 'Calculadora de aire acondicionado' : 'Calculadora de radier';
  const subtitle = isAire ? 'Motor libre para clientes: calcula BTU, equipo sugerido, instalación, consumo y presupuesto referencial.' : 'Motor libre para clientes: calcula m², m³, cemento, estabilizado, mano de obra y presupuesto referencial.';
  const rows = isAire ? aire.rows : radier.rows;
  const neto = isAire ? aire.neto : radier.neto;
  const iva = isAire ? aire.iva : radier.iva;

  return <main className="min-h-screen bg-[#060504] px-4 py-5 pb-28 text-white md:px-8">
    <div className="mx-auto max-w-[1320px]">
      <button onClick={() => navigateWithTransition('/tienda', router)} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black text-white/75"><ArrowLeft className="h-4 w-4" /> Volver a tienda</button>
      <section className="overflow-hidden rounded-[2.2rem] border border-orange-300/15 bg-[radial-gradient(circle_at_20%_0%,rgba(255,180,0,.16),transparent_24rem),linear-gradient(135deg,#11100c,#050403)] shadow-[0_28px_100px_rgba(0,0,0,.42)]">
        <div className="grid gap-0 xl:grid-cols-[.86fr_1.14fr]">
          <aside className="p-5 md:p-8">
            <p className="text-[10px] font-black uppercase tracking-[.32em] text-orange-300">Cliente · uso libre</p>
            <h1 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.07em] md:text-6xl">{title}</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">{subtitle}</p>
            <div className="mt-6 grid grid-cols-2 gap-3"><Metric label="Total ref." value={money.format(total)} accent /><Metric label={isAire ? 'Cobertura' : 'Área'} value={`${num.format(isAire ? aire.area : radier.area)} m²`} /></div>
            <div className="mt-5 rounded-[1.7rem] border border-white/10 bg-black/30 p-4 text-sm leading-6 text-zinc-400">Usa este resultado para entender el rango de inversión antes de hablar con el equipo. La visita técnica confirma medidas, acceso y disponibilidad.</div>
          </aside>
          <section className="grid gap-5 border-t border-white/10 p-5 md:p-8 xl:grid-cols-[1fr_360px] xl:border-l xl:border-t-0">
            <div className="grid content-start gap-4">
              {isAire ? <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Largo" value={largo} suffix="m" onChange={setLargo} /><Field label="Ancho" value={ancho} suffix="m" onChange={setAncho} /><Field label="Alto" value={alto} suffix="m" onChange={setAlto} /><Field label="Personas" value={personas} onChange={setPersonas} /></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Watts equipos" value={watts} suffix="W" onChange={setWatts} /><SelectField label="Servicio" value={servicio} onChange={setServicio} options={[["equipo_instalacion", 'Equipo + instalación'], ["solo_instalacion", 'Solo instalación'], ["solo_equipo", 'Solo equipo']]} /></div><div className="grid gap-3 md:grid-cols-4"><Metric label="BTU requeridos" value={aire.btu.toLocaleString('es-CL')} /><Metric label="Equipo sugerido" value={`${aire.cap.toLocaleString('es-CL')} BTU`} /><Metric label="Consumo" value={`${num.format(aire.kwhMes)} kWh/mes`} /><Metric label="Gasto mensual" value={money.format(aire.mensual)} /></div><Rows rows={rows} /></> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Largo" value={largo} suffix="m" onChange={setLargo} /><Field label="Ancho" value={ancho} suffix="m" onChange={setAncho} /><Field label="Grosor" value={grosor} suffix="cm" onChange={setGrosor} /><SelectField label="Forma" value={forma} onChange={setForma} options={[["rectangular", 'Rectangular'], ["l", 'Forma L'], ["u", 'Forma U']]} /></div><div className="grid gap-3 md:grid-cols-4"><Metric label="Área" value={`${num.format(radier.area)} m²`} /><Metric label="Hormigón" value={`${num.format(radier.volumen)} m³`} /><Metric label="Cemento 25kg" value={`${radier.sacos} sacos`} /><Metric label="Estabilizado" value={`${num.format(radier.estabilizado)} m³`} /></div><Rows rows={rows} /></>}
              <div className="rounded-[1.7rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-100"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-300" /> Resultado referencial. Para cerrar precio real se valida acceso, medidas, stock, instalación y condiciones técnicas.</div>
              <a href="/contacto" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-black"><Truck className="h-4 w-4" /> Pedir cotización final</a>
            </div>
            <Receipt title={isAire ? `Aire ${aire.cap.toLocaleString('es-CL')} BTU` : `Radier ${num.format(radier.area)} m²`} rows={rows} neto={neto} iva={iva} total={total} note={isAire ? 'Incluye cálculo BTU, equipo sugerido y costos base de instalación. No reemplaza visita técnica.' : 'Incluye cubicación, sacos, estabilizado y costos base. No reemplaza revisión de terreno.'} />
          </section>
        </div>
      </section>
      <Budget3DViewer kind={kind} area={isAire ? aire.area : radier.area} total={total} cap={isAire ? aire.cap : undefined} btu={isAire ? aire.btu : undefined} volumen={isAire ? undefined : radier.volumen} sacos={isAire ? undefined : radier.sacos} />
      <div className="mt-5 grid gap-3 md:grid-cols-2"><a href="/herramientas/aire-acondicionado" className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 font-black text-white"><Snowflake className="mb-2 h-5 w-5 text-orange-300" /> Ir al motor de aire</a><a href="/herramientas/radier" className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 font-black text-white"><Home className="mb-2 h-5 w-5 text-orange-300" /> Ir al motor de radier</a></div>
    </div>
  </main>;
}
