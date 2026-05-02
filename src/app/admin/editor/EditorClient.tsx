'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SECTION_KEYS,
  SECTION_DEFAULTS,
  isSectionKey,
  type SectionContentMap,
  type SectionKey,
} from '@/lib/siteStructureTypes';
import { SectionForm } from '@/components/admin/editor/SectionForms';

const SECTION_LABELS: Record<SectionKey, string> = {
  'global-styles': 'Estilos globales',
  'nav-menu': 'Menú (Navbar)',
  footer: 'Footer',
  checkout: 'Checkout',
  producto: 'Página de Producto',
  'error-404': 'Error 404',
  'custom-injection': 'Inyección de código (Monaco)',
};

const PREVIEW_PATHS: Record<SectionKey, string> = {
  'global-styles': '/?cms=preview',
  'nav-menu': '/?cms=preview',
  footer: '/?cms=preview',
  checkout: '/checkout?cms=preview',
  producto: '/tienda?cms=preview', // tienda is the lightest entry point that lists products
  'error-404': '/404-preview?cms=preview',
  'custom-injection': '/?cms=preview',
};

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

export default function EditorClient() {
  const [sectionKey, setSectionKey] = useState<SectionKey>('nav-menu');
  const [draft, setDraft] = useState<SectionContentMap[SectionKey]>(SECTION_DEFAULTS['nav-menu']);
  const [persisted, setPersisted] = useState<SectionContentMap[SectionKey]>(SECTION_DEFAULTS['nav-menu']);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Force-remount the iframe when section changes so we navigate cleanly.
  const [iframeBust, setIframeBust] = useState(0);

  // Load section from API when the picker changes.
  useEffect(() => {
    setIframeReady(false);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/site-structure/${encodeURIComponent(sectionKey)}`, {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          setDraft(SECTION_DEFAULTS[sectionKey]);
          setPersisted(SECTION_DEFAULTS[sectionKey]);
          return;
        }
        const json = (await res.json()) as { content?: unknown };
        if (cancelled) return;
        const content = (json.content as SectionContentMap[SectionKey] | undefined) ??
          SECTION_DEFAULTS[sectionKey];
        setDraft(content);
        setPersisted(content);
      } catch {
        setDraft(SECTION_DEFAULTS[sectionKey]);
        setPersisted(SECTION_DEFAULTS[sectionKey]);
      }
    })();
    setIframeBust(b => b + 1);
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  // Ship the latest draft to the iframe whenever it changes (or the iframe
  // signals it just mounted).
  const postDraft = useCallback(
    (next: unknown) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(
          { type: 'cms:preview', section_key: sectionKey, content: next },
          window.location.origin,
        );
      } catch {
        /* iframe origin mismatch — happens between navigations */
      }
    },
    [sectionKey],
  );

  useEffect(() => {
    if (!iframeReady) return;
    postDraft(draft);
  }, [draft, iframeReady, postDraft]);

  // Listen for the iframe's "ready" handshake.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data && data.type === 'cms:preview-ready') {
        setIframeReady(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/site-structure/${encodeURIComponent(sectionKey)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
        setStatusMsg(`Error al guardar: ${errMsg}`);
        return;
      }
      setPersisted(draft);
      setStatusMsg('Guardado.');
      // Refresh the iframe so the production-rendered content reflects the
      // new persisted state (no more postMessage overlay needed).
      setIframeBust(b => b + 1);
    } catch (e) {
      setStatusMsg(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(persisted);
    setStatusMsg('Cambios descartados.');
  };

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(persisted),
    [draft, persisted],
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-3 md:flex-row">
      {/* Left: form */}
      <aside className="flex w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-yellow-400/10 bg-zinc-950 p-4 md:max-w-md">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-400/80">Editor universal</p>
          <h1 className="text-lg font-black tracking-tight">Selecciona una sección</h1>
        </div>
        <select
          value={sectionKey}
          onChange={e => {
            const k = e.target.value;
            if (isSectionKey(k)) setSectionKey(k);
          }}
          className="rounded-lg border border-yellow-400/20 bg-black px-3 py-2 text-sm"
        >
          {SECTION_KEYS.map(k => (
            <option key={k} value={k}>{SECTION_LABELS[k]}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="rounded-full bg-yellow-400 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty}
            className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-300 disabled:opacity-40"
          >
            Descartar
          </button>
          {statusMsg && (
            <span className="ml-auto text-[10px] uppercase tracking-widest text-zinc-400">
              {statusMsg}
            </span>
          )}
        </div>

        <div className="rounded-xl border border-yellow-400/5 bg-black/50 p-1 text-xs">
          <SectionForm sectionKey={sectionKey} value={draft} onChange={setDraft} />
        </div>
      </aside>

      {/* Right: live preview iframe */}
      <section className="flex flex-1 flex-col rounded-2xl border border-yellow-400/10 bg-zinc-950 p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-yellow-400/80">Vista previa en vivo</span>
          <div className="ml-auto flex items-center gap-1">
            {(['mobile', 'tablet', 'desktop'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${device === d ? 'bg-yellow-400 text-black' : 'border border-yellow-400/20 text-yellow-400'}`}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIframeBust(b => b + 1)}
              className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-300"
            >
              Recargar
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl bg-black p-3">
          <iframe
            key={`${sectionKey}-${iframeBust}`}
            ref={iframeRef}
            src={PREVIEW_PATHS[sectionKey]}
            title={`Vista previa: ${SECTION_LABELS[sectionKey]}`}
            className="h-full max-h-full bg-white shadow-[0_0_60px_rgba(250,204,21,0.08)]"
            style={{ width: DEVICE_WIDTHS[device], minHeight: '100%', border: 0 }}
          />
        </div>
      </section>
    </div>
  );
}
