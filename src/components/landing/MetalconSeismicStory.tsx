'use client';

import Link from 'next/link';
import { ArrowRight, Braces, Check, Layers3, Ruler, ShieldCheck } from 'lucide-react';

const BENEFITS = [
  { icon: Braces, title: 'Estructura liviana', text: 'Reduce masa respecto de sistemas pesados y permite organizar cargas, encuentros y refuerzos desde el diseño.' },
  { icon: ShieldCheck, title: 'Ductilidad y continuidad', text: 'Los perfiles, arriostramientos, anclajes y uniones trabajan como un sistema cuando están correctamente calculados y ejecutados.' },
  { icon: Layers3, title: 'Envolvente por capas', text: 'La estructura puede integrar placas, barreras, aislación y revestimientos según clima, humedad, fuego y terminación requerida.' },
] as const;

export default function MetalconSeismicStory() {
  return (
    <section className="relative overflow-hidden bg-[#171820] px-4 py-16 text-[#F8F0E9] sm:px-6 md:px-12 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(204,177,150,.2),transparent_30rem),radial-gradient(circle_at_88%_80%,rgba(182,144,108,.12),transparent_32rem)]" />
      <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-center">
        <div data-reveal>
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#CCB196]">Sistema estructural destacado</p>
          <h2 className="mt-4 text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">En un país sísmico, la estructura se decide antes que la terminación.</h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#CFC3BA] sm:text-base">
            Metalcon utiliza perfiles de acero galvanizado conformados en frío. Su menor masa y capacidad de deformación pueden ser favorables frente a acciones sísmicas, pero el desempeño depende del cálculo estructural, fundaciones, anclajes, arriostramientos, uniones y ejecución completa del sistema.
          </p>
          <div className="mt-7 grid gap-3">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="flex gap-4 rounded-[1.5rem] bg-white/[.055] p-4 ring-1 ring-white/7">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#B6906C] text-[#171820]"><Icon className="h-5 w-5" /></span>
                <div><h3 className="text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-[#BEB2A8]">{text}</p></div>
              </article>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/presupuesto?servicio=metalcon" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-[#B6906C] px-6 text-sm font-black text-[#171820] transition hover:bg-[#F8F0E9]">Calcular estructura Metalcon <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/servicios/metalcon" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-white/7 px-6 text-sm font-black text-[#F8F0E9] transition hover:bg-white/12">Conocer el sistema</Link>
          </div>
          <p className="mt-5 flex max-w-2xl items-start gap-2 text-[10px] leading-5 text-white/38"><Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#CCB196]" /> La calculadora entrega una referencia comercial. Un proyecto estructural requiere revisión profesional y cumplimiento de las normas aplicables.</p>
        </div>

        <div data-reveal className="relative min-h-[560px] overflow-hidden rounded-[2.4rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-[0_32px_100px_rgba(0,0,0,.3)] sm:p-8">
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(23,24,32,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(23,24,32,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="relative flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#895E3D]">Lectura de sistema</p><h3 className="mt-2 text-3xl font-black tracking-[-.05em]">El muro trabaja por capas.</h3></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><Braces className="h-5 w-5" /></span></div>

          <div className="relative mt-9 grid gap-3 sm:grid-cols-[1fr_1.25fr] sm:items-stretch">
            <div className="grid gap-3">
              <LayerCard number="01" title="Terminación exterior" text="Revestimiento definido por exposición, mantenimiento y diseño." tone="bg-[#E7D7C7]" />
              <LayerCard number="02" title="Barrera y placa" text="Control de agua, viento y soporte exterior según especificación." tone="bg-[#CCB196]" />
              <LayerCard number="03" title="Aislación" text="Desempeño térmico y acústico coordinado con la zona y el uso." tone="bg-[#EFE7DF]" />
            </div>

            <div className="relative overflow-hidden rounded-[1.8rem] bg-[#242630] p-5 text-white">
              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,transparent_47%,rgba(204,177,150,.35)_48%,rgba(204,177,150,.35)_52%,transparent_53%)] [background-size:72px_100%]" />
              <div className="relative grid h-full min-h-[330px] grid-cols-3 gap-4">
                {[0, 1, 2].map((column) => <div key={column} className="relative"><span className="absolute inset-y-0 left-1/2 w-5 -translate-x-1/2 rounded-sm border-2 border-[#CCB196]/70 bg-[#171820] shadow-[inset_0_0_0_3px_rgba(248,240,233,.05)]" /><span className="absolute left-1/2 top-1/3 h-3 w-[calc(100%+1rem)] -translate-x-1/2 rotate-[28deg] rounded-full bg-[#B6906C]" /></div>)}
              </div>
              <div className="absolute inset-x-5 bottom-5 rounded-[1.3rem] bg-[#F8F0E9] p-4 text-[#171820]"><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#895E3D]">Núcleo estructural</p><h4 className="mt-1 font-black">Perfiles, uniones y arriostramiento</h4><p className="mt-2 text-[11px] leading-5 text-[#685D55]">La resistencia no depende de una pieza aislada: depende de la continuidad del sistema completo.</p></div>
            </div>
          </div>

          <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
            {['Fundación y anclajes definidos', 'Encuentros y vanos reforzados', 'Protección frente a humedad', 'Inspección durante el montaje'].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[11px] font-bold shadow-sm ring-1 ring-[#171820]/7"><Check className="h-4 w-4 shrink-0 text-[#895E3D]" />{item}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function LayerCard({ number, title, text, tone }: { number: string; title: string; text: string; tone: string }) {
  return <article className={`rounded-[1.4rem] p-4 ${tone}`}><span className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Capa {number}</span><h4 className="mt-2 text-sm font-black">{title}</h4><p className="mt-1 text-[10px] leading-5 text-[#5E5148]">{text}</p></article>;
}
