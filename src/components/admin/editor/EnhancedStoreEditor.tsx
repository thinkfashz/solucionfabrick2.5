'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Clock,
  LayoutGrid,
  ListTodo,
  GripVertical,
  Plus,
  Zap,
  ChevronDown,
  ChevronRight,
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
  { value: 'banner',      label: '🎨 Banner promocional' },
  { value: 'cta',         label: '🔗 Llamado a la acción' },
  { value: 'hero',        label: '⭐ Hero / Portada' },
  { value: 'servicios',   label: '🛠️ Servicios' },
  { value: 'productos',   label: '📦 Productos' },
  { value: 'trayectoria', label: '📈 Trayectoria' },
  { value: 'tienda',      label: '🛒 Tienda' },
  { value: 'galeria',     label: '🖼️ Galería' },
  { value: 'custom',      label: '⚙️ Personalizado' },
] as const;

const DEBOUNCE_MS = 500;

// ── Utility: tiny CSS toggle (Uiverse-style, adapted for the gold/black theme)
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60',
        checked
          ? 'border-yellow-400 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.45)]'
          : 'border-zinc-700 bg-zinc-800',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-3.5 w-3.5 rounded-full shadow-lg ring-0 transition-transform duration-200 mt-0.5',
          checked ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-zinc-400',
        ].join(' ')}
      />
    </button>
  );
}

export function EnhancedStoreEditor({
  page,
  title,
  subtitle,
  previewPath,
  settingGroups,
}: EnhancedStoreEditorProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [previewToken, setPreviewToken] = useState(Date.now());
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const previewSrc = `${previewPath}${previewPath.includes('?') ? '&' : '?'}preview=1&_=${previewToken}`;
  const viewportClass =
    device === 'mobile' ? 'max-w-[390px]' : device === 'tablet' ? 'max-w-[768px]' : 'max-w-full';

  // ── Data loading ────────────────────────────────────────────────────────────
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

  useEffect(() => { loadData(); }, [loadData]);

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const autosaveData = useCallback(async (data: { sections?: Section[]; settings?: Record<string, string> }) => {
    try {
      setSaveState('saving');
      if (data.sections) {
        const res = await fetch('/api/admin/home/sections/batch', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: data.sections, page }),
        });
        if (!res.ok) throw new Error('Failed to save sections');
      }
      if (data.settings) {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: data.settings }),
        });
        if (!res.ok) throw new Error('Failed to save settings');
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

  const scheduleAutosave = useCallback(
    (nextSections: Section[], nextSettings: Record<string, string>) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(
        () => autosaveData({ sections: nextSections, settings: nextSettings }),
        DEBOUNCE_MS,
      );
    },
    [autosaveData],
  );

  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }, []);

  // Listen for visual selection from the iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; id?: string };
      if (data && data.type === 'cms:select' && data.id) {
        setExpandedSection(data.id);
        const el = document.getElementById(`section-${data.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ── Section operations ──────────────────────────────────────────────────────
  const addSection = useCallback((kind: string) => {
    const newSection: Section = {
      id: `sec_${Date.now()}`,
      kind, title: 'Nueva sección', subtitle: '', body: '',
      image_url: '', link_url: '', link_label: '',
      position: sections.length, visible: true,
    };
    const next = [...sections, newSection];
    setSections(next);
    setSelectedId(newSection.id);
    setExpandedSection(newSection.id);
    setShowAddPanel(false);
    scheduleAutosave(next, settings);
  }, [sections, settings, scheduleAutosave]);

  const updateSection = useCallback((id: string, patch: Partial<Section>) => {
    setSections((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      scheduleAutosave(next, settings);
      return next;
    });
  }, [settings, scheduleAutosave]);

  const deleteSection = useCallback((id: string) => {
    if (!confirm('¿Eliminar esta sección?')) return;
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i }));
      scheduleAutosave(next, settings);
      return next;
    });
    setSelectedId(null);
    setExpandedSection(null);
  }, [settings, scheduleAutosave]);

  const updateSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      scheduleAutosave(sections, next);
      return next;
    });
  }, [sections, scheduleAutosave]);

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, position: i }));
      scheduleAutosave(next, settings);
      return next;
    });
  }, [settings, scheduleAutosave]);

  const activeDragSection = activeDragId ? sections.find((s) => s.id === activeDragId) : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-3 p-3 bg-zinc-950">
      {/* ── LEFT: Editor Panel ─────────────────────────────────────────────── */}
      <aside className="w-full md:w-2/5 lg:w-[420px] flex flex-col gap-3 overflow-y-auto bg-zinc-950 rounded-2xl border border-yellow-400/10 p-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black tracking-tight text-yellow-400 truncate">{title}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
          </div>
          <SaveIndicator state={saveState} />
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 rounded-xl border border-yellow-400/10 bg-black/60 p-1">
          {([['list', <ListTodo key="l" className="w-3.5 h-3.5" />, 'Lista'], ['grid', <LayoutGrid key="g" className="w-3.5 h-3.5" />, 'Grid']] as const).map(([m, icon, label]) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all',
                viewMode === m
                  ? 'bg-yellow-400 text-black shadow-[0_0_14px_rgba(250,204,21,0.35)]'
                  : 'text-zinc-500 hover:text-zinc-200',
              ].join(' ')}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Add Section panel */}
        <div>
          <button
            onClick={() => setShowAddPanel((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-yellow-400/20 bg-yellow-400/5 text-yellow-400 text-xs font-bold uppercase tracking-widest hover:bg-yellow-400/10 hover:border-yellow-400/40 transition-all group"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Nueva sección
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAddPanel ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showAddPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.value}
                      onClick={() => addSection(k.value)}
                      className="text-left px-3 py-2 rounded-lg border border-yellow-400/10 bg-black/60 text-xs text-zinc-300 hover:border-yellow-400/40 hover:bg-yellow-400/5 hover:text-yellow-400 transition-all"
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sections list (sortable) */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-400/70 font-bold">
            Secciones ({sections.length})
          </p>

          {loading ? (
            <LoadingPulse />
          ) : sections.length === 0 ? (
            <EmptyState />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className={viewMode === 'grid' ? 'grid gap-2 grid-cols-2' : 'flex flex-col gap-2'}>
                  {sections.map((section) => (
                    <SortableSectionCard
                      key={section.id}
                      section={section}
                      isSelected={selectedId === section.id}
                      isExpanded={expandedSection === section.id}
                      isDragging={activeDragId === section.id}
                      onSelect={() => {
                        setSelectedId(section.id);
                        setExpandedSection((p) => (p === section.id ? null : section.id));
                      }}
                      onUpdate={updateSection}
                      onDelete={deleteSection}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
                {activeDragSection ? (
                  <DragGhost section={activeDragSection} />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Settings */}
        {settingGroups.length > 0 && (
          <div className="border-t border-yellow-400/10 pt-4 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-400/70 font-bold">⚙️ Configuración</p>
            {settingGroups.map((group, gi) => (
              <div key={gi} className="space-y-2">
                <p className="text-xs font-bold text-zinc-400">{group.title}</p>
                {group.fields.map((field) => (
                  <div key={field.key}>
                    {field.multiline ? (
                      <textarea
                        placeholder={field.label}
                        value={settings[field.key] ?? ''}
                        onChange={(e) => updateSetting(field.key, e.target.value)}
                        className="w-full rounded-xl border border-yellow-400/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-yellow-400/40 resize-y min-h-[72px] transition-colors"
                      />
                    ) : (
                      <input
                        placeholder={field.label}
                        value={settings[field.key] ?? ''}
                        onChange={(e) => updateSetting(field.key, e.target.value)}
                        className="w-full rounded-xl border border-yellow-400/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-yellow-400/40 transition-colors"
                      />
                    )}
                    {field.hint && <p className="mt-1 text-[10px] text-zinc-600">{field.hint}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── RIGHT: Preview ─────────────────────────────────────────────────── */}
      <section className="hidden md:flex md:flex-1 flex-col gap-3 rounded-2xl border border-yellow-400/10 bg-zinc-950 p-3 overflow-hidden">
        <div className="flex items-center justify-between gap-2 bg-black/50 rounded-xl px-4 py-2.5">
          <span className="text-xs text-zinc-500 font-medium">Vista previa en vivo</span>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-yellow-400/20 bg-black p-1">
              {(['mobile', 'tablet', 'desktop'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  title={d}
                  className={[
                    'p-1.5 rounded-full transition-all',
                    device === d ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.4)]' : 'text-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {d === 'mobile' && <Smartphone className="w-3.5 h-3.5" />}
                  {d === 'tablet' && <Tablet className="w-3.5 h-3.5" />}
                  {d === 'desktop' && <Monitor className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPreviewToken(Date.now())}
              className="p-2 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all"
              title="Recargar vista previa"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-xl bg-black/50 flex items-start justify-center p-3">
          <div className={`${viewportClass} w-full transition-all duration-300`}>
            <iframe
              ref={iframeRef}
              src={previewSrc}
              title="Vista previa"
              className="w-full h-[80vh] rounded-xl border border-yellow-400/10 bg-white"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: SaveState }) {
  const cfg = {
    idle:   { icon: <Clock className="w-3 h-3" />,                         text: 'Listo',      cls: 'text-zinc-600' },
    saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />,           text: 'Guardando',  cls: 'text-yellow-400' },
    saved:  { icon: <CheckCircle2 className="w-3 h-3" />,                   text: 'Guardado',   cls: 'text-emerald-400' },
    error:  { icon: <AlertCircle className="w-3 h-3" />,                    text: 'Error',      cls: 'text-red-400' },
  }[state];

  return (
    <motion.div
      key={state}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest shrink-0 ${cfg.cls}`}
    >
      {cfg.icon}
      <span>{cfg.text}</span>
      {state === 'saving' && (
        <span className="flex gap-0.5">
          {[0, 150, 300].map((d) => (
            <motion.span
              key={d}
              className="inline-block w-1 h-1 rounded-full bg-yellow-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: d / 1000 }}
            />
          ))}
        </span>
      )}
    </motion.div>
  );
}

function LoadingPulse() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-xl border border-yellow-400/5 bg-zinc-900/60 overflow-hidden relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-yellow-400/15 p-8 text-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-yellow-400/5 border border-yellow-400/15 flex items-center justify-center">
        <Zap className="w-5 h-5 text-yellow-400/40" />
      </div>
      <p className="text-xs text-zinc-500">Sin secciones. Añade la primera arriba.</p>
    </div>
  );
}

// Visual ghost shown while dragging in the DragOverlay
function DragGhost({ section }: { section: Section }) {
  const kindLabel = KINDS.find((k) => k.value === section.kind)?.label || section.kind;
  return (
    <div className="rounded-xl border border-yellow-400/60 bg-zinc-900/95 px-3 py-2.5 shadow-[0_8px_32px_rgba(250,204,21,0.25)] backdrop-blur-sm flex items-center gap-2 cursor-grabbing w-full">
      <GripVertical className="w-3.5 h-3.5 text-yellow-400/60 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-yellow-400 truncate">{kindLabel}</p>
        <p className="text-[10px] text-zinc-500 truncate">{section.title || '(sin título)'}</p>
      </div>
    </div>
  );
}

// ── SortableSectionCard ──────────────────────────────────────────────────────

interface SortableSectionCardProps {
  section: Section;
  isSelected: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onUpdate: (id: string, patch: Partial<Section>) => void;
  onDelete: (id: string) => void;
}

function SortableSectionCard(props: SortableSectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } = useSortable({
    id: props.section.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSorting ? 0.35 : 1,
    zIndex: isSorting ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} id={`section-${props.section.id}`}>
      <SectionCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

interface SectionCardProps extends SortableSectionCardProps {
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
}

function SectionCard({
  section,
  isSelected,
  isExpanded,
  isDragging,
  onSelect,
  onUpdate,
  onDelete,
  dragHandleProps,
}: SectionCardProps) {
  const kindLabel = KINDS.find((k) => k.value === section.kind)?.label || section.kind;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={[
        'rounded-xl border transition-all duration-150',
        isSelected
          ? 'border-yellow-400/50 bg-yellow-400/[0.06] shadow-[0_0_20px_rgba(250,204,21,0.1),inset_0_1px_0_rgba(250,204,21,0.15)]'
          : 'border-yellow-400/10 bg-zinc-900/70 hover:border-yellow-400/25 hover:bg-zinc-900/90',
        isDragging ? 'shadow-[0_12px_40px_rgba(0,0,0,0.6)]' : '',
      ].join(' ')}
    >
      <div className="p-3 space-y-2.5">
        {/* Card header */}
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...dragHandleProps}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-yellow-400/10 text-zinc-600 hover:text-yellow-400/70 transition-colors touch-none"
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {/* Title area — click to expand */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
            <p className="text-xs font-bold text-yellow-400 truncate">{kindLabel}</p>
            <p className="text-[10px] text-zinc-500 truncate">{section.title || '(sin título)'}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <Toggle
              checked={section.visible}
              onChange={(v) => onUpdate(section.id, { visible: v })}
            />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
              className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
              aria-label="Eliminar sección"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={onSelect}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all"
              aria-label={isExpanded ? 'Contraer' : 'Expandir'}
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* Inline fields (expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-yellow-400/10 pt-2.5 space-y-2">
                {section.title !== undefined && (
                  <input
                    value={section.title ?? ''}
                    onChange={(e) => onUpdate(section.id, { title: e.target.value })}
                    placeholder="Título"
                    className="w-full text-xs rounded-lg bg-black/60 border border-yellow-400/15 px-2.5 py-1.5 text-white outline-none focus:border-yellow-400/40 transition-colors"
                  />
                )}
                {section.subtitle !== undefined && (
                  <input
                    value={section.subtitle ?? ''}
                    onChange={(e) => onUpdate(section.id, { subtitle: e.target.value })}
                    placeholder="Subtítulo"
                    className="w-full text-xs rounded-lg bg-black/60 border border-yellow-400/15 px-2.5 py-1.5 text-white outline-none focus:border-yellow-400/40 transition-colors"
                  />
                )}
                {section.body !== undefined && (
                  <textarea
                    value={section.body ?? ''}
                    onChange={(e) => onUpdate(section.id, { body: e.target.value })}
                    placeholder="Contenido"
                    rows={2}
                    className="w-full text-xs rounded-lg bg-black/60 border border-yellow-400/15 px-2.5 py-1.5 text-white outline-none focus:border-yellow-400/40 transition-colors resize-none"
                  />
                )}
                {section.image_url !== undefined && (
                  <input
                    value={section.image_url ?? ''}
                    onChange={(e) => onUpdate(section.id, { image_url: e.target.value })}
                    placeholder="URL de imagen"
                    className="w-full text-xs rounded-lg bg-black/60 border border-yellow-400/15 px-2.5 py-1.5 text-white outline-none focus:border-yellow-400/40 transition-colors"
                  />
                )}
                {section.link_url !== undefined && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      value={section.link_url ?? ''}
                      onChange={(e) => onUpdate(section.id, { link_url: e.target.value })}
                      placeholder="URL del enlace"
                      className="w-full text-xs rounded-lg bg-black/60 border border-yellow-400/15 px-2.5 py-1.5 text-white outline-none focus:border-yellow-400/40 transition-colors"
                    />
                    <input
                      value={section.link_label ?? ''}
                      onChange={(e) => onUpdate(section.id, { link_label: e.target.value })}
                      placeholder="Etiqueta"
                      className="w-full text-xs rounded-lg bg-black/60 border border-yellow-400/15 px-2.5 py-1.5 text-white outline-none focus:border-yellow-400/40 transition-colors"
                    />
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-yellow-400/10">
                  <input
                    value={(section.data?.custom_classes as string) ?? ''}
                    onChange={(e) => onUpdate(section.id, { data: { ...section.data, custom_classes: e.target.value } })}
                    placeholder="Clases CSS (Tailwind)"
                    className="w-full text-xs rounded-lg bg-black/60 border border-yellow-400/15 px-2.5 py-1.5 text-white outline-none focus:border-yellow-400/40 transition-colors"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
