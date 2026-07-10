import Link from 'next/link';
import { ArrowDown, Calculator, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

/* eslint-disable @next/next/no-img-element */

type Props = { coverUrl?: string };
const fallbackCover = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1800&q=88';

export default function StaticConstructionHero({ coverUrl }: Props) {
  return (
    <section className="relative isolate min-h-[72svh] overflow-hidden bg-[#080704] px-4 pb-10 pt-24 text-white sm:px-6 lg:px-8 lg:pt-28">
      <img src={coverUrl || fallbackCover} alt="Construcción de una vivienda" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,4,.96),rgba(5,5,4,.78)_58%,rgba(5,5,4,.42)),linear-gradient(180deg,transparent,rgba(0,0,0,.78))]" />
      <div className="mx-auto flex min-h-[calc(72svh-8rem)] max-w-[1380px] items-center">
        <div className="max-w-4xl py-10">
          <FabrickFullLogo className="mb-8" tagline="Construcción · Remodelación · Hogar" />
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[.23em] text-yellow-200 backdrop-blur-md"><ShieldCheck className="h-3.5 w-3.5" /> Linares · Región del Maule</p>
          <h1 className="mt-5 max-w-4xl text-[clamp(3rem,7vw,6.8rem)] font-black leading-[.88] tracking-[-.07em]">Construye con un alcance y un precio <span className="text-yellow-300">entendibles.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg sm:leading-8">Compara kit básico, kit avanzado y llave en mano. Revisa qué incluye cada opción antes de pedir una cotización.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="#calculadora-m2" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-yellow-300 px-7 text-sm font-black text-black transition hover:bg-white">Calcular ahora <Calculator className="h-4 w-4" /></Link>
            <a href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20orientaci%C3%B3n%20para%20mi%20proyecto." target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/25 px-7 text-sm font-black text-white transition hover:border-yellow-300/50 hover:text-yellow-300">Hablar con una persona <MessageCircle className="h-4 w-4" /></a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-5">{['Rango antes de la visita', 'Incluidos y exclusiones visibles', 'Cotización final con evaluación'].map((point) => <span key={point} className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300"><CheckCircle2 className="h-4 w-4 text-yellow-300" />{point}</span>)}</div>
        </div>
      </div>
      <a href="#calculadora-m2" aria-label="Ir a la calculadora" className="absolute bottom-5 right-5 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/40 text-yellow-300"><ArrowDown className="h-5 w-5 animate-bounce" /></a>
    </section>
  );
}
