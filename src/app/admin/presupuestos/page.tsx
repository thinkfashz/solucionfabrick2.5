'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowDown, ArrowUp, Bot, Calendar, CheckCircle, ChevronDown, Clock,
  Copy, Database, Download, Eye, FileJson, FileText, ImagePlus, Mail, MessageSquare, Play, Plus, Printer,
  Save, Send, Star, Trash2, Zap,
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

type Tab = 'datos' | 'items' | 'secciones' | 'imagenes' | 'video' | 'json' | 'html' | 'preview' | 'registros' | 'calendario' | 'radier' | 'ia' | 'email';
type SaveStatus = 'idle' | 'local' | 'syncing' | 'saved' | 'error';

const tabs: { id: Tab; label: string; icon?: ReactNode }[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'items', label: 'Items' },
  { id: 'secciones', label: 'Secciones' },
  { id: 'imagenes', label: 'Imágenes' },
  { id: 'video', label: 'Video', icon: <Play className="h-3 w-3" /> },
  { id: 'calendario', label: 'Calendario', icon: <Calendar className="h-3 w-3" /> },
  { id: 'radier', label: 'Radier', icon: <Zap className="h-3 w-3" /> },
  { id: 'ia', label: 'Asistente IA', icon: <Bot className="h-3 w-3" /> },
  { id: 'json', label: 'JSON', icon: <FileJson className="h-3 w-3" /> },
  { id: 'html', label: 'HTML' },
  { id: 'preview', label: 'Vista previa', icon: <Eye className="h-3 w-3" /> },
  { id: 'registros', label: 'Registros BD', icon: <Database className="h-3 w-3" /> },
  { id: 'email', label: 'Correo', icon: <Mail className="h-3 w-3" /> },
];

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-zinc-700 text-zinc-200',
  enviado: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  aprobado: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  rechazado: 'bg-red-500/20 text-red-300 border border-red-500/30',
  vencido: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
};

const CATEGORIA_PRESETS = ['Mobiliario', 'Radier / Obra civil', 'Pintura', 'Tabiquería', 'Cielos', 'Eléctrico', 'Gasfitería', 'Otro'] as const;

interface AiPresupuestoResult {
  titulo?: string;
  descripcion?: string;
  incluye?: string[];
  no_incluye?: string[];
  materiales?: string[];
  observacion_tecnica?: string;
}

interface RegistroRow {
  id: string; cliente: string; numero_cliente?: string | null; empresa_cliente?: string | null;
  titulo?: string | null; fecha?: string | null; estado?: string | null;
  total_con_iva?: number | null; public_link?: string | null; generated_at?: string | null;
}

interface CorreoRow {
  id: string; presupuesto_id: string; cliente?: string; email_destinatario: string;
  asunto?: string; estado: string; tipo?: string; reply_to_id?: string; resend_id?: string; error?: string;
  abierto_at?: string; entregado_at?: string; mensaje_adicional?: string; created_at: string;
}

interface RespuestaRow {
  id: number; presupuesto_id: string; correo_id?: string;
  tipo: string; descripcion: string; nota_interna?: string; created_at: string;
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

function CategoriaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      <span>Categoría</span>
      <select
        value=""
        onChange={e => { if (e.target.value) onChange(e.target.value); }}
        className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/70"
      >
        <option value="">Elige rápido…</option>
        {CATEGORIA_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Categoría…"
        className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/70"
      />
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
  const [nuevoFormOpen, setNuevoFormOpen] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ cliente: '', empresa: '', titulo: '' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiPresupuestoResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [seccionesOpen, setSeccionesOpen] = useState<Record<string, boolean>>({ incluye: true, no_incluye: true, materiales: true, observacion: true, forma_pago: true });
  const pendingSaveRef = useRef<PresupuestoPro | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Email state ──────────────────────────────────────────────────────────────
  const [emailDest, setEmailDest] = useState('');
  const [emailAsunto, setEmailAsunto] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [correos, setCorreos] = useState<CorreoRow[]>([]);
  const [respuestas, setRespuestas] = useState<RespuestaRow[]>([]);
  const [emailHistLoading, setEmailHistLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyNota, setReplyNota] = useState('');
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  // Admin sends reply email to client
  const [replyEmailFor, setReplyEmailFor] = useState<CorreoRow | null>(null);
  const [replyEmailText, setReplyEmailText] = useState('');
  const [replyEmailSending, setReplyEmailSending] = useState(false);
  const [replyEmailStatus, setReplyEmailStatus] = useState('');

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
      const matchSearch = !q || (b.cliente || '').toLowerCase().includes(q) || (b.titulo || '').toLowerCase().includes(q) || (b.empresa_cliente || '').toLowerCase().includes(q);
      return estFilter && matchSearch;
    });
  }, [budgets, search, filterEstado]);

  const persist = (next: PresupuestoPro[]) => { setBudgets(next); saveBudgets(next); };
  const update = (patch: Partial<PresupuestoPro>) => {
    const updated = calculateBudget({ ...selected, ...patch, updated_at: new Date().toISOString() });
    persist(budgets.map(b => b.id === selected.id ? updated : b));
    setSaveStatus('local');

    // Debounced auto-save to DB (2.5 s after last keystroke)
    pendingSaveRef.current = updated;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      autoSaveTimerRef.current = null;
      const toSave = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (!toSave) return;
      setSaveStatus('syncing');
      const pubLink = typeof window !== 'undefined'
        ? `${window.location.origin}/presupuestos/${toSave.slug}`
        : `/presupuestos/${toSave.slug}`;
      try {
        const { archivos: _a, ...payload } = toSave;
        const res = await fetch('/api/admin/presupuestos/registros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            presupuesto: {
              ...payload,
              numero_cliente: toSave.telefono_whatsapp || '',
              public_link: pubLink,
              meta: { modulo: 'auto_save', guardado_desde: '/admin/presupuestos' },
            },
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      } finally {
        setTimeout(() => setSaveStatus(s => s === 'saved' || s === 'error' ? 'idle' : s), 3500);
      }
    }, 2500);
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

  // ── AI assistant ─────────────────────────────────────────────────────────────
  const toggleSeccion = (key: string) => setSeccionesOpen(prev => ({ ...prev, [key]: !prev[key] }));

  async function runAi() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const res = await fetch('/api/admin/presupuestos/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const json = (await res.json().catch(() => ({}))) as { result?: AiPresupuestoResult; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setAiResult(json.result || null);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiResult() {
    if (!aiResult) return;
    const patch: Partial<PresupuestoPro> = {};
    if (aiResult.titulo) patch.titulo = aiResult.titulo;
    if (aiResult.descripcion) patch.descripcion = aiResult.descripcion;
    if (aiResult.incluye?.length) patch.incluye = aiResult.incluye;
    if (aiResult.no_incluye?.length) patch.no_incluye = aiResult.no_incluye;
    if (aiResult.materiales?.length) patch.materiales = aiResult.materiales;
    if (aiResult.observacion_tecnica) patch.observacion_tecnica = aiResult.observacion_tecnica;
    update(patch);
    setAiResult(null);
    setTab('secciones');
    setMessage('Campos generados por IA aplicados al presupuesto.');
    setTimeout(() => setMessage(''), 2500);
  }

  // ── Budget list actions ──────────────────────────────────────────────────────
  const crearBudget = () => {
    if (!nuevoForm.cliente.trim()) return;
    const titulo = nuevoForm.titulo.trim() || 'Nuevo presupuesto';
    const n = normalizeBudget({ ...baseBudgetExample, id: createBudgetId(), slug: slugifyBudget(`${nuevoForm.cliente}-${titulo}`), cliente: nuevoForm.cliente.trim(), empresa_cliente: nuevoForm.empresa.trim(), email_cliente: '', titulo, telefono_whatsapp: '', created_at: new Date().toISOString() });
    persist([n, ...budgets]); setSelectedId(n.id); setTab('datos');
    setNuevoFormOpen(false); setNuevoForm({ cliente: '', empresa: '', titulo: '' });
  };
  const nuevo = () => setNuevoFormOpen(v => !v);
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
  async function downloadHtml() {
    try {
      const res = await fetch('/api/admin/presupuestos/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto: selected }),
      });
      if (!res.ok) { setMessage('Error generando HTML'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `presupuesto-${selected.slug || selected.id}.html`;
      a.click(); URL.revokeObjectURL(url);
    } catch { setMessage('Error descargando HTML'); }
  }
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
    const sorted = [...selected.imagenes].sort((a, b) => a.orden - b.orden);
    const reordered = [
      ...sorted.filter(img => img.id === id),
      ...sorted.filter(img => img.id !== id),
    ].map((img, i) => ({ ...img, orden: i + 1 }));
    update({ imagenes: reordered });
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

  // ── Email functions ──────────────────────────────────────────────────────────
  async function loadEmailHistory() {
    setEmailHistLoading(true);
    try {
      const res = await fetch(`/api/admin/presupuestos/email?presupuestoId=${encodeURIComponent(selected.id)}`, { cache: 'no-store' });
      const json = await res.json() as { correos?: CorreoRow[]; respuestas?: RespuestaRow[] };
      setCorreos(json.correos ?? []);
      setRespuestas(json.respuestas ?? []);
    } catch { /* noop */ } finally {
      setEmailHistLoading(false);
    }
  }

  async function sendPresupuestoEmail() {
    const dest = (emailDest || selected.email_cliente || '').trim();
    if (!dest || !dest.includes('@')) { setEmailStatus('Ingresa un email válido.'); return; }
    setEmailSending(true); setEmailStatus('');
    try {
      const res = await fetch('/api/admin/presupuestos/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto: selected,
          emailDestinatario: dest,
          asunto: emailAsunto.trim() || undefined,
          mensajeAdicional: emailMsg.trim() || undefined,
          publicUrl: publicLink,
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; resendId?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setEmailStatus(`✓ Enviado a ${dest}${json.resendId ? ` (ID: ${json.resendId.slice(0, 8)}…)` : ''}`);
      setEmailMsg(''); setEmailAsunto('');
      void loadEmailHistory();
      update({ estado: 'enviado' });
    } catch (err) {
      setEmailStatus(`Error: ${(err as Error).message}`);
    } finally {
      setEmailSending(false);
    }
  }

  async function submitReply() {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      await fetch('/api/admin/presupuestos/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuestoId: selected.id,
          correoId: replyFor,
          tipo: 'respuesta',
          descripcion: replyText.trim(),
          notaInterna: replyNota.trim() || undefined,
        }),
      });
      setReplyText(''); setReplyNota(''); setReplyFor(null);
      void loadEmailHistory();
    } catch { /* noop */ } finally {
      setReplySubmitting(false);
    }
  }

  async function sendAdminReply() {
    if (!replyEmailFor || !replyEmailText.trim()) return;
    setReplyEmailSending(true); setReplyEmailStatus('');
    try {
      const res = await fetch('/api/admin/presupuestos/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuestoId: selected.id,
          emailDestinatario: replyEmailFor.email_destinatario,
          asuntoOriginal: replyEmailFor.asunto,
          mensaje: replyEmailText.trim(),
          replyToId: replyEmailFor.id,
          cliente: selected.cliente,
          presupuestoSlug: selected.slug,
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setReplyEmailStatus(`✓ Respuesta enviada a ${replyEmailFor.email_destinatario}`);
      setReplyEmailText(''); setReplyEmailFor(null);
      void loadEmailHistory();
    } catch (err) {
      setReplyEmailStatus(`Error: ${(err as Error).message}`);
    } finally {
      setReplyEmailSending(false);
    }
  }

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
              <button onClick={nuevo} className={`flex-1 rounded-2xl px-3 py-2 text-sm font-black ${nuevoFormOpen ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40' : 'bg-yellow-400 text-black'}`}>
                <Plus className="mr-1 inline h-4 w-4" />{nuevoFormOpen ? 'Cancelar' : 'Nuevo'}
              </button>
              <button onClick={duplicar} className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-bold text-white">Duplicar</button>
            </div>

            {/* Inline new-budget form */}
            {nuevoFormOpen && (
              <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Nuevo presupuesto</p>
                <input
                  placeholder="Cliente *"
                  value={nuevoForm.cliente}
                  onChange={e => setNuevoForm(p => ({ ...p, cliente: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && crearBudget()}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/50 placeholder:text-zinc-600"
                />
                <input
                  placeholder="Empresa"
                  value={nuevoForm.empresa}
                  onChange={e => setNuevoForm(p => ({ ...p, empresa: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/50 placeholder:text-zinc-600"
                />
                <input
                  placeholder="Título del presupuesto"
                  value={nuevoForm.titulo}
                  onChange={e => setNuevoForm(p => ({ ...p, titulo: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && crearBudget()}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/50 placeholder:text-zinc-600"
                />
                <div className="flex gap-2">
                  <button onClick={crearBudget} disabled={!nuevoForm.cliente.trim()} className="flex-1 rounded-xl bg-yellow-400 px-3 py-2 text-sm font-black text-black disabled:opacity-50">
                    Crear
                  </button>
                  <button onClick={() => { setNuevoFormOpen(false); setNuevoForm({ cliente: '', empresa: '', titulo: '' }); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

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
                    {b.id === selected.id && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-yellow-400">
                        ✏ Editando
                      </span>
                    )}
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

            {/* Editing context banner */}
            <AdminCard className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-base text-yellow-400">✏</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Editando presupuesto</p>
                  <h2 className="truncate font-black text-white">
                    {selected.cliente || 'Sin cliente'}
                    <span className="ml-2 text-sm font-normal text-zinc-400">· {selected.titulo}</span>
                  </h2>
                </div>
                <SaveStatusBadge status={saveStatus} />
              </div>
            </AdminCard>

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
                <button onClick={() => void downloadHtml()} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white">
                  <Download className="mr-1 inline h-4 w-4" />HTML
                </button>
                <button onClick={() => window.open(`/presupuestos/${selected.slug}?print=1`, '_blank')} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white">
                  <Download className="mr-1 inline h-4 w-4" />PDF cliente
                </button>
                <SaveStatusBadge status={saveStatus} />
                {message && <span className="text-sm font-bold text-emerald-300">{message}</span>}
              </div>

              {/* Tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); if (t.id === 'registros') void loadRegistros(); if (t.id === 'email') { setEmailDest(selected.email_cliente || ''); void loadEmailHistory(); } }}
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

                <div className="space-y-3" id="items-list">
                  {[...selected.items].sort((a, b) => a.orden - b.orden).map((item, idx, arr) => (
                    <div key={item.id} className="grid gap-2 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-8">
                      <Input label="Nombre" value={item.nombre} onChange={v => patchItem(item.id, { nombre: v })} />
                      <CategoriaSelect value={item.categoria} onChange={v => patchItem(item.id, { categoria: v })} />
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

                {/* Items total footer */}
                {selected.items.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                    <div className="grid gap-3 sm:grid-cols-3 text-sm">
                      <div><span className="block text-xs uppercase text-zinc-400">Subtotal neto</span><b className="text-white">{formatBudgetMoney(selected.valor_neto)}</b></div>
                      <div><span className="block text-xs uppercase text-zinc-400">IVA {selected.iva_porcentaje}%</span><b className="text-yellow-300">{formatBudgetMoney(selected.total_iva)}</b></div>
                      <div><span className="block text-xs uppercase text-zinc-400">Total con IVA</span><b className="text-2xl font-black text-yellow-300">{formatBudgetMoney(selected.total_con_iva)}</b></div>
                    </div>
                  </div>
                )}
              </AdminCard>
            )}

            {/* ── Secciones tab ─────────────────────────────────────────────── */}
            {tab === 'secciones' && (
              <AdminCard>
                <div className="space-y-3">
                  {/* Incluye */}
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <button onClick={() => toggleSeccion('incluye')} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-white hover:bg-white/5">
                      <span>Incluye <span className="ml-2 text-xs font-normal text-zinc-500">({selected.incluye.length} ítems)</span></span>
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${seccionesOpen.incluye ? 'rotate-180' : ''}`} />
                    </button>
                    {seccionesOpen.incluye && (
                      <div className="border-t border-white/10 p-3">
                        <Textarea label="" value={joinLines(selected.incluye)} onChange={v => update({ incluye: splitLines(v) })} rows={7} />
                      </div>
                    )}
                  </div>

                  {/* No incluye */}
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <button onClick={() => toggleSeccion('no_incluye')} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-white hover:bg-white/5">
                      <span>No incluye <span className="ml-2 text-xs font-normal text-zinc-500">({selected.no_incluye.length} ítems)</span></span>
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${seccionesOpen.no_incluye ? 'rotate-180' : ''}`} />
                    </button>
                    {seccionesOpen.no_incluye && (
                      <div className="border-t border-white/10 p-3">
                        <Textarea label="" value={joinLines(selected.no_incluye)} onChange={v => update({ no_incluye: splitLines(v) })} rows={7} />
                      </div>
                    )}
                  </div>

                  {/* Materiales */}
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <button onClick={() => toggleSeccion('materiales')} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-white hover:bg-white/5">
                      <span>Materiales <span className="ml-2 text-xs font-normal text-zinc-500">({selected.materiales.length} ítems)</span></span>
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${seccionesOpen.materiales ? 'rotate-180' : ''}`} />
                    </button>
                    {seccionesOpen.materiales && (
                      <div className="border-t border-white/10 p-3">
                        <Textarea label="" value={joinLines(selected.materiales)} onChange={v => update({ materiales: splitLines(v) })} rows={7} />
                      </div>
                    )}
                  </div>

                  {/* Observación técnica */}
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <button onClick={() => toggleSeccion('observacion')} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-white hover:bg-white/5">
                      <span>Observación técnica</span>
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${seccionesOpen.observacion ? 'rotate-180' : ''}`} />
                    </button>
                    {seccionesOpen.observacion && (
                      <div className="border-t border-white/10 p-3">
                        <Textarea label="" value={selected.observacion_tecnica} onChange={v => update({ observacion_tecnica: v })} rows={5} />
                      </div>
                    )}
                  </div>

                  {/* Forma de pago */}
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <button onClick={() => toggleSeccion('forma_pago')} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-white hover:bg-white/5">
                      <span>Forma de pago <span className="ml-2 text-xs font-normal text-zinc-500">({selected.forma_pago.length} hitos)</span></span>
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${seccionesOpen.forma_pago ? 'rotate-180' : ''}`} />
                    </button>
                    {seccionesOpen.forma_pago && (
                      <div className="border-t border-white/10 p-4 space-y-3">
                        {selected.forma_pago.map((p, i) => (
                          <div key={i} className="grid gap-2 md:grid-cols-[130px_1fr_50px]">
                            <Input label="%" type="number" value={p.porcentaje} onChange={v => update({ forma_pago: selected.forma_pago.map((x, idx) => idx === i ? { ...x, porcentaje: Number(v) } : x) })} />
                            <Input label="Descripción" value={p.descripcion} onChange={v => update({ forma_pago: selected.forma_pago.map((x, idx) => idx === i ? { ...x, descripcion: v } : x) })} />
                            <button onClick={() => update({ forma_pago: selected.forma_pago.filter((_, idx) => idx !== i) })} className="mt-4 text-red-300"><Trash2 /></button>
                          </div>
                        ))}
                        <button onClick={() => update({ forma_pago: [...selected.forma_pago, { porcentaje: 0, descripcion: 'Nuevo hito de pago' }] })} className="rounded-2xl border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-200">Agregar hito de pago</button>
                      </div>
                    )}
                  </div>
                </div>
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
                  nextOrden={selected.items.length > 0 ? Math.max(...selected.items.map(it => it.orden)) + 1 : 1}
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

            {/* ── IA tab ────────────────────────────────────────────────────── */}
            {tab === 'ia' && (
              <AdminCard>
                <div className="mb-5 flex items-center gap-3">
                  <Bot className="h-5 w-5 text-yellow-400" />
                  <h3 className="font-black text-white">Asistente IA · Generar contenido del presupuesto</h3>
                </div>
                <div className="space-y-4">
                  <Textarea
                    label="Describe el proyecto brevemente"
                    value={aiPrompt}
                    onChange={setAiPrompt}
                    rows={4}
                  />
                  <p className="text-xs text-zinc-500">Ej: &quot;Muebles de melamina blanca para oficina 20 m²&quot; · &quot;Radier hormigón 40 m² con estabilizado&quot; · &quot;Tabiquería drywall para sala de reuniones&quot;</p>
                  <button
                    onClick={() => void runAi()}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="rounded-2xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
                  >
                    {aiLoading ? 'Generando…' : 'Generar con IA'}
                  </button>

                  {aiError && (
                    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                      <AlertTriangle className="mr-2 inline h-4 w-4" />{aiError}
                    </div>
                  )}

                  {aiResult && (
                    <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/5 p-5 space-y-4">
                      <p className="text-xs font-black uppercase tracking-widest text-yellow-400">Resultado generado — revisa antes de aplicar</p>
                      {aiResult.titulo && (
                        <p><span className="text-xs uppercase text-zinc-500">Título: </span><b className="text-white">{aiResult.titulo}</b></p>
                      )}
                      {aiResult.descripcion && (
                        <p className="text-sm leading-relaxed text-zinc-300">{aiResult.descripcion}</p>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        {aiResult.incluye?.length && (
                          <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Incluye</p>
                            <ul className="space-y-0.5">{aiResult.incluye.map((s, i) => <li key={i} className="text-xs text-zinc-300">✓ {s}</li>)}</ul>
                          </div>
                        )}
                        {aiResult.no_incluye?.length && (
                          <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">No incluye</p>
                            <ul className="space-y-0.5">{aiResult.no_incluye.map((s, i) => <li key={i} className="text-xs text-zinc-300">✗ {s}</li>)}</ul>
                          </div>
                        )}
                        {aiResult.materiales?.length && (
                          <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Materiales</p>
                            <ul className="space-y-0.5">{aiResult.materiales.map((s, i) => <li key={i} className="text-xs text-zinc-300">· {s}</li>)}</ul>
                          </div>
                        )}
                        {aiResult.observacion_tecnica && (
                          <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Obs. técnica</p>
                            <p className="border-l-2 border-yellow-400/30 pl-3 text-xs italic text-zinc-400">{aiResult.observacion_tecnica}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={applyAiResult} className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-black text-white">
                          Aplicar al presupuesto
                        </button>
                        <button onClick={() => setAiResult(null)} className="rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-300">
                          Descartar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

            {/* ── Email tab ─────────────────────────────────────────────────── */}
            {tab === 'email' && (
              <div className="space-y-4">
                {/* Send form */}
                <AdminCard>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                    <h3 className="font-black text-white">Enviar presupuesto por correo</h3>
                  </div>

                  <div className="grid gap-3">
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-zinc-400">
                      <span>Email destinatario</span>
                      <input
                        type="email"
                        value={emailDest || selected.email_cliente || ''}
                        onChange={e => setEmailDest(e.target.value)}
                        placeholder="cliente@empresa.cl"
                        className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                      />
                      {!selected.email_cliente && <span className="text-orange-400 text-[10px] normal-case">Sin email en datos del cliente — ingresa uno aquí o en la pestaña Datos</span>}
                    </label>

                    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-zinc-400">
                      <span>Asunto (opcional)</span>
                      <input
                        type="text"
                        value={emailAsunto}
                        onChange={e => setEmailAsunto(e.target.value)}
                        placeholder={`Presupuesto: ${selected.titulo || 'Propuesta comercial'}`}
                        className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-zinc-400">
                      <span>Mensaje adicional (opcional)</span>
                      <textarea
                        rows={3}
                        value={emailMsg}
                        onChange={e => setEmailMsg(e.target.value)}
                        placeholder="Hola, adjunto nuestro presupuesto. Cualquier consulta, estamos disponibles…"
                        className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => void sendPresupuestoEmail()}
                      disabled={emailSending}
                      className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" />
                      {emailSending ? 'Enviando…' : 'Enviar presupuesto'}
                    </button>
                    <button onClick={() => void loadEmailHistory()} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-bold text-zinc-300">
                      Actualizar historial
                    </button>
                  </div>

                  {emailStatus && (
                    <p className={`mt-3 rounded-2xl border px-4 py-2 text-sm font-bold ${emailStatus.startsWith('✓') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                      {emailStatus}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-zinc-600">
                    Requiere Resend configurado en{' '}
                    <a href="/admin/integraciones" className="text-yellow-400 hover:underline">Centro de Integraciones</a>.
                    El cliente recibirá el presupuesto completo con todos los detalles, ítems y link al presupuesto online.
                  </p>
                </AdminCard>

                {/* Email history */}
                <AdminCard>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-400" />
                      <h3 className="font-black text-white">Historial de envíos</h3>
                    </div>
                    {emailHistLoading && <span className="text-xs text-zinc-500 animate-pulse">Cargando…</span>}
                  </div>

                  {replyEmailStatus && (
                    <p className={`mb-3 rounded-2xl border px-3 py-2 text-sm font-bold ${replyEmailStatus.startsWith('✓') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                      {replyEmailStatus}
                    </p>
                  )}

                  {correos.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-2">Sin correos enviados para este presupuesto.</p>
                  ) : (
                    <div className="space-y-2">
                      {correos.map(c => {
                        const isReply = c.tipo === 'reply';
                        const estadoColors: Record<string, string> = {
                          enviado: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                          entregado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                          abierto: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
                          fallido: 'bg-red-500/15 text-red-300 border-red-500/30',
                          rebotado: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                          spam: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
                        };
                        return (
                          <div key={c.id} className={`rounded-2xl border p-3 ${isReply ? 'border-blue-500/20 bg-blue-500/5 ml-4' : 'border-white/10 bg-black/30'}`}>
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isReply && <span className="text-[10px] font-black text-blue-400">↩ RESPUESTA ENVIADA</span>}
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${estadoColors[c.estado] || 'text-zinc-400 border-zinc-700'}`}>
                                    {c.estado}
                                  </span>
                                  <span className="text-sm font-bold text-white truncate">{c.email_destinatario}</span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-500 truncate">{c.asunto}</p>
                                {c.abierto_at && <p className="text-[10px] text-yellow-300/70 mt-0.5">Abierto: {new Date(c.abierto_at).toLocaleString('es-CL')}</p>}
                                {c.error && <p className="text-[10px] text-red-300 mt-0.5">Error: {c.error}</p>}
                                {c.mensaje_adicional && <p className="mt-1 text-[11px] text-zinc-400 italic">"{c.mensaje_adicional.slice(0, 100)}{c.mensaje_adicional.length > 100 ? '…' : ''}"</p>}
                              </div>
                              <div className="text-right flex-shrink-0 space-y-1">
                                <p className="text-[10px] text-zinc-500">{new Date(c.created_at).toLocaleString('es-CL')}</p>
                                {!isReply && (
                                  <button
                                    onClick={() => { setReplyEmailFor(c); setReplyEmailText(''); setReplyEmailStatus(''); setReplyFor(null); }}
                                    className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300 hover:bg-blue-500/20"
                                  >
                                    <Send className="h-3 w-3" /> Responder
                                  </button>
                                )}
                                <button
                                  onClick={() => { setReplyFor(replyFor === c.id ? null : c.id); setReplyText(''); setReplyNota(''); setReplyEmailFor(null); }}
                                  className="ml-1 inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-200"
                                >
                                  <MessageSquare className="h-3 w-3" /> Anotar
                                </button>
                              </div>
                            </div>

                            {/* Admin reply compose form */}
                            {replyEmailFor?.id === c.id && (
                              <div className="mt-3 space-y-2 rounded-2xl border border-blue-500/25 bg-blue-500/8 p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Responder al cliente · {c.email_destinatario}</p>
                                <textarea
                                  rows={4}
                                  value={replyEmailText}
                                  onChange={e => setReplyEmailText(e.target.value)}
                                  placeholder="Escribe tu respuesta aquí. El cliente la recibirá por correo electrónico."
                                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50 placeholder:text-zinc-600"
                                />
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    onClick={() => void sendAdminReply()}
                                    disabled={!replyEmailText.trim() || replyEmailSending}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-1.5 text-[11px] font-black text-white disabled:opacity-50"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    {replyEmailSending ? 'Enviando…' : 'Enviar respuesta'}
                                  </button>
                                  <button onClick={() => { setReplyEmailFor(null); setReplyEmailText(''); }} className="rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-bold text-zinc-400">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Log client response */}
                            {replyFor === c.id && (
                              <div className="mt-3 space-y-2 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Anotar respuesta recibida del cliente</p>
                                <textarea
                                  rows={2}
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder="¿Qué respondió el cliente? Ej: Acepta el presupuesto, pide descuento…"
                                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-yellow-400/50"
                                />
                                <input
                                  value={replyNota}
                                  onChange={e => setReplyNota(e.target.value)}
                                  placeholder="Nota interna (opcional)"
                                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-yellow-400/50"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => void submitReply()} disabled={!replyText.trim() || replySubmitting} className="rounded-xl bg-yellow-400 px-3 py-1.5 text-[11px] font-black text-black disabled:opacity-50">
                                    {replySubmitting ? 'Guardando…' : 'Guardar anotación'}
                                  </button>
                                  <button onClick={() => setReplyFor(null)} className="rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-bold text-zinc-400">Cancelar</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AdminCard>

                {/* Replies / responses */}
                {respuestas.length > 0 && (
                  <AdminCard>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <h3 className="font-black text-white">Respuestas del cliente</h3>
                    </div>
                    <div className="space-y-2">
                      {respuestas.map(r => (
                        <div key={r.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300 capitalize mr-2">{r.tipo}</span>
                              <span className="text-sm text-white">{r.descripcion}</span>
                              {r.nota_interna && <p className="mt-1 text-[11px] text-zinc-500 italic">Nota: {r.nota_interna}</p>}
                            </div>
                            <p className="text-[10px] text-zinc-500 flex-shrink-0">{new Date(r.created_at).toLocaleString('es-CL')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminCard>
                )}
              </div>
            )}

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
