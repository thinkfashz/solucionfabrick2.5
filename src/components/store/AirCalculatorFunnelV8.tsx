'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, CheckCircle2, ChevronRight, Home, Info, Loader2, Ruler, ShieldCheck, ShoppingCart, Sun, ThermometerSnowflake, Users, Waves } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  calculateAirSizing,
  normalizeAirCatalogProducts,
  recommendAirProducts,
  type AirCatalogProduct,
  type AirRoomType,
  type ClimateZone,
  type InsulationLevel,
  type SunExposure,
} from '@/lib/airConditioning';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG = `${CLOUD}/c_fill,g_auto,w_1920,h_1200/e_blur:6/q_auto:good/f_auto/v1788671813/air-bedroom-background.jpg`;

const roomLabels: Record<AirRoomType, string> = {
  dormitorio: 'Dormitorio',
  living: 'Living',
  oficina: 'Oficina',
  cocina: 'Cocina',
};

const climateLabels: Record<ClimateZone, string> = {
  norte: 'Norte cálido',
  centro: 'Zona central',
  costa: 'Costa',
  sur: 'Sur',
};

export default function AirCalculatorFunnelV8({ initialProducts }: { initialProducts: AirCatalogProduct[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<AirCatalogProduct[]>(initialProducts);
  const [catalogRefreshing, setCatalogRefreshing] = useState(initialProducts.length === 0);
  const [catalogError, setCatalogError] = useState('');

  const [lengthM, setLengthM] = useState(3.2);
  const [widthM, setWidthM] = useState(3);
  const [heightM, setHeightM] = useState(2.4);
  const [people, setPeople] = useState(1);
  const [windowAreaM2, setWindowAreaM2] = useState(1.5);
  const [roomType, setRoomType] = useState<AirRoomType>('dormitorio');
  const [sunExposure, setSunExposure] = useState<SunExposure>('media');
  const [insulation, setInsulation] = useState<InsulationLevel>('normal');
  const [climateZone, setClimateZone] = useState<ClimateZone>('centro');

  useEffect(() => {
    let active = true;
    async function refreshCatalog() {
      setCatalogRefreshing(true);
      try {
        const response = await fetch('/api/tienda/products', { cache: 'no-store', headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => null) as { products?: unknown; error?: unknown } | null;
        if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `catalog_${response.status}`);
        const next = normalizeAirCatalogProducts(payload?.products).filter((product) => /aire\s*acond|split|climat|\bbtu\b/i.test(`${product.name} ${product.description || ''} ${JSON.stringify(product.specifications || {})}`));
        if (!active) return;
        if (next.length > 0) setProducts(next);
        setCatalogError('');
      } catch {
        if (!active) return;
        if (!products.length) setCatalogError('No pudimos cargar equipos disponibles. La calculadora sigue funcionando, pero no mostraremos una compra hasta verificar catálogo y stock.');
      } finally {
        if (active) setCatalogRefreshing(false);
      }
    }
    void refreshCatalog();
    return () => { active = false; };
    // initialProducts is the stable server preload for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sizing = useMemo(() => calculateAirSizing({
    lengthM,
    widthM,
    heightM,
    people,
    roomType,
    sunExposure,
    insulation,
    climateZone,
    windowAreaM2,
  }), [lengthM, widthM, heightM, people, roomType, sunExposure, insulation, climateZone, windowAreaM2]);

  const recommendations = useMemo(() => recommendAirProducts(products, sizing, 4), [products, sizing]);
  const primary = recommendations[0];

  function goCheckout(recommendation: (typeof recommendations)[number]) {
    const product = recommendation.product;
    const params = new URLSearchParams({
      productId: product.id,
      name: product.name,
      price: String(recommendation.finalPrice),
      quantity: '1',
      img: product.image_url || '',
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return <main className="relative min-h-screen overflow-hidden bg-[#08090a] text-white">
    <div className="pointer-events-none fixed inset-0"><img src={BG} alt="" className="h-full w-full scale-[1.03] object-cover opacity-55"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,7,.88),rgba(6,7,8,.48)_52%,rgba(5,6,7,.88)),linear-gradient(180deg,rgba(5,6,7,.45),rgba(5,6,7,.82))]"/></div>

    <div className="relative z-10 mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
      <header className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => router.push('/')} className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-black/45 backdrop-blur-xl" aria-label="Volver al inicio"><ArrowLeft size={18}/></button>
        <img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-10 w-auto max-w-[210px] object-contain brightness-0 invert sm:h-12"/>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-emerald-200">Cálculo + stock real</span>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/10 bg-[#0d0f12]/88 p-4 shadow-2xl backdrop-blur-2xl sm:p-5 xl:sticky xl:top-5 xl:self-start">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Paso 1 · Tu espacio</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Calcula el BTU que realmente necesitas.</h1>
          <p className="mt-3 text-xs leading-5 text-white/45">Usamos medidas, altura, personas, ventanas, exposición solar, aislación y zona climática. Es una estimación comercial; instalaciones complejas requieren visita técnica.</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {(Object.keys(roomLabels) as AirRoomType[]).map((room) => <Choice key={room} active={roomType === room} onClick={() => setRoomType(room)}>{roomLabels[room]}</Choice>)}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="Largo" value={lengthM} min={1.5} max={20} step={0.1} suffix="m" onChange={setLengthM}/>
            <NumberField label="Ancho" value={widthM} min={1.5} max={20} step={0.1} suffix="m" onChange={setWidthM}/>
            <NumberField label="Alto" value={heightM} min={2} max={6} step={0.1} suffix="m" onChange={setHeightM}/>
            <NumberField label="Personas" value={people} min={1} max={30} step={1} onChange={(value) => setPeople(Math.round(value))}/>
            <div className="col-span-2"><NumberField label="Ventanas aprox." value={windowAreaM2} min={0} max={30} step={0.5} suffix="m²" onChange={setWindowAreaM2}/></div>
          </div>

          <div className="mt-4 grid gap-3">
            <SelectField label="Sol" value={sunExposure} onChange={(value) => setSunExposure(value as SunExposure)} options={[['baja','Poco sol'],['media','Sol medio'],['alta','Mucho sol']]}/>
            <SelectField label="Aislación" value={insulation} onChange={(value) => setInsulation(value as InsulationLevel)} options={[['buena','Buena'],['normal','Normal'],['baja','Baja']]}/>
            <SelectField label="Zona" value={climateZone} onChange={(value) => setClimateZone(value as ClimateZone)} options={(Object.keys(climateLabels) as ClimateZone[]).map((key) => [key, climateLabels[key]])}/>
          </div>
        </aside>

        <div className="grid gap-5">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0f12]/82 shadow-2xl backdrop-blur-2xl">
            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Paso 2 · Resultado personalizado</p>
                <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <strong className="text-5xl font-black tracking-[-.06em] text-[#FF9D3D] sm:text-7xl">{sizing.requiresMultiUnit ? `${sizing.minimumUnits}× ${Math.round(sizing.perUnitCapacity / 1000)}K` : `${Math.round(sizing.recommendedCapacity / 1000)}K`}</strong>
                  <span className="pb-2 text-sm font-black text-white/55">BTU recomendados</span>
                </div>
                <h2 className="mt-4 max-w-2xl text-2xl font-black tracking-[-.035em] sm:text-3xl">Para tu {roomLabels[roomType].toLowerCase()} de {sizing.areaM2.toLocaleString('es-CL')} m² estimamos {sizing.requiredBtu.toLocaleString('es-CL')} BTU/h de carga.</h2>
                <p className="mt-3 max-w-2xl text-xs leading-6 text-white/46">{sizing.requiresMultiUnit ? `La carga supera 24.000 BTU. No recomendamos comprar un solo equipo: estima al menos ${sizing.minimumUnits} unidades de ${sizing.perUnitCapacity.toLocaleString('es-CL')} BTU y valida distribución en terreno.` : `La capacidad comercial inmediatamente superior es ${sizing.recommendedCapacity.toLocaleString('es-CL')} BTU, dejando ${Math.max(0, sizing.headroomBtu).toLocaleString('es-CL')} BTU de margen.`}</p>

                <div className="mt-5 flex flex-wrap gap-2">{sizing.reasons.map((reason) => <span key={reason} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[9px] font-bold text-white/48">{reason}</span>)}</div>
              </div>

              <div className="rounded-[1.7rem] border border-[#6DDCFF]/20 bg-[radial-gradient(circle_at_top,#5edcff20,transparent_55%),#081015] p-5">
                <div className="flex items-center justify-between"><ThermometerSnowflake className="h-7 w-7 text-[#7FE5FF]"/><span className="text-[8px] font-black uppercase tracking-[.16em] text-[#8BE8FF]">Motor BTU Fabrick</span></div>
                <div className="mt-5 grid grid-cols-2 gap-2"><Metric icon={<Ruler/>} label="Área" value={`${sizing.areaM2} m²`}/><Metric icon={<Home/>} label="Volumen" value={`${sizing.volumeM3} m³`}/><Metric icon={<Users/>} label="Personas" value={String(people)}/><Metric icon={<Sun/>} label="Exposición" value={sunExposure}/></div>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-[9px] leading-4 text-white/40"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F7A347]"/>El resultado evita vender por m² solamente: la altura, ventanas, uso y condiciones del espacio también cambian la carga térmica.</div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0d0f12]/88 p-5 shadow-2xl backdrop-blur-2xl sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Paso 3 · Equipos compatibles</p><h2 className="mt-1 text-2xl font-black">Compra desde catálogo y stock verificado.</h2></div><span className="inline-flex items-center gap-2 text-[9px] font-bold text-white/38">{catalogRefreshing ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Actualizando catálogo</> : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/>Catálogo sincronizado</>}</span></div>

            {catalogError ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-xs text-amber-100">{catalogError}</div> : null}
            {sizing.requiresMultiUnit ? <div className="mt-4 rounded-xl border border-[#F7A347]/25 bg-[#F7A347]/8 p-4 text-xs leading-5 text-white/60">Por seguridad comercial no habilitamos compra directa para este cálculo. La carga necesita distribución de dos o más equipos y debe revisarse la ubicación de unidades interiores/exteriores.</div> : null}

            {!sizing.requiresMultiUnit && recommendations.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{recommendations.map((rec, index) => <article key={rec.product.id} className={`flex min-h-[330px] flex-col rounded-[1.5rem] border p-4 ${index === 0 ? 'border-[#F7A347]/45 bg-[#F7A347]/8' : 'border-white/10 bg-white/[.035]'}`}>
              <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-black/30 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#FFC27A]">{index === 0 ? 'Mejor coincidencia' : rec.match === 'ideal' ? 'Compatible' : 'Capacidad superior'}</span>{rec.product.stock !== undefined ? <span className="text-[8px] font-bold text-emerald-300">Stock {rec.product.stock}</span> : null}</div>
              <div className="mt-3 grid h-28 place-items-center rounded-xl bg-white/95 p-2">{rec.product.image_url ? <img src={rec.product.image_url} alt={rec.product.name} className="max-h-24 w-full object-contain"/> : <ThermometerSnowflake className="h-10 w-10 text-black/25"/>}</div>
              <h3 className="mt-3 line-clamp-2 text-sm font-black leading-5">{rec.product.name}</h3>
              <p className="mt-1 text-[9px] leading-4 text-white/38">{rec.reason}</p>
              <div className="mt-auto pt-4"><div className="flex items-end justify-between gap-2"><strong className="text-xl text-[#FF9D3D]">{CLP.format(rec.finalPrice)}</strong><span className="text-[9px] font-black text-white/40">{rec.capacity.toLocaleString('es-CL')} BTU</span></div><button type="button" onClick={() => goCheckout(rec)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F7A347] px-4 text-xs font-black text-[#111214]">Elegir y pagar <ChevronRight size={15}/></button></div>
            </article>)}</div> : null}

            {!sizing.requiresMultiUnit && !catalogRefreshing && recommendations.length === 0 ? <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[.035] p-6 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-white/30"/><h3 className="mt-3 font-black">No hay un equipo compatible con stock verificado.</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-white/40">No mostraremos una opción inferior solo para cerrar la venta. Puedes revisar la tienda o solicitar instalación y abastecimiento.</p><button type="button" onClick={() => router.push('/tienda')} className="mt-4 rounded-full border border-white/12 bg-white/[.06] px-5 py-3 text-xs font-black">Ver tienda</button></div> : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-3"><Trust icon={<ShieldCheck/>} title="Precio validado" text="Checkout recalcula desde servidor"/><Trust icon={<BadgeCheck/>} title="Stock reservado" text="Reserva atómica antes del pago"/><Trust icon={<Waves/>} title="Sin sobreventa" text="No recomendamos capacidad inferior"/></div>
            {primary ? <p className="mt-4 text-center text-[9px] text-white/28">Recomendación principal: {primary.product.name}. El precio mostrado es referencial de catálogo; el servidor vuelve a validar precio, stock y despacho antes de abrir Mercado Pago.</p> : null}
          </section>
        </div>
      </section>
    </div>
  </main>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-2.5 text-[10px] font-black transition ${active ? 'border-[#F7A347] bg-[#F7A347] text-[#111214]' : 'border-white/10 bg-white/[.04] text-white/48 hover:bg-white/[.08]'}`}>{children}</button>;
}

function NumberField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><div className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[.055] px-3"><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none"/><span className="text-[9px] text-white/30">{suffix}</span></div></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#181a1e] px-3 text-xs font-bold text-white outline-none focus:border-[#F7A347]">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/25 p-3"><span className="text-[#7FE5FF] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-sm">{value}</b><span className="mt-0.5 block text-[8px] uppercase tracking-[.1em] text-white/28">{label}</span></div>;
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.03] p-3"><span className="text-[#F7A347] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-[10px]">{title}</b><span className="mt-1 block text-[8px] leading-4 text-white/30">{text}</span></div>;
}
