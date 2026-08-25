"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart2,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from "@/components/admin/AdminPage";

type Estado = "pendiente" | "declarado" | "pagado";
type Metric = "ventas" | "iva" | "ppm";

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

const MONTH_SHORT: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  declarado: "Declarado",
  pagado: "Pagado",
};

const ESTADO_STYLE: Record<Estado, string> = {
  pendiente: "border-red-200 bg-red-50 text-red-700",
  declarado: "border-sky-200 bg-sky-50 text-sky-700",
  pagado: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const METRIC_LABELS: Record<Metric, string> = {
  ventas: "Ventas afectas",
  iva: "IVA neto",
  ppm: "PPM",
};

const METRIC_COLOR: Record<Metric, string> = {
  ventas: "#0f9f6e",
  iva: "#F5871F",
  ppm: "#0284c7",
};

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function fmtM(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatPeriodo(periodo: string) {
  const [year, month] = periodo.split("-");
  return `${MONTH_SHORT[month] ?? month} ${String(year).slice(2)}`;
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
      const response = await fetch("/api/admin/f29", { cache: "no-store" });
      const json = (await response.json()) as {
        declaraciones?: Record<string, unknown>[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "Error al cargar");
      setDeclaraciones(
        (json.declaraciones ?? []).map((row) => ({
          id: Number(row.id),
          periodo: String(row.periodo ?? ""),
          ventas_afectas: Number(row.ventas_afectas ?? 0),
          ventas_exentas: Number(row.ventas_exentas ?? 0),
          debito_fiscal: Number(row.debito_fiscal ?? 0),
          credito_fiscal: Number(row.credito_fiscal ?? 0),
          iva_neto: Number(row.iva_neto ?? 0),
          ppm_monto: Number(row.ppm_monto ?? 0),
          total_pagar: Number(row.total_pagar ?? 0),
          estado: (row.estado as Estado) ?? "pendiente",
        })),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sorted = useMemo(
    () => [...declaraciones].sort((a, b) => a.periodo.localeCompare(b.periodo)),
    [declaraciones],
  );

  const totals = useMemo(() => declaraciones.reduce(
    (acc, row) => ({
      ventas: acc.ventas + row.ventas_afectas,
      iva: acc.iva + row.iva_neto,
      ppm: acc.ppm + row.ppm_monto,
      pagar: acc.pagar + row.total_pagar,
    }),
    { ventas: 0, iva: 0, ppm: 0, pagar: 0 },
  ), [declaraciones]);

  const chartData = sorted.map((row) => ({
    label: formatPeriodo(row.periodo),
    ventas: row.ventas_afectas,
    iva: row.iva_neto,
    ppm: row.ppm_monto,
  }));

  const mesMaxVentas = sorted.length
    ? sorted.reduce((a, b) => (b.ventas_afectas > a.ventas_afectas ? b : a))
    : null;
  const mesMaxIva = sorted.length
    ? sorted.reduce((a, b) => (b.iva_neto > a.iva_neto ? b : a))
    : null;
  const avgVentas = declaraciones.length ? Math.round(totals.ventas / declaraciones.length) : 0;
  const avgIva = declaraciones.length ? Math.round(totals.iva / declaraciones.length) : 0;
  const chartColor = METRIC_COLOR[metric];
  const gradientId = `accountingMetric-${metric}`;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Contabilidad · F29"
        title="Analytics contable"
        description="Tendencias mensuales de ventas afectas, IVA, PPM y total declarado usando los mismos registros F29 del módulo de Contabilidad. Esta vista es analítica y no modifica declaraciones."
        actions={(
          <>
            <Link href="/admin/contabilidad" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-black text-[#171612] transition hover:bg-white">
              Abrir Contabilidad <ArrowRight className="h-4 w-4" />
            </Link>
            <button type="button" onClick={() => void load()} aria-label="Actualizar analytics contable" className="grid h-10 w-10 place-items-center rounded-xl bg-[#171612] text-[#FFB000]">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </>
        )}
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {loading && !declaraciones.length ? (
        <div className="grid min-h-[42vh] place-items-center rounded-[20px] border border-black/10 bg-white/45">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#716b60]"><Loader2 className="h-5 w-5 animate-spin text-[#c77a00]" /> Cargando declaraciones F29…</div>
        </div>
      ) : null}

      {!loading && !error && declaraciones.length === 0 ? (
        <AdminSurface title="Sin datos contables" description="Todavía no existen declaraciones F29 registradas para construir tendencias.">
          <div className="flex flex-col items-start gap-4 py-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#171612] text-[#FFB000]"><BarChart2 className="h-6 w-6" /></span>
            <p className="max-w-xl text-sm leading-6 text-[#716b60]">Registra tus períodos en Contabilidad. Cuando exista al menos una declaración, esta vista mostrará evolución, promedios y comparación mensual.</p>
            <Link href="/admin/contabilidad" className="inline-flex items-center gap-2 rounded-xl bg-[#171612] px-4 py-3 text-xs font-black text-[#FFB000]">Ir a Contabilidad <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </AdminSurface>
      ) : null}

      {declaraciones.length ? (
        <>
          <AdminStats className="xl:grid-cols-4">
            <AdminStat label="Ventas acumuladas" value={fmt.format(totals.ventas)} note="Ventas afectas registradas" icon={TrendingUp} />
            <AdminStat label="IVA neto" value={fmt.format(totals.iva)} note="Acumulado F29" icon={DollarSign} />
            <AdminStat label="PPM" value={fmt.format(totals.ppm)} note="Pagos provisionales" icon={CreditCard} />
            <AdminStat label="Total a pagar" value={fmt.format(totals.pagar)} note={`${declaraciones.length} períodos`} icon={BarChart2} />
          </AdminStats>

          <AdminSurface
            title="Evolución mensual"
            description={`${METRIC_LABELS[metric]} · ${sorted.length} períodos registrados`}
            actions={(
              <div className="flex flex-wrap gap-2">
                {(["ventas", "iva", "ppm"] as Metric[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMetric(item)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${metric === item ? "border-[#171612] bg-[#171612] text-[#FFB000]" : "border-black/10 bg-white/70 text-[#716b60] hover:bg-white"}`}
                  >
                    {METRIC_LABELS[item]}
                  </button>
                ))}
              </div>
            )}
          >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeOpacity={0.08} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={fmtM} width={56} />
                  <Tooltip formatter={(value) => fmt.format(Number(value ?? 0))} />
                  <Area type="monotone" dataKey={metric} name={METRIC_LABELS[metric]} stroke={chartColor} strokeWidth={3} fill={`url(#${gradientId})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminSurface>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Insight label="Mes con más ventas" value={mesMaxVentas ? formatPeriodo(mesMaxVentas.periodo) : "—"} note={mesMaxVentas ? fmt.format(mesMaxVentas.ventas_afectas) : "Sin datos"} />
            <Insight label="Mes con mayor IVA" value={mesMaxIva ? formatPeriodo(mesMaxIva.periodo) : "—"} note={mesMaxIva ? fmt.format(mesMaxIva.iva_neto) : "Sin datos"} />
            <Insight label="Promedio ventas/mes" value={fmt.format(avgVentas)} note={`Sobre ${declaraciones.length} períodos`} />
            <Insight label="Promedio IVA/mes" value={fmt.format(avgIva)} note="IVA neto promedio" />
          </section>

          <AdminSurface title="Resumen de declaraciones" description="Lectura consolidada de los períodos F29 disponibles.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-[9px] uppercase tracking-[.14em] text-[#8f887c]">
                    <th className="py-3 pr-4">Período</th>
                    <th className="py-3 pr-4 text-right">Ventas</th>
                    <th className="py-3 pr-4 text-right">IVA neto</th>
                    <th className="py-3 pr-4 text-right">PPM</th>
                    <th className="py-3 pr-4 text-right">Total pagar</th>
                    <th className="py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.id} className="border-b border-black/[.055] last:border-0">
                      <td className="py-3 pr-4 font-bold text-[#171612]">{formatPeriodo(row.periodo)} <span className="ml-2 font-normal text-[#9a9388]">{row.periodo}</span></td>
                      <td className="py-3 pr-4 text-right">{fmt.format(row.ventas_afectas)}</td>
                      <td className="py-3 pr-4 text-right">{fmt.format(row.iva_neto)}</td>
                      <td className="py-3 pr-4 text-right">{fmt.format(row.ppm_monto)}</td>
                      <td className="py-3 pr-4 text-right font-black text-[#9a5d00]">{fmt.format(row.total_pagar)}</td>
                      <td className="py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${ESTADO_STYLE[row.estado]}`}>{ESTADO_LABEL[row.estado]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSurface>
        </>
      ) : null}
    </AdminPage>
  );
}

function Insight({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-[18px] border border-black/10 bg-white/55 p-5 shadow-[0_12px_32px_rgba(31,26,18,.05)]">
      <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#8f887c]">{label}</p>
      <p className="mt-3 text-xl font-black tracking-[-.03em] text-[#171612]">{value}</p>
      <p className="mt-1 text-xs text-[#817a6f]">{note}</p>
    </article>
  );
}
