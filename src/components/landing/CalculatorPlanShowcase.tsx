const BENEFITS = [
  ['Saber qué medir', 'Antes de preguntar por un precio, identifica la superficie, longitud, volumen o cantidad que realmente interviene en el trabajo.'],
  ['Separar partidas', 'Un proyecto se entiende mejor cuando radier, estructura, instalaciones y terminaciones se comparan por separado.'],
  ['Llegar mejor preparado', 'Con un rango previo puedes hacer preguntas concretas, detectar diferencias y decidir qué vale la pena revisar primero.'],
] as const;

export default function CalculatorPlanShowcase() {
  return (
    <section className="bg-[#FFF9EE] px-4 py-14 text-[#08090A] sm:px-6 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-[1260px]">
        <div className="grid gap-7 border-b border-black/10 pb-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#B96F00]">Antes de pedir una cotización</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Calcula para preguntar mejor.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-black/52 sm:text-base">
            La calculadora no reemplaza una visita ni convierte un rango en precio final. Su valor está en darte contexto para saber qué estás comparando antes de comprometer dinero.
          </p>
        </div>

        <div className="grid gap-px bg-black/10 sm:grid-cols-3">
          {BENEFITS.map(([title, text], index) => (
            <article key={title} className="bg-[#FFF9EE] px-1 py-6 sm:px-5 sm:py-8">
              <span className="text-[10px] font-black text-black/25">0{index + 1}</span>
              <h3 className="mt-3 text-xl font-black tracking-[-.035em]">{title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-black/48">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
