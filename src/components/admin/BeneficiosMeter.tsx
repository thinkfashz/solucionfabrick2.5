"use client";
import { cn } from "@/lib/utils";

interface Props {
  ventas: number;
  compras: number;
  gastos: number;
  propyme: boolean;
  className?: string;
}

type BenefitMeter = {
  id: string;
  name: string;
  desc: string;
  category: string;
  categoryColor: string;
  calcSavings: (v: number, c: number, g: number, p: boolean) => number;
  maxSavings: (v: number, c: number, g: number, p: boolean) => number;
  tip: (savings: number) => string;
};

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const fmt = (n: number) => CLP.format(n);

const BENEFIT_METERS: BenefitMeter[] = [
  {
    id: "credito-iva",
    name: "Crédito Fiscal IVA",
    desc: "IVA de compras descuenta tu débito fiscal",
    category: "IVA",
    categoryColor: "text-blue-400",
    calcSavings: (_, c) => Math.round(c * 0.19),
    maxSavings: (v) => Math.round(v * 0.19),
    tip: (s) =>
      s > 0
        ? `Recuperas ${fmt(s)} en crédito fiscal`
        : "Emite facturas de compras para activar este beneficio",
  },
  {
    id: "gastos-renta",
    name: "Gastos Tributarios",
    desc: "Gastos deducibles reducen tu renta imponible",
    category: "Renta",
    categoryColor: "text-purple-400",
    calcSavings: (_, c, g, p) => Math.round((c + g) * (p ? 0.25 : 0.27)),
    maxSavings: (v, _, __, p) => Math.round(v * (p ? 0.25 : 0.27)),
    tip: (s) =>
      s > 0
        ? `Ahorras ${fmt(s)} en impuesto renta`
        : "Documenta todos tus gastos con facturas",
  },
  {
    id: "ppm",
    name: "PPM Provisionales",
    desc: "Pagos mensuales que se descuentan del impuesto anual",
    category: "PPM",
    categoryColor: "text-amber-400",
    calcSavings: (v) => Math.round(v * 0.025),
    maxSavings: (v) => Math.round(v * 0.05),
    tip: (s) =>
      s > 0
        ? `PPM estimado: ${fmt(s)}/mes`
        : "El PPM se activa con ventas",
  },
  {
    id: "propyme",
    name: "Régimen ProPyme",
    desc: "Tributación simplificada para ventas < UF 75.000",
    category: "PyME",
    categoryColor: "text-green-400",
    calcSavings: (v, _, __, p) => (p ? Math.round(v * 0.02) : 0),
    maxSavings: (v) => Math.round(v * 0.02),
    tip: (s) =>
      s > 0
        ? `Beneficio ProPyme estimado: ${fmt(s)}`
        : "Activa ProPyme en el SII si tus ventas < UF 75.000/año",
  },
  {
    id: "boleta-electronica",
    name: "Boleta Electrónica",
    desc: "Crédito especial del 0.75% sobre ventas documentadas",
    category: "PyME",
    categoryColor: "text-green-400",
    calcSavings: (v) => Math.round(v * 0.0075),
    maxSavings: (v) => Math.round(v * 0.0075),
    tip: (s) =>
      s > 0
        ? `Recuperas ${fmt(s)} con boleta electrónica`
        : "Emite boletas electrónicas para activar este crédito",
  },
];

export function BeneficiosMeter({
  ventas,
  compras,
  gastos,
  propyme,
  className,
}: Props) {
  const debitoFiscal = ventas * 0.19;
  const creditoFiscal = compras * 0.19;
  const ivaNeto = Math.max(0, Math.round(debitoFiscal - creditoFiscal));
  const ppm = Math.round(ventas * 0.025);
  const totalAPagar = ivaNeto + ppm;
  const totalAhorro = BENEFIT_METERS.reduce(
    (sum, b) => sum + b.calcSavings(ventas, compras, gastos, propyme),
    0
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tax summary box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "IVA a pagar",
            value: ivaNeto,
            color: ivaNeto > 0 ? "text-red-400" : "text-green-400",
          },
          { label: "PPM mensual", value: ppm, color: "text-amber-400" },
          {
            label: "Total a pagar",
            value: totalAPagar,
            color: "text-orange-400",
          },
          {
            label: "Total ahorro",
            value: totalAhorro,
            color: "text-emerald-400",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-white/10 bg-zinc-900/80 p-3"
          >
            <p className="text-xs text-zinc-500">{kpi.label}</p>
            <p className={`text-base font-bold mt-0.5 ${kpi.color}`}>
              {fmt(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Benefit progress bars */}
      <div className="space-y-3">
        {BENEFIT_METERS.map((b) => {
          const savings = b.calcSavings(ventas, compras, gastos, propyme);
          const max = Math.max(
            b.maxSavings(ventas, compras, gastos, propyme),
            1
          );
          const pct = Math.min(100, Math.round((savings / max) * 100));
          return (
            <div key={b.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${b.categoryColor}`}
                  >
                    {b.category}
                  </span>
                  <span className="text-xs font-medium text-white">
                    {b.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-400">
                  {fmt(savings)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-600">{b.tip(savings)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
