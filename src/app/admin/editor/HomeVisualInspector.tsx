'use client';

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  RotateCcw,
  Type,
  X,
} from 'lucide-react';
import InsforgeMediaPicker from '@/components/admin/editor/InsforgeMediaPicker';
import HomeVisualContainerInspector from './HomeVisualContainerInspector';
import type {
  HomeVisualAnimation,
  HomeVisualSection,
  HomeVisualSectionStyle,
} from '@/lib/homeVisualCms';
import {
  clearDeviceLayout,
  clearElementStyle,
  clearElementTypography,
  getAdvancedStyle,
  getDeviceLayout,
  getElementStyle,
  getElementTypography,
  patchDeviceLayout,
  patchElementStyle,
  patchElementTypography,
  type AdvancedHomeVisualStyle,
  type VisualBackgroundFit,
  type VisualDevice,
  type VisualElementStyle,
  type VisualFontFamily,
  type VisualResponsiveLayout,
  type VisualResponsiveTypography,
  type VisualShadow,
  type VisualTextAlign,
  type VisualTextTransform,
} from '@/lib/homeVisualLayout';
import {
  appendedSources,
  deletedSources,
  duplicatedSources,
  movedSources,
  remapRepeatedItemStyles,
} from '@/lib/homeVisualRepeatedStyles';

const DEVICE_LABELS: Record<VisualDevice, string> = { mobile: 'Móvil', tablet: 'Tablet', desktop: 'PC' };
const ANIMATIONS: Array<{ value: HomeVisualAnimation; label: string }> = [
  { value: 'none', label: 'Sin animación' },
  { value: 'fade-up', label: 'Fade + subir' },
  { value: 'fade', label: 'Fade' },
  { value: 'scale', label: 'Escala suave' },
  { value: 'slide-left', label: 'Desde izquierda' },
  { value: 'slide-right', label: 'Desde derecha' },
];
const SHADOWS: Array<{ value: VisualShadow; label: string }> = [
  { value: 'none', label: 'Sin sombra' },
  { value: 'soft', label: 'Suave' },
  { value: 'medium', label: 'Media' },
  { value: 'strong', label: 'Profunda' },
];
const FONTS: Array<{ value: VisualFontFamily; label: string }> = [
  { value: 'inherit', label: 'Heredar del diseño' },
  { value: 'Sora', label: 'Sora' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'serif', label: 'Serif editorial' },
  { value: 'mono', label: 'Monoespaciada' },
];
const inputCls = 'w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#FFB000]/55';
const labelCls = 'mb-1.5 block text-[9px] font-black uppercase tracking-[.17em] text-[#FFB000]/70';

type RepeatedMutation = {
  key: string;
  next: unknown[];
  sources: Array<number | null>;
  selectField?: string | null;
};

interface InspectorProps {
  section: HomeVisualSection;
  device: VisualDevice;
  selectedField: string | null;
  setSelectedField: (field: string | null) => void;
  patch: (updater: (section: HomeVisualSection) => HomeVisualSection) => void;
  reorder: (direction: -1 | 1) => void;
  duplicate: () => void;
}

export default function HomeVisualInspector({ section, device, selectedField, setSelectedField, patch, reorder, duplicate }: InspectorProps) {
  const advanced = getAdvancedStyle(section.style);
  const responsive = getDeviceLayout(section.style, device);
  const setStyle = <K extends keyof HomeVisualSectionStyle>(key: K, value: HomeVisualSectionStyle[K]) => patch((current) => ({ ...current, style: { ...current.style, [key]: value } }));
  const setAdvanced = <K extends keyof AdvancedHomeVisualStyle>(key: K, value: AdvancedHomeVisualStyle[K]) => patch((current) => ({ ...current, style: { ...getAdvancedStyle(current.style), [key]: value } as HomeVisualSectionStyle }));
  const setResponsive = <K extends keyof VisualResponsiveLayout>(key: K, value: VisualResponsiveLayout[K]) => patch((current) => ({ ...current, style: patchDeviceLayout(current.style, device, key, value) }));
  const resetResponsive = () => patch((current) => ({ ...current, style: clearDeviceLayout(current.style, device) }));
  const setContent = (key: string, value: unknown) => patch((current) => ({ ...current, content: { ...current.content, [key]: value } }));
  const setFieldContent = (field: string, value: string) => patch((current) => ({ ...current, content: patchContentField(current.content, field, value) }));
  const mutateRepeated = ({ key, next, sources, selectField }: RepeatedMutation) => {
    patch((current) => ({
      ...current,
      content: { ...current.content, [key]: next },
      style: remapRepeatedItemStyles(current.style, key, sources),
    }));
    if (selectField !== undefined) setSelectedField(selectField);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Bloque seleccionado</p>
        <div className="mt-2 flex items-center gap-2">
          <input className={`${inputCls} font-black`} value={section.label} onChange={(event) => patch((current) => ({ ...current, label: event.target.value }))} />
          <button type="button" onClick={() => patch((current) => ({ ...current, enabled: !current.enabled }))} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${section.enabled ? 'border-emerald-400/30 text-emerald-300' : 'border-white/10 text-white/25'}`}>{section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => reorder(-1)} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45"><ChevronUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => reorder(1)} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45"><ChevronDown className="h-4 w-4" /></button>
          <button type="button" onClick={duplicate} className="grid h-9 place-items-center rounded-lg border border-white/8 text-white/45" title="Duplicar bloque"><Copy className="h-4 w-4" /></button>
        </div>
      </div>

      <ElementNavigator content={section.content} selectedField={selectedField} onSelect={setSelectedField} />

      {selectedField ? (
        <ElementInspector section={section} field={selectedField} device={device} patch={patch} setFieldContent={setFieldContent} close={() => setSelectedField(null)} />
      ) : (
        <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3 text-[10px] leading-5 text-sky-100/55">Toca un título, párrafo o una tarjeta dentro de la vista previa. El texto tiene su inspector tipográfico y las tarjetas repetidas tienen además fondo, borde, espacio, sombra y visibilidad responsive.</div>
      )}

      <details open className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Contenido</summary>
        <div className="mt-4 space-y-4"><ContentFields content={section.content} selectedField={selectedField} onSelect={setSelectedField} onChange={setContent} onMutateRepeated={mutateRepeated} /></div>
      </details>

      <details className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Diseño del bloque</summary>
        <div className="mt-4 space-y-4">
          <ColorField label="Fondo" value={section.style.background || '#08090A'} onChange={(value) => setStyle('background', value)} />
          <ColorField label="Texto" value={section.style.textColor || '#FFF9EE'} onChange={(value) => setStyle('textColor', value)} />
          <ColorField label="Acento" value={section.style.accent || '#FFB000'} onChange={(value) => setStyle('accent', value)} />
          {section.type !== 'calculator' ? (
            <div>
              <label className={labelCls}>Imagen de fondo · Insforge</label>
              <InsforgeMediaPicker value={section.style.backgroundImage || ''} onChange={(url) => setStyle('backgroundImage', url)} folder="home" />
              {section.style.backgroundImage ? (
                <div className="mt-3 space-y-3">
                  <div className="aspect-[16/7] overflow-hidden rounded-xl border border-white/10 bg-black/60" style={{ backgroundImage: `url(${section.style.backgroundImage})`, backgroundSize: advanced.backgroundFit === 'contain' ? 'contain' : 'cover', backgroundPosition: `${Number(advanced.backgroundPositionX ?? 50)}% ${Number(advanced.backgroundPositionY ?? 50)}%`, backgroundRepeat: 'no-repeat' }} />
                  <div><label className={labelCls}>Ajuste de imagen</label><select className={inputCls} value={advanced.backgroundFit || 'cover'} onChange={(event) => setAdvanced('backgroundFit', event.target.value as VisualBackgroundFit)}><option value="cover">Cubrir el bloque</option><option value="contain">Mostrar imagen completa</option></select></div>
                  <RangeField label="Foco horizontal" value={Number(advanced.backgroundPositionX ?? 50)} min={0} max={100} suffix="%" onChange={(value) => setAdvanced('backgroundPositionX', value)} />
                  <RangeField label="Foco vertical" value={Number(advanced.backgroundPositionY ?? 50)} min={0} max={100} suffix="%" onChange={(value) => setAdvanced('backgroundPositionY', value)} />
                  <RangeField label="Oscurecer imagen" value={Number(section.style.overlay ?? 35)} min={0} max={90} suffix="%" onChange={(value) => setStyle('overlay', value)} />
                  <button type="button" onClick={() => { setAdvanced('backgroundPositionX', 50); setAdvanced('backgroundPositionY', 50); }} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[9px] font-black uppercase tracking-[.12em] text-white/40"><RotateCcw className="h-3 w-3" /> Centrar foco</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3"><NumberField label="Borde px" value={Number(advanced.borderWidth ?? 0)} min={0} max={16} onChange={(value) => setAdvanced('borderWidth', value)} /><NumberField label="Radio px" value={Number(advanced.borderRadius ?? 0)} min={0} max={96} onChange={(value) => setAdvanced('borderRadius', value)} /></div>
          {Number(advanced.borderWidth ?? 0) > 0 ? <ColorField label="Color del borde" value={advanced.borderColor || '#FFFFFF'} onChange={(value) => setAdvanced('borderColor', value)} /> : null}
          <NumberField label="Ancho máximo · 0 = completo" value={Number(advanced.maxWidth ?? 0)} min={0} max={2400} step={10} onChange={(value) => setAdvanced('maxWidth', value)} />
          <div><label className={labelCls}>Sombra</label><select className={inputCls} value={advanced.shadow || 'none'} onChange={(event) => setAdvanced('shadow', event.target.value as VisualShadow)}>{SHADOWS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        </div>
      </details>

      <details className="rounded-2xl border border-white/8 bg-black/25 p-3">
        <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Responsive del bloque · {DEVICE_LABELS[device]}</summary>
        <div className="mt-3 rounded-xl border border-[#FFB000]/10 bg-[#FFB000]/5 p-2.5 text-[9px] leading-4 text-[#FFD879]/60">Estos valores solo afectan {DEVICE_LABELS[device]}.</div>
        <div className="mt-4 grid grid-cols-2 gap-3"><NumberField label="Espacio arriba" value={Number(responsive.paddingTop ?? 0)} min={0} max={320} onChange={(value) => setResponsive('paddingTop', value)} /><NumberField label="Espacio abajo" value={Number(responsive.paddingBottom ?? 0)} min={0} max={320} onChange={(value) => setResponsive('paddingBottom', value)} /><NumberField label="Espacio lateral" value={Number(responsive.paddingInline ?? 0)} min={0} max={180} onChange={(value) => setResponsive('paddingInline', value)} /><NumberField label="Altura mínima" value={Number(responsive.minHeight ?? 0)} min={0} max={1600} step={10} onChange={(value) => setResponsive('minHeight', value)} /><NumberField label="Margen arriba" value={Number(responsive.marginTop ?? 0)} min={-160} max={320} onChange={(value) => setResponsive('marginTop', value)} /><NumberField label="Margen abajo" value={Number(responsive.marginBottom ?? 0)} min={-160} max={320} onChange={(value) => setResponsive('marginBottom', value)} /></div>
        <button type="button" onClick={resetResponsive} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[9px] font-black uppercase tracking-[.12em] text-white/40"><RotateCcw className="h-3 w-3" /> Limpiar ajustes</button>
      </details>

      <details className="rounded-2xl border border-white/8 bg-black/25 p-3"><summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Animación</summary><div className="mt-4 space-y-3"><div><label className={labelCls}>Entrada</label><select className={inputCls} value={section.style.animation || 'none'} onChange={(event) => setStyle('animation', event.target.value as HomeVisualAnimation)}>{ANIMATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div><label className={labelCls}>Duración · {Number(section.style.duration || .6).toFixed(1)} s</label><input type="range" min="0.1" max="2" step="0.1" value={Number(section.style.duration || .6)} onChange={(event) => setStyle('duration', Number(event.target.value))} className="w-full accent-[#FFB000]" /></div></div></details>

      {section.type === 'calculator' ? <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3 text-[10px] leading-5 text-sky-100/55">La lógica de precios, IVA y fórmulas permanece protegida. El CMS controla posición, espacio, colores y animación sin permitir que un cambio visual altere un cálculo comercial.</div> : null}
    </div>
  );
}

function ElementNavigator({ content, selectedField, onSelect }: { content: Record<string, unknown>; selectedField: string | null; onSelect: (field: string | null) => void }) {
  const groups = editableTokens(content);
  if (!groups.length) return null;
  return (
    <details open className="rounded-2xl border border-white/8 bg-black/25 p-3">
      <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[.16em] text-white/65">Elementos del bloque</summary>
      <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {groups.map(({ field, label, kind }) => <button key={field} type="button" onClick={() => onSelect(field)} className={`rounded-full border px-2.5 py-1.5 text-[9px] font-bold transition ${selectedField === field ? kind === 'container' ? 'border-violet-300/45 bg-violet-300/10 text-violet-50' : 'border-sky-300/45 bg-sky-400/10 text-sky-100' : 'border-white/8 text-white/38 hover:border-white/20 hover:text-white/65'}`}>{label}</button>)}
      </div>
    </details>
  );
}

function ElementInspector({ section, field, device, patch, setFieldContent, close }: { section: HomeVisualSection; field: string; device: VisualDevice; patch: (updater: (section: HomeVisualSection) => HomeVisualSection) => void; setFieldContent: (field: string, value: string) => void; close: () => void }) {
  const container = containerFromField(section.content, field);
  if (field.endsWith('-container') && container) {
    return <HomeVisualContainerInspector section={section} container={container} device={device} patch={patch} close={close} />;
  }

  const element = getElementStyle(section.style, field);
  const typography = getElementTypography(section.style, field, device);
  const contentValue = getContentFieldValue(section.content, field);
  const setElement = <K extends keyof Omit<VisualElementStyle, 'responsive'>>(key: K, value: VisualElementStyle[K]) => patch((current) => ({ ...current, style: patchElementStyle(current.style, field, key, value) }));
  const setTypography = <K extends keyof VisualResponsiveTypography>(key: K, value: VisualResponsiveTypography[K]) => patch((current) => ({ ...current, style: patchElementTypography(current.style, field, device, key, value) }));
  const clearDevice = () => patch((current) => ({ ...current, style: clearElementTypography(current.style, field, device) }));
  const clearAll = () => patch((current) => ({ ...current, style: clearElementStyle(current.style, field) }));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-sky-400/25 bg-sky-400/[.06] p-3">
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/10 text-sky-200"><Type className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.15em] text-sky-200/55">Elemento seleccionado</p><b className="block truncate text-sm text-sky-100">{prettyField(field)}</b></div><button type="button" onClick={close} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/40"><X className="h-3.5 w-3.5" /></button></div>
        {typeof contentValue === 'string' ? <div className="mt-4"><label className={labelCls}>Contenido de este elemento</label><textarea className={`${inputCls} min-h-20 resize-y`} value={contentValue} onChange={(event) => setFieldContent(field, event.target.value)} /></div> : <p className="mt-3 text-[9px] leading-4 text-white/30">Este elemento es visual o generado automáticamente. Puedes estilizarlo sin modificar su valor.</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Fuente</label><select className={inputCls} value={element.fontFamily || 'inherit'} onChange={(event) => setElement('fontFamily', event.target.value as VisualFontFamily)}>{FONTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <NumberField label="Peso" value={Number(element.fontWeight ?? 0)} min={0} max={900} step={100} onChange={(value) => setElement('fontWeight', value)} />
        </div>
        <div className="mt-3"><ColorField label="Color propio" value={element.color || section.style.textColor || '#FFFFFF'} onChange={(value) => setElement('color', value)} /></div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Alineación</label><select className={inputCls} value={element.textAlign || 'inherit'} onChange={(event) => setElement('textAlign', event.target.value as VisualTextAlign)}><option value="inherit">Heredar</option><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></div>
          <div><label className={labelCls}>Transformación</label><select className={inputCls} value={element.textTransform || 'none'} onChange={(event) => setElement('textTransform', event.target.value as VisualTextTransform)}><option value="none">Normal</option><option value="uppercase">Mayúsculas</option><option value="lowercase">Minúsculas</option><option value="capitalize">Capitalizar</option></select></div>
        </div>
        <div className="mt-4 border-t border-sky-300/10 pt-4"><p className="mb-3 text-[9px] font-black uppercase tracking-[.14em] text-sky-200/50">Tipografía · {DEVICE_LABELS[device]}</p><div className="grid grid-cols-2 gap-3"><NumberField label="Tamaño px · 0 hereda" value={Number(typography.fontSize ?? 0)} min={0} max={180} onChange={(value) => setTypography('fontSize', value)} /><NumberField label="Line height · 0 hereda" value={Number(typography.lineHeight ?? 0)} min={0} max={3} step={0.05} onChange={(value) => setTypography('lineHeight', value)} /><NumberField label="Tracking px" value={Number(typography.letterSpacing ?? 0)} min={-8} max={20} step={0.1} onChange={(value) => setTypography('letterSpacing', value)} /><NumberField label="Ancho máx px · 0 hereda" value={Number(typography.maxWidth ?? 0)} min={0} max={1800} step={10} onChange={(value) => setTypography('maxWidth', value)} /></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={clearDevice} className="rounded-full border border-white/10 px-3 py-2 text-[9px] font-black text-white/40">Reset {DEVICE_LABELS[device]}</button><button type="button" onClick={clearAll} className="rounded-full border border-red-400/15 px-3 py-2 text-[9px] font-black text-red-200/45">Reset elemento</button></div>
      </div>
      {container ? <HomeVisualContainerInspector section={section} container={container} device={device} patch={patch} /> : null}
    </div>
  );
}

function ContentFields({ content, selectedField, onSelect, onChange, onMutateRepeated }: {
  content: Record<string, unknown>;
  selectedField: string | null;
  onSelect: (field: string | null) => void;
  onChange: (key: string, value: unknown) => void;
  onMutateRepeated: (mutation: RepeatedMutation) => void;
}) {
  return <>{Object.entries(content).map(([key, value]) => <ContentField key={key} fieldKey={key} value={value} selectedField={selectedField} onSelect={onSelect} onChange={(next) => onChange(key, next)} onMutateRepeated={onMutateRepeated} />)}</>;
}

function ContentField({ fieldKey, value, selectedField, onSelect, onChange, onMutateRepeated }: {
  fieldKey: string;
  value: unknown;
  selectedField: string | null;
  onSelect: (field: string | null) => void;
  onChange: (next: unknown) => void;
  onMutateRepeated: (mutation: RepeatedMutation) => void;
}) {
  const title = pretty(fieldKey);
  if (typeof value === 'string') {
    const long = value.length > 72 || /(description|paragraph|text|note|subtitle)/i.test(fieldKey);
    const selected = selectedField === fieldKey;
    return <div className={selected ? 'rounded-xl ring-1 ring-sky-400/35 p-2 -m-2' : ''}><label className={labelCls}>{title}</label>{long ? <textarea onFocus={() => onSelect(fieldKey)} className={`${inputCls} min-h-24 resize-y`} value={value} onChange={(event) => onChange(event.target.value)} /> : <input onFocus={() => onSelect(fieldKey)} className={inputCls} value={value} onChange={(event) => onChange(event.target.value)} />}</div>;
  }

  if (!Array.isArray(value)) return null;

  if (value.every((item) => typeof item === 'string')) {
    const list = value as string[];
    const move = (index: number, direction: -1 | 1) => {
      const sources = movedSources(list.length, index, direction);
      if (sources[index] === index) return;
      const target = index + direction;
      onMutateRepeated({ key: fieldKey, next: sources.map((source) => list[source]), sources, selectField: `${fieldKey}-${target}` });
    };
    const duplicateItem = (index: number) => {
      const sources = duplicatedSources(list.length, index);
      onMutateRepeated({ key: fieldKey, next: sources.map((source) => list[source]), sources, selectField: `${fieldKey}-${index + 1}` });
    };
    const remove = (index: number) => {
      const sources = deletedSources(list.length, index);
      const next = sources.map((source) => list[source]);
      const nextIndex = next.length ? Math.min(index, next.length - 1) : -1;
      onMutateRepeated({ key: fieldKey, next, sources, selectField: nextIndex >= 0 ? `${fieldKey}-${nextIndex}` : null });
    };
    const add = () => {
      const sources = appendedSources(list.length);
      onMutateRepeated({ key: fieldKey, next: [...list, 'Nuevo texto'], sources, selectField: `${fieldKey}-${list.length}` });
    };

    return (
      <div>
        <label className={labelCls}>{title}</label>
        <div className="space-y-2">
          {list.map((item, index) => {
            const field = `${fieldKey}-${index}`;
            const containerField = `${fieldKey}-${index}-container`;
            const selected = selectedField === field || selectedField === containerField;
            return (
              <div key={index} className={`rounded-xl border bg-black/20 p-2 ${selected ? 'border-sky-400/30' : 'border-white/8'}`}>
                <input onFocus={() => onSelect(field)} className={inputCls} value={item} onChange={(event) => onChange(list.map((current, i) => i === index ? event.target.value : current))} />
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  <MiniButton label="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ChevronUp className="h-3.5 w-3.5" /></MiniButton>
                  <MiniButton label="Bajar" disabled={index === list.length - 1} onClick={() => move(index, 1)}><ChevronDown className="h-3.5 w-3.5" /></MiniButton>
                  <MiniButton label="Duplicar" onClick={() => duplicateItem(index)}><Copy className="h-3.5 w-3.5" /></MiniButton>
                  <MiniButton label="Eliminar" danger onClick={() => remove(index)}><X className="h-3.5 w-3.5" /></MiniButton>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={add} className="text-[10px] font-black text-[#FFB000]">+ Añadir texto</button>
        </div>
      </div>
    );
  }

  if (value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    const list = value as Array<Record<string, unknown>>;
    const move = (index: number, direction: -1 | 1) => {
      const sources = movedSources(list.length, index, direction);
      if (sources[index] === index) return;
      const target = index + direction;
      onMutateRepeated({ key: fieldKey, next: sources.map((source) => list[source]), sources, selectField: `${fieldKey}-${target}-container` });
    };
    const duplicateItem = (index: number) => {
      const sources = duplicatedSources(list.length, index);
      const next = sources.map((source, newIndex) => newIndex === index + 1 ? { ...list[source] } : list[source]);
      onMutateRepeated({ key: fieldKey, next, sources, selectField: `${fieldKey}-${index + 1}-container` });
    };
    const remove = (index: number) => {
      const sources = deletedSources(list.length, index);
      const next = sources.map((source) => list[source]);
      const nextIndex = next.length ? Math.min(index, next.length - 1) : -1;
      onMutateRepeated({ key: fieldKey, next, sources, selectField: nextIndex >= 0 ? `${fieldKey}-${nextIndex}-container` : null });
    };
    const add = () => {
      const sources = appendedSources(list.length);
      onMutateRepeated({ key: fieldKey, next: [...list, { title: 'Nuevo', text: 'Describe este elemento.' }], sources, selectField: `${fieldKey}-${list.length}-container` });
    };

    return (
      <div>
        <label className={labelCls}>{title}</label>
        <div className="space-y-2">
          {list.map((item, index) => {
            const titleField = `${fieldKey}-${index}-title`;
            const textField = `${fieldKey}-${index}-text`;
            const containerField = `${fieldKey}-${index}-container`;
            const selected = selectedField === titleField || selectedField === textField || selectedField === containerField;
            return (
              <div key={index} className={`rounded-xl border bg-black/25 p-2.5 ${selected ? 'border-violet-300/35' : 'border-white/8'}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => onSelect(containerField)} className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] ${selectedField === containerField ? 'border-violet-300/40 bg-violet-300/10 text-violet-100' : 'border-white/8 text-white/35'}`}>Tarjeta {index + 1}</button>
                  <div className="flex gap-1">
                    <MiniButton label="Subir" disabled={index === 0} onClick={() => move(index, -1)}><ChevronUp className="h-3.5 w-3.5" /></MiniButton>
                    <MiniButton label="Bajar" disabled={index === list.length - 1} onClick={() => move(index, 1)}><ChevronDown className="h-3.5 w-3.5" /></MiniButton>
                    <MiniButton label="Duplicar" onClick={() => duplicateItem(index)}><Copy className="h-3.5 w-3.5" /></MiniButton>
                    <MiniButton label="Eliminar" danger onClick={() => remove(index)}><X className="h-3.5 w-3.5" /></MiniButton>
                  </div>
                </div>
                <input onFocus={() => onSelect(titleField)} className={inputCls} value={typeof item.title === 'string' ? item.title : ''} placeholder="Título" onChange={(event) => onChange(list.map((current, i) => i === index ? { ...current, title: event.target.value } : current))} />
                <textarea onFocus={() => onSelect(textField)} className={`${inputCls} mt-2 min-h-20 resize-y`} value={typeof item.text === 'string' ? item.text : ''} placeholder="Texto" onChange={(event) => onChange(list.map((current, i) => i === index ? { ...current, text: event.target.value } : current))} />
              </div>
            );
          })}
          <button type="button" onClick={add} className="text-[10px] font-black text-[#FFB000]">+ Añadir elemento</button>
        </div>
      </div>
    );
  }

  return null;
}

function MiniButton({ label, children, onClick, disabled = false, danger = false }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`grid h-8 min-w-8 place-items-center rounded-lg border transition disabled:opacity-20 ${danger ? 'border-red-400/15 text-red-200/55 hover:bg-red-400/8' : 'border-white/8 text-white/38 hover:border-white/20 hover:text-white/70'}`}>{children}</button>;
}

function editableTokens(content: Record<string, unknown>) {
  const result: Array<{ field: string; label: string; kind: 'element' | 'container' }> = [];
  for (const [key, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      if (!/(Href|href|url)$/i.test(key)) result.push({ field: key, label: pretty(key), kind: 'element' });
      continue;
    }
    if (!Array.isArray(value)) continue;
    if (value.every((item) => typeof item === 'string')) {
      value.forEach((_, index) => {
        result.push({ field: `${key}-${index}-container`, label: `${pretty(key)} ${index + 1} · caja`, kind: 'container' });
        result.push({ field: `${key}-${index}`, label: `${pretty(key)} ${index + 1} · texto`, kind: 'element' });
      });
      continue;
    }
    value.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      const row = item as Record<string, unknown>;
      result.push({ field: `${key}-${index}-container`, label: `${pretty(key)} ${index + 1} · tarjeta`, kind: 'container' });
      if (typeof row.title === 'string') result.push({ field: `${key}-${index}-title`, label: `${pretty(key)} ${index + 1} · título`, kind: 'element' });
      if (typeof row.text === 'string') result.push({ field: `${key}-${index}-text`, label: `${pretty(key)} ${index + 1} · texto`, kind: 'element' });
    });
  }
  return result;
}

function containerFromField(content: Record<string, unknown>, field: string): string | null {
  const clean = field.endsWith('-container') ? field.slice(0, -'-container'.length) : field;
  const objectPath = clean.match(/^(.+)-(\d+)-(title|text|label|number)$/);
  if (objectPath) {
    const [, key, rawIndex] = objectPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && index >= 0 && index < list.length) return `${key}-${index}`;
  }
  const listPath = clean.match(/^(.+)-(\d+)$/);
  if (listPath) {
    const [, key, rawIndex] = listPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && index >= 0 && index < list.length) return `${key}-${index}`;
  }
  return null;
}

function getContentFieldValue(content: Record<string, unknown>, field: string): unknown {
  if (typeof content[field] === 'string') return content[field];
  const objectPath = field.match(/^(.+)-(\d+)-(title|text)$/);
  if (objectPath) {
    const [, key, rawIndex, prop] = objectPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && list[index] && typeof list[index] === 'object' && !Array.isArray(list[index])) return (list[index] as Record<string, unknown>)[prop];
  }
  const stringPath = field.match(/^(.+)-(\d+)$/);
  if (stringPath) {
    const [, key, rawIndex] = stringPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && typeof list[index] === 'string') return list[index];
  }
  return undefined;
}

function patchContentField(content: Record<string, unknown>, field: string, value: string): Record<string, unknown> {
  if (typeof content[field] === 'string') return { ...content, [field]: value };
  const objectPath = field.match(/^(.+)-(\d+)-(title|text)$/);
  if (objectPath) {
    const [, key, rawIndex, prop] = objectPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && list[index] && typeof list[index] === 'object' && !Array.isArray(list[index])) {
      const next = [...list];
      next[index] = { ...(next[index] as Record<string, unknown>), [prop]: value };
      return { ...content, [key]: next };
    }
  }
  const stringPath = field.match(/^(.+)-(\d+)$/);
  if (stringPath) {
    const [, key, rawIndex] = stringPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && typeof list[index] === 'string') {
      const next = [...list];
      next[index] = value;
      return { ...content, [key]: next };
    }
  }
  return content;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return <div><label className={labelCls}>{label}</label><div className="flex gap-2"><input type="color" value={safe} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 rounded-lg border border-white/10 bg-black p-1" /><input className={inputCls} value={value} onChange={(event) => onChange(event.target.value)} /></div></div>;
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <div><label className={labelCls}>{label}</label><input type="number" className={inputCls} min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || 0)))} /></div>;
}

function RangeField({ label, value, min, max, suffix = '', onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  const safe = Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  return <div><div className="mb-1.5 flex items-center justify-between"><label className="text-[9px] font-black uppercase tracking-[.17em] text-[#FFB000]/70">{label}</label><span className="text-[9px] font-bold text-white/35">{Math.round(safe)}{suffix}</span></div><input type="range" min={min} max={max} step="1" value={safe} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#FFB000]" /></div>;
}

function pretty(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase()).trim();
}

function prettyField(field: string) {
  const objectPath = field.match(/^(.+)-(\d+)-(title|text|label|number)$/);
  if (objectPath) {
    const labels: Record<string, string> = { title: 'Título', text: 'Texto', label: 'Etiqueta', number: 'Número' };
    return `${pretty(objectPath[1])} · ${Number(objectPath[2]) + 1} · ${labels[objectPath[3]] || pretty(objectPath[3])}`;
  }
  const stringPath = field.match(/^(.+)-(\d+)$/);
  if (stringPath) return `${pretty(stringPath[1])} · ${Number(stringPath[2]) + 1}`;
  return pretty(field);
}
