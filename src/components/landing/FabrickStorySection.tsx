import Link from 'next/link';

const AREAS = [
  ['Construcción y remodelación', 'Casas, ampliaciones, radier, estructuras, baños, techumbre y mejoras del hogar.'],
  ['Instalaciones y terminaciones', 'Electricidad, gasfitería, climatización, pisos, pintura, revestimientos y carpintería.'],
  ['Tienda y herramientas', 'Productos, calculadoras y referencias de costo para ayudarte a decidir y avanzar con más claridad.'],
] as const;

export default function FabrickStorySection() {
  return (
    <section id="nosotros" className="bg-[#FFF9EE] px-4 py-14 text-[#08090A] sm:px-6 md:px-12 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-10">
          <div className="lg:sticky lg:top-24">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#B96F00] sm:text-[10px]">Soluciones Fabrick</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Construcción, mejoras y productos en un mismo lugar.</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-black/52 sm:text-base">
              Fabrick reúne trabajos de construcción y hogar con herramientas simples para estimar, comprar y solicitar ejecución sin saltar entre distintas plataformas.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/presupuesto" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#08090A] px-5 text-xs font-black text-[#FFF9EE] transition hover:bg-[#F5871F] hover:text-[#08090A] sm:min-h-12 sm:px-6 sm:text-sm">Calcular un trabajo</Link>
              <Link href="/proyectos" className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/15 px-5 text-xs font-black text-[#08090A] transition hover:border-[#F5871F] sm:min-h-12 sm:px-6 sm:text-sm">Ver proyectos</Link>
            </div>
          </div>

          <div className="border-t border-black/10">
            {AREAS.map(([title, text]) => (
              <article key={title} className="grid gap-2 border-b border-black/10 py-6 sm:grid-cols-[230px_1fr] sm:gap-5 sm:py-8">
                <h3 className="text-base font-black tracking-[-.025em] sm:text-lg">{title}</h3>
                <p className="text-[13px] leading-6 text-black/46 sm:text-sm sm:leading-7">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
