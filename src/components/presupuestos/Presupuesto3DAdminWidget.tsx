'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, CheckCircle2, Copy, Eye, EyeOff, ExternalLink, Loader2, RefreshCw, UploadCloud, X } from 'lucide-react';
import { calculateBudget, createBudgetId, fileTypeFromUrl, loadBudgets, saveBudgets, type PresupuestoPro } from '@/lib/presupuestosBuilder';

function modelFormat(url: string) {
  return url.split('?')[0].split('.').pop()?.toLowerCase() || 'glb';
}

function dispatchBudgetSync() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('presupuestos:updated'));
}

export default function Presupuesto3DAdminWidget() {
  const pathname = usePathname();
  const visibleInPath = pathname === '/admin/presupuestos' || pathname?.startsWith('/admin/presupuestos/');
  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState<PresupuestoPro[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('Modelo 3D del proyecto');
  const [description, setDescription] = useState('Modelo 3D interactivo para revisión del cliente.');
  const [enabled, setEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visibleInPath || typeof window === 'undefined') return;
    refreshBudgets();
    const onStorage = () => refreshBudgets();
    window.addEventListener('storage', onStorage);
    window.addEventListener('presupuestos:updated', onStorage as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('presupuestos:updated', onStorage as EventListener);
    };
  }, [visibleInPath]);

  const selected = useMemo(() => budgets.find((budget) => budget.id === selectedId) || budgets[0], [budgets, selectedId]);
  const currentModel = useMemo(() => selected?.archivos?.find((file) => file.tipo === 'modelo_3d' || ['glb', 'gltf'].includes(file.formato)) || null, [selected]);

  useEffect(() => {
    if (!currentModel) {
      setUrl('');
      setName('Modelo 3D del proyecto');
      setDescription('Modelo 3D interactivo para revisión del cliente.');
      setEnabled(false);
      return;
    }
    setUrl(currentModel.url || '');
    setName(currentModel.nombre || 'Modelo 3D del proyecto');
    setDescription(currentModel.descripcion || 'Modelo 3D interactivo para revisión del cliente.');
    setEnabled(currentModel.mostrar_cliente !== false);
  }, [currentModel?.id, currentModel?.url, selectedId]);

  if (!visibleInPath) return null;

  const publicLink = selected ? `${typeof window !== 'undefined' ? window.location.origin : ''}/presupuestos/${selected.slug}` : '';
  const viewerLink = url ? `${typeof window !== 'undefined' ? window.location.origin : ''}/presupuestos/visor-3d?model=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}` : '';

  function refreshBudgets() {
    const loaded = loadBudgets();
    setBudgets(loaded);
    if (!selectedId && loaded[0]) setSelectedId(loaded[0].id);
  }

  function persistModel(nextEnabled = enabled) {
    if (!selected) {
      setMessage('No hay presupuesto seleccionado.');
      return;
    }
    if (!url.trim()) {
      setMessage('Pega primero la URL del modelo .glb o .gltf.');
      return;
    }
    setLoading(true);
    const cleanUrl = url.trim();
    const format = modelFormat(cleanUrl);
    const nextBudgets = budgets.map((budget) => {
      if (budget.id !== selected.id) return budget;
      const others = (budget.archivos || []).filter((file) => !(file.tipo === 'modelo_3d' || ['glb', 'gltf'].includes(file.formato)));
      return calculateBudget({
        ...budget,
        archivos: [
          ...others,
          {
            id: currentModel?.id || createBudgetId('file'),
            nombre: name || 'Modelo 3D del proyecto',
            url: cleanUrl,
            descripcion: description || 'Modelo 3D interactivo para revisión del cliente.',
            tipo: fileTypeFromUrl(cleanUrl, format),
            formato: format,
            mostrar_cliente: nextEnabled,
            orden: 1,
          },
        ],
        updated_at: new Date().toISOString(),
      });
    });
    saveBudgets(nextBudgets);
    setBudgets(nextBudgets);
    setEnabled(nextEnabled);
    dispatchBudgetSync();
    setMessage(nextEnabled ? 'Visor 3D activado y sincronizado con la página del cliente.' : 'Visor 3D desactivado y oculto para el cliente.');
    window.setTimeout(() => setMessage(''), 3200);
    setLoading(false);
  }

  async function copyPublicLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-[80] mx-auto w-[calc(100vw-1rem)] max-w-md px-2 print:hidden sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-auto sm:max-w-none sm:px-0">
      {!open ? (
        <button
          onClick={() => { refreshBudgets(); setOpen(true); }}
          className="mx-auto flex w-full max-w-[320px] items-center justify-center gap-2 rounded-full border border-yellow-400/40 bg-black/95 px-4 py-3 text-sm font-black text-yellow-200 shadow-2xl shadow-black/50 backdrop-blur-xl transition hover:bg-yellow-400 hover:text-black sm:w-auto"
        >
          <Box className="h-4 w-4" />
          Visor 3D
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${enabled ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}>{enabled ? 'Activo' : 'Off'}</span>
        </button>
      ) : (
        <div className="max-h-[calc(100vh-1.5rem)] w-full overflow-y-auto rounded-[1.5rem] border border-yellow-400/30 bg-zinc-950/95 text-white shadow-2xl shadow-black/60 backdrop-blur-xl sm:w-[430px]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-zinc-950/95 p-4 backdrop-blur">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Presupuesto</p>
              <h3 className="mt-1 text-lg font-black">Control del visor 3D</h3>
              <p className="mt-1 text-xs text-zinc-500">Activa o desactiva la card del visor en la página del cliente.</p>
            </div>
            <button onClick={() => setOpen(false)} className="shrink-0 rounded-full border border-white/10 p-2 text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-200"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-3 p-4">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Presupuesto
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70">
                {budgets.map((budget) => <option key={budget.id} value={budget.id}>{budget.cliente} · {budget.titulo}</option>)}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              URL .glb / .gltf
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://.../modelo.glb" className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Nombre
              <input value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Descripción
              <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
            </label>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-black text-white">Mostrar visor al cliente</p>
                <p className="text-xs text-zinc-500">Si está activo, aparecerá la card “Abrir visor 3D” en el álbum.</p>
              </div>
              <button
                onClick={() => persistModel(!enabled)}
                disabled={loading}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-black sm:w-auto ${enabled ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
              >
                {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {enabled ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button onClick={() => persistModel(true)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-3 py-2.5 text-xs font-black text-black disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Guardar y activar
              </button>
              <button onClick={() => persistModel(false)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 disabled:opacity-60">
                <EyeOff className="h-4 w-4" /> Desactivar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link href="/admin/presupuestos/modelos-3d" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2.5 text-xs font-black text-yellow-200 hover:bg-yellow-400/20">
                <UploadCloud className="h-4 w-4" /> Subir archivo
              </Link>
              <button onClick={copyPublicLink} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 hover:border-yellow-400/40">
                <Copy className="h-4 w-4" /> {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>

            <button onClick={refreshBudgets} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 hover:border-yellow-400/40">
              <RefreshCw className="h-4 w-4" /> Sincronizar presupuestos
            </button>

            {publicLink && (
              <Link href={publicLink} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-xs font-black text-emerald-200 hover:bg-emerald-400/20">
                <ExternalLink className="h-4 w-4" /> Ver página cliente
              </Link>
            )}

            {viewerLink && enabled && (
              <Link href={viewerLink} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2.5 text-xs font-black text-yellow-200 hover:bg-yellow-400/20">
                <Box className="h-4 w-4" /> Probar visor 3D
              </Link>
            )}

            {message && <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs font-bold text-yellow-100">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
