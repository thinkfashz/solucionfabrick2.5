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
  pendiente: "bg-red-900/40 text-red-300",
  declarado: "bg-blue-900/40 text-blue-300",
  pagado: "bg-green-900/40 text-green-300",
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
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
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
        {fmt.format(payload[0].value)}
      </p>
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
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (declaraciones.length === 0) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center py-24 text-center">
        <div className="size-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <BarChart2 className="size-7 text-zinc-600" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Sin datos</h2>
        <p className="text-sm text-zinc-500 mb-5 max-w-sm">
          Aún no hay declaraciones F29 registradas. Agrega tus datos contables
          para ver el análisis aquí.
        </p>
        <Link
          href="/admin/contabilidad"
          className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
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

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Analytics Contable
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Análisis de tendencias basado en declaraciones F29 reales
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Ventas acumuladas",
            value: fmt.format(totalVentas),
            sub: "ventas afectas",
            icon: TrendingUp,
          },
          {
            label: "IVA pagado",
            value: fmt.format(totalIva),
            sub: "total IVA neto",
            icon: DollarSign,
          },
          {
            label: "PPM pagado",
            value: fmt.format(totalPpm),
            sub: "pagos provisionales",
            icon: CreditCard,
          },
          {
            label: "Total a pagar",
            value: fmt.format(totalPagar),
            sub: "acumulado",
            icon: BarChart2,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">
                {k.label}
              </p>
              <k.icon className="size-4 text-zinc-600" />
            </div>
            <p className="text-xl font-bold text-white truncate">{k.value}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <p className="text-sm font-semibold text-white">
            Evolución mensual —{" "}
            <span className="text-zinc-400 font-normal">
              {METRIC_LABELS[metric]}
            </span>
          </p>
          <div className="flex gap-2">
            {(["ventas", "iva", "ppm"] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  metric === m
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
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
              <linearGradient id="amberGradF29" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
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
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#amberGradF29)"
              dot={false}
              activeDot={{ r: 4, fill: "#fbbf24", stroke: "#18181b", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Mes con más ventas",
            value: formatPeriodo(mesMaxVentas.periodo),
            sub: fmt.format(mesMaxVentas.ventas_afectas),
          },
          {
            label: "Mes con mayor IVA",
            value: formatPeriodo(mesMaxIva.periodo),
            sub: fmt.format(mesMaxIva.iva_neto),
          },
          {
            label: "Promedio ventas/mes",
            value: fmt.format(avgVentas),
            sub: `en ${declaraciones.length} períodos`,
          },
          {
            label: "Promedio IVA/mes",
            value: fmt.format(avgIva),
            sub: "IVA neto promedio",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4"
          >
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
              {k.label}
            </p>
            <p className="text-base font-bold text-amber-400 truncate">
              {k.value}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Summary Table */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">
            Resumen de declaraciones
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                  Período
                </th>
                <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                  Ventas
                </th>
                <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">
                  IVA neto
                </th>
                <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3 hidden md:table-cell">
                  PPM
                </th>
                <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                  Total pagar
                </th>
                <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {sorted.map((d) => (
                <tr key={d.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-white">
                    {formatPeriodo(d.periodo)}
                    <span className="ml-2 text-xs text-zinc-600">
                      {d.periodo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-right text-zinc-300">
                    {fmt.format(d.ventas_afectas)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-right text-zinc-300 hidden sm:table-cell">
                    {fmt.format(d.iva_neto)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-right text-zinc-400 hidden md:table-cell">
                    {fmt.format(d.ppm_monto)}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-right text-amber-400">
                    {fmt.format(d.total_pagar)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
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
