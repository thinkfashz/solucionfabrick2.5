import Link from 'next/link';
import { ArrowRight, Calculator, ClipboardList, MessageCircle, SearchCheck, ShoppingBag, Wrench } from 'lucide-react';

type Props = {
  coverUrl?: string;
};

const fallbackCover = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=85';

const workRules = [
  {
    icon: SearchCheck,
    title: 'Diagnóstico primero',
    text: 'Ordenamos metros, terreno, alcance y conexiones antes de hablar de precio cerrado.',
  },
  {
    icon: ClipboardList,
    title: 'Partidas separadas',
    text: 'Diferenciamos estructura, terminaciones, revestimientos, fosa, empalme y red de agua.',
  },
  {
    icon: Wrench,
    title: 'Ejecución con criterio',
    text: 'Aterrizamos materiales, etapas y compra para reducir errores evitables.',
  },
];

export default function StaticConstructionHero({ coverUrl }: Props) {
  const image = coverUrl || fallbackCover;
  return (
    <section className="relative overflow-hidden bg-[#050403] px-4 pb-16 pt-10 text-white sm:px-6 lg:px-8 lg:pt-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(250,204,21,.14),transparent_30rem),radial-gradient(circle_at_88%_35%,rgba(20,184,166,.10),transparent_28rem),linear-gradient(180deg,#050403,#090806_58%,#020202)]" />
      <div className="absolute inset-x-0 top-0 h-[640px] opacity-30">
        <img src={image} alt="Soluciones para construcción y mejoras del hogar" className="h-full w-full object-cover saturate-110" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,3,.98),rgba(5,4,3,.82)_48%,rgba(5,4,3,.48)),linear-gradient(180deg,rgba(0,0,0,.1),#050403)]" />
      </div>

      <div className="relative mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
        <div className="min-w-0 py-10 lg:py-20">
          <div className="inline-flex w-fit items-center border-b border-teal-300/50 pb-2 text-[10px] font-black uppercase tracking-[0.28em] text-teal-100">
            Construcción · remodelación · equipamiento
          </div>
          <h2 className="mt-8 max-w-5xl text-5xl font-black leading-[.92] tracking-[-0.075em] text-white sm:text-7xl lg:text-8xl">
            Construye con <span className="text-yellow-300">números claros</span> y decisiones mejor ordenadas.
          </h2>
          <div className="mt-7 h-1.5 w-20 rounded-full bg-gradient-to-r from-yellow-300 to-teal-300" />
          <p className="mt-7 max-w-3xl text-base leading-8 text-zinc-200 sm:text-xl">
            Después del cálculo inicial, revisamos el proyecto con criterio: materialidad, terminaciones, revestimientos, instalaciones, conexión de agua, empalme eléctrico, fosa y etapas de ejecución.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            El objetivo no es venderte una promesa rápida, sino ayudarte a entender dónde se va el dinero y qué decisiones suben o bajan el valor por metro cuadrado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#calculadora-m2" className="inline-flex h-14 items-center gap-2 rounded-full bg-yellow-300 px-6 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.25)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
              <Calculator className="h-4 w-4" /> Calcular m²
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
          <p className="mb-5 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300/90">Cómo ordenamos una obra</p>
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

      <section className="relative mx-auto mt-8 max-w-[1500px] border-y border-white/10 py-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">La promesa Fabrick</p>
        <h2 className="mx-auto mt-4 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">Que sepas qué estás pagando antes de empezar</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-zinc-400">
          Construir, remodelar o comprar para tu hogar debe sentirse más claro, más acompañado y menos expuesto a decisiones improvisadas.
        </p>
        <div className="mx-auto mt-9 grid max-w-5xl divide-y divide-white/10 text-left sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <MiniValue title="Cálculo" text="Partimos desde una referencia por m² para conversar con números reales." />
          <MiniValue title="Alcance" text="Separamos lo incluido, lo variable y lo que depende del terreno o conexión." />
          <MiniValue title="Ejecución" text="Ordenamos materiales, etapas y detalles para reducir errores evitables." />
        </div>
      </section>
    </section>
  );
}

function MiniValue({ title, text }: { title: string; text: string }) {
  return <div className="p-5 sm:p-6"><b className="block text-xl font-black text-yellow-300">{title}</b><span className="mt-2 block text-sm leading-6 text-zinc-400">{text}</span></div>;
}
