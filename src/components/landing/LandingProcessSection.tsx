import Link from 'next/link';

const STEPS = [
  ['01', 'Define el trabajo', 'Describe qué quieres resolver y separa las especialidades que intervienen.'],
  ['02', 'Ingresa medidas reales', 'La calculadora usa superficie, volumen, metros lineales o unidades según cada partida.'],
  ['03', 'Compara el rango', 'Revisa el costo referencial de cada servicio antes de pedir una confirmación.'],
  ['04', 'Confirma el alcance', 'Compartimos la estimación, revisamos condiciones reales y recién entonces cerramos el valor.'],
] as const;

export default function LandingProcessSection() {
  return (
    <section id="como-funciona" className="relative scroll-mt-20 bg-[#08090A] px-4 py-16 text-[#FFF9EE] sm:px-6 md:px-12 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-7 border-b border-white/10 pb-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#FFB000]">Cómo trabajamos</p>
            <h2 className="mt-3 max-w-[10ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">De una idea suelta a un proyecto entendible.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
            El objetivo no es llenar formularios. Es llegar a una conversación donde todos estén hablando del mismo alcance, las mismas medidas y las mismas partidas.
          </p>
        </div>

        <div className="divide-y divide-white/10">
          {STEPS.map(([number, title, text]) => (
            <article key={number} className="grid gap-3 py-6 sm:grid-cols-[70px_220px_1fr] sm:items-start sm:py-8">
              <span className="text-3xl font-black tracking-[-.05em] text-white/14">{number}</span>
              <h3 className="text-xl font-black tracking-[-.035em]">{title}</h3>
              <p className="max-w-2xl text-sm leading-7 text-white/45">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[#FFB000]/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <b className="text-lg">Empieza con una estimación, no con una promesa.</b>
            <p className="mt-1 text-xs leading-5 text-white/42">El precio final se confirma cuando el alcance deja de ser una suposición.</p>
          </div>
          <Link href="#cotizador" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#F5871F] px-6 text-sm font-black text-[#08090A] transition hover:bg-[#FFB000]">
            Ir a la calculadora
          </Link>
        </div>
      </div>
    </section>
  );
}
