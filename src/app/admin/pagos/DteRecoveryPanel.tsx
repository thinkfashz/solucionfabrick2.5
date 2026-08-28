'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, Loader2, Mail, RefreshCw, ReceiptText, TriangleAlert } from 'lucide-react';

type PendingDte = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentId: string;
  paymentStatus: string;
  orderStatus: string;
  requestedDocument: 'boleta' | 'factura';
  updatedAt: string;
  currentInvoice: null | {
    id: string;
    provider: string;
    siiStatus: string;
    folio: string;
    dteType: number;
  };
  reason: 'simulated' | 'missing';
};

type RecoveryPayload = {
  ok: boolean;
  billingConfigured: boolean;
  provider: string;
  pending: PendingDte[];
  error?: string;
};

type ReprocessResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  invoice?: {
    invoiceId?: string | null;
    folio?: string | null;
    provider?: string;
    dteType?: number | null;
    alreadyExisted?: boolean;
    upgradedFromMock?: boolean;
  };
  email?: { ok?: boolean; skipped?: boolean; reason?: string | null; error?: string | null };
};

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function DteRecoveryPanel() {
  const [data, setData] = useState<RecoveryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/payments/dte/reprocess', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => null) as RecoveryPayload | null;
      if (!response.ok || !payload) throw new Error(payload?.error || `HTTP ${response.status}`);
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los DTE pendientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function reprocess(orderId: string) {
    if (working) return;
    setWorking(orderId);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/payments/dte/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orderId }),
      });
      const payload = await response.json().catch(() => ({})) as ReprocessResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      const folio = payload.invoice?.folio ? ` Folio ${payload.invoice.folio}.` : '';
      const mail = payload.email?.ok ? ' Correo enviado al cliente.' : ' El DTE quedó guardado, pero el correo requiere revisión.';
      setMessage(`${payload.message || 'DTE real confirmado.'}${folio}${mail}`);
      await load();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'No se pudo emitir el DTE real.');
    } finally {
      setWorking(null);
    }
  }

  return <section className="mx-auto max-w-[1500px] px-4 pt-5 text-white md:px-6 lg:px-8">
    <div className="rounded-[1.8rem] border border-white/10 bg-[#101114] p-5 shadow-2xl md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300"><FileCheck2 className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">Recuperación tributaria</p></div>
          <h2 className="mt-2 text-2xl font-black tracking-[-.035em]">DTE pendientes o simulados</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Ventas ya pagadas que todavía no tienen un DTE real del SII. Cuando OpenFactura esté configurado, puedes convertir el comprobante simulado en boleta o factura real sin volver a cobrar ni duplicar la orden.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || Boolean(working)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[.12em] hover:bg-white/10 disabled:opacity-45">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}Actualizar</button>
      </div>

      {message ? <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.13em] ${data?.billingConfigured ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{data?.billingConfigured ? <CheckCircle2 className="h-3.5 w-3.5"/> : <TriangleAlert className="h-3.5 w-3.5"/>}{data?.billingConfigured ? 'OpenFactura listo' : 'OpenFactura pendiente'}</span>
        <span className="text-xs text-zinc-500">{data?.pending?.length ?? 0} venta(s) por regularizar</span>
      </div>

      {!data?.billingConfigured ? <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-xs leading-5 text-zinc-400">Carga primero API key, RUT emisor y razón social en el bloque <b className="text-amber-200">SII · Haulmer / OpenFactura</b> de arriba. Hasta entonces estos botones permanecen bloqueados y no se emite ningún documento real.</div> : null}

      {loading && !data ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-500"/></div> : null}

      {data && data.pending.length === 0 ? <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.045] p-5"><CheckCircle2 className="h-6 w-6 text-emerald-300"/><b className="mt-3 block">No hay ventas pagadas pendientes de DTE real.</b><p className="mt-1 text-xs leading-5 text-zinc-500">Las ventas recientes revisadas ya cuentan con documento tributario real o todavía no califican como pagadas.</p></div> : null}

      {data?.pending?.length ? <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {data.pending.map((item) => {
          const busy = working === item.orderId;
          const documentName = item.requestedDocument === 'factura' ? 'Factura' : 'Boleta';
          return <article key={item.orderId} className="rounded-2xl border border-white/8 bg-black/20 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-300">{documentName} · {item.reason === 'simulated' ? 'simulada' : 'sin DTE'}</p><h3 className="mt-1 break-all text-sm font-black text-white">{item.orderId}</h3><p className="mt-1 text-xs text-zinc-500">{item.customerName}{item.customerEmail ? ` · ${item.customerEmail}` : ''}</p></div>
              <b className="text-lg text-amber-200">{CLP.format(item.total)}</b>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white/[.035] p-3"><span className="block text-[9px] uppercase tracking-[.12em] text-zinc-600">Pago</span><b className="mt-1 block text-zinc-300">{item.paymentStatus || item.orderStatus || 'confirmado'}</b></div>
              <div className="rounded-xl bg-white/[.035] p-3"><span className="block text-[9px] uppercase tracking-[.12em] text-zinc-600">Documento actual</span><b className="mt-1 block text-zinc-300">{item.currentInvoice ? `${item.currentInvoice.provider} · ${item.currentInvoice.siiStatus}` : 'No registrado'}</b></div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
              <span className="inline-flex items-center gap-2 text-[10px] text-zinc-500"><Mail className="h-3.5 w-3.5"/>{item.customerEmail ? 'Se enviará el DTE al cliente' : 'La orden no tiene correo de cliente'}</span>
              <button type="button" onClick={() => void reprocess(item.orderId)} disabled={!data.billingConfigured || Boolean(working)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-black text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <ReceiptText className="h-4 w-4"/>}{busy ? 'Emitiendo…' : `Emitir ${documentName} real`}</button>
            </div>
          </article>;
        })}
      </div> : null}
    </div>
  </section>;
}
