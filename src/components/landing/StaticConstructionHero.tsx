import Link from 'next/link';

interface StaticConstructionHeroProps {
  coverUrl?: string;
}

const DECISION_PATH = [
  ['01', 'Medir', 'Parte de dimensiones reales, no de una cifra adivinada.'],
  ['02', 'Comparar', 'Separa cada especialidad y entiende dónde se concentra la inversión.'],
  ['03', 'Confirmar', 'El equipo revisa alcance y condiciones antes de cerrar un valor.'],
] as const;

export default function StaticConstructionHero(_: StaticConstructionHeroProps) {
  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#08090A] px-4 pb-12 pt-20 text-[#FFF9EE] sm:px-6 sm:pb-16 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_10%,rgba(245,135,31,.16),transparent_30rem),radial-gradient(circle_at_88%_72%,rgba(255,176,0,.08),transparent_28rem)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.04] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="mx-auto grid max-w-[1320px] items-center gap-9 lg:min-h-[610px] lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,.62fr)] lg:gap-12">
        <div className="max-w-4xl">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000] sm:text-[10px] sm:tracking-[.24em]">Construcción y remodelación · Maule y Santiago</p>
          <h1 className="mt-4 max-w-[12ch] text-[clamp(2.75rem,13vw,7.3rem)] font-black leading-[.87] tracking-[-.07em] sm:mt-5 sm:leading-[.84]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Antes de construir, ordena la decisión.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#CFC4BB] sm:mt-7 sm:text-lg sm:leading-8">
            Calcula medidas, separa partidas y conoce un rango de inversión antes de ejecutar. Fabrick reúne servicios, productos y comunicación en un solo recorrido.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:gap-3">
            <Link href="#cotizador" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#F5871F] px-4 text-center text-[11px] font-black leading-4 text-[#08090A] transition hover:bg-[#FFB000] sm:min-h-14 sm:px-7 sm:text-sm">
              Calcular proyecto
            </Link>
            <Link href="/proyectos" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-4 text-center text-[11px] font-black leading-4 text-[#FFF9EE] transition hover:border-[#FFB000]/45 hover:bg-white/[.05] sm:min-h-14 sm:px-7 sm:text-sm">
              Ver inspiraciones
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden border-y border-white/9 bg-white/9 sm:mt-10 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:border-t sm:border-b-0 sm:bg-transparent sm:pt-5">
            {['Rangos referenciales', 'Precio confirmado por alcance', 'Productos con IVA incluido'].map((item) => (
              <span key={item} className="bg-[#08090A] px-2 py-3 text-center text-[8px] font-bold uppercase leading-4 tracking-[.08em] text-white/42 sm:bg-transparent sm:px-0 sm:py-0 sm:text-left sm:text-[10px] sm:tracking-[.14em]">{item}</span>
            ))}
          </div>
        </div>

        <aside className="border-t border-[#FFB000]/30 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Una forma más clara de empezar</p>
          <div className="mt-3 grid grid-cols-3 gap-px bg-white/10 sm:mt-4 sm:block sm:divide-y sm:divide-white/10 sm:bg-transparent">
            {DECISION_PATH.map(([number, title, text]) => (
              <div key={number} className="bg-[#08090A] px-2 py-4 text-center sm:grid sm:grid-cols-[48px_1fr] sm:gap-3 sm:bg-transparent sm:px-0 sm:py-5 sm:text-left">
                <span className="text-[10px] font-black text-white/22 sm:text-2xl">{number}</span>
                <div>
                  <h2 className="mt-1 text-xs font-black sm:mt-0 sm:text-lg">{title}</h2>
                  <p className="mt-1 hidden text-xs leading-6 text-white/48 sm:block">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <a href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20ordenar%20mi%20proyecto%20antes%20de%20cotizar." target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#FFF9EE] px-5 text-xs font-black text-[#08090A] transition hover:bg-[#FFB000] sm:mt-5 sm:min-h-12 sm:text-sm">
            Hablar con el equipo
          </a>
        </aside>
      </div>
    </section>
  );
}
