import Link from 'next/link';

const PROBLEMS = [
  ['Presupuestos difíciles de comparar', 'Cuando cada partida se explica de una forma distinta, el cliente termina comparando números que no representan el mismo alcance.'],
  ['Falta de medidas antes de cotizar', 'Muchas conversaciones parten con un “¿cuánto cuesta?” sin superficie, longitud, cantidad ni estado actual del lugar.'],
  ['Información repartida en demasiados canales', 'Fotos por un lado, medidas por otro y productos en otra conversación hacen más fácil perder contexto y repetir preguntas.'],
  ['Decisiones técnicas que se ven demasiado tarde', 'Estructura, instalaciones, accesos y materiales pueden cambiar un proyecto cuando ya existe una expectativa de precio.'],
] as const;

export default function FabrickStorySection() {
  return (
    <section id="nosotros" className="bg-[#FFF9EE] px-4 py-16 text-[#08090A] sm:px-6 md:px-12 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#B96F00]">Por qué existe Soluciones Fabrick</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Construir debería empezar con claridad.</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-black/52 sm:text-base">
              Soluciones Fabrick nace de una idea simple: antes de vender una obra o un producto, hay que ayudar a entender qué se necesita, cuánto se está midiendo y qué falta confirmar.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-7 text-black/52">
              Por eso reunimos estimadores, presupuesto por partidas, productos, inspiración y comunicación en una misma plataforma. La meta no es reemplazar el criterio técnico; es llegar mejor preparado a él.
            </p>
            <Link href="/proyectos" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#08090A] px-6 text-sm font-black text-[#FFF9EE] transition hover:bg-[#F5871F] hover:text-[#08090A]">
              Ver ideas y referencias
            </Link>
          </div>

          <div className="border-t border-black/10">
            {PROBLEMS.map(([title, text], index) => (
              <article key={title} className="grid gap-2 border-b border-black/10 py-6 sm:grid-cols-[52px_230px_1fr] sm:gap-5 sm:py-7">
                <span className="text-sm font-black text-black/20">0{index + 1}</span>
                <h3 className="text-lg font-black tracking-[-.03em]">{title}</h3>
                <p className="text-sm leading-7 text-black/46">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
