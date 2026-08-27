import Link from 'next/link';

const OPTIONS = [
  ['Solo quiero una referencia', 'Usa la calculadora para entender un rango sin pedir una cotización todavía.'],
  ['Quiero ejecutar un trabajo', 'Elige una partida —radier, pintura, electricidad, baño, techumbre u otra— y conversemos sobre su ejecución.'],
  ['Tengo varias partidas', 'Reúne los trabajos en un mismo presupuesto y revisa el proyecto como conjunto.'],
] as const;

export default function LandingProcessSection() {
  return (
    <section id="como-funciona" className="relative scroll-mt-20 bg-[#08090A] px-4 py-14 text-[#FFF9EE] sm:px-6 md:px-12 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-7 border-b border-white/10 pb-7 lg:grid-cols-[.75fr_1.25fr] lg:items-end lg:pb-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000] sm:text-[10px]">Tú eliges hasta dónde avanzar</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Una partida puntual o el proyecto completo.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
            No necesitas seguir un proceso largo para empezar. Puedes mirar una referencia, pedir un trabajo específico o agrupar varias partidas cuando el proyecto lo necesite.
          </p>
        </div>

        <div className="grid gap-px bg-white/10 md:grid-cols-3">
          {OPTIONS.map(([title, text]) => (
            <article key={title} className="bg-[#08090A] p-5 sm:p-7">
              <h3 className="text-lg font-black tracking-[-.03em]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/45">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-[#FFB000]/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div><b className="text-lg">¿Quieres juntar varios trabajos?</b><p className="mt-1 text-xs leading-5 text-white/42">Crea una referencia única y elige mano de obra o trabajo vendido por partida.</p></div>
          <Link href="/presupuesto" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#F5871F] px-6 text-xs font-black text-[#08090A] transition hover:bg-[#FFB000] sm:min-h-12 sm:text-sm">Armar mi presupuesto</Link>
        </div>
      </div>
    </section>
  );
}
