import Link from 'next/link';
import { ArrowRight, Calculator, CheckCircle2, Mail, MessageCircle, Ruler, Send, WalletCards } from 'lucide-react';
import { BUDGET_SERVICES } from './serviceCatalog';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const FEATURED = ['radier', 'metalcon', 'aire', 'electricidad', 'gasfiteria', 'fosa', 'llave-mano', 'revestimiento'];

function money(value: number) {
  return CLP.format(Math.round(value || 0));
}

export default function BudgetPageGuide({ selectedServiceId }: { selectedServiceId?: string }) {
  const services = FEATURED.map((id) => BUDGET_SERVICES.find((service) => service.id === id)).filter(Boolean) as typeof BUDGET_SERVICES;

  return (
    <section className="relative isolate overflow-hidden border-b border-white/8 bg-[#071015] px-4 pb-12 pt-24 text-white sm:px-6 lg:px-8 lg:pb-16 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(246,198,74,.13),transparent_27rem),radial-gradient(circle_at_12%_42%,rgba(87,212,255,.08),transparent_24rem)]" />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Presupuesto guiado Soluciones Fabrick</p>
            <h1 className="mt-4 max-w-[14ch] text-[clamp(2.9rem,6.5vw,5.6rem)] font-black leading-[.9] tracking-[-.065em]">Elige el trabajo. Mide. Compara. Decide.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/52 sm:text-base">La calculadora mantiene la lógica actual, pero el recorrido parte por una decisión simple: qué servicio necesitas. Después ingresas medidas, eliges modalidad y recibes un rango claro antes de enviarlo por correo o WhatsApp.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#servicios-destacados" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F6C64A] px-5 text-xs font-black text-black">Ver servicios y precios <ArrowRight className="h-4 w-4" /></a>
              <a href="#budget-core" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[.035] px-5 text-xs font-black text-white">Abrir calculadora <Calculator className="h-4 w-4 text-[#57D4FF]" /></a>
            </div>
          </div>

          <aside className="overflow-hidden rounded-[1.5rem] border border-white/9 bg-white/[.035] shadow-[0_28px_90px_rgba(0,0,0,.28)]">
            <div className="border-b border-white/8 p-5">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/36">Tu salida final</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Un presupuesto que puedes usar.</h2>
              <p className="mt-2 text-[11px] leading-6 text-white/42">Servicios separados, rango estimado, modalidad elegida y datos del proyecto.</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-white/8">
              <div className="bg-[#0B1418] p-4"><Mail className="h-4 w-4 text-[#F6C64A]"/><b className="mt-3 block text-xs">Recibir por correo</b><span className="mt-1 block text-[9px] leading-4 text-white/36">Copia detallada y folio.</span></div>
              <div className="bg-[#0B1418] p-4"><MessageCircle className="h-4 w-4 text-[#57D4FF]"/><b className="mt-3 block text-xs">Continuar por WhatsApp</b><span className="mt-1 block text-[9px] leading-4 text-white/36">El mismo resumen listo para conversar.</span></div>
            </div>
          </aside>
        </div>

        <div className="mt-9 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Step number="01" Icon={CheckCircle2} title="Selecciona" text="Elige el servicio que realmente necesitas." />
          <Step number="02" Icon={Ruler} title="Ingresa medidas" text="Largo, ancho, alto, cantidad o total conocido." />
          <Step number="03" Icon={WalletCards} title="Compara alcance" text="Solo ejecución o trabajo vendido, con terminación." />
          <Step number="04" Icon={Send} title="Envía" text="Recibe la copia o abre WhatsApp con el detalle." />
        </div>

        <div id="servicios-destacados" className="scroll-mt-24 mt-10 border-t border-white/8 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#57D4FF]">Servicios más consultados</p><h2 className="mt-2 max-w-[14ch] text-3xl font-black leading-[.95] tracking-[-.05em] sm:text-4xl">Precios de referencia antes de medir.</h2></div>
            <p className="max-w-lg text-[11px] leading-6 text-white/38">El valor por unidad sirve para orientarte. El cálculo inferior usa tus medidas y ajusta el rango según complejidad y terminación.</p>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;
              const active = selectedServiceId === service.id;
              return (
                <Link key={service.id} href={`/presupuesto?servicio=${service.id}#budget-core`} className={`group rounded-[1.15rem] border p-4 transition hover:-translate-y-0.5 ${active ? 'border-[#F6C64A]/60 bg-[#F6C64A]/[.08]' : 'border-white/8 bg-white/[.025] hover:border-[#F6C64A]/30 hover:bg-white/[.04]'}`}>
                  <div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.055] text-[#F6C64A]"><Icon className="h-4 w-4" /></span><span className="rounded-full border border-white/8 px-2 py-1 text-[8px] font-black text-white/32">/{service.unit}</span></div>
                  <p className="mt-4 text-[8px] font-black uppercase tracking-[.13em] text-[#57D4FF]">{service.category}</p>
                  <h3 className="mt-1 text-[15px] font-black tracking-[-.025em]">{service.short}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/8 pt-3"><div><span className="block text-[8px] text-white/30">Ejecución desde</span><b className="mt-1 block text-[11px] text-white/78">{money(service.laborMin)}</b></div><div><span className="block text-[8px] text-white/30">Trabajo vendido</span><b className="mt-1 block text-[11px] text-[#F6C64A]">{money(service.marketMin)}</b></div></div>
                  <span className="mt-4 flex items-center justify-between text-[9px] font-black text-white/52">Calcular este servicio <ArrowRight className="h-3.5 w-3.5 text-[#F6C64A] transition group-hover:translate-x-0.5" /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ number, Icon, title, text }: { number: string; Icon: typeof Calculator; title: string; text: string }) {
  return <article className="rounded-[1rem] border border-white/7 bg-white/[.02] p-4"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-[#F6C64A]"/><span className="text-[8px] font-black text-white/20">{number}</span></div><h3 className="mt-3 text-sm font-black">{title}</h3><p className="mt-1 text-[9px] leading-4 text-white/34">{text}</p></article>;
}
