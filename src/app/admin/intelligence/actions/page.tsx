'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, Loader2, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';

type Policy = {
  role: string;
  permissions: string[];
  safeguards: {
    secretsBlocked: boolean;
    paymentCredentialsBlocked: boolean;
    tenantIsolationRequired: boolean;
    destructiveActionsBlocked: boolean;
    productPublishRequiresApproval: boolean;
    priceChangeThresholdPercent: number;
    minimumMarginPercent: number;
  };
};

type Preview = {
  ok: boolean;
  mode: string;
  executable: boolean;
  action: string;
  resourceId?: string | null;
  decision: {
    allowed: boolean;
    requiresApproval: boolean;
    permission: string;
    reasons: string[];
    normalizedPayload: Record<string, unknown>;
  };
  nextStep: string;
};

const ACTIONS = [
  ['product.create', 'Crear producto'],
  ['product.update', 'Actualizar producto'],
  ['product.publish', 'Publicar producto'],
  ['stock.update', 'Actualizar stock'],
  ['price.propose', 'Proponer precio'],
  ['seo.update', 'Actualizar SEO'],
  ['blog.create', 'Crear artículo'],
  ['blog.update', 'Actualizar artículo'],
] as const;

export default function IntelligenceActionsPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [actionType, setActionType] = useState('product.create');
  const [resourceId, setResourceId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [price, setPrice] = useState('');
  const [supplierPrice, setSupplierPrice] = useState('');
  const [stock, setStock] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/intelligence/actions', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo cargar la política.');
        setPolicy(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando política.'));
  }, []);

  const needsResource = useMemo(() => ['product.update', 'product.publish', 'stock.update', 'seo.update', 'blog.update'].includes(actionType), [actionType]);

  async function previewAction() {
    setLoading(true);
    setError('');
    setPreview(null);
    const payload: Record<string, unknown> = {};
    if (name.trim()) payload.name = name.trim();
    if (description.trim()) payload.description = description.trim();
    if (supplier.trim()) payload.supplier = supplier.trim();
    if (price) payload.price = Number(price);
    if (supplierPrice) payload.supplierPrice = Number(supplierPrice);
    if (stock) payload.stock = Number(stock);

    try {
      const res = await fetch('/api/admin/intelligence/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { type: actionType, resourceId: resourceId.trim() || null, payload },
          context: { currentPrice: currentPrice ? Number(currentPrice) : null, supplierPrice: supplierPrice ? Number(supplierPrice) : null },
        }),
      });
      const json = await res.json();
      setPreview(json);
      if (!res.ok && !json.decision) throw new Error(json.error || 'No se pudo evaluar la acción.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error evaluando acción.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen bg-[#101116] px-4 py-6 text-white sm:px-6">
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.16),transparent_35%),#171820] p-6 sm:p-8">
        <Link href="/admin/intelligence" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Fabrick Intelligence</Link>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-[#f4cf57]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]"><Bot className="h-4 w-4"/> V2 · Action Lab</span><h1 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-6xl">Propuesta antes de ejecución.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Prueba cómo Fabrick Intelligence evaluará productos, stock, precios, SEO y contenido antes de permitir cualquier cambio real.</p></div>
          {policy ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-200"><b>Rol:</b> {policy.role} · {policy.permissions.length} permisos activos</div> : null}
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-[#f4cf57]"/><h2 className="text-xl font-black">Crear propuesta</h2></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-white/55">Acción<select value={actionType} onChange={(e) => setActionType(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none">{ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-bold text-white/55">ID del recurso<input value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder={needsResource ? 'Requerido' : 'Opcional'} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none"/></label>
            <label className="text-xs font-bold text-white/55">Nombre / título<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none"/></label>
            <label className="text-xs font-bold text-white/55">Proveedor<input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none"/></label>
            <label className="text-xs font-bold text-white/55 sm:col-span-2">Descripción<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#171820] p-4 text-sm text-white outline-none"/></label>
            <label className="text-xs font-bold text-white/55">Precio propuesto<input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none"/></label>
            <label className="text-xs font-bold text-white/55">Costo proveedor<input type="number" value={supplierPrice} onChange={(e) => setSupplierPrice(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none"/></label>
            <label className="text-xs font-bold text-white/55">Stock<input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none"/></label>
            <label className="text-xs font-bold text-white/55">Precio actual<input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#171820] px-4 text-sm text-white outline-none"/></label>
          </div>
          <button onClick={() => void previewAction()} disabled={loading} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f4cf57] px-5 text-sm font-black text-black disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <ShieldCheck className="h-4 w-4"/>} Evaluar propuesta</button>
          {error ? <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</p> : null}
        </article>

        <div className="space-y-5">
          <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#f4cf57]"/><h2 className="text-lg font-black">Reglas activas</h2></div>
            <div className="mt-4 space-y-3 text-sm text-white/55">
              <p>• Margen mínimo: <b className="text-white">{policy?.safeguards.minimumMarginPercent ?? 25}%</b></p>
              <p>• Cambios de precio ≥ <b className="text-white">{policy?.safeguards.priceChangeThresholdPercent ?? 10}%</b> requieren aprobación.</p>
              <p>• Publicación de productos requiere aprobación explícita.</p>
              <p>• Secretos, sesiones y credenciales de pago están bloqueados.</p>
              <p>• Las acciones destructivas no forman parte de V2.</p>
            </div>
          </article>

          {preview ? <article className={`rounded-[2rem] border p-5 ${preview.decision?.allowed ? 'border-emerald-400/20 bg-emerald-400/[0.07]' : 'border-amber-300/20 bg-amber-300/[0.07]'}`}>
            <div className="flex items-start gap-3">{preview.decision?.allowed ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300"/> : <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300"/>}<div><h2 className="font-black">{preview.decision?.allowed ? 'Propuesta válida' : 'Propuesta bloqueada'}</h2><p className="mt-1 text-sm leading-6 text-white/55">{preview.nextStep}</p></div></div>
            {preview.decision ? <div className="mt-4 space-y-2 text-xs text-white/55"><p><b className="text-white">Permiso:</b> {preview.decision.permission}</p><p><b className="text-white">Aprobación:</b> {preview.decision.requiresApproval ? 'Sí' : 'No'}</p>{preview.decision.reasons?.length ? <div className="rounded-xl bg-black/20 p-3">{preview.decision.reasons.map((reason) => <p key={reason}>• {reason}</p>)}</div> : null}</div> : null}
          </article> : null}
        </div>
      </section>
    </section>
  </main>;
}
