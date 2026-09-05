'use client';

import type { ReactNode } from 'react';
import { Calculator, ClipboardList, Ruler } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

export default function HomeToolsQuickAccess() {
  const router = useRouter();
  const nav = (href: string) => navigateWithTransition(href, router);

  return (
    <aside className="fixed right-4 top-1/2 z-[120] hidden -translate-y-1/2 xl:block" aria-label="Herramientas rápidas de Soluciones Fabrick">
      <div className="w-[218px] overflow-hidden rounded-[1.45rem] border border-[#E6B56F]/20 bg-[#111214]/95 text-white shadow-[0_22px_70px_rgba(0,0,0,.28)] backdrop-blur-xl">
        <div className="border-b border-white/[.07] px-4 py-3">
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
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 border-b border-white/[.055] px-4 py-3.5 text-left transition last:border-0 hover:bg-white/[.055]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F5871F] text-[#111214]">{icon}</span><span className="min-w-0"><b className="block text-[11px]">{label}</b><small className="mt-0.5 block text-[8px] uppercase tracking-[.08em] text-white/30">{detail}</small></span></button>;
}
