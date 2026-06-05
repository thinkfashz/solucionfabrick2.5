"use client";
import { BadgePercent, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Categoria = "iva" | "renta" | "inversion" | "pyme";

type Beneficio = {
  id: string;
  titulo: string;
  categoria: Categoria;
  referencia: string;
  descripcion: string;
  pasos: string[];
  calcular: (v: number, c: number, a: number, p: boolean) => number;
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
    calcular: (_v, c) => Math.round(c * 0.0075),
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
  const [ventas, setVentas] = useState("5000000");
  const [compras, setCompras] = useState("2000000");
  const [activos, setActivos] = useState("1000000");
  const [propyme, setPropyme] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const v = parseNum(ventas);
  const c = parseNum(compras);
  const a = parseNum(activos);

  const withSavings = BENEFICIOS.map((b) => ({
    ...b,
    savings: b.calcular(v, c, a, propyme),
  })).sort((x, y) => y.savings - x.savings);

  const totalSavings = withSavings.reduce((s, b) => s + b.savings, 0);

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
            Calcula cuánto puedes ahorrar en impuestos aplicando la normativa vigente
          </p>
        </div>
      </div>

      {/* Calculator panel */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-5">
        <p className="text-sm font-semibold text-white mb-4">Calculadora de ahorro</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">
              Ventas anuales (CLP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={ventas}
              onChange={(e) => setVentas(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">
              Compras anuales (CLP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={compras}
              onChange={(e) => setCompras(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
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
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
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
        </div>

        {/* Total savings summary */}
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">
              Ahorro total estimado
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Suma de todos los beneficios aplicables
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {fmt.format(totalSavings)}
          </p>
        </div>
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
            return (
              <li key={b.id}>
                {/* Row header */}
                <button
                  onClick={() => setOpenId(isOpen ? null : b.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                >
                  {/* Category badge */}
                  <span
                    className={cn(
                      "hidden sm:inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      CAT_STYLE[b.categoria]
                    )}
                  >
                    {CAT_LABEL[b.categoria]}
                  </span>

                  {/* Title + reference */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {b.titulo}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{b.referencia}</p>
                  </div>

                  {/* Savings */}
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

                  {/* Chevron */}
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-zinc-500 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/[0.06]">
                    {/* Mobile category badge */}
                    <span
                      className={cn(
                        "sm:hidden inline-flex mb-3 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        CAT_STYLE[b.categoria]
                      )}
                    >
                      {CAT_LABEL[b.categoria]}
                    </span>

                    {/* Description */}
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      {b.descripcion}
                    </p>

                    {/* Steps */}
                    <p className="text-xs text-zinc-600 uppercase tracking-wide mb-3">
                      Cómo aplicarlo
                    </p>
                    <ol className="space-y-2.5">
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

                    {/* Savings highlight */}
                    {b.savings > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 flex items-center justify-between">
                        <p className="text-xs text-amber-400 font-semibold">
                          Ahorro estimado con tus datos
                        </p>
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
