import Link from 'next/link';
import { ArrowRight, Calculator, MessageCircle, SearchCheck, ShieldCheck, ShoppingBag, Wrench } from 'lucide-react';

 type Props = {
  coverUrl?: string;
};

const fallbackCover = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=85';

const trustCards = [
  {
    icon: SearchCheck,
    title: 'Más claridad antes de decidir',
    text: 'Ordenamos la idea, el alcance y las alternativas para que no avances a ciegas.',
  },
  {
    icon: ShieldCheck,
    title: 'Menos improvisación',
    text: 'Priorizamos comunicación clara, criterios técnicos y decisiones responsables.',
  },
  {
    icon: Wrench,
    title: 'Soluciones reales',
    text: 'Remodelación, equipamiento y productos pensados para resolver necesidades concretas.',
  },
];

export default function StaticConstructionHero({ coverUrl }: Props) {
  const image = coverUrl || fallbackCover;
  return (
    <section className="relative overflow-hidden bg-[#050505] px-3 pb-14 pt-24 text-white sm:px-6 lg:px-8 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(250,204,21,.18),transparent_30rem),radial-gradient(circle_at_82%_42%,rgba(249,115,22,.12),transparent_28rem),linear-gradient(180deg,#050505,#090806_58%,#030303)]" />
      <div className="relative mx-auto w-full max-w-[1500px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_35px_120px_rgba(0,0,0,.58)] backdrop-blur-xl sm:rounded-[2.8rem]">
          <div className="absolute inset-0">
            <img src={image} alt="Soluciones para construcción y mejoras del hogar" className="h-full w-full object-cover opacity-55 saturate-110" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.93),rgba(0,0,0,.72)_45%,rgba(0,0,0,.22)),linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.92))]" />
          </div>

          <div className="relative grid min-h-[680px] gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:p-12 xl:min-h-[720px]">
            <div className="flex min-w-0 flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-300/25 bg-black/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-yellow-200 backdrop-blur-xl">
                Claridad · responsabilidad · mejores decisiones
              </div>
              <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[.92] tracking-[-0.075em] text-white sm:text-7xl lg:text-8xl">
                Construcción y mejoras <span className="text-yellow-300">sin improvisaciones</span>
              </h1>
              <div className="mt-7 h-1.5 w-16 rounded-full bg-yellow-300" />
              <p className="mt-7 max-w-3xl text-base leading-8 text-zinc-200 sm:text-xl">
                En Soluciones Fabrick te ayudamos a construir, remodelar y equipar tus espacios con más orden, menos incertidumbre y una comunicación más clara desde el primer contacto.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                No prometemos números inflados: nos enfocamos en entender tu necesidad, explicar mejor las opciones y ayudarte a avanzar con criterio.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contacto" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-yellow-300 px-6 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.25)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
                  <Calculator className="h-4 w-4" /> Solicitar orientación
                </Link>
                <Link href="/tienda" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-6 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10">
                  <ShoppingBag className="h-4 w-4" /> Ver productos
                </Link>
                <a href="https://wa.me/56930121625" target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-6 text-sm font-black text-yellow-200 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-yellow-300 hover:text-black">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>

            <aside className="flex min-w-0 items-end lg:items-center">
              <div className="w-full rounded-[2rem] border border-white/15 bg-black/58 p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300/90">Nuestro enfoque</p>
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
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Eliminar la incertidumbre que normalmente frena una obra</h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-zinc-400">
            Queremos que construir, remodelar o comprar para tu hogar se sienta más claro, más acompañado y menos expuesto a malas decisiones.
          </p>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <MiniValue title="Claridad" text="Te ayudamos a entender qué necesitas y por dónde conviene empezar." />
            <MiniValue title="Responsabilidad" text="Orden, comunicación y criterio para reducir errores evitables." />
            <MiniValue title="Solución" text="Servicios y productos pensados para mejorar espacios reales." />
          </div>
        </section>
      </div>
    </section>
  );
}

function MiniValue({ title, text }: { title: string; text: string }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6"><b className="block text-xl font-black text-yellow-300">{title}</b><span className="mt-2 block text-sm leading-6 text-zinc-400">{text}</span></div>;
}
