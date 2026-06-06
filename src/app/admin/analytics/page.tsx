"use client";
import { useEffect, useState, useCallback } from "react";
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
import {
  Loader2,
  TrendingUp,
  DollarSign,
  CreditCard,
  BarChart2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type Estado = "pendiente" | "declarado" | "pagado";

type F29 = {
  id: number;
  periodo: string;
  ventas_afectas: number;
  ventas_exentas: number;
  debito_fiscal: number;
  credito_fiscal: number;
  iva_neto: number;
  ppm_monto: number;
  total_pagar: number;
  estado: Estado;
};

type Metric = "ventas" | "iva" | "ppm";

const MONTH_SHORT: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

const ESTADO_STYLE: Record<Estado, string> = {
  pendiente: "bg-red-900/40 text-red-300 border border-red-700/30",
  declarado: "bg-sky-900/40 text-sky-300 border border-sky-700/30",
  pagado: "bg-emerald-900/40 text-emerald-300 border border-emerald-700/30",
};
const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  declarado: "Declarado",
  pagado: "Pagado",
};

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function fmtM(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function formatPeriodo(p: string): string {
  const [year, month] = p.split("-");
  const short = MONTH_SHORT[month] ?? month;
  return `${short} ${String(year).slice(2)}`;
}

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  metric?: Metric;
}

// Colors per metric for the chart and tooltip
const METRIC_COLOR: Record<Metric, string> = {
  ventas: "#34d399", // emerald-400
  iva: "#fbbf24",   // amber-400
  ppm: "#38bdf8",   // sky-400
};

function ChartTooltip({ active, payload, label, metric = "ventas" }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const color = METRIC_COLOR[metric];
  return (
    <div
      style={{
        backgroundColor: "rgba(9,9,11,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "0.875rem",
        color: "#fff",
        padding: "10px 14px",
        fontSize: 13,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <p style={{ color: "#71717a", marginBottom: 4, fontSize: 11 }}>{label}</p>
      <p style={{ fontWeight: 800, color }}>
        {fmt.format(payload[0].value)}
      </p>
    </div>
  );
}

// Skeleton pulse bars for empty/loading chart placeholder
function ChartSkeleton() {
  const bars = [60, 40, 75, 55, 85, 45, 70, 50, 90, 65, 80, 55];
  return (
    <div className="flex h-[260px] items-end gap-2 px-2 pb-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-lg bg-white/5 animate-pulse"
          style={{
            height: `${h}%`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [declaraciones, setDeclaraciones] = useState<F29[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("ventas");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/f29");
      const json = (await res.json()) as {
        declaraciones?: Record<string, unknown>[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Error al cargar");
      setDeclaraciones(
        (json.declaraciones ?? []).map((d) => ({
          id: Number(d.id),
          periodo: String(d.periodo ?? ""),
          ventas_afectas: Number(d.ventas_afectas ?? 0),
          ventas_exentas: Number(d.ventas_exentas ?? 0),
          debito_fiscal: Number(d.debito_fiscal ?? 0),
          credito_fiscal: Number(d.credito_fiscal ?? 0),
          iva_neto: Number(d.iva_neto ?? 0),
          ppm_monto: Number(d.ppm_monto ?? 0),
          total_pagar: Number(d.total_pagar ?? 0),
          estado: (d.estado as Estado) ?? "pendiente",
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 p-4 md:p-8">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="rounded-2xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (declaraciones.length === 0) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center py-24 text-center">
        {/* Animated glow ring */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-3xl bg-amber-400/10 blur-2xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <BarChart2 className="size-9 text-zinc-500" />
          </div>
        </div>
        {/* Decorative skeleton bars */}
        <div className="mb-6 flex h-12 items-end gap-1.5 opacity-20">
          {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75].map((h, i) => (
            <div
              key={i}
              className="w-3 rounded-t bg-gradient-to-t from-amber-400/60 to-amber-400/20 animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <h2 className="text-lg font-black text-white mb-2">Sin datos aún</h2>
        <p className="text-sm text-zinc-500 mb-6 max-w-xs leading-relaxed">
          Aún no hay declaraciones F29 registradas. Agrega tus datos contables
          para ver el análisis aquí.
        </p>
        <Link
          href="/admin/contabilidad"
          className="flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(251,191,36,0.25)] transition-all hover:bg-amber-300 hover:shadow-[0_4px_24px_rgba(251,191,36,0.35)]"
        >
          Ir a Contabilidad
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  // Sort by periodo ascending for chart
  const sorted = [...declaraciones].sort((a, b) =>
    a.periodo.localeCompare(b.periodo)
  );

  const chartData = sorted.map((d) => ({
    label: formatPeriodo(d.periodo),
    ventas: d.ventas_afectas,
    iva: d.iva_neto,
    ppm: d.ppm_monto,
  }));

  // KPIs
  const totalVentas = declaraciones.reduce((s, d) => s + d.ventas_afectas, 0);
  const totalIva = declaraciones.reduce((s, d) => s + d.iva_neto, 0);
  const totalPpm = declaraciones.reduce((s, d) => s + d.ppm_monto, 0);
  const totalPagar = declaraciones.reduce((s, d) => s + d.total_pagar, 0);

  // Insights
  const mesMaxVentas = sorted.reduce(
    (a, b) => (b.ventas_afectas > a.ventas_afectas ? b : a),
    sorted[0]
  );
  const mesMaxIva = sorted.reduce(
    (a, b) => (b.iva_neto > a.iva_neto ? b : a),
    sorted[0]
  );
  const avgVentas = Math.round(totalVentas / declaraciones.length);
  const avgIva = Math.round(totalIva / declaraciones.length);

  const METRIC_LABELS: Record<Metric, string> = {
    ventas: "Ventas afectas",
    iva: "IVA neto",
    ppm: "PPM",
  };

  // Metric-specific chart gradient IDs and colors
  const chartColor = METRIC_COLOR[metric];

  // KPI card config with per-type gradient and icon accent
  const kpiCards = [
    {
      label: "Ventas acumuladas",
      value: fmt.format(totalVentas),
      sub: "ventas afectas",
      icon: TrendingUp,
      gradient: "from-emerald-400/15 via-emerald-300/5",
      border: "border-emerald-500/20",
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-300",
    },
    {
      label: "IVA pagado",
      value: fmt.format(totalIva),
      sub: "total IVA neto",
      icon: DollarSign,
      gradient: "from-amber-400/15 via-amber-300/5",
      border: "border-amber-500/20",
      iconColor: "text-amber-400",
      valueColor: "text-amber-300",
    },
    {
      label: "PPM pagado",
      value: fmt.format(totalPpm),
      sub: "pagos provisionales",
      icon: CreditCard,
      gradient: "from-sky-400/15 via-sky-300/5",
      border: "border-sky-500/20",
      iconColor: "text-sky-400",
      valueColor: "text-sky-300",
    },
    {
      label: "Total a pagar",
      value: fmt.format(totalPagar),
      sub: "acumulado",
      icon: BarChart2,
      gradient: "from-violet-400/15 via-violet-300/5",
      border: "border-violet-500/20",
      iconColor: "text-violet-400",
      valueColor: "text-violet-300",
    },
  ];

  // Metric selector accent classes
  const METRIC_ACTIVE: Record<Metric, string> = {
    ventas: "border-emerald-400 bg-emerald-400/10 text-emerald-300",
    iva: "border-amber-400 bg-amber-400/10 text-amber-300",
    ppm: "border-sky-400 bg-sky-400/10 text-sky-300",
  };

  const gradientId = `metricGrad_${metric}`;

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-zinc-950/85 px-6 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_35%,rgba(52,211,153,0.06))]" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/[0.06] blur-[64px]" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/[0.05] blur-[56px]" />
        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-400">
            Contabilidad
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Analytics Contable
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Análisis de tendencias basado en declaraciones F29 reales
          </p>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className={`relative overflow-hidden rounded-2xl border bg-zinc-900/70 p-4 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] ${k.border}`}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.gradient} to-transparent`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  {k.label}
                </p>
                <span className={k.iconColor}>
                  <k.icon className="size-4 opacity-70" />
                </span>
              </div>
              <p className={`text-lg font-black truncate ${k.valueColor}`}>{k.value}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-900/70 backdrop-blur-xl p-5 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        {/* Subtle inner glow matching active metric */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.5rem] opacity-40"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 80% 10%, ${
              metric === "ventas"
                ? "rgba(52,211,153,0.08)"
                : metric === "iva"
                  ? "rgba(251,191,36,0.08)"
                  : "rgba(56,189,248,0.08)"
            }, transparent)`,
          }}
        />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-sm font-black text-white">
                Evolución mensual{" "}
                <span
                  className="font-normal"
                  style={{ color: chartColor }}
                >
                  — {METRIC_LABELS[metric]}
                </span>
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {sorted.length} períodos registrados
              </p>
            </div>
            <div className="flex gap-2">
              {(["ventas", "iva", "ppm"] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    metric === m
                      ? METRIC_ACTIVE[m]
                      : "border-white/20 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtM}
                width={52}
              />
              <Tooltip
                content={<ChartTooltip metric={metric} />}
                cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={chartColor}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: chartColor,
                  stroke: "#09090b",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Insights ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Mes con más ventas",
            value: formatPeriodo(mesMaxVentas.periodo),
            sub: fmt.format(mesMaxVentas.ventas_afectas),
            accent: "text-emerald-400",
          },
          {
            label: "Mes con mayor IVA",
            value: formatPeriodo(mesMaxIva.periodo),
            sub: fmt.format(mesMaxIva.iva_neto),
            accent: "text-amber-400",
          },
          {
            label: "Promedio ventas/mes",
            value: fmt.format(avgVentas),
            sub: `en ${declaraciones.length} períodos`,
            accent: "text-emerald-300",
          },
          {
            label: "Promedio IVA/mes",
            value: fmt.format(avgIva),
            sub: "IVA neto promedio",
            accent: "text-amber-300",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">
              {k.label}
            </p>
            <p className={`text-base font-black truncate ${k.accent}`}>
              {k.value}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Summary Table ──────────────────────────────────────────── */}
      <div className="rounded-[1.5rem] border border-white/10 bg-zinc-900/70 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <p className="text-sm font-black text-white">
            Resumen de declaraciones
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            {sorted.length} períodos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="text-left text-xs text-zinc-600 font-black uppercase tracking-[0.15em] px-5 py-3">
                  Período
                </th>
                <th className="text-right text-xs text-zinc-600 font-black uppercase tracking-[0.15em] px-5 py-3">
                  Ventas
                </th>
                <th className="text-right text-xs text-zinc-600 font-black uppercase tracking-[0.15em] px-5 py-3 hidden sm:table-cell">
                  IVA neto
                </th>
                <th className="text-right text-xs text-zinc-600 font-black uppercase tracking-[0.15em] px-5 py-3 hidden md:table-cell">
                  PPM
                </th>
                <th className="text-right text-xs text-zinc-600 font-black uppercase tracking-[0.15em] px-5 py-3">
                  Total pagar
                </th>
                <th className="text-left text-xs text-zinc-600 font-black uppercase tracking-[0.15em] px-5 py-3">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {sorted.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-white">
                    {formatPeriodo(d.periodo)}
                    <span className="ml-2 text-xs text-zinc-600">
                      {d.periodo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-right text-emerald-300/80 font-medium">
                    {fmt.format(d.ventas_afectas)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-right text-amber-300/80 font-medium hidden sm:table-cell">
                    {fmt.format(d.iva_neto)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-right text-sky-300/70 hidden md:table-cell">
                    {fmt.format(d.ppm_monto)}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-right text-amber-400">
                    {fmt.format(d.total_pagar)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        ESTADO_STYLE[d.estado]
                      )}
                    >
                      {ESTADO_LABEL[d.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
