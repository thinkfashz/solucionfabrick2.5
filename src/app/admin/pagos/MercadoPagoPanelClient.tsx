'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
  XCircle,
} from 'lucide-react';

type NativeState = 'approved' | 'pending' | 'failed';
type Filter = 'all' | NativeState | 'transfer';

type PaymentRow = {
  id: string;
  externalReference?: string | null;
  amount: number;
  netAmount?: number | null;
  currency?: string | null;
  status?: string | null;
  statusDetail?: string | null;
  description?: string | null;
  paymentMethod?: string | null;
  paymentType?: string | null;
  dateCreated?: string | null;
  dateApproved?: string | null;
  dateLastUpdated?: string | null;
  moneyReleaseDate?: string | null;
  nativeState: NativeState;
  isTransfer: boolean;
  liveMode: boolean;
};

type PaymentData = {
  ok: boolean;
  engine: string;
  provider: 'mercadopago';
  providerRequired: true;
  sourceOfTruth: 'mercadopago-api';
  credentialSource: 'tenant-encrypted' | 'vercel-env' | 'encrypted-db';
  webhookSignatureConfigured: boolean;
  mode: 'production' | 'test' | 'unknown';
  paging?: { total?: number; limit?: number; offset?: number };
  kpis: {
    approved: number;
    pending: number;
    failed: number;
    transfers: number;
    approvedVolume: number;
    netReceivedVolume: number;
    total: number;
  };
  novedades: Array<{ type: string; title: string; detail: string }>;
  payments: PaymentRow[];
};

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'pending', label: 'En proceso' },
  { id: 'failed', label: 'Fallidos' },
  { id: 'transfer', label: 'Transferencias' },
];

function money(value: number, currency = 'CLP') {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(value || 0);
}

function dateTime(value?: string | null) {
  if (!value) return 'Sin fecha';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

function humanMethod(row: PaymentRow) {
  if (row.isTransfer) return 'Transferencia';
  if (row.paymentType === 'credit_card') return 'Tarjeta de crédito';
  if (row.paymentType === 'debit_card') return 'Tarjeta de débito';
  if (row.paymentType === 'account_money') return 'Dinero en cuenta';
  return row.paymentMethod || row.paymentType || 'Mercado Pago';
}

function StatusBadge({ state }: { state: NativeState }) {
  const map = {
    approved: { label: 'Aprobado', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200', Icon: CheckCircle2 },
    pending: { label: 'En proceso', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-200', Icon: Clock3 },
    failed: { label: 'Fallido', cls: 'border-rose-400/30 bg-rose-400/10 text-rose-200', Icon: XCircle },
  } as const;
  const item = map[state];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${item.cls}`}><item.Icon className="h-3.5 w-3.5" />{item.label}</span>;
}

export default function MercadoPagoPanelClient() {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PaymentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payments/native', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json().catch(() => null) as PaymentData | { error?: string } | null;
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error || `HTTP ${res.status}`);
      setData(json as PaymentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar Mercado Pago.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.payments ?? []).filter((row) => {
      if (filter === 'transfer' && !row.isTransfer) return false;
      if (filter !== 'all' && filter !== 'transfer' && row.nativeState !== filter) return false;
      if (!q) return true;
      return [row.id, row.externalReference, row.description, row.paymentMethod, row.statusDetail]
        .some((value) => String(value ?? '').toLowerCase().includes(q));
    });
  }, [data, filter, query]);

  const k = data?.kpis;
  const credentialLabel = data?.credentialSource === 'vercel-env'
    ? 'Vercel Environment'
    : data?.credentialSource === 'tenant-encrypted'
      ? 'Credencial cifrada por tenant'
      : data?.credentialSource === 'encrypted-db'
        ? 'Credencial cifrada del servidor'
        : 'Servidor';

  return (
    <div className="min-h-screen px-4 py-6 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(0,168,255,0.15),transparent_34%),linear-gradient(135deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] p-6 shadow-2xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Fuente de verdad · Mercado Pago
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Centro de pagos protegido</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
                Fabrick no aprueba, rechaza ni fabrica estados de pago. Este panel consulta directamente la API de Mercado Pago y solo muestra la información financiera que el proveedor confirma.
              </p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-300/40 hover:bg-sky-300/10 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Consultar Mercado Pago
            </button>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"><TriangleAlert className="mr-2 inline h-4 w-4" />{error}</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={CircleDollarSign} label="Ingresado neto" value={money(k?.netReceivedVolume ?? 0)} detail={`${k?.approved ?? 0} pagos aprobados`} tone="emerald" />
          <Metric icon={CheckCircle2} label="Aprobados" value={String(k?.approved ?? 0)} detail={money(k?.approvedVolume ?? 0)} tone="emerald" />
          <Metric icon={Clock3} label="En proceso" value={String(k?.pending ?? 0)} detail="Estado de Mercado Pago" tone="amber" />
          <Metric icon={XCircle} label="Fallidos" value={String(k?.failed ?? 0)} detail="Rechazados o revertidos" tone="rose" />
          <Metric icon={ArrowRightLeft} label="Transferencias" value={String(k?.transfers ?? 0)} detail={`${k?.total ?? 0} movimientos disponibles`} tone="sky" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_370px]">
          <div className="min-w-0 rounded-[2rem] border border-white/10 bg-zinc-950/75 p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${filter === item.id ? 'bg-sky-300 text-black' : 'border border-white/10 bg-white/5 text-zinc-400 hover:text-white'}`}>{item.label}</button>)}
              </div>
              <label className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 lg:w-80">
                <Search className="h-4 w-4 text-zinc-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ID, pedido, descripción o estado" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
              </label>
            </div>

            <div className="mt-4 space-y-2">
              {loading ? <div className="grid min-h-64 place-items-center gap-3 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /><span className="text-xs">Consultando api.mercadopago.com…</span></div> : null}
              {!loading && filtered.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-zinc-500">No hay movimientos para este filtro.</div> : null}
              {filtered.map((row) => (
                <button key={row.id} type="button" onClick={() => setSelected(row)} className="grid w-full gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-left transition hover:border-sky-300/25 hover:bg-white/[0.04] md:grid-cols-[minmax(0,1.4fr)_150px_140px_120px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="truncate font-bold text-white">{row.description || `Pago ${row.id}`}</p>{row.isTransfer ? <ArrowRightLeft className="h-3.5 w-3.5 text-sky-300" /> : null}</div>
                    <p className="mt-1 truncate text-xs text-zinc-500">MP #{row.id}{row.externalReference ? ` · Pedido ${row.externalReference}` : ''}</p>
                  </div>
                  <div><p className="text-sm font-black text-white">{money(row.amount, row.currency || 'CLP')}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{humanMethod(row)}</p></div>
                  <StatusBadge state={row.nativeState} />
                  <p className="text-xs text-zinc-500 md:text-right">{dateTime(row.dateLastUpdated || row.dateCreated)}</p>
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-5">
              <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-sky-300" /><h2 className="text-lg font-black">Novedades</h2></div>
              <div className="mt-4 space-y-3">
                {(data?.novedades ?? []).length === 0 ? <p className="text-sm leading-6 text-zinc-500">Sin alertas importantes en la ventana consultada.</p> : null}
                {(data?.novedades ?? []).map((news, index) => <div key={`${news.title}-${index}`} className="rounded-2xl border border-white/10 bg-black/35 p-4"><p className="text-sm font-bold text-white">{news.title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{news.detail}</p></div>)}
              </div>
            </div>

            <div className="rounded-[2rem] border border-sky-300/20 bg-sky-300/[0.06] p-5">
              <ShieldCheck className="h-5 w-5 text-sky-300" />
              <h2 className="mt-3 text-lg font-black">Modelo de seguridad</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
                <SecurityLine icon={Server} label="Origen de datos" value="API oficial de Mercado Pago" />
                <SecurityLine icon={KeyRound} label="Access Token" value={credentialLabel} />
                <SecurityLine icon={ShieldCheck} label="Webhooks firmados" value={data?.webhookSignatureConfigured ? 'Configurados' : 'Pendiente de configurar'} />
                <SecurityLine icon={WalletCards} label="Tarjetas / CVV" value="No se almacenan en Fabrick" />
              </div>
              <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-zinc-500">
                El panel no tiene botones para aprobar, fallar o registrar pagos manualmente. Un estado financiero solo cambia cuando Mercado Pago lo informa.
              </p>
            </div>
          </aside>
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm md:items-center" onMouseDown={(e) => { if (e.currentTarget === e.target) setSelected(null); }}>
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-zinc-950 p-5 shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Detalle confirmado por Mercado Pago</p><h3 className="mt-2 text-2xl font-black">{selected.description || `Pago ${selected.id}`}</h3><p className="mt-1 text-xs text-zinc-500">Payment ID #{selected.id}</p></div><StatusBadge state={selected.nativeState} /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Monto" value={money(selected.amount, selected.currency || 'CLP')} />
              <Info label="Neto recibido" value={selected.netAmount ? money(selected.netAmount, selected.currency || 'CLP') : 'No informado'} />
              <Info label="Pedido / referencia externa" value={selected.externalReference || 'Sin referencia'} />
              <Info label="Medio de pago" value={humanMethod(selected)} />
              <Info label="Estado técnico" value={selected.status || 'unknown'} />
              <Info label="Detalle del estado" value={selected.statusDetail || 'Sin detalle'} />
              <Info label="Creado" value={dateTime(selected.dateCreated)} />
              <Info label="Aprobado" value={dateTime(selected.dateApproved)} />
              <Info label="Última actualización" value={dateTime(selected.dateLastUpdated)} />
              <Info label="Liberación del dinero" value={dateTime(selected.moneyReleaseDate)} />
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-xs leading-5 text-emerald-100/75">
              <ShieldCheck className="mr-2 inline h-4 w-4" />Este detalle es de solo lectura. Fabrick no puede convertir este pago en aprobado desde el panel.
            </div>
            <button type="button" onClick={() => setSelected(null)} className="mt-4 w-full rounded-full border border-white/10 px-4 py-3 text-xs font-bold text-zinc-400 hover:text-white">Cerrar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof CheckCircle2; label: string; value: string; detail: string; tone: 'emerald' | 'amber' | 'rose' | 'sky' }) {
  const tones = { emerald: 'text-emerald-300', amber: 'text-amber-300', rose: 'text-rose-300', sky: 'text-sky-300' };
  return <div className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p><Icon className={`h-4 w-4 ${tones[tone]}`} /></div><p className="mt-3 text-2xl font-black text-white md:text-3xl">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">{label}</p><p className="mt-2 break-words text-sm font-bold text-white">{value}</p></div>;
}

function SecurityLine({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</p><p className="text-xs font-semibold text-zinc-300">{value}</p></div></div>;
}
