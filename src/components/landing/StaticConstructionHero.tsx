import Link from 'next/link';
import { ArrowDown, ArrowRight, Calculator, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

type Props = { coverUrl?: string };
const fallbackCover = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1800&q=88';
const projects = [
  { src: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=900&q=84', alt: 'Cabaña contemporánea', label: 'Cabañas' },
  { src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=84', alt: 'Casa moderna terminada', label: 'Casas' },
];

export default function StaticConstructionHero({ coverUrl }: Props) {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#080704] px-4 pb-10 pt-24 text-white sm:px-6 lg:px-8 lg:pt-28">
      <img src={coverUrl || fallbackCover} alt="Equipo trabajando en una obra Fabrick" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,4,.96),rgba(5,5,4,.82)_48%,rgba(5,5,4,.34)),linear-gradient(180deg,transparent,rgba(0,0,0,.72))]" />
      <div className="mx-auto grid min-h-[calc(100svh-8.5rem)] max-w-[1500px] items-end gap-10 pb-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center">
        <div className="max-w-5xl">
          <FabrickFullLogo className="mb-10" tagline="Construcción · Remodelación · Hogar" />
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[.25em] text-yellow-200 backdrop-blur-md"><ShieldCheck className="h-3.5 w-3.5" /> Maule y proyectos seleccionados en Santiago</p>
          <h1 className="mt-6 max-w-5xl text-[clamp(3.3rem,8vw,7.6rem)] font-black leading-[.84] tracking-[-.075em]">Tu proyecto empieza con <span className="text-yellow-300">claridad.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-200 sm:text-xl sm:leading-9">Compara un kit, una cabaña, una ampliación o una casa llave en mano. Define los metros, conoce el alcance y decide sin avanzar a ciegas.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#calculadora-m2" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-yellow-300 px-7 text-sm font-black text-black transition hover:bg-white">Calcular mi proyecto <Calculator className="h-4 w-4" /></Link>
            <Link href="/servicios" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/25 px-7 text-sm font-black">Explorar soluciones <ArrowRight className="h-4 w-4" /></Link>
            <a href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20orientaci%C3%B3n%20para%20mi%20proyecto." target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-7 text-sm font-black text-emerald-100">WhatsApp <MessageCircle className="h-4 w-4" /></a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-6">
            {['Valor referencial antes de la visita', 'Incluidos y adicionales por separado', 'Respuesta humana para cerrar detalles'].map(point => <span key={point} className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300"><CheckCircle2 className="h-4 w-4 text-yellow-300" />{point}</span>)}
          </div>
        </div>
        <aside className="hidden self-end lg:block">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[.28em] text-yellow-200">Elige el punto de partida</p>
          <div className="grid grid-cols-2 gap-3">{projects.map(item => <Link key={item.label} href="#calculadora-m2" className="group relative min-h-52 overflow-hidden rounded-[1.6rem] border border-white/15"><img src={item.src} alt={item.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" /><span className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-sm font-black">{item.label}<ArrowRight className="h-4 w-4 text-yellow-300" /></span></Link>)}</div>
          <div className="mt-3 rounded-[1.6rem] border border-white/15 bg-black/45 p-5 backdrop-blur-xl"><p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Sin compromiso</p><p className="mt-2 text-sm leading-6 text-zinc-300">Calcula una referencia en menos de un minuto. Después decides si quieres una evaluación precisa.</p></div>
        </aside>
      </div>
      <a href="#calculadora-m2" aria-label="Ir a la calculadora" className="absolute bottom-6 right-6 hidden h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/35 text-yellow-300 md:grid"><ArrowDown className="h-5 w-5 animate-bounce" /></a>
    </section>
  );
}
