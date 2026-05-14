'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Users, DollarSign, AlertTriangle,
  RefreshCw, ArrowUpRight, Package, Clock, CheckCircle2, XCircle, PauseCircle,
  ChevronRight, BarChart3,
} from 'lucide-react';

interface RevenueData {
  mrr_clp: number;
  arr_clp: number;
  mrr_usd: number;
  arr_usd: number;
  active_tenants: number;
  trial_tenants: number;
  churned_tenants: number;
  new_tenants_this_month: number;
  churned_last_30d: number;
  churn_rate_30d: number;
  by_plan: Array<{ plan_id: string; plan_name: string; count: number; mrr_clp: number }>;
  recent_payments: Array<{
    tenant_id: string;
    tenant_name: string;
    amount_clp: number;
    status: string;
    event_type: string;
    created_at: string;
  }>;
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  owner_email: string;
  plan_id: string;
  status: string;
  created_at: string;
  price_clp: number | null;
  subscription_status: string | null;
  total_orders: number;
  total_products: number;
}

function formatClp(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active:    { label: 'Activo',     cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 size={10} /> },
    trial:     { label: 'Trial',      cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',   icon: <Clock size={10} /> },
    suspended: { label: 'Suspendido', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30',   icon: <PauseCircle size={10} /> },
    cancelled: { label: 'Cancelado',  cls: 'bg-red-500/15 text-red-400 border-red-500/30',            icon: <XCircle size={10} /> },
  };
  const s = map[status] ?? map['trial'];
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

function MetricCard({ label, value, sub, icon, accent = 'emerald' }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    violet:  'text-violet-400 bg-violet-500/10',
    yellow:  'text-yellow-400 bg-yellow-500/10',
    red:     'text-red-400 bg-red-500/10',
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[accent]}`}>
        {icon}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-white/50 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

export default function PlatformPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'revenue' | 'tenants'>('revenue');

  const load = useCallback(async (s: string) => {
    setLoading(true);
    setError(null);
    try {
      const [revRes, tenRes] = await Promise.all([
        fetch('/api/platform/revenue', { headers: { Authorization: `Bearer ${s}` } }),
        fetch('/api/platform/tenants', { headers: { Authorization: `Bearer ${s}` } }),
      ]);

      if (revRes.status === 401 || tenRes.status === 401) {
        setError('Clave incorrecta.');
        setAuthed(false);
        return;
      }

      const revData = await revRes.json() as RevenueData;
      const tenData = await tenRes.json() as { tenants: TenantRow[] };
      setRevenue(revData);
      setTenants(tenData.tenants ?? []);
      setAuthed(true);
    } catch {
      setError('Error de red.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('platform_secret');
    if (saved) { setSecret(saved); load(saved); }
  }, [load]);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('platform_secret', secret);
    load(secret);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4 px-4">
          <div className="text-center mb-6">
            <div className="text-2xl font-black">FABRICK</div>
            <div className="text-xs text-white/40 mt-1 uppercase tracking-widest">Platform Dashboard</div>
          </div>
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} />{error}
            </div>
          )}
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Platform admin secret"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            Acceder
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black">FABRICK</span>
          <span className="text-white/30">/</span>
          <span className="text-white/60 text-sm">Platform</span>
        </div>
        <button
          onClick={() => load(secret)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Metrics */}
        {revenue && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="MRR"
              value={formatClp(revenue.mrr_clp)}
              sub={`≈ USD ${revenue.mrr_usd.toLocaleString()}`}
              icon={<DollarSign size={16} />}
              accent="emerald"
            />
            <MetricCard
              label="ARR"
              value={formatClp(revenue.arr_clp)}
              sub={`≈ USD ${revenue.arr_usd.toLocaleString()}`}
              icon={<TrendingUp size={16} />}
              accent="violet"
            />
            <MetricCard
              label="Clientes activos"
              value={String(revenue.active_tenants)}
              sub={`${revenue.trial_tenants} en trial · ${revenue.new_tenants_this_month} nuevos este mes`}
              icon={<Users size={16} />}
              accent="yellow"
            />
            <MetricCard
              label="Churn (30d)"
              value={`${revenue.churn_rate_30d}%`}
              sub={`${revenue.churned_last_30d} bajas`}
              icon={<AlertTriangle size={16} />}
              accent="red"
            />
          </div>
        )}

        {/* Plan breakdown */}
        {revenue && revenue.by_plan.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-white/40" />
              <span className="text-sm font-semibold">MRR por plan</span>
            </div>
            <div className="space-y-3">
              {revenue.by_plan.map((p) => {
                const pct = revenue.mrr_clp > 0 ? Math.round((p.mrr_clp / revenue.mrr_clp) * 100) : 0;
                return (
                  <div key={p.plan_id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/60">{p.plan_name} <span className="text-white/30">({p.count} clientes)</span></span>
                      <span className="font-semibold">{formatClp(p.mrr_clp)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['revenue', 'tenants'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'revenue' ? 'Pagos recientes' : 'Tenants'}
            </button>
          ))}
        </div>

        {/* Recent payments */}
        {activeTab === 'revenue' && revenue && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="px-4 py-3 text-left">Tenant</th>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {revenue.recent_payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/30 text-xs">Sin pagos aún</td>
                  </tr>
                )}
                {revenue.recent_payments.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3 text-xs text-white/70">{p.tenant_name}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{p.event_type}</td>
                    <td className="px-4 py-3 text-xs text-right font-semibold">
                      {p.amount_clp ? formatClp(p.amount_clp) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                        p.status === 'authorized' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/50'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30">
                      {new Date(p.created_at).toLocaleDateString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tenants table */}
        {activeTab === 'tenants' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="px-4 py-3 text-left">Negocio</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Pedidos</th>
                  <th className="px-4 py-3 text-right">Productos</th>
                  <th className="px-4 py-3 text-left">Desde</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/30 text-xs">Sin tenants aún</td>
                  </tr>
                )}
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-white">{t.name}</div>
                      <div className="text-[10px] text-white/30">{t.slug}.fabrick.cl</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60 capitalize">{t.plan_id}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-xs text-right text-white/60">{t.total_orders}</td>
                    <td className="px-4 py-3 text-xs text-right text-white/60">{t.total_products}</td>
                    <td className="px-4 py-3 text-xs text-white/30">
                      {new Date(t.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://${t.slug}.fabrick.cl/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[10px] text-emerald-400 hover:underline"
                      >
                        Admin <ArrowUpRight size={10} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/registro"
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-xl px-4 py-2 transition-colors"
          >
            <Package size={12} /> Ver página de registro
          </a>
          <a
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-xl px-4 py-2 transition-colors"
          >
            <ArrowUpRight size={12} /> Panel principal
          </a>
        </div>
      </div>
    </div>
  );
}
