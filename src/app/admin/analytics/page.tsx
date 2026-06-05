"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const MONTHLY_DATA = [
  { mes: "Ene", ventas: 2400000, pedidos: 48 },
  { mes: "Feb", ventas: 1800000, pedidos: 36 },
  { mes: "Mar", ventas: 3200000, pedidos: 64 },
  { mes: "Abr", ventas: 2900000, pedidos: 58 },
  { mes: "May", ventas: 3800000, pedidos: 76 },
  { mes: "Jun", ventas: 4200000, pedidos: 84 },
  { mes: "Jul", ventas: 3600000, pedidos: 72 },
  { mes: "Ago", ventas: 4500000, pedidos: 90 },
  { mes: "Sep", ventas: 3900000, pedidos: 78 },
  { mes: "Oct", ventas: 5100000, pedidos: 102 },
  { mes: "Nov", ventas: 6200000, pedidos: 124 },
  { mes: "Dic", ventas: 7800000, pedidos: 156 },
];

const TOP_PRODUCTS = [
  { name: "Torta de chocolate", units: 312, revenue: 5772000 },
  { name: "Empanadas de pino x6", units: 890, revenue: 5330100 },
  { name: "Kuchen de nuez", units: 428, revenue: 5521200 },
  { name: "Pack desayuno", units: 215, revenue: 1718500 },
];

const fmtCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const fmtM = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

type Metric = "ventas" | "pedidos";

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "#18181b",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "0.75rem",
        color: "#fff",
        padding: "10px 14px",
        fontSize: 13,
      }}
    >
      <p style={{ color: "#a1a1aa", marginBottom: 4 }}>{label}</p>
      <p style={{ fontWeight: 700, color: "#fbbf24" }}>
        {payload[0].value.toLocaleString("es-CL")}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [metric, setMetric] = useState<Metric>("ventas");

  const totalVentas = MONTHLY_DATA.reduce((s, d) => s + d.ventas, 0);
  const totalPedidos = MONTHLY_DATA.reduce((s, d) => s + d.pedidos, 0);
  const avgTicket = Math.round(totalVentas / totalPedidos);
  const bestMonth = MONTHLY_DATA.reduce((a, b) => (b.ventas > a.ventas ? b : a));

  const kpis = [
    { label: "Ventas anuales", value: fmtCLP.format(totalVentas), sub: "acumulado 12 meses" },
    { label: "Total pedidos", value: totalPedidos.toString(), sub: "en el año" },
    { label: "Ticket promedio", value: fmtCLP.format(avgTicket), sub: "por pedido" },
    { label: "Mejor mes", value: bestMonth.mes, sub: fmtCLP.format(bestMonth.ventas) },
  ];

  const maxRevenue = Math.max(...TOP_PRODUCTS.map((p) => p.revenue));

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Rendimiento de ventas y productos del año en curso</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-xl font-bold text-white truncate">{k.value}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart Card */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <p className="text-sm font-semibold text-white">Evolución mensual</p>
          <div className="flex gap-2">
            {(["ventas", "pedidos"] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                  metric === m
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-white/20 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {m === "ventas" ? "Ventas" : "Pedidos"}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={MONTHLY_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#52525b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#52525b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={metric === "ventas" ? fmtM : (v: number) => v.toString()}
              width={metric === "ventas" ? 48 : 30}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#amberGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#fbbf24", stroke: "#18181b", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">Productos más vendidos</p>
        </div>
        <ul className="divide-y divide-white/[0.08]">
          {TOP_PRODUCTS.sort((a, b) => b.revenue - a.revenue).map((p, i) => {
            const pct = Math.round((p.revenue / maxRevenue) * 100);
            return (
              <li key={p.name} className="px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{fmtCLP.format(p.revenue)}</p>
                    <p className="text-xs text-zinc-500">{p.units} uds.</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400/60 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
