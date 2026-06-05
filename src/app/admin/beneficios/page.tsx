"use client";
import { useEffect, useState, useCallback } from "react";
import { BadgePercent, ChevronDown, Loader2, ArrowRight, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BeneficiosMeter } from "@/components/admin/BeneficiosMeter";

type Estado = "pendiente" | "declarado" | "pagado";
type Categoria = "iva" | "renta" | "inversion" | "pyme";

type F29 = {
  id: number;
  periodo: string;
  ventas_afectas: number;
  ventas_exentas: number;
  compras_afectas: number;
  compras_exentas: number;
  debito_fiscal: number;
  credito_fiscal: number;
  iva_neto: number;
  remanente_siguiente: number;
  ppm_monto: number;
  total_pagar: number;
  estado: Estado;
};

type Beneficio = {
  id: string;
  titulo: string;
  categoria: Categoria;
  referencia: string;
  descripcion: string;
  pasos: string[];
  calcular: (v: number, c: number, a: number, p: boolean) => number;
  propymeTip?: string;
};

const BENEFICIOS: Beneficio[] = [
  {
    id: "credito-fiscal",
    titulo: "Crédito Fiscal IVA",
    categoria: "iva",
    referencia: "Art. 23 DL 825",
    descripcion:
      "Descuenta el IVA pagado en tus compras del IVA que debes pagar por tus ventas, reduciendo directamente tu deuda mensual con el SII.",
    pasos: [
      "Solicita facturas electrónicas de todos tus proveedores",
      "Registra las facturas en tu libro de compras",
      "Descuenta el crédito fiscal del débito fiscal en el F29",
      "Si el crédito supera al débito, queda como remanente",
    ],
    calcular: (_v, c) => Math.round(c * 0.19),
  },
  {
    id: "remanente-27bis",
    titulo: "Remanente IVA Art. 27bis",
    categoria: "iva",
    referencia: "Art. 27 bis DL 825",
    descripcion:
      "Si tienes remanente de crédito fiscal por 6 meses seguidos, puedes solicitar su devolución anticipada al SII.",
    pasos: [
      "Acumula remanente por 6 períodos consecutivos",
      "Presenta solicitud de devolución en el portal SII",
      "El SII verifica y aprueba",
      "Los fondos se depositan en tu cuenta",
    ],
    calcular: (v, c) => Math.max(0, Math.round((c - v) * 0.19) * 6),
  },
  {
    id: "gastos-art31",
    titulo: "Gastos Tributarios Art. 31",
    categoria: "renta",
    referencia: "Art. 31 LIR",
    descripcion:
      "Todos los gastos necesarios para producir tu renta son deducibles de la base imponible del impuesto de primera categoría.",
    pasos: [
      "Identifica gastos necesarios (arriendos, sueldos, servicios)",
      "Documenta con facturas y boletas legales",
      "Registra en libro de compras y gastos",
      "Descuenta de la renta líquida imponible en el AT",
    ],
    calcular: (_v, c, _a, p) => Math.round(c * (p ? 0.25 : 0.27)),
    propymeTip: "En régimen ProPyme la tasa es 25% vs 27% régimen general.",
  },
  {
    id: "propyme-14ter",
    titulo: "ProPyme Transparente (Art. 14 Ter)",
    categoria: "pyme",
    referencia: "Art. 14 D N°8 LIR",
    descripcion:
      "Empresas con ventas hasta UF 75.000 anuales pueden integrar impuesto empresa con impuesto personal, eliminando doble tributación.",
    pasos: [
      "Verifica que tus ventas no superen UF 75.000 anuales",
      "Solicita acogerte al régimen ProPyme en el SII",
      "Las utilidades tributan a tasa efectiva del propietario",
      "Presenta la declaración anual con los créditos",
    ],
    calcular: (v, _c, _a, p) => (p ? Math.round(v * 0.025) : 0),
    propymeTip: "Este beneficio es exclusivo del régimen ProPyme.",
  },
  {
    id: "art33bis",
    titulo: "Incentivo Inversión Art. 33 bis",
    categoria: "inversion",
    referencia: "Art. 33 bis LIR",
    descripcion:
      "Las empresas ProPyme pueden descontar el 6% del valor de activos fijos adquiridos como crédito directo contra el impuesto.",
    pasos: [
      "Invierte en activos fijos nuevos (maquinaria, equipos)",
      "El 6% del valor se descuenta del impuesto a pagar",
      "Documenta con facturas a nombre de la empresa",
      "Aplica el crédito en la declaración anual (F22)",
    ],
    calcular: (_v, _c, a) => Math.round(a * 0.06),
    propymeTip: "Mayor aprovechamiento en ProPyme por tasa integrada.",
  },
  {
    id: "depreciacion",
    titulo: "Depreciación Acelerada",
    categoria: "inversion",
    referencia: "Art. 31 N°5 bis LIR",
    descripcion:
      "Las PyMEs pueden depreciar activos en 1/3 del plazo normal, aumentando el gasto tributario en los primeros años.",
    pasos: [
      "Identifica activos fijos y su vida útil normal",
      "Aplica depreciación acelerada: divide vida útil por 3",
      "Registra mayor depreciación como gasto contable",
      "Descuenta el gasto adicional de la renta imponible",
    ],
    calcular: (_v, _c, a, p) => Math.round(a * 0.33 * (p ? 0.25 : 0.27)),
  },
  {
    id: "boleta-electronica",
    titulo: "Boleta Electrónica",
    categoria: "pyme",
    referencia: "Res. Ex. SII N°74/2017",
    descripcion:
      "El uso de boletas electrónicas permite recuperar el 0.75% de las ventas como crédito especial para microempresas.",
    pasos: [
      "Activa el sistema de boletas electrónicas en el SII",
      "Implementa software de facturación electrónica",
      "Emite todas las boletas electrónicamente",
      "El crédito del 0.75% se aplica en el F29 mensual",
    ],
    calcular: (v) => Math.round(v * 0.0075),
  },
  {
    id: "devolucion-ppm",
    titulo: "Devolución de PPM",
    categoria: "renta",
    referencia: "Art. 97 LIR",
    descripcion:
      "Si tu PPM pagado supera el impuesto de primera categoría al cierre del año, tienes derecho a la devolución del excedente.",
    pasos: [
      "Calcula el impuesto de primera categoría al 31 dic",
      "Suma todos los PPM pagados durante el año",
      "Si PPM > impuesto, la diferencia es devuelta",
      "Solicita devolución al presentar el F22 en abril",
    ],
    calcular: (v, _c, _a, p) => Math.round(v * (p ? 0.025 : 0.05) * 0.25),
  },
];

const CAT_STYLE: Record<Categoria, string> = {
  iva: "bg-blue-900/40 text-blue-300",
  renta: "bg-purple-900/40 text-purple-300",
  inversion: "bg-orange-900/40 text-orange-300",
  pyme: "bg-green-900/40 text-green-300",
};

const CAT_LABEL: Record<Categoria, string> = {
  iva: "IVA",
  renta: "Renta",
  inversion: "Inversión",
  pyme: "PyME",
};

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function parseNum(s: string): number {
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

export default function BeneficiosPage() {
  const [declaraciones, setDeclaraciones] = useState<F29[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propyme, setPropyme] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  // Calculator inputs — pre-filled from real data averages
  const [ventas, setVentas] = useState("5000000");
  const [compras, setCompras] = useState("2000000");
  const [activos, setActivos] = useState("1000000");

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
      const parsed: F29[] = (json.declaraciones ?? []).map((d) => ({
        id: Number(d.id),
        periodo: String(d.periodo ?? ""),
        ventas_afectas: Number(d.ventas_afectas ?? 0),
        ventas_exentas: Number(d.ventas_exentas ?? 0),
        compras_afectas: Number(d.compras_afectas ?? 0),
        compras_exentas: Number(d.compras_exentas ?? 0),
        debito_fiscal: Number(d.debito_fiscal ?? 0),
        credito_fiscal: Number(d.credito_fiscal ?? 0),
        iva_neto: Number(d.iva_neto ?? 0),
        remanente_siguiente: Number(d.remanente_siguiente ?? 0),
        ppm_monto: Number(d.ppm_monto ?? 0),
        total_pagar: Number(d.total_pagar ?? 0),
        estado: (d.estado as Estado) ?? "pendiente",
      }));
      setDeclaraciones(parsed);
      // Pre-fill calculator with annualized averages from real data
      if (parsed.length > 0) {
        const months = parsed.length;
        const avgVentas = Math.round(
          parsed.reduce((s, x) => s + x.ventas_afectas + x.ventas_exentas, 0) / months
        );
        const avgCompras = Math.round(
          parsed.reduce((s, x) => s + x.compras_afectas + x.compras_exentas, 0) / months
        );
        setVentas(String(avgVentas * 12));
        setCompras(String(avgCompras * 12));
      }
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

  const hasData = declaraciones.length > 0;

  // Summary stats from real data
  const totalVentas = declaraciones.reduce(
    (s, d) => s + d.ventas_afectas + d.ventas_exentas,
    0
  );
  const totalCompras = declaraciones.reduce(
    (s, d) => s + d.compras_afectas + d.compras_exentas,
    0
  );
  const totalIvaPagado = declaraciones.reduce(
    (s, d) => s + (d.iva_neto > 0 ? d.iva_neto : 0),
    0
  );
  const totalPpm = declaraciones.reduce((s, d) => s + d.ppm_monto, 0);
  const totalPagado = declaraciones.reduce((s, d) => s + d.total_pagar, 0);
  const totalDebitoFiscal = declaraciones.reduce(
    (s, d) => s + d.debito_fiscal,
    0
  );
  const totalCreditoFiscal = declaraciones.reduce(
    (s, d) => s + d.credito_fiscal,
    0
  );
  const totalRemanente = declaraciones.reduce(
    (s, d) => s + d.remanente_siguiente,
    0
  );

  const creditoRatio =
    totalDebitoFiscal > 0
      ? Math.round((totalCreditoFiscal / totalDebitoFiscal) * 100)
      : 0;
  const comprasVentasRatio =
    totalVentas > 0 ? Math.round((totalCompras / totalVentas) * 100) : 0;

  // Calculator
  const v = parseNum(ventas);
  const c = parseNum(compras);
  const a = parseNum(activos);

  const withSavings = BENEFICIOS.map((b) => ({
    ...b,
    savings: b.calcular(v, c, a, propyme),
  })).sort((x, y) => y.savings - x.savings);

  const totalSavings = withSavings.reduce((s, b) => s + b.savings, 0);

  // Derived fiscal summary values for sticky bar and meter
  const ivaNeto = Math.max(0, Math.round(v * 0.19 - c * 0.19));
  const ppmMensual = Math.round(v * 0.025);
  const total = ivaNeto + ppmMensual;

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10">
          <BadgePercent className="size-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Beneficios Fiscales &amp; Ahorro Tributario
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Análisis personalizado con tus datos reales de F29
          </p>
        </div>
      </div>

      {/* Sticky summary bar */}
      {hasData && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-zinc-950/90 backdrop-blur-xl border-b border-white/[0.08] md:-mx-8 md:px-8">
          <div className="flex items-center gap-4 overflow-x-auto">
            <span className="text-xs text-zinc-500 shrink-0">Resumen fiscal:</span>
            {[
              { label: "IVA neto", value: ivaNeto, color: "text-red-400" },
              { label: "PPM", value: ppmMensual, color: "text-amber-400" },
              { label: "Total a pagar", value: total, color: "text-orange-400" },
              { label: "Ahorro estimado", value: totalSavings, color: "text-emerald-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-zinc-600">{item.label}:</span>
                <span className={`text-xs font-bold ${item.color}`}>{fmt.format(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data banner */}
      {!hasData && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 shrink-0 text-yellow-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-yellow-300 font-medium mb-1">
                Sin declaraciones F29
              </p>
              <p className="text-xs text-yellow-500">
                Las estimaciones usan valores de ejemplo. Agrega tus datos F29
                para un análisis personalizado.
              </p>
            </div>
            <Link
              href="/admin/contabilidad"
              className="shrink-0 flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black"
            >
              Agregar
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Real data summary */}
      {hasData && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Ventas totales", value: fmt.format(totalVentas) },
            { label: "Compras totales", value: fmt.format(totalCompras) },
            { label: "IVA pagado", value: fmt.format(totalIvaPagado) },
            { label: "PPM total", value: fmt.format(totalPpm) },
            { label: "Total pagado SII", value: fmt.format(totalPagado) },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4"
            >
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                {k.label}
              </p>
              <p className="text-base font-bold text-white truncate">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Opportunities analysis — only if real data */}
      {hasData && (
        <div>
          <p className="text-sm font-semibold text-white mb-3">
            Análisis de pérdidas y oportunidades
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Crédito fiscal aprovechado */}
            <div
              className={cn(
                "rounded-2xl border p-4",
                creditoRatio < 70
                  ? "border-yellow-500/30 bg-yellow-900/10"
                  : "border-green-500/20 bg-green-900/10"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp
                  className={cn(
                    "size-4",
                    creditoRatio < 70 ? "text-yellow-400" : "text-green-400"
                  )}
                />
                <p className="text-xs font-semibold text-white">
                  Crédito fiscal
                </p>
              </div>
              <p
                className={cn(
                  "text-2xl font-bold mb-1",
                  creditoRatio < 70 ? "text-yellow-400" : "text-green-400"
                )}
              >
                {creditoRatio}%
              </p>
              <p className="text-xs text-zinc-500">
                {creditoRatio < 70
                  ? "Podrías aprovechar más crédito fiscal"
                  : "Buen aprovechamiento del crédito"}
              </p>
            </div>

            {/* Remanentes */}
            <div
              className={cn(
                "rounded-2xl border p-4",
                totalRemanente > 0
                  ? "border-blue-500/30 bg-blue-900/10"
                  : "border-white/10 bg-zinc-900/60"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Info className="size-4 text-blue-400" />
                <p className="text-xs font-semibold text-white">
                  Remanentes IVA
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-400 mb-1">
                {fmt.format(totalRemanente)}
              </p>
              <p className="text-xs text-zinc-500">
                {totalRemanente > 0
                  ? "Remanente que puedes recuperar (Art. 27bis)"
                  : "Sin remanentes acumulados"}
              </p>
            </div>

            {/* PPM vs impuesto */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="size-4 text-amber-400" />
                <p className="text-xs font-semibold text-white">PPM anual</p>
              </div>
              <p className="text-2xl font-bold text-amber-400 mb-1">
                {fmt.format(totalPpm)}
              </p>
              <p className="text-xs text-zinc-500">
                Podría generar devolución en el F22 si supera impuesto anual
              </p>
            </div>

            {/* Ratio compras/ventas */}
            <div
              className={cn(
                "rounded-2xl border p-4",
                comprasVentasRatio < 40
                  ? "border-orange-500/30 bg-orange-900/10"
                  : "border-white/10 bg-zinc-900/60"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp
                  className={cn(
                    "size-4",
                    comprasVentasRatio < 40 ? "text-orange-400" : "text-zinc-400"
                  )}
                />
                <p className="text-xs font-semibold text-white">
                  Ratio compras/ventas
                </p>
              </div>
              <p
                className={cn(
                  "text-2xl font-bold mb-1",
                  comprasVentasRatio < 40 ? "text-orange-400" : "text-white"
                )}
              >
                {comprasVentasRatio}%
              </p>
              <p className="text-xs text-zinc-500">
                {comprasVentasRatio < 40
                  ? "Documenta más gastos para reducir tu base imponible"
                  : "Buena documentación de gastos"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calculator panel */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">
            Calculadora de ahorro tributario
          </p>
          {hasData && (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2.5 py-0.5 text-xs text-amber-400">
              Pre-llenado con tus datos
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">
              Ventas anuales (CLP)
              {hasData && (
                <span className="ml-1 text-amber-400">★ real</span>
              )}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={ventas}
              onChange={(e) => setVentas(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-400/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">
              Compras anuales (CLP)
              {hasData && (
                <span className="ml-1 text-amber-400">★ real</span>
              )}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={compras}
              onChange={(e) => setCompras(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-400/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">
              Activos fijos (CLP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={activos}
              onChange={(e) => setActivos(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-400/50"
              placeholder="0"
            />
          </div>
        </div>

        {/* Regime toggle */}
        <div className="mt-4 flex items-center gap-3">
          <p className="text-xs text-zinc-500">Régimen tributario:</p>
          <div className="flex gap-2">
            {[
              { label: "ProPyme", value: true },
              { label: "General", value: false },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setPropyme(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  propyme === opt.value
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-white/20 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {propyme && (
            <span className="text-xs text-zinc-600">
              Tasa 25% · Beneficios adicionales activos
            </span>
          )}
        </div>

        {/* Total savings */}
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">
              Ahorro total estimado
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {hasData
                ? "Basado en tus ventas/compras anualizadas reales"
                : "Valores de ejemplo — agrega F29 para datos reales"}
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {fmt.format(totalSavings)}
          </p>
        </div>
      </div>

      {/* Fiscal benefits progress meter */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-5">
        <p className="text-sm font-semibold text-white mb-4">
          Medidor de beneficios fiscales
        </p>
        <BeneficiosMeter
          ventas={v}
          compras={c}
          gastos={a}
          propyme={propyme}
        />
      </div>

      {/* Benefits accordion */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">
            Beneficios disponibles{" "}
            <span className="text-zinc-600 font-normal">
              — ordenados por ahorro estimado
            </span>
          </p>
        </div>

        <ul className="divide-y divide-white/[0.08]">
          {withSavings.map((b) => {
            const isOpen = openId === b.id;
            const showPropymeTip = propyme && !!b.propymeTip;
            return (
              <li key={b.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : b.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                >
                  <span
                    className={cn(
                      "hidden sm:inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      CAT_STYLE[b.categoria]
                    )}
                  >
                    {CAT_LABEL[b.categoria]}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {b.titulo}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {b.referencia}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-sm font-bold",
                        b.savings > 0 ? "text-amber-400" : "text-zinc-600"
                      )}
                    >
                      {b.savings > 0 ? fmt.format(b.savings) : "—"}
                    </p>
                    <p className="text-xs text-zinc-600">ahorro est.</p>
                  </div>

                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-zinc-500 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/[0.06]">
                    <span
                      className={cn(
                        "sm:hidden inline-flex mb-3 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        CAT_STYLE[b.categoria]
                      )}
                    >
                      {CAT_LABEL[b.categoria]}
                    </span>

                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      {b.descripcion}
                    </p>

                    {showPropymeTip && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                        <BadgePercent className="size-4 shrink-0 text-amber-400 mt-0.5" />
                        <p className="text-xs text-amber-300">{b.propymeTip}</p>
                      </div>
                    )}

                    <p className="text-xs text-zinc-600 uppercase tracking-wide mb-3">
                      Cómo aplicarlo
                    </p>
                    <ol className="space-y-2.5 mb-4">
                      {b.pasos.map((paso, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span className="text-sm text-zinc-400 leading-snug">
                            {paso}
                          </span>
                        </li>
                      ))}
                    </ol>

                    {b.savings > 0 && (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-amber-400 font-semibold">
                            Ahorro estimado con{" "}
                            {hasData ? "tus datos reales" : "datos de ejemplo"}
                          </p>
                          {hasData && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Calculado sobre ventas/compras anualizadas reales
                            </p>
                          )}
                        </div>
                        <p className="text-base font-bold text-amber-400">
                          {fmt.format(b.savings)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
