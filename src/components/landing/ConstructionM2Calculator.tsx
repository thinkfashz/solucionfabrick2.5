'use client';

import { useState } from 'react';
import { AlertCircle, ArrowRight, Calculator, Check, ChevronDown, Home, Info, Ruler, TentTree } from 'lucide-react';

type PackageId = 'basico' | 'avanzado' | 'llave-mano';
type StructureId = 'madera' | 'metalcon';
type FinishId = 'ceramica' | 'porcelanato' | 'personalizado';

type PackageOption = {
  id: PackageId;
  name: string;
  eyebrow: string;
  minPrice: number;
  maxPrice: number;
  referencePrice: number;
  description: string;
  includes: string[];
  excludes: string[];
  recommended?: boolean;
};

const PACKAGES: PackageOption[] = [
  {
    id: 'basico',
    name: 'Kit básico',
    eyebrow: 'Estructura esencial',
    minPrice: 160_000,
    maxPrice: 230_000,
    referencePrice: 195_000,
    description: 'El punto de partida para levantar la vivienda y continuar terminaciones por etapas.',
    includes: [
      'Paneles interiores y exteriores forrados por una cara',
      'Cerchas en madera o Metalcon, según elección',
      'Costaneras y cubierta de zinc de 0,35 mm',
      'Estructura principal del kit prefabricado',
    ],
    excludes: ['Fundaciones, montaje y traslado', 'Ventanas, puertas y forro interior completo', 'Instalaciones eléctricas, sanitarias y terminaciones'],
  },
  {
    id: 'avanzado',
    name: 'Kit avanzado',
    eyebrow: 'Más partidas resueltas',
    minPrice: 320_000,
    maxPrice: 460_000,
    referencePrice: 390_000,
    description: 'La estructura más cierres, ventanas y partidas interiores que reducen trabajo posterior.',
    recommended: true,
    includes: [
      'Todo lo incluido en el kit básico',
      'Ventanas normales y puertas interiores tipo sinfonía',
      'Forro interior, puerta principal y salida de emergencia',
      'Puntos eléctricos básicos considerados en el proyecto',
      'Cielos de dormitorios, living y cocina',
    ],
    excludes: ['Fundaciones, fosa y conexiones exteriores', 'Pisos, pintura y artefactos no detallados', 'Personalizaciones fuera del estándar'],
  },
  {
    id: 'llave-mano',
    name: 'Llave en mano estándar',
    eyebrow: 'Vivienda terminada',
    minPrice: 540_000,
    maxPrice: 780_000,
    referencePrice: 660_000,
    description: 'Una solución terminada con materiales estándar y redes interiores preparadas para conectar.',
    includes: [
      'Todo lo incluido en el kit avanzado',
      'Cerámica o porcelanato de una marca acordada',
      'Dos capas de pintura en superficies consideradas',
      'Red sanitaria y agua potable listas para conectar',
      'Material personalizado pagando la diferencia respecto del estándar',
    ],
    excludes: ['Fosa séptica', 'Pozo de agua', 'Empalme o conexión exterior a agua potable', 'Terreno, permisos y partidas no especificadas'],
  },
];

const SIZE_PRESETS = [
  { label: 'Cabaña', detail: '15 m²', value: 15, icon: TentTree },
  { label: 'Compacta', detail: '36 m²', value: 36, icon: Home },
  { label: 'Familiar', detail: '54 m²', value: 54, icon: Home },
  { label: 'Ampliada', detail: '72 m²', value: 72, icon: Home },
] as const;

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function formatCLP(value: number) {
  return CLP.format(Math.round(value || 0));
}

function parseArea(value: string) {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? Math.min(250, Math.max(0, parsed)) : 0;
}

function projectLabel(area: number) {
  if (area <= 20) return 'Cabaña compacta';
  if (area <= 40) return 'Vivienda compacta';
  if (area <= 60) return 'Casa familiar';
  return 'Casa ampliada';
}

export default function ConstructionM2Calculator() {
  const [packageId, setPackageId] = useState<PackageId>('avanzado');
  const [areaInput, setAreaInput] = useState('36');
  const [structure, setStructure] = useState<StructureId>('metalcon');
  const [finish, setFinish] = useState<FinishId>('ceramica');
  const selected = PACKAGES.find((item) => item.id === packageId) ?? PACKAGES[1];
  const area = parseArea(areaInput);
  const totalMin = area * selected.minPrice;
  const totalMax = area * selected.maxPrice;
  const referenceTotal = area * selected.referencePrice;
  const finishLabel = finish === 'ceramica' ? 'cerámica de marca acordada' : finish === 'porcelanato' ? 'porcelanato de marca acordada' : 'material personalizado + diferencia';
  const whatsappMessage = encodeURIComponent(`Hola, calculé ${area} m² (${projectLabel(area)}) en modalidad ${selected.name}, con cerchas en ${structure === 'metalcon' ? 'Metalcon' : 'madera'}${packageId === 'llave-mano' ? ` y ${finishLabel}` : ''}. El rango mostrado es ${formatCLP(totalMin)} a ${formatCLP(totalMax)}. Quiero validar ubicación, alcance y precio final.`);

  function updateArea(rawValue: string) {
    const clean = rawValue.replace(/[^0-9]/g, '');
    setAreaInput(clean === '' ? '' : String(Math.min(250, Number(clean))));
  }

  return (
    <section id="calculadora-m2" className="scroll-mt-20 border-y border-black/10 bg-[#f1ece3] px-4 py-14 text-[#17130c] sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.3em] text-[#9b6508]"><Calculator className="h-4 w-4" /> Calculadora de construcción</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl">Compara el alcance antes de comparar el precio.</h2>
          </div>
          <p className="max-w-xl border-l border-black/15 pl-5 text-sm leading-7 text-black/58">Obtén una referencia comercial en menos de un minuto. No reemplaza la cotización técnica, pero sí te permite decidir qué modalidad tiene sentido para tu proyecto.</p>
        </div>

        <div className="mt-9 grid overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_100px_rgba(46,35,16,.12)] xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="p-5 sm:p-8 lg:p-10">
            <div className="grid grid-cols-3 divide-x divide-black/10 border-y border-black/10 py-4">
              <StepSummary number="01" label="Modalidad" />
              <StepSummary number="02" label="Superficie" />
              <StepSummary number="03" label="Opciones" />
            </div>

            <StepLabel number="01" title="Selecciona qué quieres recibir" description="Cada modalidad suma partidas y reduce trabajos posteriores." />
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {PACKAGES.map((item) => <PackageCard key={item.id} item={item} active={item.id === packageId} onSelect={() => setPackageId(item.id)} />)}
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
              <div>
                <StepLabel number="02" title="Define la superficie" description="Elige una referencia o escribe los metros cuadrados." compact />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  {SIZE_PRESETS.map(({ label, detail, value, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setAreaInput(String(value))} aria-pressed={area === value} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${area === value ? 'border-[#b97a12] bg-[#fff6dc] shadow-[inset_0_0_0_1px_rgba(185,122,18,.15)]' : 'border-black/10 bg-[#faf8f3] hover:border-black/25'}`}>
                      <Icon className="h-5 w-5 shrink-0 text-[#a66c0d]" />
                      <span><b className="block text-xs">{label}</b><span className="text-[11px] text-black/45">{detail}</span></span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-black/10 bg-[#17130c] p-4 text-white">
                  <div className="flex items-end gap-3"><Ruler className="mb-2 h-5 w-5 text-yellow-300" /><input aria-label="Superficie en metros cuadrados" inputMode="numeric" value={areaInput} onChange={(event) => updateArea(event.target.value)} onBlur={() => { if (area < 10) setAreaInput('15'); }} className="min-w-0 flex-1 bg-transparent text-4xl font-black tracking-[-.05em] outline-none" /><b className="pb-2 text-yellow-300">m²</b></div>
                  <input aria-label="Ajustar superficie" type="range" min="15" max="180" step="1" value={Math.min(180, Math.max(15, area || 15))} onChange={(event) => setAreaInput(event.target.value)} className="mt-4 h-1 w-full cursor-pointer accent-yellow-300" />
                  <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-[.16em] text-white/35"><span>15 m²</span><span>{projectLabel(area || 15)}</span><span>180 m²</span></div>
                </div>
              </div>

              <div>
                <StepLabel number="03" title="Ajusta las opciones" description="Define las decisiones que debemos considerar." compact />
                <OptionGroup label="Estructura de cerchas" value={structure} options={[['madera', 'Madera'], ['metalcon', 'Metalcon']]} onChange={(value) => setStructure(value as StructureId)} />
                {packageId === 'llave-mano' ? <OptionGroup label="Piso estándar" value={finish} options={[['ceramica', 'Cerámica'], ['porcelanato', 'Porcelanato'], ['personalizado', 'Personalizado*']]} onChange={(value) => setFinish(value as FinishId)} /> : <p className="mt-5 rounded-2xl border border-black/10 bg-[#faf8f3] p-4 text-xs leading-6 text-black/52">Las terminaciones de piso se definen únicamente en la modalidad llave en mano.</p>}
                {packageId === 'llave-mano' && finish === 'personalizado' && <p className="mt-3 text-[11px] leading-5 text-[#805309]">* Se conversa la marca y se suma solo la diferencia respecto del material estándar considerado.</p>}
              </div>
            </div>

            <details className="group mt-9 rounded-2xl border border-black/10 bg-[#faf8f3] p-5" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black">Alcance de {selected.name.toLowerCase()}<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
              <div className="mt-5 grid gap-6 border-t border-black/10 pt-5 sm:grid-cols-2">
                <div><p className="mb-3 text-[9px] font-black uppercase tracking-[.22em] text-[#95620c]">Incluye</p><ul className="space-y-2.5">{selected.includes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-black/68"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a66c0d]" />{item}</li>)}</ul></div>
                <div><p className="mb-3 text-[9px] font-black uppercase tracking-[.22em] text-black/38">No incluido / por confirmar</p><ul className="space-y-2.5">{selected.excludes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-black/48"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}</ul></div>
              </div>
            </details>
          </div>

          <EstimateSummary selected={selected} area={area} totalMin={totalMin} totalMax={totalMax} referenceTotal={referenceTotal} structure={structure} whatsappMessage={whatsappMessage} />
        </div>
      </div>
    </section>
  );
}

function StepSummary({ number, label }: { number: string; label: string }) {
  return <div className="px-3 text-center"><span className="text-[10px] font-black text-[#a66c0d]">{number}</span><span className="ml-2 text-[9px] font-black uppercase tracking-[.16em] text-black/45 sm:text-[10px]">{label}</span></div>;
}

function StepLabel({ number, title, description, compact = false }: { number: string; title: string; description: string; compact?: boolean }) {
  return <div className={compact ? '' : 'mt-9'}><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#9b6508]">{number} · {title}</p><p className="mt-1 text-xs leading-5 text-black/48">{description}</p></div>;
}

function PackageCard({ item, active, onSelect }: { item: PackageOption; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={active} className={`relative rounded-[1.4rem] border p-5 text-left transition ${active ? 'border-[#b97a12] bg-[#fff6dc] shadow-[0_16px_40px_rgba(138,86,5,.10)]' : 'border-black/10 bg-[#faf8f3] hover:-translate-y-0.5 hover:border-black/25'}`}>
      {item.recommended && <span className="absolute right-3 top-3 rounded-full bg-[#17130c] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-yellow-200">Más elegido</span>}
      <span className="text-[9px] font-black uppercase tracking-[.18em] text-[#9b6508]">{item.eyebrow}</span>
      <strong className="mt-2 block pr-16 text-lg leading-tight">{item.name}</strong>
      <span className="mt-4 block text-lg font-black tracking-[-.03em]">{formatCLP(item.minPrice)}–{formatCLP(item.maxPrice)} <small className="text-[10px] font-bold text-black/42">/m²</small></span>
      <span className="mt-3 block text-xs leading-5 text-black/52">{item.description}</span>
    </button>
  );
}

function OptionGroup({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <div className="mt-5"><span className="text-xs font-black text-black/65">{label}</span><div className="mt-2 flex flex-wrap gap-2">{options.map(([id, text]) => <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={value === id} className={`rounded-full border px-4 py-2.5 text-[11px] font-black transition ${value === id ? 'border-[#17130c] bg-[#17130c] text-yellow-200' : 'border-black/12 bg-white text-black/55 hover:border-black/30'}`}>{text}</button>)}</div></div>;
}

function EstimateSummary({ selected, area, totalMin, totalMax, referenceTotal, structure, whatsappMessage }: { selected: PackageOption; area: number; totalMin: number; totalMax: number; referenceTotal: number; structure: StructureId; whatsappMessage: string }) {
  return (
    <aside className="relative bg-[#17130c] p-6 text-white sm:p-8 xl:sticky xl:top-20 xl:self-start">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
      <p className="text-[9px] font-black uppercase tracking-[.28em] text-yellow-300">Resultado referencial</p>
      <div className="mt-3 flex items-start justify-between gap-4"><div><h3 className="text-2xl font-black tracking-[-.04em]">{projectLabel(area || 15)}</h3><p className="mt-1 text-xs text-white/42">{selected.name} · {area || 0} m²</p></div><Calculator className="h-6 w-6 text-yellow-300" /></div>

      <div className="mt-7 rounded-[1.5rem] border border-yellow-200/15 bg-white/[.045] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/42">Referencia media</p>
        <strong className="mt-2 block break-words text-[clamp(2.1rem,5vw,3.5rem)] font-black leading-none tracking-[-.06em] text-yellow-200">{formatCLP(referenceTotal)}</strong>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <div><span className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Desde</span><b className="mt-1 block text-sm">{formatCLP(totalMin)}</b></div>
          <div><span className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Hasta</span><b className="mt-1 block text-sm">{formatCLP(totalMax)}</b></div>
        </div>
        <div className="relative mt-5 h-1 rounded-full bg-white/10"><span className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-amber-700 via-yellow-300 to-amber-100" /><span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#17130c] bg-white shadow-[0_0_12px_rgba(250,204,21,.7)]" /></div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-white/10 py-6 text-sm">
        <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Valor por m²</dt><dd className="mt-1 font-black text-yellow-200">{formatCLP(selected.minPrice)}–{formatCLP(selected.maxPrice)}</dd></div>
        <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Superficie</dt><dd className="mt-1 font-black">{area || 0} m²</dd></div>
        <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Cerchas</dt><dd className="mt-1 font-black">{structure === 'metalcon' ? 'Metalcon' : 'Madera'}</dd></div>
        <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Modalidad</dt><dd className="mt-1 font-black">{selected.name}</dd></div>
      </dl>

      <p className="mt-5 flex gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 text-[11px] leading-5 text-white/52"><Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />No es un precio final. Ubicación, traslado, acceso, terreno, planos y elecciones fuera del estándar pueden modificar el rango.</p>
      <a href={`https://wa.me/56930121625?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 py-4 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white">Validar esta estimación <ArrowRight className="h-4 w-4" /></a>
      <p className="mt-3 text-center text-[9px] leading-4 text-white/28">Materiales estándar · Valores aproximados · Julio 2026</p>
    </aside>
  );
}
