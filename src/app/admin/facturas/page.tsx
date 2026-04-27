'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, RefreshCcw, AlertCircle } from 'lucide-react';

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

const DTE_NAMES: Record<number, string> = {
  33: 'Factura',
  34: 'Factura exenta',
  39: 'Boleta',
  41: 'Boleta exenta',
  56: 'Nota de débito',
  61: 'Nota de crédito',
};

/**
 * Listado de facturas (épica 1). Lectura simple desde InsForge a través del
 * SQL admin endpoint que ya existe (`/api/admin/sql`). Esto evita duplicar
 * un endpoint específico mientras la épica está en modo simulado.
 */
export default function AdminFacturasPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [billingStatus, setBillingStatus] = useState<{ provider: string; configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
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

      setBillingStatus(statusRes);
      if (sqlRes?.error) {
        setError(sqlRes.error);
      } else {
        setRows((sqlRes?.rows ?? sqlRes?.data ?? []) as InvoiceRow[]);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-zinc-100">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileText className="text-yellow-400" /> Facturas electrónicas
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            DTE emitidos por el proveedor configurado. Para emitir/anular masivamente, usá el
            endpoint correspondiente del proveedor.
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

      {billingStatus && !billingStatus.configured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <AlertCircle size={16} className="mt-0.5" />
          <div>
            <p className="font-semibold">Modo simulado ({billingStatus.provider})</p>
            <p className="text-xs text-yellow-200/80">
              Configurá <code>BILLING_PROVIDER</code>, <code>BILLING_API_KEY</code> y{' '}
              <code>BILLING_RUT_EMISOR</code> para emitir DTE reales contra el SII.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
          <p className="mt-1 text-xs text-red-200/70">
            ¿Tabla <code>invoices</code> no creada? Andá a{' '}
            <Link href="/admin/setup" className="underline">/admin/setup</Link> y crea las tablas.
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
              <th className="px-3 py-2"></th>
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
                <tr key={r.id} className="border-t border-zinc-800/60">
                  <td className="px-3 py-2">{DTE_NAMES[r.dte_type] ?? r.dte_type}</td>
                  <td className="px-3 py-2 font-mono">{r.folio ?? '—'}</td>
                  <td className="px-3 py-2">{r.rut_receptor ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    ${Math.round(Number(r.total ?? 0)).toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        r.voided
                          ? 'bg-red-500/15 text-red-300'
                          : r.sii_status === 'accepted' || r.sii_status === 'accepted_mock'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-700/50 text-zinc-300'
                      }`}
                    >
                      {r.voided ? 'Anulada' : r.sii_status ?? 'pending'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {new Date(r.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.pdf_url ? (
                      <Link
                        href={`/api/invoices/${r.id}/pdf${r.pdf_token ? `?token=${encodeURIComponent(r.pdf_token)}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-yellow-400 hover:underline"
                      >
                        PDF
                      </Link>
                    ) : null}
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
