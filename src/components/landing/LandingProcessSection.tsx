import Link from 'next/link';

const STEPS = [
  ['01', 'Compartes el contexto', 'Envías las partidas calculadas junto con ubicación, medidas, fotografías y el resultado que necesitas conseguir.'],
  ['02', 'Revisamos el alcance', 'Separamos lo que está incluido, lo que todavía falta definir y las condiciones que pueden cambiar tiempo, materiales o costo.'],
  ['03', 'Validamos lo crítico', 'Cuando corresponde, confirmamos terreno, acceso, estructura existente, instalaciones, materiales, permisos o visita técnica.'],
  ['04', 'Propuesta y ejecución', 'Con el alcance entendido se presenta el valor final, etapas y condiciones. La obra comienza con una base mucho más clara para ambas partes.'],
] as const;

export default function LandingProcessSection() {
  return (
    <section id="como-funciona" className="relative scroll-mt-20 bg-[#08090A] px-4 py-14 text-[#FFF9EE] sm:px-6 md:px-12 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-7 border-b border-white/10 pb-7 lg:grid-cols-[.75fr_1.25fr] lg:items-end lg:pb-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000] sm:text-[10px] sm:tracking-[.22em]">Después de calcular</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">El rango orienta. La revisión convierte eso en proyecto.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
            La calculadora sirve para empezar con contexto. El siguiente paso es revisar las variables que una fórmula no puede ver: estado real, acceso, materiales, terreno, instalaciones y nivel de terminación.
          </p>
        </div>

        <div className="divide-y divide-white/10">
          {STEPS.map(([number, title, text]) => (
            <article key={number} className="grid grid-cols-[42px_1fr] gap-x-3 gap-y-2 py-5 sm:grid-cols-[70px_220px_1fr] sm:items-start sm:gap-3 sm:py-8">
              <span className="pt-0.5 text-[11px] font-black tracking-[-.02em] text-white/20 sm:text-3xl sm:tracking-[-.05em]">{number}</span>
              <h3 className="text-base font-black tracking-[-.03em] sm:text-xl sm:tracking-[-.035em]">{title}</h3>
              <p className="col-start-2 max-w-2xl text-[13px] leading-6 text-white/45 sm:col-start-auto sm:text-sm sm:leading-7">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-[#FFB000]/30 pt-6 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <b className="text-lg">¿Ya tienes varias partidas?</b>
            <p className="mt-1 text-xs leading-5 text-white/42">Agrúpalas en un solo proyecto y compártelas con el equipo con sus medidas y rango.</p>
          </div>
          <Link href="/presupuesto" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#F5871F] px-6 text-xs font-black text-[#08090A] transition hover:bg-[#FFB000] sm:min-h-12 sm:text-sm">
            Armar presupuesto completo
          </Link>
        </div>
      </div>
    </section>
  );
}
