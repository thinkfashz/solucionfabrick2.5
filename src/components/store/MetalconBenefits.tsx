import { Banknote, BugOff, Clock3, Flame, Hammer, Info, LayoutTemplate, Recycle, Waves } from 'lucide-react';

/**
 * "Por qué Metalcon": beneficios declarados por el fabricante (Cintac) traducidos a lenguaje claro.
 * Regla editorial: se citan como propiedades del sistema, no como garantías universales;
 * la vida útil y el comportamiento sísmico dependen de diseño, ejecución y ambiente.
 */
const BENEFITS = [
  {
    icon: Flame,
    title: 'No combustible',
    text: 'El acero no aporta material combustible al incendio: la estructura no alimenta el fuego ni genera humo tóxico por sí misma.',
  },
  {
    icon: Waves,
    title: 'Sismo-resistente dúctil',
    text: 'Ante un sismo el acero se deforma en vez de quebrarse. Esa ductilidad absorbe energía y gana tiempo de desalojo.',
  },
  {
    icon: Clock3,
    title: 'Más de 100 años, sin mantención',
    text: 'El fabricante declara una vida útil superior a 100 años y ausencia de mantención periódica del sistema.',
  },
  {
    icon: BugOff,
    title: 'Sin hongos, moho ni termitas',
    text: 'El acero galvanizado no absorbe humedad: no hay moho, no hay hongos y las termitas no se alimentan de él.',
  },
  {
    icon: Hammer,
    title: 'Liviano y rápido de montar',
    text: 'Piezas pre-armadas que se atornillan entre sí. Se manipula a mano y sin maquinaria pesada en obra.',
  },
  {
    icon: LayoutTemplate,
    title: 'Versátil, hasta 3 niveles',
    text: 'Permite espacios amplios sin vigas ni columnas intermedias. El fabricante declara viviendas de hasta tres niveles.',
  },
  {
    icon: Banknote,
    title: 'Económico',
    text: 'Bajo desperdicio de material y cero reparaciones por humedad o plagas: el costo total del ciclo de vida baja con los años.',
  },
  {
    icon: Recycle,
    title: '100% reciclable',
    text: 'El acero se recicla sin perder propiedades. El sistema es ecológico y de bajo desperdicio en obra y al final de su vida.',
  },
] as const;

export default function MetalconBenefits() {
  return (
    <section id="por-que-metalcon" className="border-b border-white/8 px-3 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1500px]">
        <p className="text-[11px] font-black uppercase tracking-[.24em] text-[#FFE600]">Por qué Metalcon</p>
        <h2 className="mt-3 max-w-4xl text-[clamp(1.8rem,4vw,3.2rem)] font-black leading-[.98] tracking-[-.045em]">
          Ocho razones para elegir acero galvanizado.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
          Metalcon es un sistema constructivo de acero galvanizado conformado en frío. Estas son las propiedades que el fabricante declara para el sistema y por qué te cambian el resultado en obra.
        </p>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="group rounded-[1.4rem] border border-white/10 bg-[#0A0F13] p-5 transition-colors hover:border-[#FFE600]/35">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#FFE600]/25 bg-[#FFE600]/10 text-[#FFE600]">
                <Icon size={19} aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-black leading-tight text-white/90">{title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-white/55">{text}</p>
            </article>
          ))}
        </div>

        <p className="mt-6 flex max-w-4xl gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-[12px] leading-6 text-white/50">
          <Info size={15} className="mt-1 shrink-0 text-[#FFE600]" aria-hidden />
          Son propiedades declaradas por Cintac para el sistema. La vida útil de más de 100 años es una referencia del fabricante: el ambiente, la corrosión, el agua, el diseño, la ejecución y la mantención siguen siendo determinantes en cada obra.
        </p>
      </div>
    </section>
  );
}
