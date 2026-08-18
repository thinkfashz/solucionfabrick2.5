'use client';

import Link from 'next/link';
import { ArrowRight, Braces, Check, Ruler, ShieldCheck } from 'lucide-react';
import MetalconStructure3D from '@/components/landing/MetalconStructure3D';

const BENEFITS = [
  { icon: Braces, title: 'Estructura liviana', text: 'Reduce masa respecto de sistemas pesados y permite organizar cargas, encuentros y refuerzos desde el diseño.' },
  { icon: ShieldCheck, title: 'Ductilidad y continuidad', text: 'Los perfiles, arriostramientos, anclajes y uniones trabajan como un sistema cuando están correctamente dimensionados y ejecutados.' },
] as const;

export default function MetalconSeismicStory() {
  return (
    <section className="relative overflow-hidden bg-[#171820] px-4 py-16 text-[#F8F0E9] sm:px-6 md:px-12 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(204,177,150,.2),transparent_30rem),radial-gradient(circle_at_88%_80%,rgba(182,144,108,.12),transparent_32rem)]" />
      <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-center">
        <div>
          <p data-reveal className="text-[10px] font-black uppercase tracking-[.25em] text-[#CCB196]">Sistema estructural destacado</p>
          <h2 data-split className="mt-4 text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">En un país sísmico, la estructura se decide antes que la terminación.</h2>
          <p data-reveal data-reveal-delay="0.15" className="mt-5 max-w-2xl text-sm leading-7 text-[#CFC3BA] sm:text-base">
            Metalcon utiliza perfiles de acero galvanizado conformados en frío. Su menor masa y capacidad de deformación pueden ser favorables frente a acciones sísmicas, pero el desempeño depende del cálculo estructural, fundaciones, anclajes, arriostramientos, uniones y ejecución completa del sistema.
          </p>
        <div data-reveal-group data-reveal-dir="up" className="mt-7 grid gap-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="flex gap-4 rounded-[1.5rem] bg-white/[.055] p-4 ring-1 ring-white/7">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#B6906C] text-[#171820]"><Icon className="h-5 w-5" /></span>
                <div><h3 className="text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-[#BEB2A8]">{text}</p></div>
              </article>
            ))}
          </div>
          <div data-reveal data-reveal-delay="0.2" className="mt-7 flex flex-wrap gap-3">
            <Link href="/presupuesto?servicio=metalcon" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-[#D8B23D] px-6 text-sm font-black text-[#171820] transition hover:bg-[#F4D98B]">Cotizar estructura Metalcon <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/servicios/metalcon" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-white/7 px-6 text-sm font-black text-[#F8F0E9] transition hover:bg-white/12">Conocer el sistema</Link>
          </div>
          <p className="mt-5 flex max-w-2xl items-start gap-2 text-[10px] leading-5 text-white/38"><Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#CCB196]" /> El estimador entrega una referencia comercial. Un proyecto estructural requiere revisión profesional y cumplimiento de las normas aplicables.</p>
        </div>

        <div data-reveal data-reveal-dir="right" data-parallax="-5" className="relative overflow-hidden rounded-[2.4rem] bg-[#F8F0E9] p-4 shadow-[0_32px_100px_rgba(0,0,0,.3)] sm:p-5">
          <MetalconStructure3D />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {['Parantes C90 cada 0,40 m con rieles U90', 'Dinteles dobles sobre vanos de puerta y ventana', 'Arriostramiento en X en los muros', 'Cerchas tipo W cada 0,60 m sobre los muros'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[11px] font-bold shadow-sm ring-1 ring-[#171820]/7"><Check className="h-4 w-4 shrink-0 text-[#895E3D]" />{item}</div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-[#8A7769]"><Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#895E3D]" /> Perfiles dimensionados según ficha técnica Metalcon D90 (parante C 90×38×12 e0,85 y riel U 90×25 e0,45); el espesor se muestra ampliado para lectura visual. Un proyecto real requiere cálculo estructural profesional.</p>
        </div>
      </div>
    </section>
  );
}
