'use client';

import { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ── Helpers de formato ── */
function formatCLP(amount: number) {
  return '$' + Math.round(amount).toLocaleString('es-CL').replace(/,/g, '.');
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* ── Tipos ── */
interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
  items: { name: string; quantity: number; price: number }[];
}

interface WeekData {
  semana: string;
  pedidos: number;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

/* ── Tooltip personalizado ── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="font-bold text-yellow-400">{payload[0].value} pedidos</p>
    </div>
  );
}

/* ── Exportar CSV ── */
function exportCSV(orders: Order[]) {
  const headers = ['ID', 'Cliente', 'Email', 'Total (CLP)', 'Estado', 'Fecha'];
  const rows = orders.map((o) => [
    o.id,
    o.customer_name,
    o.customer_email,
    o.total,
    o.status,
    formatDate(o.created_at),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fabrick-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════ */
export default function ReportesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: err } = await insforge.database
        .from('orders')
        .select('id,customer_name,customer_email,total,status,created_at,items')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (err) { setError(err.message); setLoading(false); return; }
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    }
    load();
  }, []);

  /* ── Pedidos últimas 4 semanas ── */
  const weeklyData: WeekData[] = (() => {
    const now = new Date();
    const weeks: WeekData[] = [];
    for (let i = 3; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
      const count = orders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= start && d <= end;
      }).length;
      weeks.push({ semana: label, pedidos: count });
    }
    return weeks;
  })();

  /* ── Top 5 productos ── */
  const topProducts: TopProduct[] = (() => {
    const map = new Map<string, TopProduct>();
    for (const order of orders) {
      if (!Array.isArray(order.items)) continue;
      for (const item of order.items) {
        const key = item.name ?? 'Sin nombre';
        if (!map.has(key)) map.set(key, { name: key, qty: 0, revenue: 0 });
        const p = map.get(key)!;
        p.qty += item.quantity ?? 1;
        p.revenue += (item.price ?? 0) * (item.quantity ?? 1);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  })();

  /* ── Ingresos mes actual y anterior ── */
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const revenueThisMonth = orders
    .filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((s, o) => s + (o.total ?? 0), 0);

  const revenueLastMonth = orders
    .filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    })
    .reduce((s, o) => s + (o.total ?? 0), 0);

  const delta = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
    : revenueThisMonth > 0
    ? 100
    : 0;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-bold text-white">Reportes</h1>
          <p className="text-zinc-400 text-sm mt-1">Resumen de actividad de tu tienda</p>
        </div>
        <button
          onClick={() => exportCSV(orders)}
          disabled={loading || orders.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-yellow-400/30 text-yellow-400 text-sm font-medium hover:bg-yellow-400/10 transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <svg className="w-8 h-8 animate-spin text-yellow-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* ── Ingresos ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Mes actual */}
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Ingresos — {monthNames[thisMonth]} {thisYear}
              </p>
              <p className="text-3xl font-bold text-yellow-400">{formatCLP(revenueThisMonth)}</p>
            </div>

            {/* Mes anterior */}
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Ingresos — {monthNames[lastMonth]} {lastMonthYear}
              </p>
              <p className="text-3xl font-bold text-white">{formatCLP(revenueLastMonth)}</p>
            </div>

            {/* Comparación */}
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 sm:col-span-1 flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Variación mensual
              </p>
              <div className="flex items-center gap-2">
                {delta > 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-400" />
                ) : delta < 0 ? (
                  <TrendingDown className="w-6 h-6 text-red-400" />
                ) : (
                  <Minus className="w-6 h-6 text-zinc-400" />
                )}
                <span
                  className={`text-3xl font-bold ${
                    delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {delta > 0
                  ? `+${formatCLP(revenueThisMonth - revenueLastMonth)} vs mes anterior`
                  : delta < 0
                  ? `${formatCLP(revenueThisMonth - revenueLastMonth)} vs mes anterior`
                  : 'Sin cambio respecto al mes anterior'}
              </p>
            </div>
          </div>

          {/* ── Gráfico de barras ── */}
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">
              Pedidos por semana — últimas 4 semanas
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="semana"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="pedidos" fill="#facc15" radius={[8, 8, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Top 5 productos ── */}
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                Productos más vendidos — Top 5
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['#', 'Producto', 'Unidades vendidas', 'Ingresos generados'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-zinc-500 text-sm">
                        Sin datos de productos aún.
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p, i) => (
                      <tr key={p.name} className="border-b border-white/5 last:border-0">
                        <td className="px-6 py-4 text-sm text-zinc-500 font-mono">{i + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{p.name}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">
                          <span className="inline-block bg-yellow-400/10 text-yellow-400 font-bold rounded-full px-3 py-0.5 text-xs">
                            {p.qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-yellow-400">
                          {formatCLP(p.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
