'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowDown, ArrowUp, Calendar, CheckCircle, Clock, Copy, Database,
  Eye, FileJson, FileText, ImagePlus, Play, Plus, Printer, Save, Send, Star, Trash2, Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { MediaPicker, type MediaAsset } from '@/components/admin/cms/MediaPicker';
import PresupuestoPublicView from '@/components/presupuestos/PresupuestoPublicView';
import RadierCalculator from '@/components/admin/presupuestos/RadierCalculator';
import {
  baseBudgetExample, calculateBudget, createBudgetId, formatBudgetMoney,
  loadBudgets, normalizeBudget, saveBudgets, sanitizeBudgetHtml, slugifyBudget,
  type PresupuestoImagen, type PresupuestoItem, type PresupuestoPro,
} from '@/lib/presupuestosBuilder';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'datos' | 'items' | 'secciones' | 'imagenes' | 'video' | 'json' | 'html' | 'preview' | 'registros' | 'calendario' | 'radier';
type SaveStatus = 'idle' | 'local' | 'syncing' | 'saved' | 'error';

const tabs: { id: Tab; label: string; icon?: ReactNode }[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'items', label: 'Items' },
  { id: 'secciones', label: 'Secciones' },
  { id: 'imagenes', label: 'Imágenes' },
  { id: 'video', label: 'Video', icon: <Play className="h-3 w-3" /> },
  { id: 'calendario', label: 'Calendario', icon: <Calendar className="h-3 w-3" /> },
  { id: 'radier', label: 'Radier', icon: <Zap className="h-3 w-3" /> },
  { id: 'json', label: 'JSON', icon: <FileJson className="h-3 w-3" /> },
  { id: 'html', label: 'HTML' },
  { id: 'preview', label: 'Vista previa', icon: <Eye className="h-3 w-3" /> },
  { id: 'registros', label: 'Registros BD', icon: <Database className="h-3 w-3" /> },
];

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-zinc-700 text-zinc-200',
  enviado: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  aprobado: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  rechazado: 'bg-red-500/20 text-red-300 border border-red-500/30',
  vencido: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
};

interface RegistroRow {
  id: string; cliente: string; numero_cliente?: string | null; empresa_cliente?: string | null;
  titulo?: string | null; fecha?: string | null; estado?: string | null;
  total_con_iva?: number | null; public_link?: string | null; generated_at?: string | null;
}

// ─── Small reusable inputs ─────────────────────────────────────────────────────

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
    </label>
  );
}
function Textarea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
        className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
    </label>
  );
}

const splitLines = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);
const joinLines = (v: string[]) => v.join('\n');

function daysLeft(fechaVencimiento?: string): number | null {
  if (!fechaVencimiento) return null;
  const diff = new Date(fechaVencimiento).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { label: string; cls: string; icon: ReactNode }> = {
    idle: { label: 'Sin cambios', cls: 'text-zinc-500', icon: <Clock className="h-3.5 w-3.5" /> },
    local: { label: 'Guardado local', cls: 'text-amber-400', icon: <Save className="h-3.5 w-3.5" /> },
    syncing: { label: 'Sincronizando BD…', cls: 'text-blue-400', icon: <Database className="h-3.5 w-3.5 animate-pulse" /> },
    saved: { label: 'Guardado en BD', cls: 'text-emerald-400', icon: <CheckCircle className="h-3.5 w-3.5" /> },
    error: { label: 'Error BD · local OK', cls: 'text-orange-400', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const { label, cls, icon } = map[status];
  return <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${cls}`}>{icon}{label}</span>;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PresupuestosBuilderPage() {
  const [budgets, setBudgets] = useState<PresupuestoPro[]>([baseBudgetExample]);
  const [selectedId, setSelectedId] = useState(baseBudgetExample.id);
  const [tab, setTab] = useState<Tab>('datos');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroRow[]>([]);
  const [registrosError, setRegistrosError] = useState('');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  useEffect(() => {
    const loaded = loadBudgets();
    setBudgets(loaded);
    setSelectedId(loaded[0]?.id || baseBudgetExample.id);
  }, []);

  const selected = useMemo(
    () => calculateBudget(budgets.find(b => b.id === selectedId) || budgets[0] || baseBudgetExample),
    [budgets, selectedId],
  );

  const publicLink = typeof window !== 'undefined'
    ? `${window.location.origin}/presupuestos/${selected.slug}`
    : `/presupuestos/${selected.slug}`;

  // ── Dashboard stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const activos = budgets.filter(b => b.estado === 'borrador' || b.estado === 'enviado').length;
    const aprobados = budgets.filter(b => b.estado === 'aprobado').length;
    const vencidos = budgets.filter(b => {
      if (b.estado === 'vencido') return true;
      if (b.fecha_vencimiento) return new Date(b.fecha_vencimiento).getTime() < now;
      return false;
    }).length;
    const totalCotizado = budgets.reduce((s, b) => s + (calculateBudget(b).total_con_iva || 0), 0);
    return { activos, aprobados, vencidos, totalCotizado };
  }, [budgets]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filteredBudgets = useMemo(() => {
    const now = Date.now();
    return budgets.filter(b => {
      const expired = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() < now : b.estado === 'vencido';
      const estFilter = filterEstado === 'todos' ? true
        : filterEstado === 'vencido' ? expired
        : b.estado === filterEstado;
      const q = search.toLowerCase();
      const matchSearch = !q || b.cliente.toLowerCase().includes(q) || b.titulo.toLowerCase().includes(q) || b.empresa_cliente.toLowerCase().includes(q);
      return estFilter && matchSearch;
    });
  }, [budgets, search, filterEstado]);

  const persist = (next: PresupuestoPro[]) => { setBudgets(next); saveBudgets(next); };
  const update = (patch: Partial<PresupuestoPro>) => {
    persist(budgets.map(b => b.id === selected.id ? calculateBudget({ ...b, ...patch, updated_at: new Date().toISOString() }) : b));
    setSaveStatus('local');
  };

  // ── Save to DB ───────────────────────────────────────────────────────────────
  async function saveToDb(overridePatch?: Partial<PresupuestoPro>) {
    const finalBudget = calculateBudget({ ...selected, ...overridePatch, updated_at: new Date().toISOString() });
    persist(budgets.map(b => b.id === selected.id ? finalBudget : b));
    setSaveStatus('syncing');
    try {
      const { archivos: _archivos, ...safePayload } = finalBudget;
      const res = await fetch('/api/admin/presupuestos/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto: {
            ...safePayload,
            numero_cliente: finalBudget.telefono_whatsapp || '',
            public_link: publicLink,
            meta: {
              modulo: 'constructor_presupuestos',
              tipo_documento: 'presupuesto_comercial',
              empresa: finalBudget.empresa_cliente,
              cliente_numero: finalBudget.telefono_whatsapp || '',
              cliente_email: finalBudget.email_cliente || '',
              guardado_desde: '/admin/presupuestos',
            },
          },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setSaveStatus('saved');
      setMessage(`Registrado en BD: ${json.id || 'ok'}`);
      void loadRegistros();
    } catch (err) {
      setSaveStatus('error');
      setMessage(`Local OK · BD falló: ${(err as Error).message}`);
    } finally {
      setTimeout(() => { setSaveStatus(s => s === 'saved' || s === 'error' ? 'idle' : s); setMessage(''); }, 3500);
    }
  }

  async function saveAndActivate() {
    const now = new Date().toISOString();
    const patch: Partial<PresupuestoPro> = { estado: 'enviado', fecha_activacion: now };
    update(patch);
    await saveToDb(patch);
  }

  async function loadRegistros() {
    setRegistrosError('');
    try {
      const res = await fetch('/api/admin/presupuestos/registros', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as { data?: { rows?: RegistroRow[]; data?: RegistroRow[] }; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setRegistros(json.data?.rows || json.data?.data || []);
    } catch (err) {
      setRegistrosError((err as Error).message);
    }
  }

  // ── Budget list actions ──────────────────────────────────────────────────────
  const nuevo = () => {
    const n = normalizeBudget({ ...baseBudgetExample, id: createBudgetId(), slug: slugifyBudget(`nuevo-${Date.now()}`), cliente: 'Nuevo cliente', empresa_cliente: '', email_cliente: '', titulo: 'Nuevo presupuesto', telefono_whatsapp: '', created_at: new Date().toISOString() });
    persist([n, ...budgets]); setSelectedId(n.id); setTab('datos');
  };
  const duplicar = () => {
    const d = normalizeBudget({ ...selected, id: createBudgetId(), slug: `${selected.slug}-copia-${Date.now().toString(36)}`, titulo: `${selected.titulo} — copia`, estado: 'borrador' });
    persist([d, ...budgets]); setSelectedId(d.id);
  };
  const removeBudget = (id: string) => {
    const next = budgets.filter(b => b.id !== id);
    persist(next.length ? next : [baseBudgetExample]);
    setSelectedId((next[0] || baseBudgetExample).id);
  };
  const copyLink = async () => { await navigator.clipboard.writeText(publicLink); setMessage('Link público copiado.'); setTimeout(() => setMessage(''), 1800); };
  const importJson = () => {
    try { const parsed = JSON.parse(jsonText); const imported = normalizeBudget(parsed); persist([imported, ...budgets.filter(b => b.id !== imported.id)]); setSelectedId(imported.id); setJsonError(''); setMessage('JSON importado.'); }
    catch (e) { setJsonError(`JSON inválido: ${(e as Error).message}`); }
  };

  // ── Item actions ─────────────────────────────────────────────────────────────
  const addItem = () => update({ items: [...selected.items, { id: createBudgetId('item'), nombre: '', descripcion: '', categoria: '', cantidad: 1, unidad: 'un', precio_unitario: 0, total: 0, orden: selected.items.length + 1 }] });
  const patchItem = (id: string, patch: Partial<PresupuestoItem>) => update({ items: selected.items.map(it => it.id === id ? { ...it, ...patch } : it) });
  const duplicateItem = (id: string) => {
    const src = selected.items.find(it => it.id === id);
    if (!src) return;
    const clone = { ...src, id: createBudgetId('item'), orden: selected.items.length + 1 };
    update({ items: [...selected.items, clone] });
  };
  const moveItem = (id: string, dir: 'up' | 'down') => {
    const sorted = [...selected.items].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex(it => it.id === id);
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= sorted.length) return;
    const items = sorted.map((it, i) => {
      if (i === idx) return { ...it, orden: sorted[swap].orden };
      if (i === swap) return { ...it, orden: sorted[idx].orden };
      return it;
    });
    update({ items });
  };

  // ── Image actions ────────────────────────────────────────────────────────────
  const addImage = () => update({ imagenes: [...selected.imagenes, { id: createBudgetId('img'), url: '', titulo: '', descripcion: '', orden: selected.imagenes.length + 1 }] });
  const patchImage = (id: string, patch: Partial<PresupuestoImagen>) => update({ imagenes: selected.imagenes.map(img => img.id === id ? { ...img, ...patch } : img) });
  const setHeroImage = (id: string) => {
    const updated = selected.imagenes.map(img => ({ ...img, orden: img.id === id ? 1 : img.orden >= 1 ? img.orden + 1 : img.orden }))
      .sort((a, b) => a.orden - b.orden)
      .map((img, i) => ({ ...img, orden: i + 1 }));
    update({ imagenes: updated });
  };
  const openMediaPicker = (targetId: string | null = null) => { setImageTargetId(targetId); setMediaPickerOpen(true); };
  const selectMediaAsset = (asset: MediaAsset) => {
    const title = asset.alt || asset.path?.split('/').pop()?.replace(/[-_]/g, ' ') || 'Imagen del proyecto';
    const description = `Origen: ${asset.source === 'cloudinary' ? 'Cloudinary' : 'Base de datos'}${asset.folder ? ` · Carpeta: ${asset.folder}` : ''}`;
    if (imageTargetId) update({ imagenes: selected.imagenes.map(img => img.id === imageTargetId ? { ...img, url: asset.url, titulo: img.titulo || title, descripcion: img.descripcion || description } : img) });
    else update({ imagenes: [...selected.imagenes, { id: createBudgetId('img'), url: asset.url, titulo: title, descripcion: description, orden: selected.imagenes.length + 1 }] });
    setMediaPickerOpen(false); setImageTargetId(null);
    setMessage('Imagen incorporada.'); setTimeout(() => setMessage(''), 1800);
  };

  // ── Category subtotals ───────────────────────────────────────────────────────
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    selected.items.forEach(it => { map[it.categoria || 'Sin categoría'] = (map[it.categoria || 'Sin categoría'] || 0) + it.total; });
    return map;
  }, [selected.items]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · Constructor comercial"
        title="Presupuestos profesionales"
        description="Crea propuestas editables, con calendario, calculadora de radier, registro en BD y link público."
        icon={FileText}
      />

      {/* ── Dashboard stats ──────────────────────────────────────────────────── */}
      <AdminMotion>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Activos', value: stats.activos, cls: 'text-blue-300' },
            { label: 'Aprobados', value: stats.aprobados, cls: 'text-emerald-300' },
            { label: 'Vencidos', value: stats.vencidos, cls: 'text-orange-300' },
            { label: 'Total cotizado', value: formatBudgetMoney(stats.totalCotizado), cls: 'text-yellow-300' },
          ].map(s => (
            <div key={s.label} className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">{s.label}</span>
              <p className={`mt-1 text-xl font-black ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </AdminMotion>

      <AdminMotion>
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">

          {/* ── Left sidebar ─────────────────────────────────────────────────── */}
          <AdminCard className="h-max space-y-3">
            <div className="flex gap-2">
              <button onClick={nuevo} className="flex-1 rounded-2xl bg-yellow-400 px-3 py-2 text-sm font-black text-black">
                <Plus className="mr-1 inline h-4 w-4" />Nuevo
              </button>
              <button onClick={duplicar} className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-bold text-white">Duplicar</button>
            </div>

            {/* Search */}
            <input
              type="search"
              placeholder="Buscar cliente, título…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/50 placeholder:text-zinc-600"
            />

            {/* Estado filter */}
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/50"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviado">Enviado</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
              <option value="vencido">Vencido</option>
            </select>

            {/* Budget list */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredBudgets.map(b => {
                const calc = calculateBudget(b);
                const expired = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() < Date.now() : b.estado === 'vencido';
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${b.id === selected.id ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-white/10 bg-black/30 hover:border-white/25'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <b className={`block text-sm text-white ${expired ? 'line-through opacity-50' : ''}`}>{b.cliente}</b>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${ESTADO_COLORS[b.estado] || ''}`}>{b.estado}</span>
                    </div>
                    <span className={`line-clamp-1 text-xs text-zinc-400 ${expired ? 'line-through opacity-50' : ''}`}>{b.titulo}</span>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-yellow-300">{formatBudgetMoney(calc.total_con_iva)}</span>
                      {b.fecha_vencimiento && (
                        <span className={`text-[10px] ${expired ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                          {expired ? '⚠ Vencido' : `Vence ${b.fecha_vencimiento}`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredBudgets.length === 0 && <p className="py-4 text-center text-xs text-zinc-600">Sin resultados.</p>}
            </div>

            <button onClick={() => removeBudget(selected.id)} className="inline-flex items-center gap-2 text-xs font-bold text-red-300">
              <Trash2 className="h-4 w-4" />Eliminar seleccionado
            </button>
          </AdminCard>

          {/* ── Right panel ──────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Action bar */}
            <AdminCard>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => void saveToDb()} className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60" disabled={saveStatus === 'syncing'}>
                  <Save className="mr-1 inline h-4 w-4" />{saveStatus === 'syncing' ? 'Guardando…' : 'Guardar + BD'}
                </button>
                <button onClick={() => void saveAndActivate()} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white disabled:opacity-60" disabled={saveStatus === 'syncing'}>
                  <Send className="mr-1 inline h-4 w-4" />Guardar y activar
                </button>
                <button onClick={() => setTab('preview')} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white">
                  <Eye className="mr-1 inline h-4 w-4" />Vista previa
                </button>
                <button onClick={copyLink} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white">
                  <Copy className="mr-1 inline h-4 w-4" />Link
                </button>
                <button onClick={() => window.print()} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white">
                  <Printer className="mr-1 inline h-4 w-4" />PDF
                </button>
                <SaveStatusBadge status={saveStatus} />
                {message && <span className="text-sm font-bold text-emerald-300">{message}</span>}
              </div>

              {/* Tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); if (t.id === 'registros') void loadRegistros(); }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest ${tab === t.id ? 'bg-yellow-400 text-black' : 'border border-white/10 text-zinc-300'}`}
                  >
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </AdminCard>

            {/* ── Datos tab ──────────────────────────────────────────────────── */}
            {tab === 'datos' && (
              <AdminCard>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Proveedor" value={selected.proveedor} onChange={v => update({ proveedor: v })} />
                  <Input label="Cliente" value={selected.cliente} onChange={v => update({ cliente: v })} />
                  <Input label="Número / WhatsApp" value={selected.telefono_whatsapp || ''} onChange={v => update({ telefono_whatsapp: v })} placeholder="+56 9..." />
                  <Input label="Email cliente" type="email" value={selected.email_cliente || ''} onChange={v => update({ email_cliente: v })} placeholder="cliente@empresa.cl" />
                  <Input label="Empresa cliente" value={selected.empresa_cliente} onChange={v => update({ empresa_cliente: v })} />
                  <Input label="Ciudad" value={selected.ciudad} onChange={v => update({ ciudad: v })} />
                  <Input label="Título" value={selected.titulo} onChange={v => update({ titulo: v, slug: slugifyBudget(`${selected.cliente}-${v}`) })} />
                  <Input label="Slug" value={selected.slug} onChange={v => update({ slug: slugifyBudget(v) })} />
                  <Input label="Fecha" type="date" value={selected.fecha} onChange={v => update({ fecha: v })} />
                  <Input label="Validez" value={selected.validez} onChange={v => update({ validez: v })} />
                  <Input label="Plazo entrega" value={selected.plazo_entrega} onChange={v => update({ plazo_entrega: v })} />
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                    <span>Estado</span>
                    <select value={selected.estado} onChange={e => update({ estado: e.target.value as PresupuestoPro['estado'] })} className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70">
                      <option value="borrador">Borrador</option><option value="enviado">Enviado</option>
                      <option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option>
                      <option value="vencido">Vencido</option>
                    </select>
                  </label>
                  <Input label="Valor neto" type="number" value={selected.valor_neto} onChange={v => update({ valor_neto: Number(v), items: [] })} />
                  <Input label="IVA %" type="number" value={selected.iva_porcentaje} onChange={v => update({ iva_porcentaje: Number(v) })} />
                  <div className="md:col-span-2"><Textarea label="Descripción" value={selected.descripcion} onChange={v => update({ descripcion: v })} /></div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-black/40 p-4"><span className="text-xs text-zinc-400">Neto</span><b className="block text-yellow-300">{formatBudgetMoney(selected.valor_neto)}</b></div>
                  <div className="rounded-2xl bg-black/40 p-4"><span className="text-xs text-zinc-400">IVA</span><b className="block text-yellow-300">{formatBudgetMoney(selected.total_iva)}</b></div>
                  <div className="rounded-2xl bg-black/40 p-4"><span className="text-xs text-zinc-400">Total con IVA</span><b className="block text-yellow-300">{formatBudgetMoney(selected.total_con_iva)}</b></div>
                </div>
              </AdminCard>
            )}

            {/* ── Items tab ──────────────────────────────────────────────────── */}
            {tab === 'items' && (
              <AdminCard>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <button onClick={addItem} className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black">
                    <Plus className="mr-1 inline h-4 w-4" />Agregar item
                  </button>
                  <span className="text-sm font-black text-yellow-300">Total: {formatBudgetMoney(selected.total_con_iva)}</span>
                </div>

                {/* Category subtotals */}
                {Object.keys(categoryTotals).length > 1 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {Object.entries(categoryTotals).map(([cat, total]) => (
                      <span key={cat} className="rounded-xl border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-300">
                        <b className="text-white">{cat}</b>: {formatBudgetMoney(total)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  {[...selected.items].sort((a, b) => a.orden - b.orden).map((item, idx, arr) => (
                    <div key={item.id} className="grid gap-2 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-8">
                      <Input label="Nombre" value={item.nombre} onChange={v => patchItem(item.id, { nombre: v })} />
                      <Input label="Categoría" value={item.categoria} onChange={v => patchItem(item.id, { categoria: v })} />
                      <Input label="Cantidad" type="number" value={item.cantidad} onChange={v => patchItem(item.id, { cantidad: Number(v) })} />
                      <Input label="Unidad" value={item.unidad} onChange={v => patchItem(item.id, { unidad: v })} />
                      <Input label="Precio unit." type="number" value={item.precio_unitario} onChange={v => patchItem(item.id, { precio_unitario: Number(v) })} />
                      <div className="rounded-2xl bg-yellow-400/10 p-3 text-sm font-black text-yellow-300 flex items-center">{formatBudgetMoney(item.total)}</div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 md:col-span-2">
                        <button onClick={() => moveItem(item.id, 'up')} disabled={idx === 0} className="rounded-xl border border-white/10 p-1.5 text-zinc-400 disabled:opacity-30 hover:text-white"><ArrowUp className="h-4 w-4" /></button>
                        <button onClick={() => moveItem(item.id, 'down')} disabled={idx === arr.length - 1} className="rounded-xl border border-white/10 p-1.5 text-zinc-400 disabled:opacity-30 hover:text-white"><ArrowDown className="h-4 w-4" /></button>
                        <button onClick={() => duplicateItem(item.id)} className="rounded-xl border border-yellow-400/30 p-1.5 text-yellow-300 hover:bg-yellow-400/10"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => update({ items: selected.items.filter(x => x.id !== item.id) })} className="rounded-xl border border-red-400/20 p-1.5 text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="md:col-span-8"><Textarea label="Descripción" value={item.descripcion} onChange={v => patchItem(item.id, { descripcion: v })} rows={2} /></div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* ── Secciones tab ─────────────────────────────────────────────── */}
            {tab === 'secciones' && (
              <AdminCard>
                <div className="grid gap-4 md:grid-cols-2">
                  <Textarea label="Incluye · una línea por punto" value={joinLines(selected.incluye)} onChange={v => update({ incluye: splitLines(v) })} rows={8} />
                  <Textarea label="No incluye" value={joinLines(selected.no_incluye)} onChange={v => update({ no_incluye: splitLines(v) })} rows={8} />
                  <Textarea label="Materiales" value={joinLines(selected.materiales)} onChange={v => update({ materiales: splitLines(v) })} rows={8} />
                  <Textarea label="Observación técnica" value={selected.observacion_tecnica} onChange={v => update({ observacion_tecnica: v })} rows={8} />
                </div>
                <h3 className="mt-6 mb-3 font-black text-white">Forma de pago</h3>
                <div className="space-y-2">
                  {selected.forma_pago.map((p, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[130px_1fr_50px]">
                      <Input label="%" type="number" value={p.porcentaje} onChange={v => update({ forma_pago: selected.forma_pago.map((x, idx) => idx === i ? { ...x, porcentaje: Number(v) } : x) })} />
                      <Input label="Descripción" value={p.descripcion} onChange={v => update({ forma_pago: selected.forma_pago.map((x, idx) => idx === i ? { ...x, descripcion: v } : x) })} />
                      <button onClick={() => update({ forma_pago: selected.forma_pago.filter((_, idx) => idx !== i) })} className="text-red-300"><Trash2 /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => update({ forma_pago: [...selected.forma_pago, { porcentaje: 0, descripcion: 'Nuevo hito de pago' }] })} className="mt-3 rounded-2xl border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-200">Agregar forma de pago</button>
              </AdminCard>
            )}

            {/* ── Imágenes tab ──────────────────────────────────────────────── */}
            {tab === 'imagenes' && (
              <AdminCard>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button onClick={addImage} className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"><ImagePlus className="mr-1 inline h-4 w-4" />Agregar URL manual</button>
                  <button onClick={() => openMediaPicker()} className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-200 hover:bg-yellow-400/20"><Database className="mr-1 inline h-4 w-4" />Biblioteca</button>
                </div>
                <div className="space-y-3">
                  {[...selected.imagenes].sort((a, b) => a.orden - b.orden).map(img => (
                    <div key={img.id} className="grid gap-3 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-5">
                      <Input label="URL" value={img.url} onChange={v => patchImage(img.id, { url: v })} />
                      <Input label="Título" value={img.titulo} onChange={v => patchImage(img.id, { titulo: v })} />
                      <Input label="Descripción" value={img.descripcion} onChange={v => patchImage(img.id, { descripcion: v })} />
                      <Input label="Orden" type="number" value={img.orden} onChange={v => patchImage(img.id, { orden: Number(v) })} />
                      <div className="flex flex-wrap items-end gap-2">
                        <button onClick={() => openMediaPicker(img.id)} className="rounded-xl border border-yellow-400/40 px-3 py-2 text-xs font-bold text-yellow-200">Elegir BD</button>
                        <button onClick={() => setHeroImage(img.id)} title="Marcar como imagen principal" className="rounded-xl border border-yellow-400/40 px-2 py-2 text-xs text-yellow-200 hover:bg-yellow-400/10"><Star className="h-4 w-4" /></button>
                        <button onClick={() => update({ imagenes: selected.imagenes.filter(x => x.id !== img.id) })} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-300"><Trash2 className="inline h-4 w-4" /></button>
                      </div>
                      {img.url && <img src={img.url} alt={img.titulo || 'preview'} className="h-40 w-full rounded-2xl object-cover md:col-span-5" />}
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* ── Video tab ─────────────────────────────────────────────────── */}
            {tab === 'video' && (
              <AdminCard>
                <div className="grid gap-4">
                  <p className="text-sm leading-7 text-zinc-400">Agrega un video de presentación del proyecto.</p>
                  <Input label="URL del video (Cloudinary .mp4 o .webm)" value={selected.video_url || ''} onChange={v => update({ video_url: v })} placeholder="https://res.cloudinary.com/.../video.mp4" />
                  <Input label="Título del video" value={selected.video_titulo || ''} onChange={v => update({ video_titulo: v })} placeholder="Presentación del proyecto" />
                  <Textarea label="Descripción breve" value={selected.video_descripcion || ''} onChange={v => update({ video_descripcion: v })} rows={3} />
                  {selected.video_url && <video src={selected.video_url} controls preload="metadata" className="w-full rounded-2xl border border-white/10" style={{ maxHeight: '360px' }} />}
                  <Link href="/admin/presupuestos/videos" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 py-2.5 text-sm font-black text-yellow-200 hover:bg-yellow-400/20"><Play className="h-4 w-4" />Subir video →</Link>
                </div>
              </AdminCard>
            )}

            {/* ── Calendario tab ────────────────────────────────────────────── */}
            {tab === 'calendario' && (
              <AdminCard>
                <div className="flex items-center gap-2 mb-5">
                  <Calendar className="h-5 w-5 text-yellow-400" />
                  <h3 className="font-black text-white">Ciclo de vida del presupuesto</h3>
                </div>
                {(() => {
                  const days = daysLeft(selected.fecha_vencimiento);
                  const expired = days !== null && days < 0;
                  return (
                    <div className="space-y-5">
                      {expired && (
                        <div className="flex items-center gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4">
                          <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0" />
                          <p className="text-sm font-bold text-orange-300">Este presupuesto venció hace {Math.abs(days!)} días. Actualiza la fecha o marca como vencido.</p>
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Fecha creación</p>
                          <p className="font-bold text-white">{selected.created_at ? new Date(selected.created_at).toLocaleDateString('es-CL') : '—'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Fecha activación</p>
                          <p className="font-bold text-white">{selected.fecha_activacion ? new Date(selected.fecha_activacion).toLocaleDateString('es-CL') : <span className="text-zinc-600">No activado aún</span>}</p>
                        </div>
                        <div className={`rounded-2xl border p-4 ${expired ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/10 bg-black/30'}`}>
                          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Fecha vencimiento</p>
                          <div className="flex gap-2 items-center">
                            <input type="date" value={selected.fecha_vencimiento || ''} onChange={e => update({ fecha_vencimiento: e.target.value })} className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/70" />
                            <button type="button" onClick={() => update({ fecha_vencimiento: '' })} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-red-300">✕</button>
                          </div>
                        </div>
                        <div className={`rounded-2xl border p-4 ${expired ? 'border-orange-500/40 bg-orange-500/5' : days !== null && days <= 5 ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10 bg-black/30'}`}>
                          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Días restantes</p>
                          <p className={`text-2xl font-black ${expired ? 'text-orange-400 line-through' : days !== null && days <= 5 ? 'text-amber-400' : 'text-white'}`}>
                            {days === null ? '—' : expired ? `Vencido (${Math.abs(days)}d atrás)` : `${days} días`}
                          </p>
                        </div>
                      </div>
                      {/* Shortcuts */}
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Atajos de vencimiento</p>
                        <div className="flex flex-wrap gap-2">
                          {[3, 5, 7, 15, 30].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => { const base = new Date(selected.fecha || Date.now()); base.setDate(base.getDate() + d); update({ fecha_vencimiento: base.toISOString().slice(0, 10) }); }}
                              className="rounded-xl border border-yellow-400/30 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-400/10"
                            >
                              +{d} días
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </AdminCard>
            )}

            {/* ── Radier tab ────────────────────────────────────────────────── */}
            {tab === 'radier' && (
              <AdminCard>
                <RadierCalculator
                  nextOrden={selected.items.length + 1}
                  onAddItem={(item, desglose) => {
                    const obs = selected.observacion_tecnica;
                    const sep = obs ? '\n\n' : '';
                    update({ items: [...selected.items, item], observacion_tecnica: obs + sep + `Radier calculado: ${desglose}` });
                    setTab('items');
                    setMessage('Radier agregado como item.');
                    setTimeout(() => setMessage(''), 2000);
                  }}
                />
              </AdminCard>
            )}

            {/* ── JSON tab ──────────────────────────────────────────────────── */}
            {tab === 'json' && (
              <AdminCard>
                <Textarea label="Pega JSON estructurado" value={jsonText} onChange={setJsonText} rows={14} />
                {jsonError && <p className="mt-2 text-sm font-bold text-red-300">{jsonError}</p>}
                <button onClick={importJson} className="mt-4 rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black">
                  <FileJson className="mr-1 inline h-4 w-4" />Importar JSON
                </button>
              </AdminCard>
            )}

            {/* ── HTML tab ──────────────────────────────────────────────────── */}
            {tab === 'html' && (
              <AdminCard>
                <label className="mb-4 flex items-center gap-3 text-sm font-bold text-white">
                  <input type="checkbox" checked={selected.usar_html_personalizado} onChange={e => update({ usar_html_personalizado: e.target.checked })} />
                  Usar HTML personalizado
                </label>
                <Textarea label="HTML personalizado" value={selected.html_personalizado} onChange={v => update({ html_personalizado: v })} rows={16} />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => update({ html_personalizado: '' })} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white">Limpiar</button>
                  <button onClick={() => update({ html_personalizado: sanitizeBudgetHtml(selected.html_personalizado) })} className="rounded-2xl border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-200">Sanitizar</button>
                </div>
              </AdminCard>
            )}

            {/* ── Preview tab ───────────────────────────────────────────────── */}
            {tab === 'preview' && <PresupuestoPublicView presupuesto={selected} publicLink={publicLink} adminPreview />}

            {/* ── Registros BD tab ──────────────────────────────────────────── */}
            {tab === 'registros' && (
              <AdminCard>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="font-black text-white">Registros en base de datos</h3>
                  <button onClick={() => void loadRegistros()} className="rounded-2xl border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-200">Actualizar</button>
                </div>
                {registrosError && <p className="mb-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{registrosError}</p>}
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-widest text-zinc-400">
                      <tr><th className="p-3">Fecha</th><th>Cliente</th><th>Empresa</th><th>Estado</th><th>Total</th><th>Link</th></tr>
                    </thead>
                    <tbody>
                      {registros.length === 0
                        ? <tr><td colSpan={6} className="p-5 text-center text-zinc-500">Sin registros cargados.</td></tr>
                        : registros.map(r => (
                          <tr key={r.id} className="border-t border-white/10">
                            <td className="p-3 text-xs text-zinc-400">{r.generated_at ? new Date(r.generated_at).toLocaleString('es-CL') : r.fecha}</td>
                            <td>{r.cliente}</td>
                            <td>{r.empresa_cliente || '—'}</td>
                            <td><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${ESTADO_COLORS[r.estado || ''] || 'text-zinc-400'}`}>{r.estado || '—'}</span></td>
                            <td className="font-bold text-yellow-300">{formatBudgetMoney(Number(r.total_con_iva || 0))}</td>
                            <td>{r.public_link ? <a href={r.public_link} target="_blank" rel="noreferrer" className="text-yellow-300 underline">Abrir</a> : '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </AdminCard>
            )}
          </div>
        </div>
      </AdminMotion>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => { setMediaPickerOpen(false); setImageTargetId(null); }}
        onSelect={selectMediaAsset}
        defaultFolder="productos"
        defaultSource="insforge"
      />
    </AdminPage>
  );
}
