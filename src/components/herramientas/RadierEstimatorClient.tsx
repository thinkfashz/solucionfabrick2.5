'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Info,
  Layers3,
  Maximize2,
  PackageCheck,
  Ruler,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

const PRICE_REFERENCE = {
  cementBag25kg: 5080,
  gravelM3: 49820,
  sandM3: 32000,
  stabilizedM3: 28000,
  meshC92: 22520,
  polyethyleneM2: 690,
  spacer: 190,
  delivery: 55000,
  laborM2: 22000,
};

type MeasurementMode = 'area' | 'dimensions';
type LayerId = 'concrete' | 'mesh' | 'membrane' | 'gravel' | 'stabilized' | 'soil';

type MaterialLine = {
  id: string;
  name: string;
  family: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  source?: string;
  note: string;
  color: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function safeNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
  max,
  helper,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  suffix: string;
  step?: number;
  min?: number;
  max?: number;
  helper?: string;
}) {
  return (
    <label className="grid gap-2 bg-white/[0.055] p-3.5 ring-1 ring-white/[0.075] transition focus-within:bg-white/[0.09] focus-within:ring-yellow-300/60">
      <span className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[.17em] text-[#f9efd9]/53">
        <span>{label}</span>
        <span>{suffix}</span>
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(event) => {
          const raw = Number(event.target.value);
          const next = Number.isFinite(raw) ? raw : min;
          onChange(clamp(next, min, max || Number.MAX_SAFE_INTEGER));
        }}
        className="min-w-0 bg-transparent text-2xl font-black tracking-[-.045em] text-white outline-none"
      />
      {helper ? <span className="text-[10px] leading-4 text-white/42">{helper}</span> : null}
    </label>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: typeof Ruler;
  accent?: boolean;
}) {
  return (
    <div className={accent ? 'bg-yellow-300 p-4 text-black shadow-[0_16px_44px_rgba(250,204,21,.16)]' : 'bg-white/[0.06] p-4 text-white ring-1 ring-white/[0.07]'}>
      <div className="flex items-center justify-between gap-2">
        <p className={accent ? 'text-[9px] font-black uppercase tracking-[.17em] text-black/52' : 'text-[9px] font-black uppercase tracking-[.17em] text-[#f9efd9]/48'}>{label}</p>
        {Icon ? <Icon className="h-4 w-4 opacity-60" /> : null}
      </div>
      <p className="mt-2 text-2xl font-black tracking-[-.055em]">{value}</p>
    </div>
  );
}

function LayerViewer({
  concreteCm,
  stabilizedCm,
  gravelCm,
  area,
  selected,
  onSelect,
}: {
  concreteCm: number;
  stabilizedCm: number;
  gravelCm: number;
  area: number;
  selected: LayerId;
  onSelect: (id: LayerId) => void;
}) {
  const totalDepth = concreteCm + stabilizedCm + gravelCm;
  const layers: Array<{
    id: LayerId;
    label: string;
    detail: string;
    cm: number;
    short: string;
    background: string;
    text: string;
  }> = [
    {
      id: 'concrete',
      label: 'Hormigón H20',
      detail: 'Losa superior de concreto para tránsito residencial liviano.',
      cm: concreteCm,
      short: 'Capa estructural',
      background: '#e9e1d3',
      text: '#221b13',
    },
    {
      id: 'mesh',
      label: 'Malla Acma C-92',
      detail: 'Refuerzo interior elevado con separadores, no apoyado sobre la base.',
      cm: 0,
      short: 'Refuerzo',
      background: '#172231',
      text: '#ffffff',
    },
    {
      id: 'membrane',
      label: 'Polietileno 200 micras',
      detail: 'Barrera de humedad, con traslapes antes del vaciado.',
      cm: 0,
      short: 'Barrera de humedad',
      background: '#36b8b0',
      text: '#031515',
    },
    {
      id: 'gravel',
      label: 'Gravilla compactada',
      detail: 'Cama drenante y regularizadora bajo la losa.',
      cm: gravelCm,
      short: 'Drenaje y nivelación',
      background: '#9ba9b0',
      text: '#172127',
    },
    {
      id: 'stabilized',
      label: 'Base estabilizada',
      detail: 'Base granular compactada sobre terreno preparado.',
      cm: stabilizedCm,
      short: 'Soporte del radier',
      background: '#b88d55',
      text: '#24170c',
    },
    {
      id: 'soil',
      label: 'Terreno compactado',
      detail: 'Subrasante nivelada y compactada; se valida en visita técnica.',
      cm: 0,
      short: 'Subrasante',
      background: '#68462d',
      text: '#fff5df',
    },
  ];

  const visualHeight = (id: LayerId, cm: number) => {
    if (id === 'mesh') return 11;
    if (id === 'membrane') return 8;
    if (id === 'soil') return 48;
    return clamp(cm * 4.4, 28, 88);
  };

  return (
    <section className="overflow-hidden bg-white text-[#17120c] shadow-[0_30px_85px_rgba(0,0,0,.3)]" aria-labelledby="radier-viewer-title">
      <div className="grid gap-0 lg:grid-cols-[1.14fr_.86fr]">
        <div className="relative min-h-[475px] overflow-hidden bg-[radial-gradient(circle_at_15%_8%,rgba(250,204,21,.24),transparent_25rem),linear-gradient(180deg,#ffffff,#f4efe5)] p-5 sm:p-7">
          <div aria-hidden className="absolute inset-0 opacity-[.35] [background-image:linear-gradient(rgba(43,34,21,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(43,34,21,.09)_1px,transparent_1px)] [background-size:34px_34px]" />
          <header className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#9b611e]">Visor de capas</p>
              <h2 id="radier-viewer-title" className="mt-1 text-3xl font-black leading-none tracking-[-.06em]">Corte constructivo del radier</h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-black/58">Toca una capa para verla aislada. Las alturas se ajustan a tus espesores.</p>
            </div>
            <div className="bg-[#17120c] px-3 py-2 text-right text-white shadow-lg">
              <span className="block text-[9px] font-black uppercase tracking-[.16em] text-yellow-200">Estructura base</span>
              <b className="text-lg">{decimal.format(totalDepth)} cm</b>
            </div>
          </header>

          <div className="relative mx-auto mt-10 h-[315px] max-w-[550px]">
            <div className="absolute bottom-3 left-3 right-16 h-7 -skew-y-3 bg-black/[.12] blur-md" />
            <div className="absolute bottom-7 left-5 right-5 [transform:perspective(900px)_rotateX(56deg)_rotateZ(-4deg)]">
              {layers.slice().reverse().map((layer) => {
                const isSelected = selected === layer.id;
                const height = visualHeight(layer.id, layer.cm);
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => onSelect(layer.id)}
                    className={isSelected ? 'relative block w-full cursor-pointer border-2 border-yellow-300 shadow-[0_0_0_7px_rgba(250,204,21,.22)] outline-none transition' : 'relative block w-full cursor-pointer border border-black/15 outline-none transition hover:brightness-105'}
                    style={{
                      minHeight: height,
                      background: layer.background,
                      color: layer.text,
                      zIndex: isSelected ? 20 : 1,
                      transform: isSelected ? 'translateY(-13px) scale(1.015)' : undefined,
                    }}
                    aria-pressed={isSelected}
                  >
                    {layer.id === 'mesh' ? (
                      <span aria-hidden className="absolute inset-0 opacity-55 [background-image:linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(currentColor_1px,transparent_1px)] [background-size:17px_17px]" />
                    ) : null}
                    <span className="relative flex min-h-[inherit] items-center justify-between gap-3 px-4 py-2 text-left">
                      <span className="text-[11px] font-black uppercase tracking-[.13em]">{layer.label}</span>
                      <span className="text-[10px] font-bold opacity-65">{layer.cm ? decimal.format(layer.cm) + ' cm' : layer.id === 'mesh' ? 'C-92' : layer.id === 'membrane' ? '200 µm' : 'compactado'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="absolute bottom-1 right-0 flex h-[260px] w-10 flex-col items-center justify-between border-l-2 border-black/25 text-[10px] font-black text-black/52">
              <span>0</span>
              <span>{decimal.format(totalDepth / 2)} cm</span>
              <span>{decimal.format(totalDepth)} cm</span>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <div className="bg-black/[.055] p-3"><span className="block text-[9px] font-black uppercase tracking-[.15em] text-black/45">Superficie</span><b className="mt-1 block text-lg">{decimal.format(area)} m²</b></div>
            <div className="bg-black/[.055] p-3"><span className="block text-[9px] font-black uppercase tracking-[.15em] text-black/45">Concreto</span><b className="mt-1 block text-lg">{decimal.format(concreteCm)} cm</b></div>
            <div className="bg-black/[.055] p-3"><span className="block text-[9px] font-black uppercase tracking-[.15em] text-black/45">Base bajo losa</span><b className="mt-1 block text-lg">{decimal.format(stabilizedCm + gravelCm)} cm</b></div>
          </div>
        </div>

        <aside className="bg-[#17120c] p-5 text-white sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Capa seleccionada</p>
          {layers.filter((layer) => layer.id === selected).map((layer) => (
            <div key={layer.id} className="mt-3">
              <span className="inline-flex bg-yellow-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-black">{layer.short}</span>
              <h3 className="mt-3 text-3xl font-black leading-none tracking-[-.055em]">{layer.label}</h3>
              <p className="mt-3 text-sm leading-6 text-[#f7eedb]/68">{layer.detail}</p>
              <div className="mt-5 bg-white/[.08] p-4">
                <span className="text-[9px] font-black uppercase tracking-[.16em] text-yellow-100">Medida configurada</span>
                <b className="mt-1 block text-3xl tracking-[-.05em]">{layer.cm ? decimal.format(layer.cm) + ' cm' : layer.id === 'mesh' ? 'C-92 elevada' : layer.id === 'membrane' ? '200 micras' : 'Compactación previa'}</b>
              </div>
            </div>
          ))}
          <div className="mt-6 space-y-2">
            {layers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => onSelect(layer.id)}
                className={selected === layer.id ? 'flex w-full items-center justify-between bg-yellow-300 px-3 py-3 text-left text-xs font-black text-black' : 'flex w-full items-center justify-between bg-white/[.055] px-3 py-3 text-left text-xs font-bold text-white/70 transition hover:bg-white/[.11]'}
              >
                <span>{layer.label}</span>
                <span>{layer.cm ? decimal.format(layer.cm) + ' cm' : 'ver'}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 text-[11px] leading-5 text-[#f7eedb]/48">Representación orientativa: la subrasante, drenajes, juntas, resistencia del hormigón y espesores finales se confirman según terreno, carga y proyecto.</p>
        </aside>
      </div>
    </section>
  );
}

function DistributionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.max(3, Math.round((value / total) * 100)) : 0;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-[#f8eedb]/72">{label}</span>
        <b className="text-white">{money.format(value)} <span className="font-normal text-white/42">· {percent}%</span></b>
      </div>
      <div className="h-2 overflow-hidden bg-white/[.08]">
        <div className="h-full transition-all duration-500" style={{ width: percent + '%', background: color }} />
      </div>
    </div>
  );
}

function MaterialRow({ item }: { item: MaterialLine }) {
  return (
    <article className="grid gap-3 bg-white/[0.055] p-4 ring-1 ring-white/[0.065] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0" style={{ background: item.color }} />
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.17em] text-yellow-200">{item.family}</p>
          <h3 className="mt-1 text-sm font-black text-white">{item.name}</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#f7eedb]/50">{item.note}</p>
          {item.source ? <a className="mt-1 inline-block text-[10px] font-bold text-yellow-200 underline decoration-yellow-200/35 underline-offset-4" href={item.source} target="_blank" rel="noreferrer">Ver referencia de precio</a> : null}
        </div>
      </div>
      <div className="text-left sm:text-right">
        <span className="block text-[9px] font-black uppercase tracking-[.15em] text-white/38">Cantidad</span>
        <b className="text-sm text-white">{decimal.format(item.qty)} {item.unit}</b>
      </div>
      <div className="text-left sm:min-w-[110px] sm:text-right">
        <span className="block text-[9px] font-black uppercase tracking-[.15em] text-white/38">Subtotal</span>
        <b className="text-base text-yellow-300">{money.format(item.total)}</b>
        <span className="mt-1 block text-[10px] text-white/40">{money.format(item.unitPrice)} / {item.unit}</span>
      </div>
    </article>
  );
}

export default function RadierEstimatorClient() {
  const router = useRouter();
  const [mode, setMode] = useState<MeasurementMode>('area');
  const [areaInput, setAreaInput] = useState(25);
  const [length, setLength] = useState(5);
  const [width, setWidth] = useState(5);
  const [concreteCm, setConcreteCm] = useState(10);
  const [stabilizedCm, setStabilizedCm] = useState(10);
  const [gravelCm, setGravelCm] = useState(5);
  const [waste, setWaste] = useState(10);
  const [includeInstallation, setIncludeInstallation] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<LayerId>('concrete');

  const estimate = useMemo(() => {
    const rawArea = mode === 'area' ? safeNumber(areaInput, 1) : safeNumber(length, 1) * safeNumber(width, 1);
    const area = Math.max(1, rawArea);
    const wasteFactor = 1 + waste / 100;
    const concreteM3 = area * (concreteCm / 100) * wasteFactor;
    const stabilizedM3 = area * (stabilizedCm / 100) * wasteFactor;
    const gravelBaseM3 = area * (gravelCm / 100) * wasteFactor;
    const cementBags = Math.ceil(concreteM3 * 12);
    const sandM3 = concreteM3 * 0.55;
    const gravelMixM3 = concreteM3 * 0.75;
    const meshSheets = Math.ceil((area * wasteFactor) / 13);
    const polyethyleneM2 = Math.ceil(area * 1.12);
    const spacers = Math.ceil(area * 4);

    const materials: MaterialLine[] = [
      {
        id: 'cement',
        name: 'Cemento especial 25 kg',
        family: 'Concreto H20 orientativo',
        qty: cementBags,
        unit: 'sacos',
        unitPrice: PRICE_REFERENCE.cementBag25kg,
        total: cementBags * PRICE_REFERENCE.cementBag25kg,
        source: 'https://www.sodimac.cl/sodimac-cl/articulo/110323991/cemento-melon-especial-25-kg/110324015',
        note: 'Dosificación referencial: 12 sacos por m³ de concreto. Se ajusta por resistencia y proveedor.',
        color: '#f6e8d2',
      },
      {
        id: 'sand',
        name: 'Arena gruesa para mezcla',
        family: 'Concreto H20 orientativo',
        qty: sandM3,
        unit: 'm³',
        unitPrice: PRICE_REFERENCE.sandM3,
        total: Math.round(sandM3 * PRICE_REFERENCE.sandM3),
        note: 'Referencia de árido a granel; despacho y distancia pueden cambiar el valor.',
        color: '#e6be78',
      },
      {
        id: 'gravel-mix',
        name: 'Gravilla para mezcla de concreto',
        family: 'Concreto H20 orientativo',
        qty: gravelMixM3,
        unit: 'm³',
        unitPrice: PRICE_REFERENCE.gravelM3,
        total: Math.round(gravelMixM3 * PRICE_REFERENCE.gravelM3),
        source: 'https://www.sodimac.cl/sodimac-cl/articulo/110308282/gravilla-para-construccion-saco-25-kg/110308286',
        note: 'Valor equivalente referencial: 53 sacos de 25 kg por m³, según ficha del producto.',
        color: '#9ba9b0',
      },
      {
        id: 'stabilized',
        name: 'Base estabilizada compactada',
        family: 'Base bajo radier',
        qty: stabilizedM3,
        unit: 'm³',
        unitPrice: PRICE_REFERENCE.stabilizedM3,
        total: Math.round(stabilizedM3 * PRICE_REFERENCE.stabilizedM3),
        note: 'Base granular estimada a granel. Considera el espesor que configuraste y merma.',
        color: '#b88d55',
      },
      {
        id: 'gravel-base',
        name: 'Gravilla bajo losa',
        family: 'Drenaje y nivelación',
        qty: gravelBaseM3,
        unit: 'm³',
        unitPrice: PRICE_REFERENCE.gravelM3,
        total: Math.round(gravelBaseM3 * PRICE_REFERENCE.gravelM3),
        source: 'https://www.sodimac.cl/sodimac-cl/articulo/110308282/gravilla-para-construccion-saco-25-kg/110308286',
        note: 'Cama drenante y de regularización bajo la barrera de humedad.',
        color: '#7f929d',
      },
      {
        id: 'mesh',
        name: 'Malla Acma C-92 · 2,6 × 5 m',
        family: 'Refuerzo',
        qty: meshSheets,
        unit: 'paños',
        unitPrice: PRICE_REFERENCE.meshC92,
        total: meshSheets * PRICE_REFERENCE.meshC92,
        source: 'https://www.sodimac.cl/sodimac-cl/articulo/110327948/malla-acma-c-92-2-6x5-m/110327972',
        note: 'Cada paño cubre 13 m² antes de traslapes. La cantidad incluye la merma configurada.',
        color: '#f4cc47',
      },
      {
        id: 'polyethylene',
        name: 'Polietileno 200 micras',
        family: 'Barrera de humedad',
        qty: polyethyleneM2,
        unit: 'm²',
        unitPrice: PRICE_REFERENCE.polyethyleneM2,
        total: polyethyleneM2 * PRICE_REFERENCE.polyethyleneM2,
        note: 'Cubre el área con traslapes. Precio referencial por m², según disponibilidad local.',
        color: '#36b8b0',
      },
      {
        id: 'spacers',
        name: 'Separadores para malla',
        family: 'Refuerzo',
        qty: spacers,
        unit: 'un.',
        unitPrice: PRICE_REFERENCE.spacer,
        total: spacers * PRICE_REFERENCE.spacer,
        note: 'Criterio estimado: 4 separadores por m² para mantener la malla elevada.',
        color: '#fdde63',
      },
    ];

    const materialsSubtotal = materials.reduce((sum, item) => sum + item.total, 0);
    const delivery = PRICE_REFERENCE.delivery;
    const labor = includeInstallation ? Math.round(area * PRICE_REFERENCE.laborM2) : 0;
    const net = materialsSubtotal + delivery + labor;
    const iva = Math.round(net * 0.19);
    const total = net + iva;

    const groups = [
      {
        label: 'Concreto (cemento + áridos)',
        value: materials.filter((item) => ['cement', 'sand', 'gravel-mix'].includes(item.id)).reduce((sum, item) => sum + item.total, 0),
        color: '#f9d858',
      },
      {
        label: 'Base y drenaje',
        value: materials.filter((item) => ['stabilized', 'gravel-base'].includes(item.id)).reduce((sum, item) => sum + item.total, 0),
        color: '#b88d55',
      },
      {
        label: 'Refuerzo y barrera',
        value: materials.filter((item) => ['mesh', 'polyethylene', 'spacers'].includes(item.id)).reduce((sum, item) => sum + item.total, 0),
        color: '#36b8b0',
      },
      { label: 'Despacho referencial', value: delivery, color: '#f7eedb' },
      ...(includeInstallation ? [{ label: 'Ejecución y terminación', value: labor, color: '#fb923c' }] : []),
    ];

    return {
      area,
      concreteM3,
      stabilizedM3,
      gravelBaseM3,
      cementBags,
      meshSheets,
      polyethyleneM2,
      spacers,
      materials,
      materialsSubtotal,
      delivery,
      labor,
      net,
      iva,
      total,
      groups,
    };
  }, [areaInput, concreteCm, gravelCm, includeInstallation, length, mode, stabilizedCm, waste, width]);

  const viewerLength = mode === 'dimensions' ? length : Math.sqrt(estimate.area * 1.25);
  const viewerWidth = mode === 'dimensions' ? width : Math.sqrt(estimate.area / 1.25);
  const whatsappMessage = [
    'Hola Soluciones Fabrick, quiero cotizar un radier.',
    'Superficie: ' + decimal.format(estimate.area) + ' m².',
    'Medidas: ' + (mode === 'dimensions' ? decimal.format(length) + ' × ' + decimal.format(width) + ' m.' : 'ingresé superficie directa.'),
    'Capas: hormigón ' + concreteCm + ' cm, estabilizado ' + stabilizedCm + ' cm y gravilla ' + gravelCm + ' cm.',
    'Materiales estimados: ' + money.format(estimate.materialsSubtotal) + '.',
    'Total referencial: ' + money.format(estimate.total) + '.',
  ].join('\n');
  const whatsappUrl = 'https://wa.me/56930121625?text=' + encodeURIComponent(whatsappMessage);

  return (
    <div className="min-h-screen bg-[#080604] text-[#fff8eb]">
      <StorefrontHeader />
      <main className="relative isolate overflow-hidden px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 md:px-8 md:pb-16">
        <div aria-hidden className="pointer-events-none absolute -left-44 top-16 -z-10 h-[35rem] w-[35rem] rounded-full bg-yellow-300/[.11] blur-[105px]" />
        <div aria-hidden className="pointer-events-none absolute -right-44 top-[42rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-orange-400/[.09] blur-[105px]" />
        <div className="mx-auto max-w-[1320px]">
          <button type="button" onClick={() => navigateWithTransition('/tienda', router)} className="mb-4 inline-flex items-center gap-2 bg-white/[.065] px-4 py-2.5 text-xs font-black text-white/75 transition hover:bg-white/[.12]">
            <ArrowLeft className="h-4 w-4" /> Volver a productos
          </button>

          <section className="overflow-hidden bg-[#141009]/92 shadow-[0_34px_110px_rgba(0,0,0,.42)] ring-1 ring-yellow-200/[.13]">
            <div className="grid xl:grid-cols-[.76fr_1.24fr]">
              <header className="relative overflow-hidden p-5 sm:p-7 xl:p-9">
                <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-yellow-300/20 blur-3xl" />
                <p className="relative text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Herramienta de obra gruesa</p>
                <h1 className="relative mt-3 max-w-lg text-[clamp(42px,6vw,72px)] font-black leading-[.88] tracking-[-.075em]">Tu radier, material por material.</h1>
                <p className="relative mt-5 max-w-xl text-sm leading-7 text-[#f7eedb]/62">Ingresa 25 m² directamente o calcula con ancho y largo. Ajusta espesores, revisa las capas y recibe una lista orientativa para conversar con una persona técnica.</p>
                <div className="relative mt-7 grid grid-cols-2 gap-3">
                  <Metric label="Materiales aprox." value={money.format(estimate.materialsSubtotal)} accent icon={PackageCheck} />
                  <Metric label="Superficie" value={decimal.format(estimate.area) + ' m²'} icon={Maximize2} />
                </div>
                <div className="relative mt-4 bg-black/30 p-4 text-xs leading-5 text-[#f7eedb]/55">
                  <b className="text-yellow-200">No es una cotización final.</b> Los precios varían por comuna, proveedor, distancia, acceso, compactación, pendientes y especificaciones estructurales.
                </div>
              </header>

              <div className="grid gap-5 bg-black/[.19] p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_335px] xl:p-8">
                <div className="grid content-start gap-5">
                  <section>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center bg-yellow-300 text-sm font-black text-black">1</span>
                      <div><h2 className="font-black">Define la superficie</h2><p className="text-xs text-white/43">Usa la opción que te resulte más cómoda.</p></div>
                    </div>
                    <div className="grid grid-cols-2 bg-white/[.055] p-1 ring-1 ring-white/[.07]">
                      <button type="button" onClick={() => setMode('area')} className={mode === 'area' ? 'bg-yellow-300 px-3 py-3 text-xs font-black text-black' : 'px-3 py-3 text-xs font-bold text-white/58'}>Ingresar m²</button>
                      <button type="button" onClick={() => setMode('dimensions')} className={mode === 'dimensions' ? 'bg-yellow-300 px-3 py-3 text-xs font-black text-black' : 'px-3 py-3 text-xs font-bold text-white/58'}>Ancho × largo</button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {mode === 'area' ? (
                        <NumberField label="Superficie a cubrir" value={areaInput} onChange={setAreaInput} suffix="m²" step={0.5} min={1} helper="Ejemplo: escribe 25 para un radier de 25 m²." />
                      ) : (
                        <>
                          <NumberField label="Largo" value={length} onChange={setLength} suffix="m" step={0.1} min={0.5} />
                          <NumberField label="Ancho" value={width} onChange={setWidth} suffix="m" step={0.1} min={0.5} />
                          <Metric label="Área resultante" value={decimal.format(estimate.area) + ' m²'} icon={Ruler} />
                        </>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center bg-yellow-300 text-sm font-black text-black">2</span>
                      <div><h2 className="font-black">Ajusta capas y merma</h2><p className="text-xs text-white/43">Los controles actualizan cubicación, visor y costos.</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <NumberField label="Hormigón H20" value={concreteCm} onChange={setConcreteCm} suffix="cm" min={7} max={25} />
                      <NumberField label="Estabilizado" value={stabilizedCm} onChange={setStabilizedCm} suffix="cm" min={5} max={25} />
                      <NumberField label="Gravilla base" value={gravelCm} onChange={setGravelCm} suffix="cm" min={2} max={20} />
                      <NumberField label="Merma" value={waste} onChange={setWaste} suffix="%" min={0} max={20} />
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center bg-yellow-300 text-sm font-black text-black">3</span>
                      <div><h2 className="font-black">Cubicación rápida</h2><p className="text-xs text-white/43">Las cantidades se redondean para facilitar la compra.</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Metric label="Concreto" value={decimal.format(estimate.concreteM3) + ' m³'} icon={Layers3} />
                      <Metric label="Cemento 25 kg" value={whole.format(estimate.cementBags) + ' sacos'} icon={PackageCheck} />
                      <Metric label="Estabilizado" value={decimal.format(estimate.stabilizedM3) + ' m³'} icon={Layers3} />
                      <Metric label="Malla C-92" value={whole.format(estimate.meshSheets) + ' paños'} icon={Layers3} />
                    </div>
                  </section>

                  <label className="flex cursor-pointer items-center justify-between gap-4 bg-yellow-300/[.10] p-4 ring-1 ring-yellow-300/[.22]">
                    <span><b className="block text-sm text-yellow-100">Incluir ejecución referencial</b><span className="mt-1 block text-xs leading-5 text-[#f7eedb]/62">Suma mano de obra y terminación orientativa. Puedes dejarlo apagado si solo quieres materiales.</span></span>
                    <input type="checkbox" checked={includeInstallation} onChange={(event) => setIncludeInstallation(event.target.checked)} className="h-5 w-5 accent-yellow-300" />
                  </label>
                </div>

                <aside className="bg-[#f8f0dd] p-5 text-[#20170f] shadow-[0_22px_65px_rgba(0,0,0,.28)]">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[9px] font-black uppercase tracking-[.21em] text-[#a45d26]">Resumen de presupuesto</p><h2 className="mt-2 text-2xl font-black leading-none tracking-[-.055em]">Radier de {decimal.format(estimate.area)} m²</h2></div>
                    <ClipboardList className="h-6 w-6 text-[#a45d26]" />
                  </div>
                  <div className="my-5 border-y border-dashed border-black/20 py-2">
                    <div className="flex justify-between gap-3 py-2 text-xs"><span className="text-black/58">Capas configuradas</span><b>{concreteCm + stabilizedCm + gravelCm} cm + barrera</b></div>
                    <div className="flex justify-between gap-3 py-2 text-xs"><span className="text-black/58">Materiales</span><b>{money.format(estimate.materialsSubtotal)}</b></div>
                    <div className="flex justify-between gap-3 py-2 text-xs"><span className="text-black/58">Despacho referencial</span><b>{money.format(estimate.delivery)}</b></div>
                    {includeInstallation ? <div className="flex justify-between gap-3 py-2 text-xs"><span className="text-black/58">Ejecución orientativa</span><b>{money.format(estimate.labor)}</b></div> : null}
                  </div>
                  <div className="flex justify-between text-xs text-black/58"><span>Neto aproximado</span><b>{money.format(estimate.net)}</b></div>
                  <div className="mt-2 flex justify-between text-xs text-black/58"><span>IVA referencial</span><b>{money.format(estimate.iva)}</b></div>
                  <div className="mt-5 bg-[#17120c] p-4 text-white"><span className="text-[9px] font-black uppercase tracking-[.18em] text-yellow-200">Total orientativo</span><b className="mt-1 block text-3xl font-black tracking-[-.06em]">{money.format(estimate.total)}</b></div>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-yellow-300 px-4 py-4 text-center text-sm font-black text-black transition hover:bg-[#ffe77a]"><Truck className="h-4 w-4" /> Enviar cálculo por WhatsApp</a>
                  <p className="mt-4 text-[10px] leading-5 text-black/50">Incluye material, merma y despacho de referencia. No considera excavación, retiro de escombros, drenajes especiales, moldajes complejos, bombeo ni diseño estructural.</p>
                </aside>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(350px,.84fr)]">
            <LayerViewer concreteCm={concreteCm} stabilizedCm={stabilizedCm} gravelCm={gravelCm} area={estimate.area} selected={selectedLayer} onSelect={setSelectedLayer} />
            <section className="bg-[#17120c] p-5 shadow-[0_25px_75px_rgba(0,0,0,.28)] ring-1 ring-white/[.08] sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Gráficas de la estimación</p>
              <h2 className="mt-2 text-3xl font-black leading-none tracking-[-.055em]">Dónde se concentra la inversión</h2>
              <p className="mt-3 text-sm leading-6 text-[#f7eedb]/62">Distribución del total configurado. Los montos cambian al modificar m², espesores o la opción de ejecución.</p>
              <div className="mt-6 space-y-5">
                {estimate.groups.map((group) => <DistributionBar key={group.label} label={group.label} value={group.value} total={estimate.net} color={group.color} />)}
              </div>
              <div className="mt-7 grid grid-cols-3 gap-2">
                <div className="bg-white/[.06] p-3"><span className="block text-[9px] font-black uppercase tracking-[.14em] text-white/43">Malla</span><b className="mt-1 block text-xl">{whole.format(estimate.meshSheets)} paños</b><span className="text-[10px] text-white/46">13 m² por paño</span></div>
                <div className="bg-white/[.06] p-3"><span className="block text-[9px] font-black uppercase tracking-[.14em] text-white/43">Polietileno</span><b className="mt-1 block text-xl">{whole.format(estimate.polyethyleneM2)} m²</b><span className="text-[10px] text-white/46">incluye traslape</span></div>
                <div className="bg-white/[.06] p-3"><span className="block text-[9px] font-black uppercase tracking-[.14em] text-white/43">Separadores</span><b className="mt-1 block text-xl">{whole.format(estimate.spacers)} un.</b><span className="text-[10px] text-white/46">4 por m² aprox.</span></div>
              </div>
              <div className="mt-6 bg-yellow-300/[.11] p-4 text-xs leading-5 text-yellow-50 ring-1 ring-yellow-300/[.2]"><Info className="mb-2 h-5 w-5 text-yellow-300" />La malla debe quedar dentro de la losa, apoyada sobre separadores. La sección visual explica el orden de las capas, pero no sustituye una especificación técnica o estructural.</div>
            </section>
          </section>

          <section className="mt-6 overflow-hidden bg-[#100d08] shadow-[0_25px_75px_rgba(0,0,0,.24)] ring-1 ring-white/[.075]">
            <header className="flex flex-wrap items-end justify-between gap-4 bg-white/[.035] p-5 sm:p-7">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Lista de compra orientativa</p>
                <h2 className="mt-2 text-3xl font-black leading-none tracking-[-.055em]">Materiales y valores separados</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f7eedb]/60">Calculado con {waste}% de merma. Los áridos a granel, flete y disponibilidad varían especialmente según comuna y volumen solicitado.</p>
              </div>
              <div className="bg-yellow-300 px-4 py-3 text-black"><span className="block text-[9px] font-black uppercase tracking-[.15em] text-black/50">Subtotal materiales</span><b className="text-2xl">{money.format(estimate.materialsSubtotal)}</b></div>
            </header>
            <div className="grid gap-px bg-white/[.06] sm:grid-cols-2">
              {estimate.materials.map((item) => <MaterialRow key={item.id} item={item} />)}
            </div>
            <footer className="grid gap-4 bg-[#17120c] p-5 text-xs leading-5 text-[#f7eedb]/58 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
              <p>Referencias consultadas en julio de 2026: cemento especial Melón 25 kg y malla Acma C-92 de Sodimac; la gravilla usa el rendimiento publicado de 53 sacos de 25 kg por m³. Arena, estabilizado, polietileno, separadores y flete se muestran como referencias de compra local, no como tarifa oficial.</p>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-white px-4 py-3 text-xs font-black text-black"><Sparkles className="h-4 w-4" /> Validar con Fabrick</a>
            </footer>
          </section>

          <section className="mt-6 grid gap-3 bg-emerald-300/[.07] p-5 text-sm leading-6 text-emerald-50 ring-1 ring-emerald-300/[.15] sm:grid-cols-[auto_1fr] sm:items-start">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            <div><b className="block">Tu cálculo queda listo para revisar.</b><span className="text-emerald-50/70">Para cerrar un valor real se confirma estado del terreno, cotas, compactación, acceso, juntas, resistencia requerida y despacho. El visor está pensado para que sepas qué preguntar y qué comparar.</span></div>
          </section>

          <div className="sr-only">Representación de referencia para una superficie aproximada de {decimal.format(viewerLength * viewerWidth)} metros cuadrados.</div>
        </div>
      </main>
      <StoreBottomNav />
    </div>
  );
}
