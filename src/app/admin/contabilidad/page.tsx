"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type F29Row = {
  mes: string;
  ventas: number;
  compras: number;
  ivaDebito: number;
  creditoFiscal: number;
  ppm: number;
  ivaNeto: number;
  estado: "declarado" | "pendiente" | "por_vencer";
};

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct"];

const MOCK_F29: F29Row[] = MONTHS.map((mes, i) => {
  const ventas = 1_500_000 + i * 200_000;
  const compras = 600_000 + i * 80_000;
  return {
    mes,
    ventas,
    compras,
    ivaDebito: Math.round(ventas * 0.19),
    creditoFiscal: Math.round(compras * 0.19),
    ppm: Math.round(ventas * 0.025),
    ivaNeto: Math.round(ventas * 0.19) - Math.round(compras * 0.19),
    estado: i < 8 ? "declarado" : i === 8 ? "pendiente" : "por_vencer",
  };
});

const ESTADO_STYLE: Record<F29Row["estado"], string> = {
  declarado: "bg-green-900/40 text-green-300",
  pendiente: "bg-red-900/40 text-red-300",
  por_vencer: "bg-yellow-900/40 text-yellow-300",
};

const ESTADO_LABEL: Record<F29Row["estado"], string> = {
  declarado: "Declarado",
  pendiente: "Pendiente",
  por_vencer: "Por vencer",
};

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function ContabilidadPage() {
  const [selected, setSelected] = useState<F29Row | null>(null);

  const totalVentas = MOCK_F29.reduce((s, r) => s + r.ventas, 0);
  const totalIvaNeto = MOCK_F29.reduce((s, r) => s + r.ivaNeto, 0);
  const totalPpm = MOCK_F29.reduce((s, r) => s + r.ppm, 0);
  const declarados = MOCK_F29.filter((r) => r.estado === "declarado").length;

  const kpis = [
    { label: "Ventas acumuladas", value: fmt.format(totalVentas), sub: "período" },
    { label: "IVA neto acumulado", value: fmt.format(totalIvaNeto), sub: "a pagar" },
    { label: "PPM acumulado", value: fmt.format(totalPpm), sub: "pagos provisionales" },
    { label: "Declaraciones", value: `${declarados}/${MOCK_F29.length}`, sub: "declaradas" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Contabilidad F29 / SII</h1>
        <p className="text-sm text-zinc-500 mt-1">Declaraciones mensuales de IVA y PPM</p>
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

      {/* Main grid: table + detail */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Table — takes 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
          {/* Desktop */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Mes</th>
                <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Ventas</th>
                <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">IVA neto</th>
                <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">PPM</th>
                <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {MOCK_F29.map((row) => (
                <tr
                  key={row.mes}
                  onClick={() => setSelected(row === selected ? null : row)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selected?.mes === row.mes
                      ? "bg-amber-400/5 border-l-2 border-l-amber-400"
                      : "hover:bg-white/5"
                  )}
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-white">{row.mes}</td>
                  <td className="px-5 py-3.5 text-sm text-right text-zinc-300">{fmt.format(row.ventas)}</td>
                  <td className="px-5 py-3.5 text-sm text-right font-semibold text-white">{fmt.format(row.ivaNeto)}</td>
                  <td className="px-5 py-3.5 text-sm text-right text-zinc-400">{fmt.format(row.ppm)}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ESTADO_STYLE[row.estado])}>
                      {ESTADO_LABEL[row.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile */}
          <ul className="md:hidden divide-y divide-white/[0.08]">
            {MOCK_F29.map((row) => (
              <li
                key={row.mes}
                onClick={() => setSelected(row === selected ? null : row)}
                className={cn(
                  "px-4 py-4 cursor-pointer transition-colors",
                  selected?.mes === row.mes ? "bg-amber-400/5" : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{row.mes}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ESTADO_STYLE[row.estado])}>
                    {ESTADO_LABEL[row.estado]}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-500">
                  <span>Ventas: {fmt.format(row.ventas)}</span>
                  <span>IVA: {fmt.format(row.ivaNeto)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Detail panel */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-semibold text-white">Detalle — {selected.mes}</p>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ESTADO_STYLE[selected.estado])}>
                  {ESTADO_LABEL[selected.estado]}
                </span>
              </div>

              <ul className="space-y-3">
                {[
                  { label: "Ventas netas", value: fmt.format(selected.ventas), highlight: false },
                  { label: "IVA débito (19%)", value: fmt.format(selected.ivaDebito), highlight: false },
                  { label: "Crédito fiscal", value: `− ${fmt.format(selected.creditoFiscal)}`, highlight: false },
                  { label: "IVA neto a pagar", value: fmt.format(selected.ivaNeto), highlight: true },
                  { label: "PPM (2.5%)", value: fmt.format(selected.ppm), highlight: false },
                  {
                    label: "Total a pagar",
                    value: fmt.format(selected.ivaNeto + selected.ppm),
                    highlight: true,
                  },
                ].map((item) => (
                  <li
                    key={item.label}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5",
                      item.highlight ? "bg-amber-400/5 border border-amber-400/20" : "bg-white/[0.03]"
                    )}
                  >
                    <span className={cn("text-xs", item.highlight ? "text-amber-400 font-semibold" : "text-zinc-400")}>
                      {item.label}
                    </span>
                    <span className={cn("text-sm font-semibold", item.highlight ? "text-amber-400" : "text-white")}>
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <div className="size-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <svg className="size-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600">Selecciona un mes para ver el detalle</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
