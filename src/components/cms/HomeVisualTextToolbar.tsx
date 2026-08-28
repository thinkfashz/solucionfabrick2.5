'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Minus,
  Pencil,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';

export type PreviewTextAction =
  | 'decrease-size'
  | 'increase-size'
  | 'toggle-bold'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'inspect';

interface Props {
  sectionId: string;
  field: string;
  editable: boolean;
  onEdit: () => void;
}

export default function HomeVisualTextToolbar({ sectionId, field, editable, onEdit }: Props) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0, pointerEvents: 'none' });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>(`[data-cms-block-id="${token(sectionId)}"]`);
      setTarget(root?.querySelector<HTMLElement>(`[data-cms-field="${token(field)}"]`) || null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sectionId, field]);

  useEffect(() => {
    if (!target) return;
    const update = () => {
      const rect = target.getBoundingClientRect();
      const viewportWidth = Math.max(320, window.innerWidth);
      const width = Math.min(editable ? 304 : 264, viewportWidth - 16);
      const left = Math.max(8, Math.min(rect.right - width, viewportWidth - width - 8));
      const toolbarHeight = 42;
      const above = rect.top - toolbarHeight - 8;
      const top = above >= 8 ? above : Math.min(window.innerHeight - toolbarHeight - 8, rect.bottom + 8);
      setStyle({ position: 'fixed', left, top, width, zIndex: 2147482000, opacity: 1, pointerEvents: 'auto' });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [target, editable]);

  if (!target) return null;

  const send = (action: PreviewTextAction) => {
    const computed = window.getComputedStyle(target);
    window.parent?.postMessage({
      type: 'cms:home-text-action',
      sectionId,
      field,
      action,
      computedFontSize: Number.parseFloat(computed.fontSize) || 0,
      computedFontWeight: Number.parseInt(computed.fontWeight, 10) || 0,
    }, window.location.origin);
  };

  return createPortal(
    <div
      data-cms-toolbar="text"
      style={style}
      className="flex h-[42px] items-center justify-center gap-1 rounded-xl border border-sky-300/20 bg-[#08090A]/95 p-1 shadow-[0_18px_60px_rgba(0,0,0,.48)] backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {editable ? <ToolButton label="Editar texto" accent onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></ToolButton> : null}
      <ToolButton label="Reducir tamaño" onClick={() => send('decrease-size')}><Minus className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton label="Aumentar tamaño" onClick={() => send('increase-size')}><Plus className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton label="Alternar negrita" onClick={() => send('toggle-bold')}><Bold className="h-3.5 w-3.5" /></ToolButton>
      <span className="mx-0.5 h-5 w-px bg-white/10" />
      <ToolButton label="Alinear izquierda" onClick={() => send('align-left')}><AlignLeft className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton label="Centrar" onClick={() => send('align-center')}><AlignCenter className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton label="Alinear derecha" onClick={() => send('align-right')}><AlignRight className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton label="Inspector avanzado" accent onClick={() => send('inspect')}><SlidersHorizontal className="h-3.5 w-3.5" /></ToolButton>
    </div>,
    document.body,
  );
}

function ToolButton({ label, accent = false, onClick, children }: { label: string; accent?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition ${accent ? 'border-sky-300/25 bg-sky-300/12 text-sky-100 hover:bg-sky-300/20' : 'border-white/8 bg-white/[.04] text-white/65 hover:border-white/20 hover:bg-white/[.08]'}`}
    >
      {children}
    </button>
  );
}

function token(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}
