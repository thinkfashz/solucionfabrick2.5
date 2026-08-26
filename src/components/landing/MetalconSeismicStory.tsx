import Link from 'next/link';

const SYSTEM_STEPS = [
  ['01', 'Suelo y fundación', 'La respuesta de la vivienda empieza en una base adecuada al terreno, las cargas y el proyecto.'],
  ['02', 'Estructura y conexiones', 'Perfiles, anclajes, arriostramientos y fijaciones deben trabajar como un conjunto.'],
  ['03', 'Materiales especificados', 'Cada producto debe tener una función clara y ser compatible con el sistema que se está ejecutando.'],
  ['04', 'Ejecución controlada', 'Una buena solución necesita montaje preciso, revisión y decisiones técnicas antes de cerrar muros y techumbre.'],
] as const;

export default function MetalconSeismicStory() {
  return (
    <section aria-labelledby="sismo-title" className="bg-[#08090A] px-4 py-16 text-[#FFF9EE] sm:px-6 md:px-12 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#FFB000]">Criterio sísmico</p>
            <h2 id="sismo-title" className="mt-3 max-w-[11ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">
              En Chile, la seguridad no puede ser una terminación.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/52 sm:text-base">
              La resistencia no depende de una sola placa, un perfil o una promesa comercial. Depende de cómo suelo, fundación, estructura, anclajes, uniones y ejecución trabajan juntos.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/52">
              Una vivienda bien proyectada busca proteger a las personas y controlar fallas esperables. No existe una casa invulnerable; existe un sistema que se diseña y se ejecuta con criterio.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/presupuesto?servicio=metalcon" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#F5871F] px-6 text-sm font-black text-[#08090A] transition hover:bg-[#FFB000]">
                Estimar estructura Metalcon
              </Link>
              <Link href="/servicios/metalcon" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-black text-[#FFF9EE] transition hover:border-[#FFB000]/45">
                Conocer el sistema
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-[10px] leading-5 text-white/32">Toda solución estructural se confirma según proyecto, cálculo profesional, terreno y normativa aplicable.</p>
          </div>

          <div className="border-t border-white/10">
            {SYSTEM_STEPS.map(([number, title, text]) => (
              <article key={number} className="grid gap-2 border-b border-white/10 py-6 sm:grid-cols-[52px_220px_1fr] sm:gap-5 sm:py-7">
                <span className="text-sm font-black text-white/18">{number}</span>
                <h3 className="text-lg font-black tracking-[-.03em]">{title}</h3>
                <p className="text-sm leading-7 text-white/46">{text}</p>
              </article>
            ))}
            <div className="py-6">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#FFB000]">Respaldo verificable</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/46">Cuando un material tenga garantía de fabricante, la propuesta debe identificar marca, alcance, vigencia y condiciones. La garantía se explica; no se usa como sustituto del diseño correcto.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
