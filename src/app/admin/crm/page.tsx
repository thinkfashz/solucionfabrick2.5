"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MOCK_LEADS = [
  { id: "1", name: "Restaurante La Cima", contact: "Pedro Soto", value: 1200000, stage: "Propuesta", prob: 60 },
  { id: "2", name: "Clínica Norte", contact: "Ana García", value: 3500000, stage: "Negociación", prob: 80 },
  { id: "3", name: "Ferretería López", contact: "Juan López", value: 450000, stage: "Contacto inicial", prob: 20 },
  { id: "4", name: "Hotel Bello", contact: "María Silva", value: 2100000, stage: "Calificación", prob: 40 },
  { id: "5", name: "Farmacia Cruz", contact: "Diego Muñoz", value: 780000, stage: "Propuesta", prob: 55 },
  { id: "6", name: "Taller Mecánico JM", contact: "José Morales", value: 320000, stage: "Contacto inicial", prob: 15 },
];

const STAGES = ["Todos", "Contacto inicial", "Calificación", "Propuesta", "Negociación", "Cerrado"];

const STAGE_COLOR: Record<string, string> = {
  "Contacto inicial": "bg-zinc-800 text-zinc-300",
  "Calificación": "bg-blue-900/40 text-blue-300",
  "Propuesta": "bg-yellow-900/40 text-yellow-300",
  "Negociación": "bg-orange-900/40 text-orange-300",
  "Cerrado": "bg-green-900/40 text-green-300",
};

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function CRMPage() {
  const [activeStage, setActiveStage] = useState("Todos");

  const filtered = activeStage === "Todos"
    ? MOCK_LEADS
    : MOCK_LEADS.filter((l) => l.stage === activeStage);

  const totalValue = MOCK_LEADS.reduce((s, l) => s + l.value, 0);
  const weightedValue = MOCK_LEADS.reduce((s, l) => s + l.value * l.prob / 100, 0);

  const kpis = [
    { label: "Oportunidades", value: MOCK_LEADS.length.toString(), sub: "activas" },
    { label: "Valor total", value: fmt.format(totalValue), sub: "en pipeline" },
    { label: "Valor ponderado", value: fmt.format(weightedValue), sub: "por probabilidad" },
    { label: "Tasa de cierre", value: "38%", sub: "últimos 90 días" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">CRM & Pipeline de Ventas</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona tus oportunidades comerciales y seguimiento de clientes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStage(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              activeStage === s
                ? "border-amber-400 bg-amber-400/10 text-amber-400"
                : "border-white/20 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Leads table */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        {/* Desktop table */}
        <table className="w-full hidden md:table">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Empresa</th>
              <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Contacto</th>
              <th className="text-left text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Etapa</th>
              <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Valor</th>
              <th className="text-right text-xs text-zinc-600 uppercase tracking-wide px-5 py-3">Prob.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {filtered.map((lead) => (
              <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-white">{lead.name}</td>
                <td className="px-5 py-3.5 text-sm text-zinc-400">{lead.contact}</td>
                <td className="px-5 py-3.5">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STAGE_COLOR[lead.stage] ?? "bg-zinc-800 text-zinc-300")}>
                    {lead.stage}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-right text-white font-medium">{fmt.format(lead.value)}</td>
                <td className="px-5 py-3.5 text-sm text-right">
                  <span className={cn("font-semibold", lead.prob >= 70 ? "text-green-400" : lead.prob >= 40 ? "text-amber-400" : "text-zinc-400")}>
                    {lead.prob}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile list */}
        <ul className="md:hidden divide-y divide-white/[0.08]">
          {filtered.map((lead) => (
            <li key={lead.id} className="px-4 py-4 hover:bg-white/5 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{lead.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{lead.contact}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0", STAGE_COLOR[lead.stage] ?? "bg-zinc-800 text-zinc-300")}>
                  {lead.stage}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-white">{fmt.format(lead.value)}</span>
                <span className={cn("text-xs font-semibold", lead.prob >= 70 ? "text-green-400" : lead.prob >= 40 ? "text-amber-400" : "text-zinc-400")}>
                  {lead.prob}% prob.
                </span>
              </div>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-zinc-600 text-sm">
            No hay oportunidades en esta etapa
          </div>
        )}
      </div>
    </div>
  );
}
