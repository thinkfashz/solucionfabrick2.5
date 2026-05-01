'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, ImagePlus, Settings, Map, Monitor, ExternalLink } from 'lucide-react';
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

interface SettingsMap {
  copyright_text?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cover_url?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_tiktok?: string;
}

export function HomeAdmin() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<null | { kind: 'section'; id: string } | { kind: 'hero' }>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'estructura'>('editor');

  const loadSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/home/sections', { cache: 'no-store' });
      const json = (await res.json()) as { sections?: Section[]; error?: string; hint?: string };
      if (!res.ok) throw new Error(json.error ? `${json.error}${json.hint ? ` — ${json.hint}` : ''}` : `HTTP ${res.status}`);
      setSections(json.sections ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const json = (await res.json()) as { settings?: SettingsMap; error?: string };
      if (res.ok) setSettings(json.settings ?? {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { loadSections(); loadSettings(); }, [loadSections, loadSettings]);

  async function addSection(kind: string) {
    setAdding(true);
    try {
      const res = await fetch('/api/admin/home/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title: 'Nueva sección', visible: true }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await loadSections();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al añadir.');
    } finally {
      setAdding(false);
    }
  }

  async function updateSection(id: string, patch: Partial<Section>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try {
      const res = await fetch(`/api/admin/home/sections/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
      await loadSections();
    }
  }

  async function deleteSection(id: string) {
    if (!confirm('¿Eliminar esta sección?')) return;
    try {
      const res = await fetch(`/api/admin/home/sections/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSections((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
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
    try {
      const res = await fetch('/api/admin/home/sections/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map((s, i) => ({ id: s.id, position: i })) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reordenar.');
      await loadSections();
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setSettingsMessage('Configuración guardada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-playfair text-2xl font-black tracking-wide text-yellow-400">Pantalla principal</h1>
        <p className="text-xs text-zinc-500">
          Edita el hero, banners y secciones que ves en la landing. Reordena con ↑/↓. Cambios visibles inmediatamente en la home.
        </p>
      </header>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/60 p-1.5">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${activeTab === 'editor' ? 'bg-yellow-400 text-black shadow' : 'text-zinc-400 hover:text-white'}`}
        >
          <Settings className="h-3.5 w-3.5" /> Editor
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${activeTab === 'preview' ? 'bg-yellow-400 text-black shadow' : 'text-zinc-400 hover:text-white'}`}
        >
          <Monitor className="h-3.5 w-3.5" /> Vista previa
        </button>
        <button
          onClick={() => setActiveTab('estructura')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${activeTab === 'estructura' ? 'bg-yellow-400 text-black shadow' : 'text-zinc-400 hover:text-white'}`}
        >
          <Map className="h-3.5 w-3.5" /> Estructura
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      {/* ── EDITOR TAB ── */}
      {activeTab === 'editor' && <>
      {/* HERO + COPYRIGHT (settings) */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/60 p-4">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400 flex items-center gap-2"><Settings className="h-4 w-4" /> Hero, footer y redes</h2>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-black hover:bg-yellow-300 disabled:opacity-50"
          >
            {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
          </button>
        </header>
        {settingsMessage && <p className="text-xs text-green-300">{settingsMessage}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <SettingField label="Título del hero" value={settings.hero_title ?? ''} onChange={(v) => setSettings((s) => ({ ...s, hero_title: v }))} />
          <SettingField label="Subtítulo del hero" value={settings.hero_subtitle ?? ''} onChange={(v) => setSettings((s) => ({ ...s, hero_subtitle: v }))} />
          <div className="md:col-span-2">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Imagen de portada (hero)</span>
            <div className="flex items-center gap-3">
              {settings.hero_cover_url ? (
                <img src={settings.hero_cover_url} alt="" className="h-20 w-32 rounded-lg border border-white/10 object-cover" />
              ) : (
                <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-white/15 text-zinc-600 text-[10px]">Sin imagen</div>
              )}
              <button
                type="button"
                onClick={() => setPickerFor({ kind: 'hero' })}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40"
              >
                <ImagePlus className="h-3.5 w-3.5" /> {settings.hero_cover_url ? 'Cambiar' : 'Elegir'}
              </button>
              {settings.hero_cover_url && (
                <button type="button" onClick={() => setSettings((s) => ({ ...s, hero_cover_url: '' }))} className="text-xs text-red-300 hover:underline">Quitar</button>
              )}
            </div>
            <input
              value={settings.hero_cover_url ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, hero_cover_url: e.target.value }))}
              placeholder="O pega URL externa…"
              className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white"
            />
          </div>
          <SettingField
            label="Texto de copyright"
            hint="Usa {year} para insertar el año actual"
            value={settings.copyright_text ?? ''}
            onChange={(v) => setSettings((s) => ({ ...s, copyright_text: v }))}
          />
          <SettingField label="Facebook (URL)" value={settings.social_facebook ?? ''} onChange={(v) => setSettings((s) => ({ ...s, social_facebook: v }))} />
          <SettingField label="Instagram (URL)" value={settings.social_instagram ?? ''} onChange={(v) => setSettings((s) => ({ ...s, social_instagram: v }))} />
          <SettingField label="TikTok (URL)" value={settings.social_tiktok ?? ''} onChange={(v) => setSettings((s) => ({ ...s, social_tiktok: v }))} />
        </div>
      </section>

      {/* SECCIONES */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/60 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400">Secciones de la home</h2>
            <p className="text-[11px] text-zinc-500">Cada sección visible se renderiza en la home en el orden indicado, antes del contenido base.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              onChange={(e) => { if (e.target.value) { addSection(e.target.value); e.currentTarget.value = ''; } }}
              defaultValue=""
              disabled={adding}
              className="rounded-full border border-white/10 bg-black px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-400 hover:border-yellow-400/40"
            >
              <option value="" disabled>+ Nueva sección…</option>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
        ) : sections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
            Sin secciones todavía. Añade la primera arriba — tu home seguirá mostrando el contenido base mientras tanto.
          </p>
        ) : (
          <ul className="space-y-3">
            {sections.map((s, idx) => (
              <li key={s.id} className="rounded-xl border border-white/10 bg-zinc-950 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">{s.kind}</span>
                  <span className="text-[10px] text-zinc-500">#{idx + 1}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => move(s.id, -1)} disabled={idx === 0} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-yellow-400 disabled:opacity-30" aria-label="Subir"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(s.id, 1)} disabled={idx === sections.length - 1} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-yellow-400 disabled:opacity-30" aria-label="Bajar"><ChevronDown className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => updateSection(s.id, { visible: !s.visible })}
                      className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40"
                      title={s.visible ? 'Ocultar' : 'Mostrar'}
                    >
                      {s.visible ? <Eye className="h-3 w-3 text-green-400" /> : <EyeOff className="h-3 w-3 text-zinc-500" />} {s.visible ? 'Visible' : 'Oculto'}
                    </button>
                    <button onClick={() => deleteSection(s.id)} className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/10" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={s.title ?? ''}
                    onChange={(e) => updateSection(s.id, { title: e.target.value })}
                    placeholder="Título"
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={s.subtitle ?? ''}
                    onChange={(e) => updateSection(s.id, { subtitle: e.target.value })}
                    placeholder="Subtítulo"
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
                  />
                  <textarea
                    value={s.body ?? ''}
                    onChange={(e) => updateSection(s.id, { body: e.target.value })}
                    placeholder="Cuerpo / descripción"
                    rows={2}
                    className="md:col-span-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
                  />
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    {s.image_url ? (
                      <img src={s.image_url} alt="" className="h-16 w-24 rounded-lg border border-white/10 object-cover" />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-white/15 text-zinc-600 text-[10px]">Sin imagen</div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPickerFor({ kind: 'section', id: s.id })}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-yellow-400/40"
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> {s.image_url ? 'Cambiar' : 'Elegir imagen'}
                    </button>
                    {s.image_url && (
                      <button type="button" onClick={() => updateSection(s.id, { image_url: null })} className="text-xs text-red-300 hover:underline">Quitar</button>
                    )}
                  </div>
                  <input
                    value={s.link_url ?? ''}
                    onChange={(e) => updateSection(s.id, { link_url: e.target.value })}
                    placeholder="URL del botón (opcional)"
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={s.link_label ?? ''}
                    onChange={(e) => updateSection(s.id, { link_label: e.target.value })}
                    placeholder="Texto del botón (opcional)"
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MediaPicker
        open={pickerFor !== null}
        defaultFolder={pickerFor?.kind === 'section' ? 'banners' : 'home'}
        onClose={() => setPickerFor(null)}
        onSelect={(asset) => {
          if (!pickerFor) return;
          if (pickerFor.kind === 'hero') {
            setSettings((s) => ({ ...s, hero_cover_url: asset.url }));
          } else {
            updateSection(pickerFor.id, { image_url: asset.url });
          }
          setPickerFor(null);
        }}
      />
      </>}

      {/* ── PREVIEW TAB ── */}
      {activeTab === 'preview' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Vista previa en vivo basada en la configuración guardada. Los cambios sin guardar no se reflejan aquí hasta que pulses <strong className="text-yellow-400">Guardar</strong>.
            </p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-4 py-2 text-xs text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver sitio real
            </a>
          </div>

          {/* Hero preview card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black" style={{ minHeight: 320 }}>
            {settings.hero_cover_url ? (
              <img
                src={settings.hero_cover_url}
                alt="Portada hero"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 flex min-h-[320px] flex-col items-center justify-center px-8 py-12 text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-black/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-yellow-400/90 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                Un equipo · un estándar · una obra completa
              </span>
              <h1 className="font-playfair text-4xl font-black text-white drop-shadow-lg">
                {settings.hero_title || 'Tu Visión,'}
              </h1>
              <p className="mt-1 font-playfair text-4xl font-black text-yellow-400 drop-shadow-lg">
                Nuestra Obra
              </p>
              {settings.hero_subtitle && (
                <p className="mt-4 max-w-lg text-sm text-zinc-300">{settings.hero_subtitle}</p>
              )}
              <div className="mt-6 flex gap-3">
                <span className="rounded-full bg-yellow-400 px-6 py-2 text-xs font-bold uppercase tracking-wider text-black">Explorar Servicios</span>
                <span className="rounded-full border border-yellow-400/40 px-6 py-2 text-xs font-bold uppercase tracking-wider text-yellow-400">Ir a Tienda</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent" />
          </div>

          {/* Dynamic sections preview */}
          {sections.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Secciones dinámicas ({sections.filter((s) => s.visible).length} visibles)</p>
              {sections.filter((s) => s.visible).map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-3">
                  {s.image_url && (
                    <img src={s.image_url} alt="" className="h-12 w-16 flex-shrink-0 rounded-lg border border-white/10 object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-yellow-400">{s.kind}</span>
                    {s.title && <p className="mt-1 truncate text-xs font-bold text-white">{s.title}</p>}
                    {s.subtitle && <p className="truncate text-[10px] text-zinc-400">{s.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── ESTRUCTURA TAB ── */}
      {activeTab === 'estructura' && (
        <section className="space-y-4">
          <p className="text-xs text-zinc-500">
            Mapa de componentes de la pantalla principal. Cada entrada muestra el archivo fuente y su función en la página.
          </p>

          <div className="space-y-3">
            {/* page.tsx */}
            <StructureNode
              label="page.tsx"
              path="src/app/page.tsx"
              description="Página raíz de la home. Carga datos del CMS (settings + secciones) y compone el layout."
              tag="Server Component"
              tagColor="blue"
              children={[
                {
                  label: '<Navbar />',
                  path: 'src/components/Navbar.tsx',
                  description: 'Barra de navegación global con logo, menú y botón de WhatsApp.',
                  tag: 'Client',
                },
                {
                  label: '<Hero coverUrl={settings.hero_cover_url} />',
                  path: 'src/components/Hero.tsx',
                  description: 'Sección hero de pantalla completa con imagen de portada editable desde el admin, overlay de texto y animaciones GSAP/Framer Motion. La imagen se controla con el campo "Imagen de portada" de este editor.',
                  tag: 'Client',
                  highlight: true,
                },
                {
                  label: '<HomeDynamicSections sections={sections} />',
                  path: 'src/components/HomeDynamicSections.tsx',
                  description: 'Renderiza las secciones dinámicas definidas en la pestaña "Editor" de arriba. Soporta tipos: banner, cta, hero, custom y más.',
                  tag: 'Server',
                },
                {
                  label: '<LandingSections />',
                  path: 'src/components/LandingSections.tsx',
                  description: 'Secciones estáticas de la landing: servicios, galería de proyectos, beneficios, formulario de contacto y footer.',
                  tag: 'Client',
                },
              ]}
            />

            {/* CMS layer */}
            <StructureNode
              label="src/lib/cms.ts"
              path="src/lib/cms.ts"
              description="Capa de datos del CMS. getCmsSettings() lee la tabla `configuracion` (InsForge). getPublicHomeSections() lee la tabla `home_sections`. Ambas se usan en page.tsx."
              tag="Server-only"
              tagColor="zinc"
            />

            {/* Admin editor */}
            <StructureNode
              label="Admin: /admin/home"
              path="src/app/admin/home/HomeAdmin.tsx"
              description="Panel de edición de esta misma página. Guarda en la tabla `configuracion` y `home_sections` de InsForge. Los cambios se reflejan en el sitio en cada petición."
              tag="Admin"
              tagColor="yellow"
              children={[
                {
                  label: '<MediaPicker />',
                  path: 'src/components/admin/cms/MediaPicker.tsx',
                  description: 'Selector de imágenes del bucket InsForge. Permite buscar y subir imágenes para asignarlas al hero o a secciones.',
                  tag: 'Client',
                },
              ]}
            />

            {/* Medios / Cloudinary */}
            <StructureNode
              label="Admin: /admin/medios"
              path="src/app/admin/medios/MediaAdmin.tsx"
              description="Biblioteca de medios con dos tabs: InsForge (bucket media) y Cloudinary. Desde aquí se suben y copian URLs para usar en la portada o secciones."
              tag="Admin"
              tagColor="yellow"
            />
          </div>

          <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4 text-xs text-zinc-400">
            <p className="font-bold text-yellow-400 mb-2">Cómo editar la foto de portada</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Ve a <strong className="text-white">Medios</strong> → sube tu imagen a InsForge (carpeta <em>home</em>) o a Cloudinary.</li>
              <li>Copia la URL de la imagen.</li>
              <li>Regresa aquí → pestaña <strong className="text-white">Editor</strong> → sección "Hero, footer y redes".</li>
              <li>Pega la URL en el campo <em>Imagen de portada (hero)</em> o usa el botón <em>Elegir</em>.</li>
              <li>Haz clic en <strong className="text-yellow-400">Guardar</strong>. La portada cambia al instante.</li>
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}

interface StructureNodeProps {
  label: string;
  path: string;
  description: string;
  tag?: string;
  tagColor?: 'blue' | 'yellow' | 'zinc' | 'green';
  highlight?: boolean;
  children?: Array<{ label: string; path: string; description: string; tag?: string; highlight?: boolean }>;
}

function StructureNode({ label, path, description, tag, tagColor = 'zinc', highlight = false, children }: StructureNodeProps) {
  const tagClass = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    yellow: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400',
    zinc: 'border-zinc-700 bg-zinc-900 text-zinc-400',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
  }[tagColor];

  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-white/10 bg-zinc-950'}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <code className={`text-sm font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{label}</code>
            {tag && (
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${tagClass}`}>{tag}</span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">{description}</p>
          <code className="mt-1 block text-[10px] text-zinc-600">{path}</code>
        </div>
      </div>
      {children && children.length > 0 && (
        <ul className="mt-3 space-y-2 border-l-2 border-white/10 pl-4">
          {children.map((child, idx) => (
            <li key={idx} className={`rounded-xl border p-3 ${child.highlight ? 'border-yellow-400/20 bg-yellow-400/5' : 'border-white/5 bg-black/40'}`}>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <code className={`text-xs font-bold ${child.highlight ? 'text-yellow-400' : 'text-white'}`}>{child.label}</code>
                {child.tag && (
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">{child.tag}</span>
                )}
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-500">{child.description}</p>
              <code className="text-[9px] text-zinc-700">{child.path}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" />
      {hint && <span className="mt-1 block text-[10px] text-zinc-600">{hint}</span>}
    </label>
  );
}
