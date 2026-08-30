'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { HOME_VISUAL_BLOCK_TEMPLATES, isHomeVisualLibraryBlockId } from '@/lib/homeVisualBlockLibrary';

type Rect = { top: number; left: number; width: number; height: number };

function rectOf(element: HTMLElement | null): Rect | null {
  if (!element?.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function isEditorUi(element: Element | null) {
  return Boolean(element?.closest('[data-cms-editor-ignore]'));
}

export default function VisualCmsBlockLibraryOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [section, setSection] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let active = false;
    try {
      const params = new URLSearchParams(window.location.search);
      active = params.get('cmsVisual') === '1' && window.parent !== window && window.location.pathname === '/';
    } catch { /* noop */ }
    setEnabled(active);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setRect(rectOf(section)));
    };
    const select = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || isEditorUi(target)) return;
      const block = target.closest<HTMLElement>('[data-cms-block-id]');
      if (!block) return;
      setSection(block);
      setOpen(false);
      setConfirmRemove(false);
      window.requestAnimationFrame(() => setRect(rectOf(block)));
    };
    document.addEventListener('click', select, true);
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('scroll', update, true);
    update();
    return () => {
      document.removeEventListener('click', select, true);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, section]);

  if (!enabled || !section || !rect || typeof document === 'undefined') return null;

  const sectionId = section.dataset.cmsBlockId || '';
  if (!sectionId) return null;
  const removable = isHomeVisualLibraryBlockId(sectionId);

  const mobile = window.innerWidth < 640;
  const actionWidth = removable ? 196 : 110;
  const buttonLeft = mobile
    ? Math.max(8, (window.innerWidth - actionWidth) / 2)
    : Math.max(8, Math.min(window.innerWidth - actionWidth - 8, rect.left + rect.width - actionWidth));
  const buttonTop = Math.max(8, Math.min(window.innerHeight - 42, rect.top + rect.height - 18));

  const insert = (templateId: string) => {
    window.parent.postMessage({
      type: 'cms:visual-home-insert-block',
      templateId,
      afterSectionId: sectionId,
    }, window.location.origin);
    setOpen(false);
    setConfirmRemove(false);
  };

  const remove = () => {
    if (!removable) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    window.parent.postMessage({ type: 'cms:visual-home-remove-block', sectionId }, window.location.origin);
    setOpen(false);
    setConfirmRemove(false);
    setSection(null);
    setRect(null);
  };

  const panelStyle: CSSProperties = mobile
    ? { left: 8, right: 8, bottom: 8, maxHeight: '72vh' }
    : {
      width: 430,
      maxHeight: 'min(620px, 76vh)',
      left: Math.max(8, Math.min(window.innerWidth - 438, rect.left + rect.width - 430)),
      top: buttonTop > 330 ? Math.max(8, buttonTop - Math.min(500, window.innerHeight * 0.72)) : Math.max(8, Math.min(window.innerHeight - 360, buttonTop + 44)),
    };

  return createPortal(
    <div data-cms-editor-ignore="true" className="pointer-events-none fixed inset-0 z-[2147483100] font-sans">
      <div
        className="pointer-events-auto absolute flex h-9 items-center overflow-hidden rounded-full border border-[#ffb000]/45 bg-[#15140f]/95 shadow-[0_12px_36px_rgba(0,0,0,.3)] backdrop-blur-xl"
        style={{ left: buttonLeft, top: buttonTop, width: actionWidth }}
      >
        <button
          type="button"
          onClick={() => { setOpen((value) => !value); setConfirmRemove(false); }}
          className="h-full flex-1 px-3 text-[9px] font-black uppercase tracking-[.08em] text-[#ffd77a]"
          title="Insertar un bloque después de esta sección"
        >
          + Bloque
        </button>
        {removable ? (
          <button
            type="button"
            onClick={remove}
            className={`h-full border-l px-2.5 text-[8px] font-black uppercase tracking-[.06em] ${confirmRemove ? 'border-red-300/30 bg-red-400/15 text-red-200' : 'border-white/10 text-white/40'}`}
            title={confirmRemove ? 'Pulsa otra vez para confirmar' : 'Eliminar este bloque de la biblioteca'}
          >
            {confirmRemove ? 'Confirmar' : 'Eliminar'}
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          className="pointer-events-auto absolute overflow-hidden rounded-2xl border border-white/10 bg-[#11110e]/[.98] text-[#fff8e9] shadow-[0_28px_90px_rgba(0,0,0,.5)] backdrop-blur-xl"
          style={panelStyle}
        >
          <div className="flex items-start gap-3 border-b border-white/8 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[.15em] text-[#ffb000]/65">Biblioteca de bloques</p>
              <h3 className="mt-1 text-sm font-black">Añadir después de esta sección</h3>
              <p className="mt-1 text-[9px] leading-4 text-white/35">Se guarda primero en el borrador estructural. Nada se publica hasta usar “Publicar estructura”.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-sm text-white/50">×</button>
          </div>
          <div className="max-h-[calc(72vh-92px)] space-y-2 overflow-y-auto p-3">
            {HOME_VISUAL_BLOCK_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => insert(template.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3 text-left transition hover:border-[#ffb000]/30 hover:bg-[#ffb000]/[.06]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ffb000]/15 bg-[#ffb000]/8 text-base font-black text-[#ffd77a]">{template.icon}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[11px] font-black text-white/85">{template.label}</b>
                  <span className="mt-1 block text-[9px] leading-4 text-white/35">{template.description}</span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[8px] font-black text-white/40 group-hover:border-[#ffb000]/25 group-hover:text-[#ffd77a]">Insertar</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
