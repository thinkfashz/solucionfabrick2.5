'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, CheckCircle2, Copy, Eye, EyeOff, ExternalLink, Loader2, UploadCloud, X } from 'lucide-react';
import {
  calculateBudget,
  createBudgetId,
  fileTypeFromUrl,
  loadBudgets,
  PRESUPUESTOS_PRO_STORAGE_KEY,
  saveBudgets,
  type PresupuestoPro,
} from '@/lib/presupuestosBuilder';

function modelFormat(url: string) {
  return url.split('?')[0].split('.').pop()?.toLowerCase() || 'glb';
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
    const loaded = loadBudgets();
    setBudgets(loaded);
    const first = loaded[0];
    setSelectedId(first?.id || '');
  }, [visibleInPath]);

  const selected = useMemo(() => budgets.find((budget) => budget.id === selectedId) || budgets[0], [budgets, selectedId]);
  const currentModel = useMemo(() => selected?.archivos?.find((file) => file.tipo === 'modelo_3d' || ['glb', 'gltf'].includes(file.formato)) || null, [selected]);

  useEffect(() => {
    if (!currentModel) return;
    setUrl(currentModel.url || '');
    setName(currentModel.nombre || 'Modelo 3D del proyecto');
    setDescription(currentModel.descripcion || 'Modelo 3D interactivo para revisión del cliente.');
    setEnabled(currentModel.mostrar_cliente !== false);
  }, [currentModel?.id, currentModel?.url]);

  if (!visibleInPath) return null;

  const publicLink = selected
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/presupuestos/${selected.slug}${url && enabled ? `?model=${encodeURIComponent(url)}&modelName=${encodeURIComponent(name)}` : ''}`
    : '';

  function refreshBudgets() {
    const loaded = loadBudgets();
    setBudgets(loaded);
    if (!selectedId && loaded[0]) setSelectedId(loaded[0].id);
  }

  function saveModel(nextEnabled = enabled) {
    if (!selected) {
      setMessage('No hay presupuesto seleccionado.');
      return;
    }
    if (!url.trim()) {
      setMessage('Pega primero la URL del modelo .glb o .gltf.');
      return;
    }
    setLoading(true);
    const format = modelFormat(url.trim());
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
            url: url.trim(),
            descripcion: description || 'Modelo 3D interactivo para revisión del cliente.',
            tipo: fileTypeFromUrl(url.trim(), format),
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
    setMessage(nextEnabled ? 'Visor 3D activado para este presupuesto.' : 'Visor 3D desactivado para el cliente.');
    window.setTimeout(() => setMessage(''), 2600);
    setLoading(false);
  }

  function disableModel() {
    saveModel(false);
  }

  async function copyPublicLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed bottom-5 right-4 z-[80] print:hidden sm:bottom-6 sm:right-6">
      {!open ? (
        <button
          onClick={() => { refreshBudgets(); setOpen(true); }}
          className="group flex items-center gap-2 rounded-full border border-yellow-400/40 bg-black/90 px-4 py-3 text-sm font-black text-yellow-200 shadow-2xl shadow-black/50 backdrop-blur-xl transition hover:bg-yellow-400 hover:text-black"
        >
          <Box className="h-4 w-4" />
          Visor 3D
        </button>
      ) : (
        <div className="w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-[1.5rem] border border-yellow-400/30 bg-zinc-950/95 text-white shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Presupuesto</p>
              <h3 className="mt-1 text-lg font-black">Activar visor 3D</h3>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full border border-white/10 p-2 text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-200"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-3 p-4">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Presupuesto
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70">
                {budgets.map((budget) => <option key={budget.id} value={budget.id}>{budget.cliente} · {budget.titulo}</option>)}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              URL .glb / .gltf
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://.../modelo.glb" className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Nombre
              <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Descripción
              <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
            </label>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3">
              <div>
                <p className="text-sm font-black text-white">Mostrar visor al cliente</p>
                <p className="text-xs text-zinc-500">Activa o desactiva el modelo en el link público.</p>
              </div>
              <button
                onClick={() => saveModel(!enabled)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${enabled ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
              >
                {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {enabled ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => saveModel(true)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-3 py-2.5 text-xs font-black text-black disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Guardar y activar
              </button>
              <button onClick={disableModel} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 disabled:opacity-60">
                <EyeOff className="h-4 w-4" /> Desactivar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/presupuestos/modelos-3d" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2.5 text-xs font-black text-yellow-200 hover:bg-yellow-400/20">
                <UploadCloud className="h-4 w-4" /> Subir archivo
              </Link>
              <button onClick={copyPublicLink} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 hover:border-yellow-400/40">
                <Copy className="h-4 w-4" /> {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>

            {publicLink && (
              <Link href={publicLink} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-xs font-black text-emerald-200 hover:bg-emerald-400/20">
                <ExternalLink className="h-4 w-4" /> Probar vista pública
              </Link>
            )}

            {message && <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs font-bold text-yellow-100">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
