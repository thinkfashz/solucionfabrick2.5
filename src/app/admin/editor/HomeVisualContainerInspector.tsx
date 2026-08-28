'use client';

import { Eye, EyeOff, LayoutPanelTop, RotateCcw, X } from 'lucide-react';
import type { HomeVisualSection } from '@/lib/homeVisualCms';
import {
  clearContainerResponsive,
  clearContainerStyle,
  getContainerResponsive,
  getContainerStyle,
  patchContainerResponsive,
  patchContainerStyle,
  type VisualContainerStyle,
  type VisualResponsiveContainer,
} from '@/lib/homeVisualContainers';
import type { VisualDevice, VisualShadow } from '@/lib/homeVisualLayout';

const DEVICE_LABELS: Record<VisualDevice, string> = { mobile: 'Móvil', tablet: 'Tablet', desktop: 'PC' };
const SHADOWS: Array<{ value: VisualShadow; label: string }> = [
  { value: 'none', label: 'Sin sombra' },
  { value: 'soft', label: 'Suave' },
  { value: 'medium', label: 'Media' },
  { value: 'strong', label: 'Profunda' },
];
const inputCls = 'w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-300/55';
const labelCls = 'mb-1.5 block text-[9px] font-black uppercase tracking-[.17em] text-violet-200/65';

export default function HomeVisualContainerInspector({ section, container, device, patch, close }: {
  section: HomeVisualSection;
  container: string;
  device: VisualDevice;
  patch: (updater: (section: HomeVisualSection) => HomeVisualSection) => void;
  close?: () => void;
}) {
  const card = getContainerStyle(section.style, container);
  const responsive = getContainerResponsive(section.style, container, device);
  const setCard = <K extends keyof Omit<VisualContainerStyle, 'responsive'>>(key: K, value: VisualContainerStyle[K]) => patch((current) => ({ ...current, style: patchContainerStyle(current.style, container, key, value) }));
  const setResponsive = <K extends keyof VisualResponsiveContainer>(key: K, value: VisualResponsiveContainer[K]) => patch((current) => ({ ...current, style: patchContainerResponsive(current.style, container, device, key, value) }));
  const resetDevice = () => patch((current) => ({ ...current, style: clearContainerResponsive(current.style, container, device) }));
  const resetAll = () => patch((current) => ({ ...current, style: clearContainerStyle(current.style, container) }));

  return (
    <div className="rounded-2xl border border-violet-300/25 bg-violet-300/[.055] p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-300/10 text-violet-100"><LayoutPanelTop className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[.15em] text-violet-200/55">Contenedor seleccionado</p>
          <b className="block truncate text-sm text-violet-50">{prettyContainer(container)}</b>
        </div>
        {close ? <button type="button" onClick={close} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/40"><X className="h-3.5 w-3.5" /></button> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ColorField label="Fondo" value={card.background || section.style.background || '#08090A'} onChange={(value) => setCard('background', value)} />
        <ColorField label="Texto heredado" value={card.color || section.style.textColor || '#FFF9EE'} onChange={(value) => setCard('color', value)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumberField label="Borde px" value={Number(card.borderWidth ?? 0)} min={0} max={16} onChange={(value) => setCard('borderWidth', value)} />
        <NumberField label="Radio px" value={Number(card.borderRadius ?? 0)} min={0} max={96} onChange={(value) => setCard('borderRadius', value)} />
      </div>
      {Number(card.borderWidth ?? 0) > 0 ? <div className="mt-3"><ColorField label="Color del borde" value={card.borderColor || '#FFFFFF'} onChange={(value) => setCard('borderColor', value)} /></div> : null}
      <div className="mt-3"><label className={labelCls}>Sombra</label><select className={inputCls} value={card.shadow || 'none'} onChange={(event) => setCard('shadow', event.target.value as VisualShadow)}>{SHADOWS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>

      <div className="mt-4 border-t border-violet-200/10 pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-violet-200/50">Caja · {DEVICE_LABELS[device]}</p>
          <button type="button" onClick={() => setResponsive('hidden', responsive.hidden !== true)} className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-black ${responsive.hidden ? 'border-red-300/25 bg-red-300/8 text-red-100' : 'border-white/10 text-white/42'}`}>
            {responsive.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{responsive.hidden ? 'Oculta' : 'Visible'}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumberField label="Padding arriba" value={Number(responsive.paddingTop ?? 0)} min={0} max={320} onChange={(value) => setResponsive('paddingTop', value)} />
          <NumberField label="Padding abajo" value={Number(responsive.paddingBottom ?? 0)} min={0} max={320} onChange={(value) => setResponsive('paddingBottom', value)} />
          <NumberField label="Padding lateral" value={Number(responsive.paddingInline ?? 0)} min={0} max={180} onChange={(value) => setResponsive('paddingInline', value)} />
          <NumberField label="Separación interna" value={Number(responsive.gap ?? 0)} min={0} max={120} onChange={(value) => setResponsive('gap', value)} />
          <NumberField label="Margen arriba" value={Number(responsive.marginTop ?? 0)} min={-160} max={320} onChange={(value) => setResponsive('marginTop', value)} />
          <NumberField label="Margen abajo" value={Number(responsive.marginBottom ?? 0)} min={-160} max={320} onChange={(value) => setResponsive('marginBottom', value)} />
          <NumberField label="Altura mínima" value={Number(responsive.minHeight ?? 0)} min={0} max={1200} step={10} onChange={(value) => setResponsive('minHeight', value)} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={resetDevice} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[9px] font-black text-white/40"><RotateCcw className="h-3 w-3" /> Reset {DEVICE_LABELS[device]}</button>
        <button type="button" onClick={resetAll} className="rounded-full border border-red-400/15 px-3 py-2 text-[9px] font-black text-red-200/45">Reset tarjeta</button>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return <div><label className={labelCls}>{label}</label><div className="flex gap-2"><input type="color" value={safe} onChange={(event) => onChange(event.target.value)} className="h-10 w-11 shrink-0 rounded-lg border border-white/10 bg-black p-1" /><input className={inputCls} value={value} onChange={(event) => onChange(event.target.value)} /></div></div>;
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <div><label className={labelCls}>{label}</label><input type="number" className={inputCls} min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || 0)))} /></div>;
}

function prettyContainer(value: string) {
  const match = value.match(/^(.+)-(\d+)$/);
  if (!match) return value.replace(/[-_]/g, ' ');
  return `${match[1].replace(/[-_]/g, ' ')} · tarjeta ${Number(match[2]) + 1}`;
}
