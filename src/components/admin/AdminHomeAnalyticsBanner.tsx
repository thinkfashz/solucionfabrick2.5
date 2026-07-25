'use client';

import Link from 'next/link';
import { Activity, ArrowRight, BarChart3, Clock3, Globe2, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminHomeAnalyticsBanner() {
  const pathname = usePathname();
  if (pathname !== '/admin') return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[450] w-[min(92vw,760px)] -translate-x-1/2 lg:bottom-7 lg:left-auto lg:right-8 lg:w-[430px] lg:translate-x-0">
      <Link href="/admin/analitica" className="pointer-events-auto group flex items-center gap-4 rounded-[1.7rem] bg-[#171820] p-4 text-[#F8F0E9] shadow-[0_24px_80px_rgba(23,24,32,.34)] transition hover:-translate-y-1">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#B6906C] text-[#171820]"><Activity className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-black">Nueva analítica detallada</span><span className="mt-1 block truncate text-[10px] uppercase tracking-[.12em] text-[#CCB196]">Origen · páginas · navegador · duración</span></span>
        <ArrowRight className="h-5 w-5 text-[#CCB196] transition group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
