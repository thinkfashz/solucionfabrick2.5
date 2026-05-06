'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface ItemDraft {
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
}

interface PresupuestoCreated {
  id: string;
  slug: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  total: number;
  expira_at: string;
}

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

const buildWhatsappLink = (phone: string, name: string, link: string) => {
  const cleanedPhone = phone.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(
    `Hola ${name}, te comparto tu presupuesto de Soluciones Fabrick: ${link}\n\n` +
      `Importante: el enlace caduca automáticamente en 5 días por la rotación de precios de materiales. ` +
      `Cualquier duda quedo atento.`,
  );
  return cleanedPhone
    ? `https://wa.me/${cleanedPhone}?text=${text}`
    : `https://wa.me/?text=${text}`;
};

export default function CrearPresupuestoPage() {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notas, setNotas] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PresupuestoCreated | null>(null);
  const [link, setLink] = useState<string>('');
  const [copyOk, setCopyOk] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const itemsTotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const c = Number(it.cantidad) || 0;
      const p = Number(it.precio_unitario) || 0;
      return sum + c * p;
    }, 0);
  }, [items]);

  function addItem() {
    setItems((prev) => [...prev, { descripcion: '', cantidad: '1', precio_unitario: '' }]);
  }
  function updateItem(i: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailMsg(null);
    if (!customerName.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    const totalNum = Number(montoTotal);
    const payload = {
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim() || null,
      customer_phone: customerPhone.trim() || null,
      notas: notas.trim() || null,
      items: items
        .filter((it) => it.descripcion.trim().length > 0)
        .map((it) => ({
          descripcion: it.descripcion.trim(),
          cantidad: Number(it.cantidad) || 0,
          precio_unitario: Number(it.precio_unitario) || 0,
        })),
      total: Number.isFinite(totalNum) && totalNum > 0 ? totalNum : undefined,
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error ?? `Error ${res.status}`);
        return;
      }
      const presupuesto = (json as { presupuesto: PresupuestoCreated }).presupuesto;
      const linkOut = (json as { link: string }).link;
      setCreated(presupuesto);
      setLink(linkOut);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function handleSendEmail() {
    if (!created) return;
    setEmailMsg(null);
    setEmailing(true);
    try {
      const res = await fetch('/api/send-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: created.slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailMsg(`✕ ${(json as { error?: string }).error ?? `Error ${res.status}`}`);
        return;
      }
      setEmailMsg(`✓ Email enviado a ${(json as { to?: string }).to ?? created.customer_email ?? ''}`);
    } catch (err) {
      setEmailMsg(`✕ ${(err as Error).message}`);
    } finally {
      setEmailing(false);
    }
  }

  function resetAll() {
    setCreated(null);
    setLink('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setMontoTotal('');
    setNotas('');
    setItems([]);
    setError(null);
    setEmailMsg(null);
  }

  const expiraFormatted = created?.expira_at
    ? new Date(created.expira_at).toLocaleString('es-CL', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '';

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Presupuestos · Autodestrucción 5 días"
        title="Generar y enviar presupuesto"
        description="Crea un presupuesto, genera un link único y compártelo por WhatsApp o email. El enlace caduca automáticamente a los 5 días."
        icon={FileText}
      />

      {!created ? (
        <AdminMotion>
          <AdminCard>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nombre del cliente *"
                  value={customerName}
                  onChange={setCustomerName}
                  placeholder="Juan Pérez"
                  required
                />
                <Input
                  label="Teléfono (con código de país)"
                  value={customerPhone}
                  onChange={setCustomerPhone}
                  placeholder="+56 9 1234 5678"
                  type="tel"
                />
                <Input
                  label="Email"
                  value={customerEmail}
                  onChange={setCustomerEmail}
                  placeholder="cliente@ejemplo.cl"
                  type="email"
                />
                <Input
                  label="Monto total (CLP)"
                  value={montoTotal}
                  onChange={setMontoTotal}
                  placeholder={itemsTotal > 0 ? String(Math.round(itemsTotal)) : '0'}
                  type="number"
                  hint={
                    itemsTotal > 0
                      ? `Sugerido por items: ${formatCLP(itemsTotal)}`
                      : 'Si dejas en blanco, se sumarán los items'
                  }
                />
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-black/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                    Items / materiales (opcional)
                  </p>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-200 transition hover:bg-amber-400/20"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar item
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    Sin items: solo se guardará el monto total. Agrega items si quieres detallar materiales y
                    cantidades en el presupuesto público.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-2"
                      >
                        <input
                          className="col-span-6 rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
                          placeholder="Descripción"
                          value={it.descripcion}
                          onChange={(e) => updateItem(i, { descripcion: e.target.value })}
                        />
                        <input
                          className="col-span-2 rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
                          placeholder="Cant."
                          type="number"
                          value={it.cantidad}
                          onChange={(e) => updateItem(i, { cantidad: e.target.value })}
                        />
                        <input
                          className="col-span-3 rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
                          placeholder="Precio unitario"
                          type="number"
                          value={it.precio_unitario}
                          onChange={(e) => updateItem(i, { precio_unitario: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          aria-label="Eliminar item"
                          className="col-span-1 inline-flex items-center justify-center rounded-lg border border-neutral-800 bg-black/40 text-neutral-400 transition hover:border-red-500/40 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Textarea
                label="Notas para el cliente (opcional)"
                value={notas}
                onChange={setNotas}
                placeholder="Detalles, condiciones de pago, plazos..."
              />

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-neutral-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generando…
                  </>
                ) : (
                  'Generar Presupuesto'
                )}
              </button>
            </form>
          </AdminCard>
        </AdminMotion>
      ) : (
        <AdminMotion>
          <AdminCard>
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-semibold">Presupuesto guardado correctamente</p>
                </div>
                <p className="mt-1 text-xs text-emerald-200/80">
                  Caduca el <strong>{expiraFormatted}</strong> (5 días desde ahora).
                </p>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  Link del presupuesto
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-black/60 p-2">
                  <code className="flex-1 truncate px-2 text-sm text-amber-200">{link}</code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-200 transition hover:border-amber-400/50 hover:text-amber-200"
                  >
                    {copyOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copyOk ? 'Copiado' : 'Copiar'}
                  </button>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-200 transition hover:border-amber-400/50 hover:text-amber-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <a
                  href={buildWhatsappLink(created.customer_phone ?? '', created.customer_name, link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-4 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar por WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailing || !created.customer_email}
                  title={!created.customer_email ? 'El cliente no tiene email registrado' : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-4 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Enviar por Email (Resend)
                </button>
              </div>

              {emailMsg ? (
                <p
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    emailMsg.startsWith('✓')
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/30 bg-red-500/10 text-red-200'
                  }`}
                >
                  {emailMsg}
                </p>
              ) : null}

              <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                <p className="text-xs text-neutral-500">
                  Total: <span className="text-amber-300">{formatCLP(Number(created.total) || 0)}</span>
                </p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-300 transition hover:border-amber-400/40 hover:text-amber-200"
                >
                  Crear otro presupuesto
                </button>
              </div>
            </div>
          </AdminCard>
        </AdminMotion>
      )}
    </AdminPage>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      <input
        className="rounded-xl border border-neutral-800 bg-black/60 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/50"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
      {hint ? <span className="text-[11px] text-neutral-500">{hint}</span> : null}
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      <textarea
        rows={3}
        className="rounded-xl border border-neutral-800 bg-black/60 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
