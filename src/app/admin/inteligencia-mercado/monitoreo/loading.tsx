import { Activity, RefreshCw } from 'lucide-react';

export default function MarketMonitoringLoading() {
  return (
    <div className="space-y-4 px-2 py-3 text-[#111214] md:px-3">
      <section className="overflow-hidden rounded-[1.9rem] border border-black/7 bg-[#fffaf0] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#111214] text-[#f5c75d]"><Activity className="h-4 w-4" /></span>
          <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Monitoreo vivo</p><h1 className="mt-1 text-xl font-black">Preparando referencias de mercado</h1></div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/[0.05]"><div className="h-full w-1/3 animate-pulse rounded-full bg-[#e0a62e]" /></div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-black/7 bg-[#fffaf0]" />)}</section>
      <section className="grid gap-3 xl:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl border border-black/7 bg-[#fffaf0]" />)}</section>
      <p className="flex items-center justify-center gap-2 text-xs font-bold text-black/35"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Cargando productos conectados al radar…</p>
    </div>
  );
}
