'use client';

import type { ReactNode } from 'react';
import { Calculator, ClipboardList, Ruler } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

export default function HomeToolsQuickAccess() {
  const router = useRouter();
  const nav = (href: string) => navigateWithTransition(href, router);

  return (
    <aside className="fixed right-3 top-1/2 z-[120] hidden -translate-y-1/2 md:block xl:right-4" aria-label="Herramientas rápidas de Soluciones Fabrick">
      <div className="w-[190px] overflow-hidden rounded-[1.35rem] border border-[#E6B56F]/20 bg-[#111214]/95 text-white shadow-[0_22px_70px_rgba(0,0,0,.28)] backdrop-blur-xl xl:w-[218px] xl:rounded-[1.45rem]">
        <div className="border-b border-white/[.07] px-3.5 py-3 xl:px-4">
          <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#E6B56F]">Herramientas Fabrick</p>
          <p className="mt-1 text-[10px] leading-4 text-white/38">Calcula antes de cotizar.</p>
        </div>
        <QuickTool icon={<Calculator className="h-4 w-4" />} label="Calculadora BTU" detail="Aire acondicionado" onClick={() => nav('/herramientas/aire-acondicionado')} />
        <QuickTool icon={<Ruler className="h-4 w-4" />} label="Calculadora Radier" detail="m² · ml · volumen" onClick={() => nav('/herramientas/radier')} />
        <QuickTool icon={<ClipboardList className="h-4 w-4" />} label="Presupuesto" detail="Agrupar partidas" onClick={() => nav('/presupuesto')} />
      </div>
    </aside>
  );
}

function QuickTool({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-2.5 border-b border-white/[.055] px-3.5 py-3 text-left transition last:border-0 hover:bg-white/[.055] xl:gap-3 xl:px-4 xl:py-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F5871F] text-[#111214]">{icon}</span><span className="min-w-0"><b className="block text-[10px] xl:text-[11px]">{label}</b><small className="mt-0.5 block text-[7px] uppercase tracking-[.08em] text-white/30 xl:text-[8px]">{detail}</small></span></button>;
}
