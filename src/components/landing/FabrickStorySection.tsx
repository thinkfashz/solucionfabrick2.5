import Link from 'next/link';

const PROBLEMS = [
  ['Cotizar sin saber qué se está midiendo', 'Un precio por mensaje sirve de poco si todavía no sabemos superficie, longitud, cantidad, estado actual ni qué incluye realmente el trabajo.'],
  ['Comparar números que no incluyen lo mismo', 'Dos valores pueden parecer muy distintos cuando uno considera materiales, preparación o terminaciones y el otro no. Fabrick busca separar esas diferencias antes de decidir.'],
  ['Perder información entre fotos y conversaciones', 'Cuando medidas, imágenes, productos y cambios quedan repartidos en varios canales, se repiten preguntas y aumentan las posibilidades de error.'],
  ['Descubrir problemas cuando la obra ya empezó', 'Acceso, estructura, instalaciones, humedad, terreno o materiales pueden cambiar una solución. Es mejor detectarlo antes de comprometer un precio o una fecha.'],
] as const;

export default function FabrickStorySection() {
  return (
    <section id="nosotros" className="bg-[#FFF9EE] px-4 py-14 text-[#08090A] sm:px-6 md:px-12 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-10">
          <div className="lg:sticky lg:top-24">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#B96F00] sm:text-[10px] sm:tracking-[.22em]">Por qué existe Soluciones Fabrick</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">La obra empieza mucho antes del primer material.</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-black/52 sm:text-base">
              La idea detrás de Fabrick nace de un problema cotidiano: muchas decisiones de construcción comienzan con una foto y una pregunta de precio, cuando todavía falta ordenar casi todo lo que define ese precio.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-7 text-black/52">
              Por eso la plataforma conecta estimadores, presupuesto por partidas, productos, inspiraciones y contacto con el equipo. No reemplaza una evaluación técnica; hace que lleguemos a ella con mejor información.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/presupuesto" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#08090A] px-5 text-xs font-black text-[#FFF9EE] transition hover:bg-[#F5871F] hover:text-[#08090A] sm:min-h-12 sm:px-6 sm:text-sm">
                Ordenar mi proyecto
              </Link>
              <Link href="/proyectos" className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/15 px-5 text-xs font-black text-[#08090A] transition hover:border-[#F5871F] sm:min-h-12 sm:px-6 sm:text-sm">
                Ver inspiraciones
              </Link>
            </div>
          </div>

          <div className="border-t border-black/10">
            {PROBLEMS.map(([title, text], index) => (
              <article key={title} className="grid grid-cols-[38px_1fr] gap-x-3 gap-y-2 border-b border-black/10 py-5 sm:grid-cols-[52px_230px_1fr] sm:gap-5 sm:py-7">
                <span className="pt-0.5 text-[10px] font-black text-black/22 sm:text-sm">0{index + 1}</span>
                <h3 className="text-base font-black tracking-[-.025em] sm:text-lg">{title}</h3>
                <p className="col-start-2 text-[13px] leading-6 text-black/46 sm:col-start-auto sm:text-sm sm:leading-7">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
