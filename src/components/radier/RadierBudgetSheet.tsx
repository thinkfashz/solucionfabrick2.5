'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import type { RadierQuote } from './useRadierQuote';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUM = (value: number, digits = 2) => value.toLocaleString('es-CL', { maximumFractionDigits: digits });

/** Materiales por capa, en el orden en que se construyen. Fuente: calculateRadier. */
function layerRows(result: RadierQuote) {
  return [
    { layer: 'Base estabilizada', qty: `${NUM(result.stabilized)} m³`, detail: `${result.baseDepth} cm compactados` },
    { layer: 'Gravilla', qty: `${NUM(result.gravel)} m³`, detail: `${result.gravelDepth} cm de regularización` },
    { layer: 'Barrera de humedad', qty: `${NUM(result.moistureBarrierM2, 1)} m²`, detail: 'lámina con 10% de traslape' },
    { layer: 'Malla ACMA', qty: `${result.meshSheets} plancha(s)`, detail: 'refuerzo previo al hormigonado' },
    { layer: 'Moldaje', qty: `${NUM(result.formworkMeters, 1)} ml`, detail: `tablas + ${result.stakes43cm} estacas de 43 cm` },
    { layer: 'Hormigón', qty: `${NUM(result.concrete)} m³`, detail: `${result.cementBags25} sacos de 25 kg · mezcla en obra` },
  ];
}

/**
 * Hoja de presupuesto del radier. Lee las medidas de la URL para que el mismo
 * link sirva para compartirlo por WhatsApp y para desbloquear la guía completa.
 */
export default function RadierBudgetSheet({ result, unlocked }: { result: RadierQuote; unlocked: boolean }) {
  const plan = result.plans.find((p) => p.id === 'estandar') || result.plans[1];
  const rows = layerRows(result);
  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <section aria-labelledby="presupuesto-title" className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0A0F13]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[.02] px-5 py-4 sm:px-7">
        <FabrickFullLogo compact theme="light" />
        <div className="text-right">
          <p id="presupuesto-title" className="text-[10px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Hoja de presupuesto · Radier</p>
          <p className="mt-1 text-[11px] text-white/40">Emitida el {today} · referencia comercial, no cotización final</p>
        </div>
      </div>

      <div className="grid gap-px bg-white/[.07] sm:grid-cols-3">
        {[
          { label: 'Superficie', value: `${NUM(result.area, 1)} m²`, sub: `${result.length} × ${result.width} m · perímetro ${NUM(result.perimeter, 1)} ml` },
          { label: 'Hormigón', value: `${NUM(result.concrete)} m³`, sub: `espesor ${result.thickness} cm · incluye 5% por pérdida` },
          { label: 'Total referencial', value: plan ? CLP.format(plan.total) : '—', sub: plan ? `${plan.name} · ${CLP.format(plan.referenceM2)}/m² con IVA` : '' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0A0F13] px-5 py-5 sm:px-7">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">{stat.label}</p>
            <p className="mt-1.5 text-[clamp(1.5rem,4vw,2rem)] font-black tracking-[-.04em] text-white">{stat.value}</p>
            <p className="mt-1 text-[11px] leading-5 text-white/45">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-5 sm:px-7">
        <h3 className="text-sm font-black">Material por capa</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <caption className="sr-only">Cantidad de material por cada capa del radier</caption>
            <thead>
              <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-[.14em] text-[#F6C64A]">
                <th className="py-2 pr-3">Capa</th>
                <th className="py-2 pr-3">Cantidad</th>
                <th className="py-2">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.06] text-xs">
              {rows.map((row) => (
                <tr key={row.layer}>
                  <td className="py-2.5 pr-3 font-black text-white/85">{row.layer}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-[#F6C64A]">{row.qty}</td>
                  <td className="py-2.5 text-white/50">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 divide-y divide-white/[.07] border-y border-white/[.07]">
          {result.plans.map((option) => (
            <div key={option.id} className="flex flex-wrap items-center justify-between gap-2 py-3.5">
              <div>
                <b className="block text-xs font-black text-white/90">{option.name}</b>
                <small className="block text-[10px] text-white/40">{option.label} · {CLP.format(option.referenceM2)}/m²</small>
              </div>
              <b className={`text-lg tabular-nums ${option.id === 'estandar' ? 'text-[#F6C64A]' : 'text-white/80'}`}>{CLP.format(option.total)}</b>
            </div>
          ))}
        </div>

        {!unlocked ? (
          <p className="mt-4 border-l-2 border-[#F6C64A] pl-3 text-[11px] leading-5 text-white/60">
            La guía paso a paso, el desglose imprimible y el PDF con estos números se desbloquean dejando tus datos. <Link href="#guia-completa" className="inline-flex items-center gap-1 font-black text-[#F6C64A]">Desbloquear guía <ArrowRight size={12} aria-hidden /></Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
