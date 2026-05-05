'use client';

/**
 * Enhanced Store Editor - Mejoras sobre PageEditor:
 * - Guardado automático en tiempo real (sin botón guardar)
 * - Selector visual de componentes como tarjetas
 * - Indicadores visuales de qué se está editando
 * - UI/UX mejorada con animaciones
 * - Responsivo completo mobile-first
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ImagePlus,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Settings,
  Clock,
  Zap,
  LayoutGrid,
  ListTodo,
} from 'lucide-react';

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

interface SettingDef {
  key: string;
  label: string;
  hint?: string;
  image?: boolean;
  multiline?: boolean;
}

interface EnhancedStoreEditorProps {
  page: 'home' | 'tienda';
  title: string;
  subtitle: string;
  previewPath: string;
  settingGroups: Array<{
    title: string;
    fields: SettingDef[];
  }>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type ViewMode = 'grid' | 'list';
type DeviceMode = 'mobile' | 'tablet' | 'desktop';

const KINDS = [
  { value: 'banner', label: '🎨 Banner promocional' },
  { value: 'cta', label: '🔗 Llamado a la acción' },
  { value: 'hero', label: '⭐ Hero / Portada' },
  { value: 'servicios', label: '🛠️ Servicios' },
  { value: 'productos', label: '📦 Productos' },
  { value: 'trayectoria', label: '📈 Trayectoria' },
  { value: 'tienda', label: '🛒 Tienda' },
  { value: 'galeria', label: '🖼️ Galería' },
  { value: 'custom', label: '⚙️ Personalizado' },
] as const;

const DEBOUNCE_MS = 500;

export function EnhancedStoreEditor({
  page,
  title,
  subtitle,
  previewPath,
  settingGroups,
}: EnhancedStoreEditorProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [sections, setSections] = useState<Section[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [previewToken, setPreviewToken] = useState(Date.now());
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────
  const previewSrc = `${previewPath}${previewPath.includes('?') ? '&' : '?'}preview=1&_=${previewToken}`;
  const viewportClass =
    device === 'mobile'
      ? 'max-w-[390px]'
      : device === 'tablet'
        ? 'max-w-[768px]'
        : 'max-w-full';

  // ── API Calls ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, setRes] = await Promise.all([
        fetch(`/api/admin/home/sections?page=${encodeURIComponent(page)}`),
        fetch('/api/admin/settings'),
      ]);

      if (secRes.ok) {
        const data = (await secRes.json()) as { sections: Section[] };
        setSections(data.sections ?? []);
      }

      if (setRes.ok) {
        const data = (await setRes.json()) as { settings: Record<string, string> };
        setSettings(data.settings ?? {});
      }
    } catch (e) {
      console.error('Error loading:', e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Auto-save with debounce ──────────────────────────────────────────────
  const autosaveData = useCallback(async (data: { sections?: Section[]; settings?: Record<string, string> }) => {
    try {
      setSaveState('saving');

      if (data.sections) {
        const res = await fetch(`/api/admin/home/sections/batch`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: data.sections, page }),
        });
        if (!res.ok) throw new Error(`Failed to save sections`);
      }

      if (data.settings) {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: data.settings }),
        });
        if (!res.ok) throw new Error(`Failed to save settings`);
      }

      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
      setPreviewToken(Date.now());
    } catch (e) {
      console.error('Autosave failed:', e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }, [page]);

  // Schedule autosave
  const scheduleAutosave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autosaveData({ sections, settings });
    }, DEBOUNCE_MS);
  }, [sections, settings, autosaveData]);

  // ── Section Operations ───────────────────────────────────────────────────
  const addSection = useCallback(
    (kind: string) => {
      const newSection: Section = {
        id: `sec_${Date.now()}`,
        kind,
        title: 'Nueva sección',
        subtitle: '',
        body: '',
        image_url: '',
        link_url: '',
        link_label: '',
        position: sections.length,
        visible: true,
      };
      setSections([...sections, newSection]);
      setSelectedId(newSection.id);
      setExpandedSection(newSection.id);
      scheduleAutosave();
    },
    [sections, scheduleAutosave],
  );

  const updateSection = useCallback(
    (id: string, patch: Partial<Section>) => {
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const deleteSection = useCallback(
    (id: string) => {
      if (!confirm('¿Eliminar esta sección?')) return;
      setSections((prev) => prev.filter((s) => s.id !== id));
      setSelectedId(null);
      setExpandedSection(null);
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const moveSection = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = sections.findIndex((s) => s.id === id);
      if (idx < 0 || idx + dir < 0 || idx + dir >= sections.length) return;
      const next = [...sections];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      next.forEach((s, i) => (s.position = i));
      setSections(next);
      scheduleAutosave();
    },
    [sections, scheduleAutosave],
  );

  // ── Settings Operations ──────────────────────────────────────────────────
  const updateSetting = useCallback(
    (key: string, value: string) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-3 p-3 bg-zinc-950">
      {/* LEFT: Editor Panel */}
      <aside className="w-full md:w-2/5 lg:w-[400px] flex flex-col gap-3 overflow-y-auto bg-zinc-950 rounded-2xl border border-yellow-400/10 p-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black tracking-tight text-yellow-400 truncate">{title}</h1>
              <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
            </div>
            <SaveIndicator state={saveState} />
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 rounded-lg border border-yellow-400/10 bg-black/50 p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListTodo className="w-4 h-4" /> Lista
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Grid
          </button>
        </div>

        {/* Add Section */}
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-[0.3em] text-yellow-400/80 font-bold">
            + Nueva sección
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) addSection(e.target.value);
              e.target.value = '';
            }}
            aria-label="Selecciona tipo de nueva sección"
            className="w-full rounded-lg border border-yellow-400/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/50"
          >
            <option value="" disabled>
              Selecciona tipo…
            </option>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sections */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          <label className="block text-[10px] uppercase tracking-[0.3em] text-yellow-400/80 font-bold">
            Secciones ({sections.length})
          </label>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-yellow-400/20 p-6 text-center text-xs text-zinc-500">
              Sin secciones. Añade la primera arriba.
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-2 grid-cols-2'
                  : 'space-y-2'
              }
            >
              {sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  isSelected={selectedId === section.id}
                  isExpanded={expandedSection === section.id}
                  onSelect={() => {
                    setSelectedId(section.id);
                    setExpandedSection(section.id);
                  }}
                  onUpdate={updateSection}
                  onDelete={deleteSection}
                  onMove={moveSection}
                  settingGroups={settingGroups}
                  onSettingChange={updateSetting}
                />
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="border-t border-yellow-400/10 pt-4 space-y-3">
          <label className="block text-[10px] uppercase tracking-[0.3em] text-yellow-400/80 font-bold">
            ⚙️ Configuración
          </label>
          {settingGroups.map((group, gi) => (
            <div key={gi} className="space-y-2">
              <p className="text-xs font-bold text-zinc-400">{group.title}</p>
              <div className="space-y-2">
                {group.fields.map((field) => (
                  <input
                    key={field.key}
                    placeholder={field.label}
                    value={settings[field.key] ?? ''}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                    className="w-full rounded-lg border border-yellow-400/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-yellow-400/50"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT: Preview Panel */}
      <section className="hidden md:flex md:flex-1 flex-col gap-3 rounded-2xl border border-yellow-400/10 bg-zinc-950 p-3 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 bg-black/50 rounded-lg p-3">
          <span className="text-xs text-zinc-500">Vista previa en vivo</span>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-yellow-400/20 bg-black p-1">
              {(['mobile', 'tablet', 'desktop'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                    device === d
                      ? 'bg-yellow-400 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {d === 'mobile' && <Smartphone className="w-4 h-4" />}
                  {d === 'tablet' && <Tablet className="w-4 h-4" />}
                  {d === 'desktop' && <Monitor className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPreviewToken(Date.now())}
              className="p-2 hover:bg-yellow-400/10 rounded-lg transition-all"
              title="Recargar vista previa"
              aria-label="Recargar"
            >
              <RefreshCw className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-auto rounded-xl bg-black flex items-center justify-center p-3">
          <div className={viewportClass}>
            <iframe
              ref={iframeRef}
              src={previewSrc}
              title="Vista previa"
              className="w-full h-[80vh] rounded-lg border border-yellow-400/10 bg-white"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Components ─────────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: SaveState }) {
  const config = {
    idle: { icon: <Clock className="w-3 h-3" />, text: 'Listo', color: 'text-zinc-500' },
    saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Guardando…', color: 'text-yellow-400' },
    saved: { icon: <CheckCircle2 className="w-3 h-3" />, text: 'Guardado', color: 'text-green-400' },
    error: { icon: <AlertCircle className="w-3 h-3" />, text: 'Error', color: 'text-red-400' },
  }[state];

  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

interface SectionCardProps {
  section: Section;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onUpdate: (id: string, patch: Partial<Section>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  settingGroups: any[];
  onSettingChange: (key: string, value: string) => void;
}

function SectionCard({
  section,
  isSelected,
  isExpanded,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
}: SectionCardProps) {
  const kindLabel = KINDS.find((k) => k.value === section.kind)?.label || section.kind;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'border-yellow-400/50 bg-yellow-400/10'
          : 'border-yellow-400/10 bg-black/50 hover:border-yellow-400/30'
      }`}
    >
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2" onClick={onSelect}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-yellow-400 truncate">{kindLabel}</p>
            <p className="text-xs text-zinc-400 truncate">{section.title || '(sin título)'}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(section.id, { visible: !section.visible });
              }}
              className="p-1 hover:bg-yellow-400/10 rounded transition-all"
              aria-label={section.visible ? 'Ocultar sección' : 'Mostrar sección'}
            >
              {section.visible ? (
                <Eye className="w-3 h-3 text-zinc-400" />
              ) : (
                <EyeOff className="w-3 h-3 text-zinc-600" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(section.id);
              }}
              className="p-1 hover:bg-red-500/10 rounded transition-all"
              aria-label="Eliminar sección"
            >
              <Trash2 className="w-3 h-3 text-red-400/60" />
            </button>
          </div>
        </div>

        {/* Inline Fields (when expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-yellow-400/10 pt-3 space-y-2"
            >
              {section.title !== undefined && (
                <input
                  value={section.title ?? ''}
                  onChange={(e) => onUpdate(section.id, { title: e.target.value })}
                  placeholder="Título"
                  className="w-full text-xs rounded bg-black/50 border border-yellow-400/15 px-2 py-1.5 text-white outline-none focus:border-yellow-400/50"
                />
              )}
              {section.subtitle !== undefined && (
                <input
                  value={section.subtitle ?? ''}
                  onChange={(e) => onUpdate(section.id, { subtitle: e.target.value })}
                  placeholder="Subtítulo"
                  className="w-full text-xs rounded bg-black/50 border border-yellow-400/15 px-2 py-1.5 text-white outline-none focus:border-yellow-400/50"
                />
              )}
              {section.image_url !== undefined && (
                <input
                  value={section.image_url ?? ''}
                  onChange={(e) => onUpdate(section.id, { image_url: e.target.value })}
                  placeholder="URL de imagen"
                  className="w-full text-xs rounded bg-black/50 border border-yellow-400/15 px-2 py-1.5 text-white outline-none focus:border-yellow-400/50"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Move buttons */}
        <div className="flex gap-1 text-[10px]">
          <button
            onClick={() => onMove(section.id, -1)}
            className="flex-1 py-1 rounded bg-black/50 border border-yellow-400/15 text-zinc-400 hover:border-yellow-400/30 transition-all flex items-center justify-center gap-1"
          >
            <ChevronUp className="w-3 h-3" /> Arriba
          </button>
          <button
            onClick={() => onMove(section.id, 1)}
            className="flex-1 py-1 rounded bg-black/50 border border-yellow-400/15 text-zinc-400 hover:border-yellow-400/30 transition-all flex items-center justify-center gap-1"
          >
            <ChevronDown className="w-3 h-3" /> Abajo
          </button>
        </div>
      </div>
    </motion.div>
  );
}
