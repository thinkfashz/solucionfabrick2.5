'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Snowflake, Truck } from 'lucide-react';
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
    const neto = (equipo + instalacion + materiales + visita + envio) * 1.12;
    const total = Math.round(neto * 1.19);
    const kwhMes = (cap === 9000 ? 0.82 : cap === 12000 ? 1.08 : cap === 18000 ? 1.58 : 2.2) * 6 * 30;
    return { area, volumen, btu, cap, equipo, instalacion, materiales, visita, envio, total, kwhMes, mensual: Math.round(kwhMes * 210 * 0.72) };
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
    const total = Math.round((materiales + manoObra + transporte) * 1.19);
    return { area, volumen, sacos, estabilizado, materiales, manoObra, transporte, total };
  }, [ancho, forma, grosor, largo]);

  const isAire = kind === 'aire';
  const total = isAire ? aire.total : radier.total;
  const title = isAire ? 'Calculadora de aire acondicionado' : 'Calculadora de radier';
  const subtitle = isAire ? 'Motor libre para clientes: calcula BTU, equipo sugerido, instalación, consumo y presupuesto referencial.' : 'Motor libre para clientes: calcula m², m³, cemento, estabilizado, mano de obra y presupuesto referencial.';

  return <main className="min-h-screen bg-[#060504] px-4 py-5 pb-28 text-white md:px-8"><div className="mx-auto max-w-[1280px]"><button onClick={() => navigateWithTransition('/tienda', router)} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black text-white/75"><ArrowLeft className="h-4 w-4" /> Volver a tienda</button><section className="overflow-hidden rounded-[2.2rem] border border-orange-300/15 bg-[radial-gradient(circle_at_20%_0%,rgba(255,180,0,.16),transparent_24rem),linear-gradient(135deg,#11100c,#050403)] shadow-[0_28px_100px_rgba(0,0,0,.42)]"><div className="grid gap-0 lg:grid-cols-[.9fr_1.1fr]"><aside className="p-5 md:p-8"><p className="text-[10px] font-black uppercase tracking-[.32em] text-orange-300">Cliente · uso libre</p><h1 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.07em] md:text-6xl">{title}</h1><p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">{subtitle}</p><div className="mt-6 grid grid-cols-2 gap-3"><Metric label="Total ref." value={money.format(total)} accent /><Metric label={isAire ? 'Cobertura' : 'Área'} value={`${num.format(isAire ? aire.area : radier.area)} m²`} /></div></aside><section className="grid gap-4 border-t border-white/10 p-5 md:p-8 lg:border-l lg:border-t-0">{isAire ? <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Largo" value={largo} suffix="m" onChange={setLargo} /><Field label="Ancho" value={ancho} suffix="m" onChange={setAncho} /><Field label="Alto" value={alto} suffix="m" onChange={setAlto} /><Field label="Personas" value={personas} onChange={setPersonas} /></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Watts equipos" value={watts} suffix="W" onChange={setWatts} /><SelectField label="Servicio" value={servicio} onChange={setServicio} options={[["equipo_instalacion", 'Equipo + instalación'], ["solo_instalacion", 'Solo instalación'], ["solo_equipo", 'Solo equipo']]} /></div><div className="grid gap-3 md:grid-cols-4"><Metric label="BTU requeridos" value={aire.btu.toLocaleString('es-CL')} /><Metric label="Equipo sugerido" value={`${aire.cap.toLocaleString('es-CL')} BTU`} /><Metric label="Consumo" value={`${num.format(aire.kwhMes)} kWh/mes`} /><Metric label="Gasto mensual" value={money.format(aire.mensual)} /></div><Rows rows={[[`Equipo ${aire.cap.toLocaleString('es-CL')} BTU`, aire.equipo], ['Instalación estándar', aire.instalacion], ['Materiales', aire.materiales], ['Envío / traslado', aire.envio], ['Visita técnica', aire.visita]]} /></> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Largo" value={largo} suffix="m" onChange={setLargo} /><Field label="Ancho" value={ancho} suffix="m" onChange={setAncho} /><Field label="Grosor" value={grosor} suffix="cm" onChange={setGrosor} /><SelectField label="Forma" value={forma} onChange={setForma} options={[["rectangular", 'Rectangular'], ["l", 'Forma L'], ["u", 'Forma U']]} /></div><div className="grid gap-3 md:grid-cols-4"><Metric label="Área" value={`${num.format(radier.area)} m²`} /><Metric label="Hormigón" value={`${num.format(radier.volumen)} m³`} /><Metric label="Cemento 25kg" value={`${radier.sacos} sacos`} /><Metric label="Estabilizado" value={`${num.format(radier.estabilizado)} m³`} /></div><Rows rows={[[`Materiales + cemento`, radier.materiales], ['Mano de obra', radier.manoObra], ['Transporte', radier.transporte]]} /></>}<div className="rounded-[1.7rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-100"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-300" /> Resultado referencial. Para cerrar precio real se valida acceso, medidas, stock, instalación y condiciones técnicas.</div><a href="/contacto" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-black"><Truck className="h-4 w-4" /> Pedir cotización final</a></section></div></section></div></main>;
}
