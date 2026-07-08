import Link from 'next/link';
import { ArrowRight, Calculator, ClipboardList, MessageCircle, SearchCheck, ShoppingBag, Wrench } from 'lucide-react';

type Props = {
  coverUrl?: string;
};

const fallbackCover = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=85';

const workRules = [
  {
    icon: SearchCheck,
    title: 'Primero entendemos lo que quieres hacer',
    text: 'Revisamos si buscas un kit, una cabaña, una casa funcional o una solución con mejores terminaciones.',
  },
  {
    icon: Calculator,
    title: 'Luego aterrizamos precio y alcance',
    text: 'Separamos qué incluye, qué queda fuera y qué puede cambiar según terreno, traslado o conexiones.',
  },
  {
    icon: Wrench,
    title: 'Después ordenamos el siguiente paso',
    text: 'Si el número te sirve, avanzamos a medidas, ubicación, materialidad y cotización más cerrada.',
  },
];

export default function StaticConstructionHero({ coverUrl }: Props) {
  const image = coverUrl || fallbackCover;
  return (
    <section data-scroll-section className="relative overflow-hidden bg-[#050403] px-4 pb-16 pt-10 text-white sm:px-6 lg:px-8 lg:pt-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(250,204,21,.14),transparent_30rem),radial-gradient(circle_at_88%_35%,rgba(20,184,166,.10),transparent_28rem),linear-gradient(180deg,#050403,#090806_58%,#020202)]" />
      <div className="absolute inset-x-0 top-0 h-[640px] opacity-28">
        <img src={image} alt="Soluciones para construcción y mejoras del hogar" className="h-full w-full object-cover saturate-110" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,3,.98),rgba(5,4,3,.82)_48%,rgba(5,4,3,.48)),linear-gradient(180deg,rgba(0,0,0,.1),#050403)]" />
      </div>

      <div className="relative mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
        <div className="min-w-0 py-10 lg:py-20">
          <div className="inline-flex w-fit items-center border-b border-teal-300/50 pb-2 text-[10px] font-black uppercase tracking-[0.28em] text-teal-100">
            Kits · cabañas · casas llave en mano
          </div>
          <h2 className="mt-8 max-w-5xl text-5xl font-black leading-[.92] tracking-[-0.075em] text-white sm:text-7xl lg:text-8xl">
            Cotiza con <span className="text-yellow-300">números claros</span> antes de construir.
          </h2>
          <div className="mt-7 h-1.5 w-20 rounded-full bg-gradient-to-r from-yellow-300 to-teal-300" />
          <p className="mt-7 max-w-3xl text-base leading-8 text-zinc-200 sm:text-xl">
            En Soluciones Fabrick te ayudamos a comparar opciones simples: kit básico, kit intermedio o casa llave en mano. La idea es que primero entiendas el precio aproximado y después veamos los detalles reales de tu terreno.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            No partimos con promesas infladas. Partimos con una base clara: metros cuadrados, alcance, materialidad, instalación, terminaciones y lo que se cotiza aparte.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#calculadora-m2" className="inline-flex h-14 items-center gap-2 rounded-full bg-yellow-300 px-6 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.25)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
              <Calculator className="h-4 w-4" /> Calcular precio
            </Link>
            <Link href="/tienda" className="inline-flex h-14 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-yellow-300/50 hover:text-yellow-300">
              <ShoppingBag className="h-4 w-4" /> Ver productos
            </Link>
            <a href="https://wa.me/56930121625" target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center gap-2 rounded-full border border-teal-300/40 px-6 text-sm font-black text-teal-100 transition hover:-translate-y-0.5 hover:bg-teal-300 hover:text-black">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>

        <aside className="border-y border-white/10 py-6 lg:border-y-0 lg:border-l lg:pl-8">
          <p className="mb-5 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300/90">Cómo te guiamos</p>
          <div className="divide-y divide-white/10">
            {workRules.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-4 py-5">
                <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow-300 text-black"><Icon className="h-4 w-4" /></span>
                <span><b className="block text-white">{title}</b><span className="mt-1 block text-sm leading-6 text-zinc-400">{text}</span></span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section data-scroll-section className="relative mx-auto mt-8 max-w-[1500px] border-y border-white/10 py-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">La promesa Fabrick</p>
        <h2 className="mx-auto mt-4 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">Saber qué pagas antes de avanzar</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-zinc-400">
          Construir no debería sentirse confuso. Te mostramos un número de partida, lo que incluye y lo que queda pendiente para cotizar con más precisión.
        </p>
        <div className="mx-auto mt-9 grid max-w-5xl divide-y divide-white/10 text-left sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <MiniValue title="Precio base" text="Calculamos por m² para que sepas rápido si el proyecto entra en tu presupuesto." />
          <MiniValue title="Alcance claro" text="Marcamos lo incluido y lo que se cotiza aparte, como fosa, empalme o conexiones exteriores." />
          <MiniValue title="Siguiente paso" text="Si el valor te sirve, revisamos medidas, lugar, accesos y terminaciones para cerrar mejor." />
        </div>
      </section>
    </section>
  );
}

function MiniValue({ title, text }: { title: string; text: string }) {
  return <div className="p-5 sm:p-6"><b className="block text-xl font-black text-yellow-300">{title}</b><span className="mt-2 block text-sm leading-6 text-zinc-400">{text}</span></div>;
}
