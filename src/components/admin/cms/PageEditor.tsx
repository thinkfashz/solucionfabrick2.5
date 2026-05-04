'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Loader2, Save, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, ImagePlus,
  Settings, Map, Monitor, ExternalLink, RefreshCw, Smartphone, Tablet, Plus,
  CheckCircle2, AlertCircle, Edit3, BookOpen, Code,
} from 'lucide-react';
import { MediaPicker } from '@/components/admin/cms/MediaPicker';

const KINDS = [
  { value: 'banner', label: 'Banner promocional' },
  { value: 'cta', label: 'Llamado a la acción (CTA)' },
  { value: 'hero', label: 'Hero / Portada' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'productos', label: 'Productos destacados' },
  { value: 'trayectoria', label: 'Trayectoria' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'galeria', label: 'Galería' },
  { value: 'custom', label: 'Personalizado' },
] as const;

interface Section {
  id: string;
  kind: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  link_label?: string | null;
  position: number;
  visible: boolean;
  data?: Record<string, unknown>;
}

export interface PageEditorSettingDef {
  /** Setting key in `configuracion`. */
  key: string;
  /** Label shown to the editor. */
  label: string;
  /** Optional helper text. */
  hint?: string;
  /** When true, render as a media picker (image URL). */
  image?: boolean;
  /** Optional textarea instead of single-line input. */
  multiline?: boolean;
}

export interface PageEditorStaticNode {
  /** Friendly label, e.g. `<Hero />`. */
  label: string;
  /** Path to source file for the structure tab. */
  path: string;
  description: string;
  tag?: string;
  /** Settings keys this static component reads from `configuracion`, used to
   *  jump from the structure tab to the relevant input in the editor tab. */
  settingKeys?: string[];
  /** TSX / code snippet shown in the Guía tab. */
  codePreview?: string;
  /** Step-by-step instructions for admins. */
  guideSteps?: string[];
}

export interface PageEditorProps {
  /** Discriminator persisted in `home_sections.page`. */
  page: 'home' | 'tienda';
  /** Title shown above the tabs. */
  title: string;
  /** Subtitle shown above the tabs. */
  subtitle: string;
  /** Public URL the iframe should load (without query string). */
  previewPath: string;
  /** Settings groups (each rendered in its own card on the Editor tab). */
  settingGroups: Array<{
    title: string;
    icon?: 'settings';
    fields: PageEditorSettingDef[];
  }>;
  /** Static (code-rendered) components, shown on the Structure tab. */
  staticNodes: PageEditorStaticNode[];
}

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: number } | { kind: 'error'; message: string };

const TEXT_DEBOUNCE_MS = 400;
const PREVIEW_RELOAD_DEBOUNCE_MS = 600;

export function PageEditor({ page, title, subtitle, previewPath, settingGroups, staticNodes }: PageEditorProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [pickerFor, setPickerFor] = useState<null | { kind: 'section'; id: string } | { kind: 'setting'; key: string }>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'estructura' | 'guia'>('editor');
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [previewToken, setPreviewToken] = useState<number>(() => Date.now());
  const focusFieldRef = useRef<string | null>(null);

  const allSettingKeys = useMemo(
    () => settingGroups.flatMap((g) => g.fields.map((f) => f.key)),
    [settingGroups],
  );

  const sectionsApi = `/api/admin/home/sections?page=${encodeURIComponent(page)}`;

  const loadSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(sectionsApi, { cache: 'no-store' });
      const json = (await res.json()) as { sections?: Section[]; error?: string; hint?: string };
      if (!res.ok) throw new Error(json.error ? `${json.error}${json.hint ? ` — ${json.hint}` : ''}` : `HTTP ${res.status}`);
      setSections(json.sections ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, [sectionsApi]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const json = (await res.json()) as { settings?: Record<string, string>; error?: string };
      if (res.ok) setSettings(json.settings ?? {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { loadSections(); loadSettings(); }, [loadSections, loadSettings]);

  // Debounced preview reload after any successful mutation.
  const previewReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePreviewReload = useCallback(() => {
    if (previewReloadTimer.current) clearTimeout(previewReloadTimer.current);
    previewReloadTimer.current = setTimeout(() => {
      setPreviewToken(Date.now());
    }, PREVIEW_RELOAD_DEBOUNCE_MS);
  }, []);

  const markSaving = useCallback(() => setSaveState({ kind: 'saving' }), []);
  const markSaved = useCallback(() => {
    setSaveState({ kind: 'saved', at: Date.now() });
    schedulePreviewReload();
  }, [schedulePreviewReload]);
  const markError = useCallback((msg: string) => setSaveState({ kind: 'error', message: msg }), []);

  // ── Section CRUD ─────────────────────────────────────────────────────────
  async function addSection(kind: string) {
    setAdding(true);
    markSaving();
    try {
      const res = await fetch(sectionsApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title: 'Nueva sección', visible: true, page }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await loadSections();
      markSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al añadir.';
      setError(msg);
      markError(msg);
    } finally {
      setAdding(false);
    }
  }

  // Per-section text debounce timers, keyed by `${id}:${field}`.
  type TimerHandle = ReturnType<typeof setTimeout>;
  const textTimers = useRef<Record<string, TimerHandle>>({});

  const persistSection = useCallback(
    async (id: string, patch: Partial<Section>) => {
      markSaving();
      try {
        const res = await fetch(`/api/admin/home/sections/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patch, page }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        markSaved();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al guardar.';
        setError(msg);
        markError(msg);
        await loadSections();
      }
    },
    [loadSections, markSaving, markSaved, markError, page],
  );

  /** Optimistic update + immediate persist (used for non-text patches such as
   *  visibility toggles, image picker, position). */
  const updateSection = useCallback(
    (id: string, patch: Partial<Section>) => {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      persistSection(id, patch);
    },
    [persistSection],
  );

  /** Optimistic update + debounced persist (used for text inputs). */
  const updateSectionDebounced = useCallback(
    (id: string, patch: Partial<Section>) => {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      const fieldKey = `${id}:${Object.keys(patch).join(',')}`;
      const existing = textTimers.current[fieldKey];
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        persistSection(id, patch);
        delete textTimers.current[fieldKey];
      }, TEXT_DEBOUNCE_MS);
      textTimers.current[fieldKey] = t;
    },
    [persistSection],
  );

  async function deleteSection(id: string) {
    if (!confirm('¿Eliminar esta sección?')) return;
    markSaving();
    try {
      const res = await fetch(`/api/admin/home/sections/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSections((prev) => prev.filter((s) => s.id !== id));
      markSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar.';
      setError(msg);
      markError(msg);
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= sections.length) return;
    const next = [...sections];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    const reordered = next.map((s, i) => ({ ...s, position: i }));
    setSections(reordered);
    markSaving();
    try {
      const res = await fetch('/api/admin/home/sections/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map((s, i) => ({ id: s.id, position: i })), page }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      markSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al reordenar.';
      setError(msg);
      markError(msg);
      await loadSections();
    }
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  async function saveSettings() {
    setSavingSettings(true);
    setError(null);
    markSaving();
    try {
      // Filter to only the keys this editor manages; the server still
      // whitelists everything but no point sending unrelated keys.
      const payload: Record<string, string> = {};
      for (const k of allSettingKeys) {
        if (typeof settings[k] === 'string') payload[k] = settings[k];
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      markSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar.';
      setError(msg);
      markError(msg);
    } finally {
      setSavingSettings(false);
    }
  }

  // ── Iframe preview ───────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewSrc = `${previewPath}${previewPath.includes('?') ? '&' : '?'}preview=1&_=${previewToken}`;
  const viewportMaxClass = viewport === 'mobile' ? 'max-w-[390px]' : viewport === 'tablet' ? 'max-w-[768px]' : 'max-w-[1280px]';

  // Cleanup timers on unmount.
  useEffect(() => () => {
    if (previewReloadTimer.current) clearTimeout(previewReloadTimer.current);
    for (const t of Object.values(textTimers.current)) clearTimeout(t);
  }, []);

  // Focus a setting input when navigating from the structure tab.
  useEffect(() => {
    if (activeTab !== 'editor' || !focusFieldRef.current) return;
    const id = focusFieldRef.current;
    const el = document.getElementById(`setting-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLInputElement | HTMLTextAreaElement).focus();
    }
    focusFieldRef.current = null;
  }, [activeTab]);

  function jumpToSetting(key: string) {
    focusFieldRef.current = key;
    setActiveTab('editor');
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-black tracking-wide text-yellow-400">{title}</h1>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <SaveBadge state={saveState} />
      </header>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/60 p-1.5">
        <TabButton active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} icon={<Settings className="h-3.5 w-3.5" />}>Editor</TabButton>
        <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} icon={<Monitor className="h-3.5 w-3.5" />}>Vista previa</TabButton>
        <TabButton active={activeTab === 'estructura'} onClick={() => setActiveTab('estructura')} icon={<Map className="h-3.5 w-3.5" />}>Estructura</TabButton>
        <TabButton active={activeTab === 'guia'} onClick={() => setActiveTab('guia')} icon={<BookOpen className="h-3.5 w-3.5" />}>Guía</TabButton>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white" aria-label="Cerrar">×</button>
        </div>
      )}

      {/* ── EDITOR TAB ── */}
      {activeTab === 'editor' && (
        <>
          {settingGroups.map((group, gi) => (
            <section key={gi} className="space-y-3 rounded-2xl border border-white/10 bg-black/60 p-4">
              <header className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400 flex items-center gap-2">
                  <Settings className="h-4 w-4" /> {group.title}
                </h2>
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-black hover:bg-yellow-300 disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                </button>
              </header>
              <div className="grid gap-3 md:grid-cols-2">
                {group.fields.map((field) => (
                  <SettingControl
                    key={field.key}
                    field={field}
                    value={settings[field.key] ?? ''}
                    onChange={(v) => setSettings((s) => ({ ...s, [field.key]: v }))}
                    onPick={() => setPickerFor({ kind: 'setting', key: field.key })}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Sections */}
          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/60 p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400">Secciones dinámicas</h2>
                <p className="text-[11px] text-zinc-500">Cada sección visible se renderiza en orden, antes del contenido base de la página.</p>
              </div>
              <select
                aria-label="Agregar nueva sección"
                title="Agregar nueva sección"
                onChange={(e) => { if (e.target.value) { addSection(e.target.value); e.currentTarget.value = ''; } }}
                defaultValue=""
                disabled={adding}
                className="rounded-full border border-white/10 bg-black px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-400 hover:border-yellow-400/40"
              >
                <option value="" disabled>+ Nueva sección…</option>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </header>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
            ) : sections.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
                Sin secciones todavía. Añade la primera arriba.
              </p>
            ) : (
              <ul className="space-y-3">
                {sections.map((s, idx) => (
                  <SectionEditor
                    key={s.id}
                    section={s}
                    index={idx}
                    total={sections.length}
                    onUpdateText={(patch) => updateSectionDebounced(s.id, patch)}
                    onUpdateNow={(patch) => updateSection(s.id, patch)}
                    onPickImage={() => setPickerFor({ kind: 'section', id: s.id })}
                    onMove={(dir) => move(s.id, dir)}
                    onDelete={() => deleteSection(s.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <MediaPicker
            open={pickerFor !== null}
            defaultFolder={pickerFor?.kind === 'section' ? 'banners' : page === 'tienda' ? 'productos' : 'home'}
            onClose={() => setPickerFor(null)}
            onSelect={(asset) => {
              if (!pickerFor) return;
              if (pickerFor.kind === 'setting') {
                setSettings((s) => ({ ...s, [pickerFor.key]: asset.url }));
              } else {
                updateSection(pickerFor.id, { image_url: asset.url });
              }
              setPickerFor(null);
            }}
          />
        </>
      )}

      {/* ── PREVIEW TAB ── */}
      {activeTab === 'preview' && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              Vista previa real de <code className="text-yellow-400">{previewPath}</code>. Se actualiza
              automáticamente cuando guardas un cambio.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-white/10 bg-black p-1">
                <ViewportButton active={viewport === 'mobile'} onClick={() => setViewport('mobile')} icon={<Smartphone className="h-3.5 w-3.5" />} />
                <ViewportButton active={viewport === 'tablet'} onClick={() => setViewport('tablet')} icon={<Tablet className="h-3.5 w-3.5" />} />
                <ViewportButton active={viewport === 'desktop'} onClick={() => setViewport('desktop')} icon={<Monitor className="h-3.5 w-3.5" />} />
              </div>
              <button
                onClick={() => setPreviewToken(Date.now())}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40"
                title="Recargar vista previa"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Recargar
              </button>
              <a
                href={previewPath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-3">
            <div className={`mx-auto w-full ${viewportMaxClass}`}>
              <iframe
                ref={iframeRef}
                src={previewSrc}
                title={`Vista previa de ${previewPath}`}
                className="block h-[78vh] w-full rounded-lg border border-white/10 bg-white"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── STRUCTURE TAB ── */}
      {activeTab === 'estructura' && (
        <section className="space-y-3">
          <p className="text-xs text-zinc-500">
            Mapa de componentes de esta página. Los nodos estáticos son código fuente; los dinámicos viven en la tabla
            <code className="text-yellow-400"> home_sections</code> y se editan en la pestaña Editor.
          </p>

          {/* Static nodes */}
          {staticNodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Componentes estáticos</p>
              {staticNodes.map((node, idx) => (
                <StructureStaticRow key={idx} node={node} settingValues={settings} onJump={jumpToSetting} />
              ))}
            </div>
          )}

          {/* Dynamic sections */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Secciones dinámicas ({sections.length})
            </p>
            {sections.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">
                Sin secciones. Vuelve al Editor para añadir.
              </p>
            ) : (
              sections.map((s, idx) => (
                <StructureDynamicRow
                  key={s.id}
                  section={s}
                  index={idx}
                  total={sections.length}
                  onMove={(dir) => move(s.id, dir)}
                  onToggle={() => updateSection(s.id, { visible: !s.visible })}
                  onEdit={() => setActiveTab('editor')}
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* ── GUÍA TAB ── */}
      {activeTab === 'guia' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3">
            <p className="text-xs leading-relaxed text-zinc-300">
              <span className="font-bold text-yellow-400">Guía rápida</span> — Cada tarjeta explica qué hace el componente,
              cómo editarlo paso a paso y muestra el código de referencia. Haz clic en un chip{' '}
              <code className="rounded bg-yellow-400/15 px-1 text-yellow-300">clave</code> para saltar al campo en la pestaña Editor.
            </p>
          </div>
          {staticNodes.map((node, idx) => (
            <GuideCard key={idx} node={node} onJump={jumpToSetting} />
          ))}
        </section>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${active ? 'bg-yellow-400 text-black shadow' : 'text-zinc-400 hover:text-white'}`}
    >
      {icon} {children}
    </button>
  );
}

function ViewportButton({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 w-9 items-center justify-center rounded-full text-xs ${active ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'}`}
    >
      {icon}
    </button>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state.kind === 'idle') {
    return <span className="rounded-full border border-white/10 bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Sin cambios</span>;
  }
  if (state.kind === 'saving') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300">
        <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
      </span>
    );
  }
  if (state.kind === 'saved') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-green-300">
        <CheckCircle2 className="h-3 w-3" /> Guardado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300" title={state.message}>
      <AlertCircle className="h-3 w-3" /> Error
    </span>
  );
}

function SettingControl({ field, value, onChange, onPick }: {
  field: PageEditorSettingDef;
  value: string;
  onChange: (v: string) => void;
  onPick: () => void;
}) {
  if (field.image) {
    return (
      <div className="md:col-span-2">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{field.label}</span>
        <div className="flex items-center gap-3">
          {value ? (
            <img src={value} alt="" className="h-20 w-32 rounded-lg border border-white/10 object-cover" />
          ) : (
            <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-white/15 text-zinc-600 text-[10px]">Sin imagen</div>
          )}
          <button
            type="button"
            onClick={onPick}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40"
          >
            <ImagePlus className="h-3.5 w-3.5" /> {value ? 'Cambiar' : 'Elegir'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} className="text-xs text-red-300 hover:underline">Quitar</button>
          )}
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="O pega URL externa…"
          className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white"
          aria-label={field.label}
        />
        {field.hint && <span className="mt-1 block text-[10px] text-zinc-600">{field.hint}</span>}
      </div>
    );
  }
  if (field.multiline) {
    return (
      <label className="block md:col-span-2">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{field.label}</span>
        <textarea
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
        />
        {field.hint && <span className="mt-1 block text-[10px] text-zinc-600">{field.hint}</span>}
      </label>
    );
  }
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{field.label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
      />
      {field.hint && <span className="mt-1 block text-[10px] text-zinc-600">{field.hint}</span>}
    </label>
  );
}

function SectionEditor({ section, index, total, onUpdateText, onUpdateNow, onPickImage, onMove, onDelete }: {
  section: Section;
  index: number;
  total: number;
  onUpdateText: (patch: Partial<Section>) => void;
  onUpdateNow: (patch: Partial<Section>) => void;
  onPickImage: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const data = section.data ?? {};
  const dataString = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
  const setData = (patch: Record<string, unknown>) => {
    onUpdateNow({ data: { ...data, ...patch } });
  };
  const setDataDebounced = (patch: Record<string, unknown>) => {
    onUpdateText({ data: { ...data, ...patch } });
  };

  return (
    <li className="rounded-xl border border-white/10 bg-zinc-950 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">{section.kind}</span>
        <span className="text-[10px] text-zinc-500">#{index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-yellow-400 disabled:opacity-30" aria-label="Subir"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-yellow-400 disabled:opacity-30" aria-label="Bajar"><ChevronDown className="h-3.5 w-3.5" /></button>
          <button
            onClick={() => onUpdateNow({ visible: !section.visible })}
            className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40"
            title={section.visible ? 'Ocultar' : 'Mostrar'}
          >
            {section.visible ? <Eye className="h-3 w-3 text-green-400" /> : <EyeOff className="h-3 w-3 text-zinc-500" />} {section.visible ? 'Visible' : 'Oculto'}
          </button>
          <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/10" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Common fields */}
      <div className="grid gap-2 md:grid-cols-2">
        <input
          value={section.title ?? ''}
          onChange={(e) => onUpdateText({ title: e.target.value })}
          placeholder="Título"
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
        />
        <input
          value={section.subtitle ?? ''}
          onChange={(e) => onUpdateText({ subtitle: e.target.value })}
          placeholder="Subtítulo"
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
        />
        <textarea
          value={section.body ?? ''}
          onChange={(e) => onUpdateText({ body: e.target.value })}
          placeholder="Cuerpo / descripción"
          rows={2}
          className="md:col-span-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
        />
        {/* Image (skip for `custom` since it uses HTML field instead) */}
        {section.kind !== 'custom' && (
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            {section.image_url ? (
              <img src={section.image_url} alt="" className="h-16 w-24 rounded-lg border border-white/10 object-cover" />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-white/15 text-zinc-600 text-[10px]">Sin imagen</div>
            )}
            <button
              type="button"
              onClick={onPickImage}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40"
            >
              <ImagePlus className="h-3.5 w-3.5" /> {section.image_url ? 'Cambiar' : 'Elegir imagen'}
            </button>
            {section.image_url && (
              <button type="button" onClick={() => onUpdateNow({ image_url: null })} className="text-xs text-red-300 hover:underline">Quitar</button>
            )}
          </div>
        )}
        <input
          value={section.link_url ?? ''}
          onChange={(e) => onUpdateText({ link_url: e.target.value })}
          placeholder="URL del botón (opcional)"
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
        />
        <input
          value={section.link_label ?? ''}
          onChange={(e) => onUpdateText({ link_label: e.target.value })}
          placeholder="Texto del botón (opcional)"
          className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
        />
      </div>

      {/* Specialized data.* editors per kind */}
      {section.kind === 'hero' && (
        <details className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3" open>
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Opciones avanzadas (hero)</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <DataInput label="Badge superior" value={dataString('badge')} onChange={(v) => setDataDebounced({ badge: v })} />
          </div>
        </details>
      )}

      {section.kind === 'cta' && (
        <details className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3" open>
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Opciones avanzadas (CTA)</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Estilo del botón</span>
              <select
                aria-label="Estilo del botón CTA"
                title="Estilo del botón CTA"
                value={dataString('cta_style') || 'solid'}
                onChange={(e) => setData({ cta_style: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
              >
                <option value="solid">Sólido (amarillo)</option>
                <option value="outline">Contorno</option>
              </select>
            </label>
          </div>
        </details>
      )}

      {section.kind === 'banner' && (
        <details className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3" open>
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Opciones avanzadas (banner)</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <DataInput label="Color de fondo (CSS)" value={dataString('bg_color')} onChange={(v) => setDataDebounced({ bg_color: v })} placeholder="#000000 o linear-gradient(...)" />
          </div>
        </details>
      )}

      {section.kind === 'galeria' && (
        <GalleryEditor
          images={(data.images as Array<{ url: string; alt?: string }> | undefined) ?? []}
          columns={Number(data.columns ?? 3)}
          onChange={(images, columns) => setData({ images, columns })}
        />
      )}

      {section.kind === 'custom' && (
        <details className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3" open>
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">HTML personalizado</summary>
          <textarea
            value={dataString('html')}
            onChange={(e) => setDataDebounced({ html: e.target.value })}
            rows={6}
            placeholder="<div>HTML inline...</div>"
            className="mt-3 w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white"
          />
          <p className="mt-1 text-[10px] text-zinc-600">Se inyecta directo en la página. Sólo disponible para administradores.</p>
        </details>
      )}
    </li>
  );
}

function DataInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
      />
    </label>
  );
}

function GalleryEditor({ images, columns, onChange }: {
  images: Array<{ url: string; alt?: string }>;
  columns: number;
  onChange: (images: Array<{ url: string; alt?: string }>, columns: number) => void;
}) {
  return (
    <details className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3" open>
      <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Imágenes de galería ({images.length})</summary>
      <div className="mt-3 space-y-2">
        <label className="block max-w-xs">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Columnas</span>
          <select
            aria-label="Columnas de la galería"
            title="Columnas de la galería"
            value={String(columns)}
            onChange={(e) => onChange(images, Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
        <ul className="space-y-2">
          {images.map((img, idx) => (
            <li key={idx} className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-950 p-2">
              {img.url ? (
                <img src={img.url} alt={img.alt ?? ''} className="h-10 w-14 rounded border border-white/10 object-cover" />
              ) : (
                <div className="h-10 w-14 rounded border border-dashed border-white/15" />
              )}
              <input
                value={img.url}
                onChange={(e) => {
                  const next = [...images];
                  next[idx] = { ...next[idx], url: e.target.value };
                  onChange(next, columns);
                }}
                placeholder="URL de imagen"
                className="flex-1 rounded border border-white/10 bg-black px-2 py-1 text-xs text-white"
              />
              <input
                value={img.alt ?? ''}
                onChange={(e) => {
                  const next = [...images];
                  next[idx] = { ...next[idx], alt: e.target.value };
                  onChange(next, columns);
                }}
                placeholder="alt"
                className="w-32 rounded border border-white/10 bg-black px-2 py-1 text-xs text-white"
              />
              <button
                onClick={() => {
                  const next = images.filter((_, i) => i !== idx);
                  onChange(next, columns);
                }}
                className="rounded p-1 text-red-300 hover:bg-red-500/10"
                aria-label="Eliminar imagen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => onChange([...images, { url: '', alt: '' }], columns)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40"
        >
          <Plus className="h-3 w-3" /> Añadir imagen
        </button>
      </div>
    </details>
  );
}

function StructureStaticRow({ node, settingValues, onJump }: {
  node: PageEditorStaticNode;
  settingValues: Record<string, string>;
  onJump: (key: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-sm font-bold text-white">{node.label}</code>
            {node.tag && (
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">{node.tag}</span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{node.description}</p>
          <code className="mt-1 block text-[10px] text-zinc-600">{node.path}</code>
          {node.settingKeys && node.settingKeys.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {node.settingKeys.map((k) => (
                <button
                  key={k}
                  onClick={() => onJump(k)}
                  className="flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-yellow-300 hover:bg-yellow-400/10"
                  title={settingValues[k] || '(vacío)'}
                >
                  <Edit3 className="h-2.5 w-2.5" /> {k}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StructureDynamicRow({ section, index, total, onMove, onToggle, onEdit }: {
  section: Section;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const snippet = section.title || section.subtitle || section.body || '(sin contenido)';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-3">
      {section.image_url && (
        <img src={section.image_url} alt="" className="h-10 w-14 flex-shrink-0 rounded-lg border border-white/10 object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-yellow-400">{section.kind}</span>
          <span className="text-[10px] text-zinc-500">#{index + 1}</span>
          {section.visible ? (
            <span className="flex items-center gap-1 text-[10px] text-green-400"><Eye className="h-3 w-3" /> visible</span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600"><EyeOff className="h-3 w-3" /> oculto</span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-white">{snippet}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onMove(-1)} disabled={index === 0} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-yellow-400 disabled:opacity-30" aria-label="Subir"><ChevronUp className="h-3.5 w-3.5" /></button>
        <button onClick={() => onMove(1)} disabled={index === total - 1} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-yellow-400 disabled:opacity-30" aria-label="Bajar"><ChevronDown className="h-3.5 w-3.5" /></button>
        <button onClick={onToggle} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-yellow-400" aria-label="Visibilidad">
          {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button onClick={onEdit} className="flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-yellow-300 hover:bg-yellow-400/10">
          <Edit3 className="h-3 w-3" /> Editar
        </button>
      </div>
    </div>
  );
}

// ── GuideCard — shown in the "Guía" tab ──────────────────────────────────

function GuideCard({
  node,
  onJump,
}: {
  node: PageEditorStaticNode;
  onJump: (key: string) => void;
}) {
  const [codeOpen, setCodeOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      {/* Header */}
      <div className="border-b border-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm font-bold text-yellow-400">{node.label}</code>
          {node.tag && (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              {node.tag}
            </span>
          )}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-300">{node.description}</p>
        <code className="mt-1 block text-[10px] text-zinc-600">{node.path}</code>
      </div>

      {/* Step-by-step guide */}
      {node.guideSteps && node.guideSteps.length > 0 && (
        <div className="border-b border-white/5 p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-400">
            <BookOpen className="h-3 w-3" /> Cómo editar
          </p>
          <ol className="space-y-2.5">
            {node.guideSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-[9px] font-black text-yellow-400">
                  {i + 1}
                </span>
                <span className="text-[12px] leading-relaxed text-zinc-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Editable setting key chips */}
      {node.settingKeys && node.settingKeys.length > 0 && (
        <div className="border-b border-white/5 p-4">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
            Campos editables
          </p>
          <div className="flex flex-wrap gap-1.5">
            {node.settingKeys.map((k) => (
              <button
                key={k}
                onClick={() => onJump(k)}
                title={`Ir al campo ${k} en el Editor`}
                className="flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-yellow-300 transition-colors hover:bg-yellow-400/12"
              >
                <Edit3 className="h-2.5 w-2.5" /> {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible code preview */}
      {node.codePreview && (
        <div className="p-4">
          <button
            onClick={() => setCodeOpen((v) => !v)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-yellow-400"
          >
            <Code className="h-3 w-3" />
            {codeOpen ? 'Ocultar código' : 'Ver código de referencia'}
          </button>
          {codeOpen && (
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/80 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
              <code>{node.codePreview}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
