'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Banknote,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
  XCircle,
} from 'lucide-react';

type NativeState = 'approved' | 'pending' | 'failed';
type Filter = 'all' | NativeState | 'transfer';

type PaymentRow = {
  id: string;
  total: number;
  status?: string | null;
  payment_status?: string | null;
  payment_id?: string | null;
  customer: string;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  currency?: string | null;
  nativeState: NativeState;
  method: 'transfer' | 'manual' | 'gateway' | 'internal';
};

type PaymentData = {
  ok: boolean;
  engine: string;
  providerRequired: boolean;
  kpis: {
    approved: number;
    pending: number;
    failed: number;
    transfers: number;
    approvedVolume: number;
    pendingVolume: number;
    total: number;
  };
  novedades: Array<{ type: string; title: string; detail: string }>;
  orders: PaymentRow[];
};

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'pending', label: 'En proceso' },
  { id: 'failed', label: 'Fallidos' },
  { id: 'transfer', label: 'Transferencias' },
];

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
}

function dateTime(value?: string | null) {
  if (!value) return 'Sin fecha';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(d);
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [reference, setReference] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/payments/native', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json().catch(() => null) as PaymentData | { error?: string } | null;
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error || `HTTP ${res.status}`);
      setData(json as PaymentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el centro de pagos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.orders ?? []).filter((row) => {
      if (filter === 'transfer' && row.method !== 'transfer') return false;
      if (filter !== 'all' && filter !== 'transfer' && row.nativeState !== filter) return false;
      if (!q) return true;
      return [row.id, row.customer, row.email, row.payment_id].some((value) => String(value ?? '').toLowerCase().includes(q));
    });
  }, [data, filter, query]);

  async function updatePayment(state: NativeState, method: 'transfer' | 'manual') {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payments/native', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orderId: selected.id, state, method, reference }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo actualizar el pago.');
      setSelected(null);
      setReference('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el pago.');
    } finally {
      setSaving(false);
    }
  }

  const k = data?.kpis;

  return (
    <div className="min-h-screen px-4 py-6 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] p-6 shadow-2xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Motor nativo Fabrick
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Centro de pagos</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
                Controla pagos, transferencias y estados financieros directamente desde tu app. Mercado Pago puede seguir funcionando en checkout como proveedor opcional, pero este panel no necesita sus credenciales para operar.
              </p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-yellow-300/40 hover:bg-yellow-300/10 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
            </button>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"><TriangleAlert className="mr-2 inline h-4 w-4" />{error}</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={CheckCircle2} label="Aprobados" value={String(k?.approved ?? 0)} detail={money(k?.approvedVolume ?? 0)} tone="emerald" />
          <Metric icon={Clock3} label="En proceso" value={String(k?.pending ?? 0)} detail={money(k?.pendingVolume ?? 0)} tone="amber" />
          <Metric icon={XCircle} label="Fallidos" value={String(k?.failed ?? 0)} detail="Requieren revisión" tone="rose" />
          <Metric icon={ArrowRightLeft} label="Transferencias" value={String(k?.transfers ?? 0)} detail="Registro interno" tone="sky" />
          <Metric icon={CircleDollarSign} label="Movimientos" value={String(k?.total ?? 0)} detail="Últimos 250" tone="yellow" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="min-w-0 rounded-[2rem] border border-white/10 bg-zinc-950/75 p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${filter === item.id ? 'bg-yellow-300 text-black' : 'border border-white/10 bg-white/5 text-zinc-400 hover:text-white'}`}>{item.label}</button>)}
              </div>
              <label className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 lg:w-80">
                <Search className="h-4 w-4 text-zinc-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pedido, cliente, correo o referencia" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
              </label>
            </div>

            <div className="mt-4 space-y-2">
              {loading ? <div className="grid min-h-64 place-items-center text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div> : null}
              {!loading && filtered.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-zinc-500">No hay movimientos para este filtro.</div> : null}
              {filtered.map((row) => (
                <button key={row.id} type="button" onClick={() => { setSelected(row); setReference(row.method === 'transfer' ? String(row.payment_id ?? '').replace(/^TRF-/i, '') : ''); }} className="grid w-full gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-left transition hover:border-yellow-300/25 hover:bg-white/[0.04] md:grid-cols-[minmax(0,1.4fr)_150px_140px_120px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="truncate font-bold text-white">{row.customer}</p>{row.method === 'transfer' ? <ArrowRightLeft className="h-3.5 w-3.5 text-sky-300" /> : null}</div>
                    <p className="mt-1 truncate text-xs text-zinc-500">#{row.id} · {row.email || 'sin correo'}</p>
                  </div>
                  <div><p className="text-sm font-black text-white">{money(row.total)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{row.method}</p></div>
                  <StatusBadge state={row.nativeState} />
                  <p className="text-xs text-zinc-500 md:text-right">{dateTime(row.updated_at || row.created_at)}</p>
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-5">
              <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-yellow-300" /><h2 className="text-lg font-black">Novedades</h2></div>
              <div className="mt-4 space-y-3">
                {(data?.novedades ?? []).length === 0 ? <p className="text-sm leading-6 text-zinc-500">Sin alertas importantes. El motor financiero está estable.</p> : null}
                {(data?.novedades ?? []).map((news, index) => <div key={`${news.title}-${index}`} className="rounded-2xl border border-white/10 bg-black/35 p-4"><p className="text-sm font-bold text-white">{news.title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{news.detail}</p></div>)}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-5">
              <WalletCards className="h-5 w-5 text-yellow-300" />
              <h2 className="mt-3 text-lg font-black">Cómo funciona</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Los estados se guardan en tu propia orden. Una transferencia se registra con referencia interna; este módulo no ejecuta movimientos bancarios ni necesita una cuenta de Mercado Pago.</p>
            </div>
          </aside>
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm md:items-center" onMouseDown={(e) => { if (e.currentTarget === e.target && !saving) setSelected(null); }}>
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-zinc-950 p-5 shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">Revisión de movimiento</p><h3 className="mt-2 text-2xl font-black">{selected.customer}</h3><p className="mt-1 text-xs text-zinc-500">Pedido #{selected.id}</p></div><StatusBadge state={selected.nativeState} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><Info label="Total" value={money(selected.total)} /><Info label="Referencia" value={selected.payment_id || 'Sin referencia'} /></div>
            <label className="mt-4 block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Referencia de transferencia / registro</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: TRANSF-24891" className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/50" /></label>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Action disabled={saving} onClick={() => void updatePayment('approved', 'transfer')} icon={Banknote} label="Transferencia aprobada" className="bg-sky-300 text-black" />
              <Action disabled={saving} onClick={() => void updatePayment('approved', 'manual')} icon={CheckCircle2} label="Aprobar manual" className="bg-emerald-300 text-black" />
              <Action disabled={saving} onClick={() => void updatePayment('pending', 'manual')} icon={Clock3} label="Dejar en proceso" className="border border-amber-300/30 bg-amber-300/10 text-amber-200" />
              <Action disabled={saving} onClick={() => void updatePayment('failed', 'manual')} icon={XCircle} label="Marcar fallido" className="border border-rose-300/30 bg-rose-300/10 text-rose-200" />
            </div>
            <button type="button" disabled={saving} onClick={() => setSelected(null)} className="mt-4 w-full rounded-full border border-white/10 px-4 py-3 text-xs font-bold text-zinc-400 hover:text-white">Cerrar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof CheckCircle2; label: string; value: string; detail: string; tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'yellow' }) {
  const tones = { emerald: 'text-emerald-300', amber: 'text-amber-300', rose: 'text-rose-300', sky: 'text-sky-300', yellow: 'text-yellow-300' };
  return <div className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p><Icon className={`h-4 w-4 ${tones[tone]}`} /></div><p className="mt-3 text-3xl font-black text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">{label}</p><p className="mt-2 truncate text-sm font-bold text-white">{value}</p></div>;
}

function Action({ icon: Icon, label, onClick, disabled, className }: { icon: typeof CheckCircle2; label: string; onClick: () => void; disabled?: boolean; className: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.1em] transition disabled:opacity-50 ${className}`}>{disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{label}</button>;
}
