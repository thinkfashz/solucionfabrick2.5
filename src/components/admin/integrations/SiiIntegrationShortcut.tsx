'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileKey2, Loader2, Settings2, TriangleAlert } from 'lucide-react';

type BillingStatus = {
  configured?: boolean;
  simulated?: boolean;
  provider_name?: string;
  source?: string;
  missing?: string[];
};

export default function SiiIntegrationShortcut() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  useEffect(() => {
    let active = true;
    void fetch('/api/billing/status', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (active) setStatus(data); })
      .catch(() => { if (active) setStatus({ configured: false }); });
    return () => { active = false; };
  }, []);

  return <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.4rem] border border-amber-300/25 bg-[linear-gradient(135deg,rgba(255,176,0,.10),rgba(255,255,255,.92))] p-4 text-[#171612] shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#171612] text-amber-300"><FileKey2 className="h-5 w-5"/></span>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">SII · Haulmer / OpenFactura</b>{status ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] ${status.configured ? 'bg-emerald-500/10 text-emerald-800' : 'bg-amber-500/10 text-amber-800'}`}>{status.configured ? <CheckCircle2 className="h-3 w-3"/> : <TriangleAlert className="h-3 w-3"/>}{status.configured ? 'DTE real' : 'Modo comprobante'}</span> : <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700"/>}</div><p className="mt-1 text-xs leading-5 text-black/55">Boletas y facturas electrónicas. Las credenciales se guardan cifradas en Insforge; Mercado Pago continúa administrado desde Vercel.</p>{status?.source ? <span className="mt-1 block text-[10px] font-bold text-black/40">Fuente DTE: {status.source}</span> : null}</div>
      </div>
      <Link href="/admin/pagos#dte" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><Settings2 className="h-4 w-4"/>Configurar DTE</Link>
    </div>
  </div>;
}
