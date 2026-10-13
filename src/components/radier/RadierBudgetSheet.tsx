'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import type { RadierQuote } from './useRadierQuote';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUM = (value: number, digits = 2) => value.toLocaleString('es-CL', { maximumFractionDigits: digits });
const CLIENT_KEY = 'fabrick-radier-cliente';

function folioFor(result: RadierQuote) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RDR-${date}-${Math.round(result.area)}M2`;
}

/** Partidas cubicadas con código, unidad y cantidad. Sin precios inventados: el dinero va en el resumen comercial. */
function lineItems(result: RadierQuote) {
  return [
    { code: 'BAS-01', item: 'Base estabilizada compactada', unit: 'm³', qty: NUM(result.stabilized), detail: `${result.baseDepth} cm` },
    { code: 'GRA-02', item: 'Gravilla de regularización', unit: 'm³', qty: NUM(result.gravel), detail: `${result.gravelDepth} cm` },
    { code: 'BAR-03', item: 'Barrera de humedad', unit: 'm²', qty: NUM(result.moistureBarrierM2, 1), detail: 'lámina + 10% traslape' },
    { code: 'MAL-04', item: `Malla ACMA ${result.grade.id.toUpperCase()}`, unit: 'planchas', qty: String(result.meshSheets), detail: '2,6 × 5,0 m c/u' },
    { code: 'MOL-05', item: 'Moldaje perimetral', unit: 'ml', qty: NUM(result.formworkMeters, 1), detail: `tablas + ${result.stakes43cm} estacas 43 cm` },
    { code: 'HOR-06', item: `Hormigón ${result.grade.id.toUpperCase()} colocado`, unit: 'm³', qty: NUM(result.concrete), detail: `${result.cementBags25} sacos 25 kg · 5% pérdida incl.` },
  ];
}

/**
 * Hoja de presupuesto empresarial: folio, cubicación codificada, resumen
 * comercial con los precios reales y condiciones. Los precios unitarios por
 * material no se inventan: el dinero vive en los planes comerciales.
 */
export default function RadierBudgetSheet({ result, unlocked }: { result: RadierQuote; unlocked: boolean }) {
  const [client, setClient] = useState<string | null>(null);
  useEffect(() => {
    try { setClient(window.localStorage.getItem(CLIENT_KEY)); } catch { /* privado */ }
  }, []);

  const folio = folioFor(result);
  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const items = lineItems(result);

  return (
    <section aria-labelledby="presupuesto-title" className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0A0F13]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[.02] px-5 py-4 sm:px-7">
        <FabrickFullLogo compact theme="light" />
        <div className="text-right">
          <p id="presupuesto-title" className="font-mono text-[11px] font-bold tracking-[.14em] text-[#F6C64A]">{folio}</p>
          <p className="mt-1 text-[11px] text-white/40">Emitida el {today} · válida 15 días · referencia comercial</p>
        </div>
      </div>

      <div className="grid gap-px border-b border-white/10 bg-white/[.07] sm:grid-cols-2">
        <div className="bg-[#0A0F13] px-5 py-4 sm:px-7">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Cliente</p>
          <p className="mt-1 text-sm font-black text-white/90">{client || '—'}</p>
        </div>
        <div className="bg-[#0A0F13] px-5 py-4 sm:px-7">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">Obra</p>
          <p className="mt-1 text-sm font-black tabular-nums text-white/90">Radier {result.length}×{result.width} m · {result.grade.id.toUpperCase()} · e={result.thickness} cm</p>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-7">
        <h3 className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Cubicación · {NUM(result.area, 1)} m²</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <caption className="sr-only">Partidas cubicadas del radier</caption>
            <thead>
              <tr className="border-b border-white/10 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-white/35">
                <th className="py-2 pr-3">Código</th>
                <th className="py-2 pr-3">Partida</th>
                <th className="py-2 pr-3 text-right">Cantidad</th>
                <th className="py-2">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.06] text-xs">
              {items.map((row) => (
                <tr key={row.code}>
                  <td className="py-2.5 pr-3 font-mono text-[10px] font-bold text-[#F6C64A]">{row.code}</td>
                  <td className="py-2.5 pr-3 font-black text-white/85">{row.item}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-white/85">{row.qty} <span className="text-white/40">{row.unit}</span></td>
                  <td className="py-2.5 text-white/45">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-[10px] font-black uppercase tracking-[.2em] text-white/40">Resumen comercial</h3>
        <div className="mt-2 divide-y divide-white/[.07] border-y border-white/[.07]">
          {result.plans.map((option) => (
            <div key={option.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <div>
                <b className="block text-sm font-black text-white/90">{option.name}</b>
                <small className="block text-[11px] tabular-nums text-white/40">{CLP.format(option.referenceM2)}/m² con IVA</small>
              </div>
              <b className={`text-xl tabular-nums tracking-[-.02em] ${option.id === 'estandar' ? 'text-[#F6C64A]' : 'text-white/85'}`}>{CLP.format(option.total)}</b>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] leading-5 text-white/35">
          Precios con IVA incluido. No incluye movimiento de tierra extraordinario, retiro de escombros, bombeo ni ingeniería. La visita a terreno confirma el proyecto final.
        </p>

        {!unlocked ? (
          <p className="mt-3 border-l-2 border-[#F6C64A] pl-3 text-[11px] leading-5 text-white/60">
            La guía paso a paso, el PDF imprimible y el detalle por saco se desbloquean dejando tus datos. <Link href="#guia-completa" className="inline-flex items-center gap-1 font-black text-[#F6C64A]">Desbloquear guía <ArrowRight size={12} aria-hidden /></Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Guarda el nombre del cliente para mostrarlo en la hoja y el PDF. */
export function rememberRadierClient(name: string) {
  try { window.localStorage.setItem(CLIENT_KEY, name); } catch { /* privado */ }
}
