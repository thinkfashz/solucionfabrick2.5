const BENEFITS = [
  ['Mano de obra', 'Muestra cuánto puede costar ejecutar o instalar el trabajo sin sumar los materiales principales.'],
  ['Trabajo vendido', 'Muestra una referencia con ejecución más los materiales o insumos base descritos para esa partida.'],
  ['Medida real', 'Calcula por m², metro lineal, volumen, punto o unidad según el trabajo que elijas.'],
] as const;

export default function CalculatorPlanShowcase() {
  return (
    <section className="bg-[#FFF9EE] px-4 py-14 text-[#08090A] sm:px-6 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-[1260px]">
        <div className="grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#B96F00]">Una referencia sin vueltas</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Mira el costo sin mezclar conceptos.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-black/52 sm:text-base">
            Un precio puede parecer alto cuando mezcla instalación, materiales y terminaciones. Por eso ahora separamos <b className="text-black/75">mano de obra</b> de <b className="text-black/75">trabajo vendido</b> para que compares lo mismo con lo mismo.
          </p>
        </div>

        <div className="grid gap-px bg-black/10 sm:grid-cols-3">
          {BENEFITS.map(([title, text]) => (
            <article key={title} className="bg-[#FFF9EE] px-1 py-6 sm:px-5 sm:py-8">
              <span className="inline-flex rounded-full bg-[#F2DFBB]/65 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em] text-[#8D5B19]">Referencia</span>
              <h3 className="mt-3 text-xl font-black tracking-[-.035em]">{title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-black/48">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
