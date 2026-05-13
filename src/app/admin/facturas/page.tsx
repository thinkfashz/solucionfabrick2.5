'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  RefreshCcw,
  AlertCircle,
  Plus,
  X,
  Trash2,
  Send,
  Ban,
  CheckCircle2,
} from 'lucide-react';

interface InvoiceRow {
  id: string;
  order_id: string | null;
  dte_type: number;
  folio: string | null;
  rut_receptor: string | null;
  total: number;
  sii_status: string | null;
  pdf_url: string | null;
  pdf_token: string | null;
  voided: boolean;
  created_at: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  exempt: boolean;
}

const DTE_NAMES: Record<number, string> = {
  33: 'Factura',
  34: 'Factura exenta',
  39: 'Boleta',
  41: 'Boleta exenta',
  56: 'Nota de débito',
  61: 'Nota de crédito',
};

const EMPTY_ITEM: LineItem = { description: '', quantity: 1, unit_price: 0, exempt: false };

function formatCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

// ── Emit form ─────────────────────────────────────────────────────────────────

function EmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dteType, setDteType] = useState<number>(39);
  const [orderId, setOrderId] = useState('');
  const [rutReceptor, setRutReceptor] = useState('');
  const [razonSocial, setRazonSocial] = useState('Consumidor Final');
  const [giro, setGiro] = useState('');
  const [direccion, setDireccion] = useState('');
  const [comuna, setComuna] = useState('');
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);

  const isFact = dteType === 33 || dteType === 34;

  const updateItem = (i: number, field: keyof LineItem, val: string | number | boolean) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  };
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/billing/emit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dte_type: dteType,
          order_id: orderId || crypto.randomUUID(),
          rut_receptor: isFact ? rutReceptor : (rutReceptor || undefined),
          razon_social_receptor: razonSocial || undefined,
          giro_receptor: giro || undefined,
          direccion_receptor: direccion || undefined,
          comuna_receptor: comuna || undefined,
          email_receptor: email || undefined,
          items: items.map((it) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            exempt: it.exempt,
          })),
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al emitir');
      setOpen(false);
      setItems([{ ...EMPTY_ITEM }]);
      setOrderId('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-yellow-300 transition-colors"
      >
        <Plus size={14} /> Emitir DTE
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mb-6 rounded-2xl border border-yellow-400/30 bg-zinc-900/80 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-yellow-400 flex items-center gap-2">
          <Send size={16} /> Emitir nuevo DTE
        </h2>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">Tipo de DTE</label>
          <select
            value={dteType}
            onChange={(e) => setDteType(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
          >
            {Object.entries(DTE_NAMES).map(([k, v]) => (
              <option key={k} value={k}>{k} — {v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">
            RUT receptor {isFact && <span className="text-red-400">*</span>}
          </label>
          <input
            value={rutReceptor}
            onChange={(e) => setRutReceptor(e.target.value)}
            placeholder="12345678-9"
            required={isFact}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
          />
        </div>

        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">Razón social</label>
          <input
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            placeholder="Consumidor Final"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
          />
        </div>

        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">Email receptor</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@email.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
          />
        </div>

        {isFact && (
          <>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Giro</label>
              <input
                value={giro}
                onChange={(e) => setGiro(e.target.value)}
                placeholder="Comercio al por menor"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Dirección</label>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. Principal 123"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Comuna</label>
              <input
                value={comuna}
                onChange={(e) => setComuna(e.target.value)}
                placeholder="Santiago"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">ID pedido (opcional)</label>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="UUID del pedido"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
          />
        </div>
      </div>

      {/* Items */}
      <div className="mb-3">
        <div className="mb-1 grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="col-span-5">Descripción</span>
          <span className="col-span-2 text-right">Cantidad</span>
          <span className="col-span-2 text-right">Precio unit. (CLP)</span>
          <span className="col-span-2 text-center">Exento</span>
          <span className="col-span-1" />
        </div>
        {items.map((item, i) => (
          <div key={i} className="mb-1.5 grid grid-cols-12 gap-2 items-center">
            <input
              value={item.description}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              required
              placeholder="Nombre del producto"
              className="col-span-5 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
            />
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
              className="col-span-2 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-yellow-400/50"
            />
            <input
              type="number"
              min={0}
              value={item.unit_price}
              onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
              className="col-span-2 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-yellow-400/50"
            />
            <div className="col-span-2 flex justify-center">
              <input
                type="checkbox"
                checked={item.exempt}
                onChange={(e) => updateItem(i, 'exempt', e.target.checked)}
                className="accent-yellow-400"
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
              className="col-span-1 flex justify-end text-zinc-600 hover:text-red-400 disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400 hover:text-yellow-400"
        >
          <Plus size={12} /> Agregar ítem
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-1.5 text-xs font-bold text-black hover:bg-yellow-300 disabled:opacity-60"
        >
          <Send size={13} />
          {sending ? 'Emitiendo…' : 'Emitir DTE'}
        </button>
      </div>
    </form>
  );
}

// ── Void dialog ───────────────────────────────────────────────────────────────

function VoidButton({ invoice, onVoided }: { invoice: InvoiceRow; onVoided: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoid = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/billing/void', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id, reason }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al anular');
      setOpen(false);
      onVoided();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
        title="Anular DTE"
      >
        <Ban size={12} /> Anular
      </button>
    );
  }

  return (
    <div className="min-w-[220px] rounded-xl border border-red-500/30 bg-zinc-900 p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-red-300 text-xs">Anular folio {invoice.folio}</p>
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo de anulación"
        className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:outline-none focus:border-red-400/50"
      />
      {error && <p className="mb-1.5 text-[10px] text-red-400">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void handleVoid()}
          disabled={loading || !reason.trim()}
          className="flex-1 rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-400 disabled:opacity-50"
        >
          {loading ? 'Anulando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminFacturasPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [billingStatus, setBillingStatus] = useState<{ provider: string; configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, sqlRes] = await Promise.all([
        fetch('/api/billing/status').then((r) => r.json()),
        fetch('/api/admin/sql', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query:
              'SELECT id, order_id, dte_type, folio, rut_receptor, total, sii_status, pdf_url, pdf_token, voided, created_at FROM invoices ORDER BY created_at DESC LIMIT 200',
          }),
        }).then((r) => r.json()),
      ]);

      setBillingStatus(statusRes as { provider: string; configured: boolean });
      const sqlData = sqlRes as { error?: string; rows?: InvoiceRow[]; data?: InvoiceRow[] };
      if (sqlData.error) {
        setError(sqlData.error);
      } else {
        setRows((sqlData.rows ?? sqlData.data ?? []) as InvoiceRow[]);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-zinc-100">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileText className="text-yellow-400" /> Facturas electrónicas
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            DTE emitidos a través de{' '}
            <span className="text-yellow-400 font-semibold">
              {billingStatus?.provider ?? '…'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs hover:bg-zinc-800"
        >
          <RefreshCcw size={14} /> Refrescar
        </button>
      </header>

      {/* Billing status banner */}
      {billingStatus && !billingStatus.configured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Modo simulado ({billingStatus.provider})</p>
            <p className="text-xs text-yellow-200/80">
              Configurá <code>BILLING_PROVIDER=haulmer</code>, <code>BILLING_API_KEY</code> y{' '}
              <code>BILLING_RUT_EMISOR</code> en Vercel para emitir DTE reales contra el SII.
            </p>
          </div>
        </div>
      )}

      {billingStatus?.configured && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <p>
            <strong>Haulmer activo</strong> — las emisiones van contra el SII en tiempo real.
          </p>
        </div>
      )}

      {/* Emit form */}
      <EmitForm onSuccess={() => void load()} />

      {error && (
        <div className="my-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
          <p className="mt-1 text-xs text-red-200/70">
            ¿Tabla <code>invoices</code> no creada? Andá a{' '}
            <Link href="/admin/setup" className="underline">/admin/setup</Link>.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Folio</th>
              <th className="px-3 py-2 text-left">RUT receptor</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">SII</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">Cargando…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  Aún no hay facturas emitidas.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-zinc-800/60 ${r.voided ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-2">{DTE_NAMES[r.dte_type] ?? r.dte_type}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.folio ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.rut_receptor ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCLP(Number(r.total ?? 0))}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        r.voided
                          ? 'bg-red-500/15 text-red-300'
                          : r.sii_status === 'accepted' || r.sii_status === 'accepted_mock'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : r.sii_status === 'rejected'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-zinc-700/50 text-zinc-300'
                      }`}
                    >
                      {r.voided ? 'Anulada' : r.sii_status ?? 'pending'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {new Date(r.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3">
                      {r.pdf_url && (
                        <Link
                          href={`/api/invoices/${r.id}/pdf${r.pdf_token ? `?token=${encodeURIComponent(r.pdf_token)}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-yellow-400 hover:underline"
                        >
                          PDF
                        </Link>
                      )}
                      {!r.voided && r.dte_type !== 61 && (
                        <VoidButton invoice={r} onVoided={() => void load()} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
