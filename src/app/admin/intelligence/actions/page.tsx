'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Loader2, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

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
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
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

  const needsResource = useMemo(
    () => ['product.update', 'product.publish', 'stock.update', 'seo.update', 'blog.update'].includes(actionType),
    [actionType],
  );

  function buildPayload() {
    const payload: Record<string, unknown> = {};
    if (name.trim()) payload.name = name.trim();
    if (description.trim()) payload.description = description.trim();
    if (supplier.trim()) payload.supplier = supplier.trim();
    if (price) payload.price = Number(price);
    if (supplierPrice) payload.supplierPrice = Number(supplierPrice);
    if (stock) payload.stock = Number(stock);
    return payload;
  }

  function buildRequest() {
    return {
      action: { type: actionType, resourceId: resourceId.trim() || null, payload: buildPayload() },
      context: {
        currentPrice: currentPrice ? Number(currentPrice) : null,
        supplierPrice: supplierPrice ? Number(supplierPrice) : null,
      },
    };
  }

  async function previewAction() {
    setLoading(true);
    setError('');
    setPreview(null);
    setSavedId('');
    try {
      const res = await fetch('/api/admin/intelligence/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest()),
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

  async function saveProposal() {
    setSaving(true);
    setError('');
    setSavedId('');
    try {
      const res = await fetch('/api/admin/intelligence/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.decision?.reasons?.join(' ') || 'No se pudo guardar la propuesta.');
      setSavedId(json.proposal?.id || 'ok');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando propuesta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Action Lab"
        title="Propuesta antes de ejecución"
        description="Evalúa una acción contra Policy Engine y, si corresponde, envíala a la cola de aprobación. La ejecución real permanece separada y auditada."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Centro Intelligence
            </Link>
            <Link href="/admin/intelligence/proposals" className="rounded-xl bg-[#171612] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#2b2924]">
              Cola de aprobación
            </Link>
          </div>
        )}
      />

      <AdminStats>
        <AdminStat label="Rol evaluado" value={policy?.role || '—'} note="Identidad activa del Policy Engine" icon={Bot} />
        <AdminStat label="Permisos" value={policy?.permissions.length ?? '—'} note="Permisos visibles para la sesión" icon={ShieldCheck} />
        <AdminStat label="Margen mínimo" value={`${policy?.safeguards.minimumMarginPercent ?? 25}%`} note="Umbral comercial de seguridad" icon={Sparkles} />
        <AdminStat label="Cambio de precio" value={`${policy?.safeguards.priceChangeThresholdPercent ?? 10}%`} note="Desde este umbral requiere aprobación" icon={TriangleAlert} />
      </AdminStats>

      {error ? <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {savedId ? (
        <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          Propuesta guardada. <Link href="/admin/intelligence/proposals" className="font-black underline">Abrir cola de aprobación</Link>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <AdminSurface title="Crear propuesta" description="Describe el cambio. Evaluar nunca ejecuta la acción; solo devuelve la decisión de política.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Acción">
              <select value={actionType} onChange={(event) => setActionType(event.target.value)} className="fabrick-action-input">
                {ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="ID del recurso">
              <input value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder={needsResource ? 'Requerido' : 'Opcional'} className="fabrick-action-input" />
            </Field>
            <Field label="Nombre / título">
              <input value={name} onChange={(event) => setName(event.target.value)} className="fabrick-action-input" />
            </Field>
            <Field label="Proveedor">
              <input value={supplier} onChange={(event) => setSupplier(event.target.value)} className="fabrick-action-input" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descripción">
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="fabrick-action-input h-auto min-h-28 py-3" />
              </Field>
            </div>
            <Field label="Precio propuesto">
              <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="fabrick-action-input" />
            </Field>
            <Field label="Costo proveedor">
              <input type="number" value={supplierPrice} onChange={(event) => setSupplierPrice(event.target.value)} className="fabrick-action-input" />
            </Field>
            <Field label="Stock">
              <input type="number" value={stock} onChange={(event) => setStock(event.target.value)} className="fabrick-action-input" />
            </Field>
            <Field label="Precio actual">
              <input type="number" value={currentPrice} onChange={(event) => setCurrentPrice(event.target.value)} className="fabrick-action-input" />
            </Field>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void previewAction()}
              disabled={loading || saving}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#c77a00]/25 bg-[#fff7e8] px-5 text-sm font-black text-[#9b6a12] transition hover:bg-[#fff0cf] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Evaluar
            </button>
            <button
              type="button"
              onClick={() => void saveProposal()}
              disabled={loading || saving || preview?.decision?.allowed === false}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c77a00] px-5 text-sm font-black text-white transition hover:bg-[#a96500] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Guardar propuesta
            </button>
          </div>
        </AdminSurface>

        <div className="space-y-5">
          <AdminSurface title="Reglas activas" description="Límites duros que el agente no puede saltarse desde este laboratorio.">
            <div className="space-y-3 text-sm leading-6 text-[#716b60]">
              <Rule ok text={`Margen mínimo: ${policy?.safeguards.minimumMarginPercent ?? 25}%`} />
              <Rule ok text={`Cambios de precio ≥ ${policy?.safeguards.priceChangeThresholdPercent ?? 10}% requieren aprobación.`} />
              <Rule ok text="Publicación de productos requiere aprobación explícita." />
              <Rule ok text="Secretos, sesiones y credenciales de pago están bloqueados." />
              <Rule ok text="Las acciones destructivas no forman parte de V2." />
            </div>
          </AdminSurface>

          {preview ? (
            <AdminSurface
              title={preview.decision?.allowed ? 'Propuesta válida' : 'Propuesta bloqueada'}
              description={preview.nextStep}
              className={preview.decision?.allowed ? 'border-emerald-200 bg-emerald-50/65' : 'border-amber-200 bg-amber-50/70'}
            >
              <div className="flex items-start gap-3">
                {preview.decision?.allowed
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  : <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
                <div className="space-y-2 text-xs leading-5 text-[#716b60]">
                  <p><b className="text-[#171612]">Permiso:</b> {preview.decision?.permission || 'N/D'}</p>
                  <p><b className="text-[#171612]">Aprobación:</b> {preview.decision?.requiresApproval ? 'Sí' : 'No'}</p>
                  {preview.decision?.reasons?.length ? (
                    <div className="rounded-xl border border-black/8 bg-white/60 p-3">
                      {preview.decision.reasons.map((reason) => <p key={reason}>• {reason}</p>)}
                    </div>
                  ) : null}
                </div>
              </div>
            </AdminSurface>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        :global(.fabrick-action-input) {
          margin-top: .5rem;
          min-height: 3rem;
          width: 100%;
          border-radius: .75rem;
          border: 1px solid rgba(23, 22, 18, .12);
          background: rgba(255, 255, 255, .82);
          padding-left: .875rem;
          padding-right: .875rem;
          color: #171612;
          font-size: .875rem;
          outline: none;
        }
        :global(.fabrick-action-input:focus) { border-color: rgba(199, 122, 0, .55); }
      `}</style>
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-bold text-[#716b60]">{label}{children}</label>;
}

function Rule({ text }: { ok: boolean; text: string }) {
  return <p><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-700" />{text}</p>;
}
