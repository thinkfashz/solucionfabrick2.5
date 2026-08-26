import Link from 'next/link';

interface StaticConstructionHeroProps {
  coverUrl?: string;
}

const DECISION_PATH = [
  ['01', 'Medir', 'Parte de dimensiones reales y no de una cifra adivinada.'],
  ['02', 'Comparar', 'Separa cada especialidad para entender dónde se concentra la inversión.'],
  ['03', 'Confirmar', 'El equipo revisa alcance, ubicación y condiciones antes de cerrar un valor.'],
] as const;

export default function StaticConstructionHero(_: StaticConstructionHeroProps) {
  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#08090A] px-4 pb-16 pt-24 text-[#FFF9EE] sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_10%,rgba(245,135,31,.16),transparent_30rem),radial-gradient(circle_at_88%_72%,rgba(255,176,0,.08),transparent_28rem)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.045] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="mx-auto grid min-h-[610px] max-w-[1320px] items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,.62fr)]">
        <div className="max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#FFB000]">Construcción y remodelación · Maule y Santiago</p>
          <h1 className="mt-5 max-w-[12ch] text-[clamp(3.2rem,7vw,7.3rem)] font-black leading-[.84] tracking-[-.075em]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Antes de construir, ordena la decisión.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#CFC4BB] sm:text-lg">
            Medidas, partidas, rangos de inversión y una revisión técnica antes de ejecutar. Soluciones Fabrick reúne calculadoras, servicios, productos y comunicación en un mismo recorrido.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#cotizador" className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#F5871F] px-7 text-sm font-black text-[#08090A] transition hover:bg-[#FFB000]">
              Calcular antes de cotizar
            </Link>
            <Link href="/proyectos" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/15 px-7 text-sm font-black text-[#FFF9EE] transition hover:border-[#FFB000]/45 hover:bg-white/[.05]">
              Ver inspiraciones
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[.14em] text-white/42">
            <span>Rangos referenciales</span>
            <span>Precio final confirmado por alcance</span>
            <span>Productos con IVA incluido</span>
          </div>
        </div>

        <aside className="border-t border-[#FFB000]/35 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#FFB000]">Una forma más clara de empezar</p>
          <div className="mt-4 divide-y divide-white/10">
            {DECISION_PATH.map(([number, title, text]) => (
              <div key={number} className="grid grid-cols-[48px_1fr] gap-3 py-5">
                <span className="text-2xl font-black text-white/16">{number}</span>
                <div>
                  <h2 className="text-lg font-black">{title}</h2>
                  <p className="mt-1 text-xs leading-6 text-white/48">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <a href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20ordenar%20mi%20proyecto%20antes%20de%20cotizar." target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#FFF9EE] px-5 text-sm font-black text-[#08090A] transition hover:bg-[#FFB000]">
            Hablar con el equipo
          </a>
        </aside>
      </div>
    </section>
  );
}
