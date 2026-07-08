import Link from 'next/link';
import { ArrowRight, Calculator, CheckCircle2, ClipboardList, MessageCircle, SearchCheck, ShieldCheck, ShoppingBag, Wrench } from 'lucide-react';

 type Props = {
  coverUrl?: string;
};

const fallbackCover = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=85';

const trustCards = [
  {
    icon: SearchCheck,
    title: 'Diagnóstico antes de prometer precio',
    text: 'Primero ordenamos metros, alcance, terreno, terminaciones y conexiones para evitar cotizaciones engañosas.',
  },
  {
    icon: ClipboardList,
    title: 'Presupuesto con partidas claras',
    text: 'Separamos estructura, instalaciones, revestimientos, fosa, empalme eléctrico y red de agua cuando aplica.',
  },
  {
    icon: Wrench,
    title: 'Ejecución y compra más organizada',
    text: 'Conectamos servicios, materiales y productos para que el avance tenga sentido técnico y comercial.',
  },
];

export default function StaticConstructionHero({ coverUrl }: Props) {
  const image = coverUrl || fallbackCover;
  return (
    <section className="relative overflow-hidden bg-[#050403] px-3 pb-16 pt-8 text-white sm:px-6 lg:px-8 lg:pt-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(250,204,21,.16),transparent_30rem),radial-gradient(circle_at_88%_40%,rgba(20,184,166,.10),transparent_28rem),linear-gradient(180deg,#050403,#090806_58%,#020202)]" />
      <div className="relative mx-auto w-full max-w-[1500px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/14 bg-black/45 shadow-[0_35px_120px_rgba(0,0,0,.58)] backdrop-blur-xl sm:rounded-[2.8rem]">
          <div className="absolute inset-0">
            <img src={image} alt="Soluciones para construcción y mejoras del hogar" className="h-full w-full object-cover opacity-42 saturate-110" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,3,.96),rgba(5,4,3,.78)_48%,rgba(5,4,3,.28)),linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.94))]" />
          </div>

          <div className="relative grid min-h-[620px] gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:p-12 xl:min-h-[670px]">
            <div className="flex min-w-0 flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-teal-100 backdrop-blur-xl">
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
                <Link href="#calculadora-m2" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-yellow-300 px-6 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.25)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
                  <Calculator className="h-4 w-4" /> Calcular m²
                </Link>
                <Link href="/tienda" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-6 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10">
                  <ShoppingBag className="h-4 w-4" /> Ver productos
                </Link>
                <a href="https://wa.me/56930121625" target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-6 text-sm font-black text-teal-100 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-teal-300 hover:text-black">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>

            <aside className="flex min-w-0 items-end lg:items-center">
              <div className="w-full rounded-[2rem] border border-white/15 bg-black/62 p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300/90">Cómo ordenamos una obra</p>
                <div className="grid gap-4">
                  {trustCards.map(({ icon: Icon, title, text }) => (
                    <div key={title} className="flex items-start gap-4 rounded-[1.45rem] border border-white/10 bg-white/[0.045] p-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 text-yellow-300"><Icon className="h-5 w-5" /></span>
                      <span><b className="block text-white">{title}</b><span className="mt-1 block text-sm leading-6 text-zinc-400">{text}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <section className="mx-auto mt-12 max-w-6xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">La promesa Fabrick</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Que sepas qué estás pagando antes de empezar</h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-zinc-400">
            Construir, remodelar o comprar para tu hogar debe sentirse más claro, más acompañado y menos expuesto a decisiones improvisadas.
          </p>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <MiniValue title="Cálculo" text="Partimos desde una referencia por m² para conversar con números reales." />
            <MiniValue title="Alcance" text="Separamos lo incluido, lo variable y lo que depende del terreno o conexión." />
            <MiniValue title="Ejecución" text="Ordenamos materiales, etapas y detalles para reducir errores evitables." />
          </div>
        </section>
      </div>
    </section>
  );
}

function MiniValue({ title, text }: { title: string; text: string }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6"><b className="block text-xl font-black text-yellow-300">{title}</b><span className="mt-2 block text-sm leading-6 text-zinc-400">{text}</span></div>;
}
