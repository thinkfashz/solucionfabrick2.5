'use client';

import { useState } from 'react';
import { AlertCircle, ArrowRight, Calculator, Check, Home, Info, Ruler, TentTree } from 'lucide-react';

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
};

const PACKAGES: PackageOption[] = [
  {
    id: 'basico',
    name: 'Kit básico',
    eyebrow: 'Para avanzar por etapas',
    minPrice: 160_000,
    maxPrice: 230_000,
    referencePrice: 195_000,
    description: 'La estructura y envolvente inicial para que puedas continuar el proyecto por etapas.',
    includes: [
      'Paneles interiores y exteriores forrados por una cara',
      'Cerchas en madera o Metalcon, según elección',
      'Costaneras y cubierta de zinc de 0,35 mm',
      'Estructura principal del kit prefabricado',
    ],
    excludes: ['Fundaciones, montaje y traslado', 'Ventanas, puertas y forro interior completo', 'Instalaciones y terminaciones'],
  },
  {
    id: 'avanzado',
    name: 'Kit avanzado',
    eyebrow: 'Más partidas resueltas',
    minPrice: 320_000,
    maxPrice: 460_000,
    referencePrice: 390_000,
    description: 'Reduce trabajos posteriores incorporando cierres, forros y puntos eléctricos básicos.',
    includes: [
      'Todo lo incluido en el kit básico',
      'Ventanas estándar y puertas interiores estándar',
      'Puerta principal y puerta de salida de emergencia',
      'Forro interior y puntos eléctricos básicos',
      'Cielos de dormitorios, living y cocina',
    ],
    excludes: ['Fundaciones, fosa y conexiones exteriores', 'Pisos, pintura y artefactos no detallados', 'Personalizaciones fuera del estándar'],
  },
  {
    id: 'llave-mano',
    name: 'Llave en mano estándar',
    eyebrow: 'Lista para terminar de conectar',
    minPrice: 540_000,
    maxPrice: 780_000,
    referencePrice: 660_000,
    description: 'Una vivienda terminada con materiales estándar y conexiones interiores preparadas.',
    includes: [
      'Todo lo incluido en el kit avanzado',
      'Cerámica o porcelanato de una marca acordada',
      'Dos capas de pintura en superficies consideradas',
      'Red sanitaria y agua potable listas para conectar',
      'Opción personalizada pagando la diferencia real del material',
    ],
    excludes: ['Fosa séptica', 'Pozo de agua', 'Empalme o conexión exterior a agua potable', 'Obras de terreno, permisos y partidas no especificadas'],
  },
];

const SIZE_PRESETS = [
  { label: 'Cabaña', detail: '15 m²', value: 15, icon: TentTree },
  { label: 'Compacta', detail: '36 m²', value: 36, icon: Home },
  { label: 'Familiar', detail: '54 m²', value: 54, icon: Home },
  { label: 'Ampliada', detail: '72 m²', value: 72, icon: Home },
] as const;

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function parseArea(value: string) {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? Math.min(250, Math.max(0, parsed)) : 0;
}

export default function ConstructionM2Calculator() {
  const [packageId, setPackageId] = useState<PackageId>('basico');
  const [areaInput, setAreaInput] = useState('36');
  const [structure, setStructure] = useState<StructureId>('metalcon');
  const [finish, setFinish] = useState<FinishId>('ceramica');
  const selected = PACKAGES.find((item) => item.id === packageId) || PACKAGES[0];
  const area = parseArea(areaInput);
  const totalMin = area * selected.minPrice;
  const totalMax = area * selected.maxPrice;
  const referenceTotal = area * selected.referencePrice;
  const finishLabel = finish === 'ceramica' ? 'cerámica de marca acordada' : finish === 'porcelanato' ? 'porcelanato de marca acordada' : 'material personalizado + diferencia';
  const whatsappMessage = encodeURIComponent(`Hola, calculé ${area} m² en modalidad ${selected.name}, con cerchas en ${structure === 'metalcon' ? 'Metalcon' : 'madera'}${packageId === 'llave-mano' ? ` y ${finishLabel}` : ''}. El rango mostrado es ${formatCLP(totalMin)} a ${formatCLP(totalMax)}. Quiero validar ubicación, alcance y precio final.`);

  return (
    <section id="calculadora-m2" className="border-y border-white/10 bg-[#080705] px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-5 border-b border-white/10 pb-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.3em] text-yellow-300"><Calculator className="h-4 w-4" /> Calculadora principal</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-[-.04em] sm:text-5xl">Elige qué recibes. Luego calcula.</h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-zinc-400">Rangos comerciales orientativos para comparar alternativas. El precio final se confirma con ubicación, plano, acceso, terreno y materialidad.</p>
        </div>

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">1 · Selecciona el nivel de entrega</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {PACKAGES.map((item) => {
                const active = item.id === packageId;
                return (
                  <button key={item.id} type="button" onClick={() => setPackageId(item.id)} aria-pressed={active} className={`rounded-2xl border p-5 text-left transition ${active ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[.025] hover:border-white/25'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-[.2em] ${active ? 'text-black/55' : 'text-yellow-300'}`}>{item.eyebrow}</span>
                    <strong className="mt-2 block text-lg leading-tight">{item.name}</strong>
                    <span className={`mt-3 block text-sm font-black ${active ? 'text-black' : 'text-white'}`}>{formatCLP(item.minPrice)}–{formatCLP(item.maxPrice)} <small className="font-bold">/m²</small></span>
                    <span className={`mt-3 block text-xs leading-5 ${active ? 'text-black/65' : 'text-zinc-500'}`}>{item.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">2 · Elige un tamaño o escribe los m²</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">{SIZE_PRESETS.map(({ label, detail, value, icon: Icon }) => <button key={value} type="button" onClick={() => setAreaInput(String(value))} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${area === value ? 'border-yellow-300/70 bg-yellow-300/10' : 'border-white/10 hover:border-white/25'}`}><Icon className="h-4 w-4 text-yellow-300" /><span><b className="block text-xs">{label}</b><span className="text-[11px] text-zinc-500">{detail}</span></span></button>)}</div>
                <div className="mt-3 flex items-end gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3"><Ruler className="mb-1 h-5 w-5 text-yellow-300" /><input aria-label="Superficie en metros cuadrados" inputMode="numeric" value={areaInput} onChange={(event) => setAreaInput(String(parseArea(event.target.value)))} className="w-full bg-transparent text-3xl font-black outline-none" /><b className="pb-1 text-yellow-300">m²</b></div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">3 · Define las opciones</p>
                <OptionGroup label="Cerchas" value={structure} options={[['madera', 'Madera'], ['metalcon', 'Metalcon']]} onChange={(value) => setStructure(value as StructureId)} />
                {packageId === 'llave-mano' && <OptionGroup label="Piso estándar" value={finish} options={[['ceramica', 'Cerámica'], ['porcelanato', 'Porcelanato'], ['personalizado', 'Personalizado*']]} onChange={(value) => setFinish(value as FinishId)} />}
                {packageId === 'llave-mano' && finish === 'personalizado' && <p className="mt-2 text-[11px] leading-5 text-yellow-100/65">* Se conversa la marca y se suma únicamente la diferencia respecto del material estándar considerado.</p>}
              </div>
            </div>

            <details className="group mt-7 rounded-2xl border border-white/10 bg-white/[.02] p-5" open>
              <summary className="cursor-pointer list-none text-sm font-black">Qué incluye {selected.name.toLowerCase()}</summary>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <ul className="space-y-2">{selected.includes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />{item}</li>)}</ul>
                <div><p className="mb-2 text-[9px] font-black uppercase tracking-[.2em] text-zinc-500">No incluido / por confirmar</p><ul className="space-y-2">{selected.excludes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-zinc-500"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}</ul></div>
              </div>
            </details>
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[1.6rem] border border-yellow-300/25 bg-[#11100d] p-6 shadow-[0_24px_70px_rgba(0,0,0,.35)]">
              <p className="text-[9px] font-black uppercase tracking-[.25em] text-yellow-300">Presupuesto aproximado</p>
              <h3 className="mt-2 text-xl font-black">{selected.name} · {area} m²</h3>
              <div className="mt-6 border-y border-white/10 py-5">
                <p className="text-xs text-zinc-500">Rango estimado</p>
                <strong className="mt-2 block text-3xl font-black tracking-[-.045em] text-white">{formatCLP(totalMin)} <span className="block text-xl text-zinc-500">a {formatCLP(totalMax)}</span></strong>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-5 py-5 text-sm">
                <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">Referencia media</dt><dd className="mt-1 font-black text-yellow-300">{formatCLP(referenceTotal)}</dd></div>
                <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">Valor por m²</dt><dd className="mt-1 font-black">{formatCLP(selected.minPrice)}–{formatCLP(selected.maxPrice)}</dd></div>
                <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">Cerchas</dt><dd className="mt-1 font-black">{structure === 'metalcon' ? 'Metalcon' : 'Madera'}</dd></div>
                <div><dt className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">Superficie</dt><dd className="mt-1 font-black">{area} m²</dd></div>
              </dl>
              <p className="flex gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-[11px] leading-5 text-zinc-400"><Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />No es una cotización final. El rango cambia por ubicación, transporte, terreno, plano y elecciones fuera del estándar.</p>
              <a href={`https://wa.me/56930121625?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 py-4 text-sm font-black text-black transition hover:bg-white">Solicitar precio preciso <ArrowRight className="h-4 w-4" /></a>
              <p className="mt-3 text-center text-[9px] leading-4 text-zinc-600">Rangos de orientación comercial · Actualizados julio 2026</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function OptionGroup({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <div className="mt-3"><span className="text-xs font-bold text-zinc-400">{label}</span><div className="mt-2 flex flex-wrap gap-2">{options.map(([id, text]) => <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-full border px-3 py-2 text-[11px] font-bold transition ${value === id ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 text-zinc-400 hover:border-white/25'}`}>{text}</button>)}</div></div>;
}
