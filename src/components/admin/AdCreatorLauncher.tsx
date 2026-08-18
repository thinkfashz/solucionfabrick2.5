'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, BarChart3, MonitorSmartphone, Sparkles, Target } from 'lucide-react';

export default function AdCreatorLauncher() {
  const pathname = usePathname();
  if (pathname !== '/admin/publicidad') return null;

  return (
    <section className="mb-6 overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_85%_0%,rgba(204,177,150,.25),transparent_28rem),linear-gradient(145deg,#1A1B1F,#08090A)] p-6 text-[#FFF9EE] shadow-[0_24px_80px_rgba(0,0,0,.2)] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F2DFBB]"><Sparkles className="h-3.5 w-3.5" /> Nueva herramienta independiente</span>
          <h2 className="mt-4 text-2xl font-black tracking-[-.04em] sm:text-4xl">Crea, compara y previsualiza anuncios antes de enviarlos a Meta.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#CFC3BA]">La IA genera dos enfoques persuasivos, ordena títulos y descripciones, analiza seis señales de conversión y muestra el resultado en Feed, Stories, móvil y escritorio.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[.12em] text-[#FFB000]"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2"><Target className="h-3.5 w-3.5" /> Estrategia</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2"><MonitorSmartphone className="h-3.5 w-3.5" /> 4 previews</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2"><BarChart3 className="h-3.5 w-3.5" /> Análisis de venta</span></div>
        </div>
        <Link href="/admin/publicidad/creador" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#F5871F] px-6 text-sm font-black text-[#08090A] transition hover:bg-[#FFB000]">Abrir creador IA <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
