import { BookOpen, Layers3, Ruler, Shapes } from 'lucide-react';
import { METALCON_FAMILIES, METALCON_PROFILES, METALCON_SOURCES } from '@/lib/metalconSpecs';

const PANEL = 'rounded-[1.6rem] border border-white/10 bg-[#0A0F13]';
const TH = 'px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[.14em] text-[#FFE600]';
const TD = 'px-3 py-3 align-top text-[12px] leading-5 text-white/60';

/** Guía del sistema: anatomía del sistema, uso de cada perfil y medidas comerciales publicadas. */
export default function MetalconGuideSections() {
  return (
    <>
      {/* Anatomía del sistema */}
      <section id="sistema" className="border-b border-white/8 px-3 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-[11px] font-black uppercase tracking-[.24em] text-[#FFE600]">El sistema</p>
          <h2 className="mt-3 max-w-4xl text-[clamp(1.8rem,4vw,3.2rem)] font-black leading-[.98] tracking-[-.045em]">
            Anatomía del sistema: cuatro familias, un solo acero.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
            El fabricante no vende un perfil suelto, sino cuatro familias con espesores distintos. Elegir la familia equivocada es el error más común antes de cotificar: un muro portante nunca se resuelve con el perfil de tabiquería.
          </p>

          <div className="mt-9 grid gap-3 lg:grid-cols-4">
            {METALCON_FAMILIES.map((family) => (
              <article key={family.id} className="rounded-[1.4rem] border border-white/10 bg-white/[.025] p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-black text-white/90">{family.name}</h3>
                  <span className="shrink-0 rounded-full bg-[#FFE600]/12 px-2.5 py-1 text-[10px] font-black text-[#FFE600]">{family.thickness}</span>
                </div>
                <p className="mt-3 text-[13px] leading-6 text-white/60">{family.purpose}</p>
                <p className="mt-3 flex gap-1.5 text-[11px] leading-5 text-white/40"><Ruler size={13} className="mt-0.5 shrink-0 text-[#FFE600]/70" aria-hidden />{family.usedIn}</p>
                <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-5 text-white/45">{family.detail}</p>
              </article>
            ))}
          </div>

          {/* ¿Dónde se usa cada perfil? */}
          <div className={`${PANEL} mt-5 p-5 sm:p-8`}>
            <h3 className="flex items-center gap-2.5 text-xl font-black tracking-[-.03em] sm:text-2xl"><Shapes size={20} className="text-[#FFE600]" aria-hidden />¿Dónde se usa cada perfil?</h3>
            <p className="mt-3 max-w-3xl text-[13px] leading-6 text-white/50">
              Cada pieza del sistema tiene un trabajo definido. Así reconoces qué va en un muro portante, qué va en una división interior y qué va bajo la techumbre.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <caption className="sr-only">Uso de cada perfil del sistema Metalcon</caption>
                <thead><tr className="border-b border-white/10"><th className={TH}>Perfil</th><th className={TH}>Espesor</th><th className={TH}>Dónde se usa</th><th className={TH}>Para qué sirve</th></tr></thead>
                <tbody className="divide-y divide-white/8">
                  <tr>
                    <td className={`${TD} font-black text-white/85`}>C estructural</td>
                    <td className={`${TD} tabular-nums`}>0,85 · 1,0 · 1,6 mm</td>
                    <td className={TD}>Muros portantes de la vivienda</td>
                    <td className={TD}>Es el montante que sostiene la casa. Su espesor y separación los define la memoria de cálculo.</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-black text-white/85`}>C tabiquería</td>
                    <td className={`${TD} tabular-nums`}>0,50 mm</td>
                    <td className={TD}>Divisiones interiores</td>
                    <td className={TD}>Separa recintos sin estructurar la casa y aísla térmica y acústicamente. No es portante.</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-black text-white/85`}>U solera</td>
                    <td className={`${TD} tabular-nums`}>U 61 · U 92 · U 103 · U 153</td>
                    <td className={TD}>Base y coronación de cada muro</td>
                    <td className={TD}>Canal sin labios que recibe a los montantes C: solera inferior anclada y solera superior de cierre.</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-black text-white/85`}>C cielos</td>
                    <td className={`${TD} tabular-nums`}>0,50 mm</td>
                    <td className={TD}>Bajo techumbre o entrepiso</td>
                    <td className={TD}>Estructura liviana que recibe el revestimiento de cielo, con maestras y colgadores propios.</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-black text-white/85`}>Accesorios</td>
                    <td className={`${TD} tabular-nums`}>Según fijación</td>
                    <td className={TD}>Todas las uniones del sistema</td>
                    <td className={TD}>Tornillos autoperforantes galvanizados. El fabricante remite a la norma AISI para el diseño de las fijaciones.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 flex gap-2 text-[11px] leading-5 text-white/40">
              <Layers3 size={14} className="mt-0.5 shrink-0 text-[#FFE600]" aria-hidden />
              Regla de oro: <b className="text-white/65">C y U se eligen juntos</b>. Cada alma de perfil C tiene su solera compatible; una solera de otro ancho obliga a cambiar el montante, no a forzar el ajuste.
            </p>
          </div>
        </div>
      </section>

      {/* Medidas comerciales */}
      <section id="medidas" className="border-b border-white/8 px-3 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-[11px] font-black uppercase tracking-[.24em] text-[#FFE600]">Medidas comerciales</p>
          <h2 className="mt-3 max-w-4xl text-[clamp(1.8rem,4vw,3.2rem)] font-black leading-[.98] tracking-[-.045em]">
            Los números que definen el pedido.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
            Estos son los largos, formatos y modulaciones con los que trabaja el mercado. Con ellos ordenas material y con la calculadora de abajo sabes cuántos montantes necesitas.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: '6,00 m', label: 'Largo comercial', text: 'Los perfiles C y U se venden en barras de 6 metros.' },
              { value: '2,50 m', label: 'Corte de vivienda', text: 'La vivienda se corta a 2,50 m: el muro típico de un piso.' },
              { value: '40 / 60 cm', label: 'Modulación', text: 'Separación entre montantes, según revestimiento y cálculo.' },
              { value: '37 · 56 · 72 · 120 m²', label: 'Casas modelo', text: 'Superficies de las casas modelo del fabricante.' },
            ].map((stat) => (
              <article key={stat.label} className="rounded-[1.4rem] border border-white/10 bg-[#0A0F13] p-5">
                <b className="block text-3xl font-black tracking-[-.04em] text-[#FFE600] tabular-nums">{stat.value}</b>
                <small className="mt-1.5 block text-[11px] font-black uppercase tracking-[.12em] text-white/55">{stat.label}</small>
                <p className="mt-2 text-[12px] leading-5 text-white/45">{stat.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* OSB */}
            <article className={`${PANEL} p-5 sm:p-8`}>
              <h3 className="text-xl font-black tracking-[-.03em] sm:text-2xl">Planchas OSB: formatos y espesores</h3>
              <p className="mt-3 text-[13px] leading-6 text-white/50">
                El tablero OSB es lo que rigidiza el panel: va atornillado a los montantes. Se consigue en dos formatos estándar y tres espesores.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 px-3.5 py-2 text-[12px] font-black text-white/70">244 × 120 cm</span>
                <span className="rounded-full border border-white/15 px-3.5 py-2 text-[12px] font-black text-white/70">244 × 122 cm</span>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse">
                  <caption className="sr-only">Regla orientativa de espesor de OSB según altura</caption>
                  <thead><tr className="border-b border-white/10"><th className={TH}>Espesor</th><th className={TH}>Uso orientativo</th></tr></thead>
                  <tbody className="divide-y divide-white/8">
                    <tr><td className={`${TD} font-black text-white/85 tabular-nums`}>9 mm</td><td className={TD}>Hasta 2,5 m de altura</td></tr>
                    <tr><td className={`${TD} font-black text-white/85 tabular-nums`}>10 mm</td><td className={TD}>Hasta 3 m de altura</td></tr>
                    <tr><td className={`${TD} font-black text-white/85 tabular-nums`}>12 mm</td><td className={TD}>Sobre 3 m o cuando el cerramiento trabaja en dos pisos</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-white/40">Regla orientativa de selección. El espesor final lo confirma el revestimiento y la memoria de cálculo del proyecto.</p>
            </article>

            {/* Perfiles C kg/m */}
            <article className={`${PANEL} p-5 sm:p-8`}>
              <h3 className="text-xl font-black tracking-[-.03em] sm:text-2xl">Perfiles C: peso por metro y largos</h3>
              <p className="mt-3 text-[13px] leading-6 text-white/50">
                El perfil C se nombra por su alma, ala, labio y espesor: <b className="text-white/70">C 90 × 38 × 12 × 0,85</b> es alma de 90 mm, ala de 38 mm, labio de 12 mm y espesor de 0,85 mm. El peso por metro es lo que permite cubicar el acero de un muro.
              </p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[460px] border-collapse">
                  <caption className="sr-only">Perfiles C publicados en el Manual de Diseño Metalcon de Cintac</caption>
                  <thead><tr className="border-b border-white/10"><th className={TH}>Perfil</th><th className={TH}>Peso</th><th className={TH}>Largos comerciales</th></tr></thead>
                  <tbody className="divide-y divide-white/8">
                    {METALCON_PROFILES.map((profile) => (
                      <tr key={profile.label}>
                        <td className={`${TD} font-black text-white/85`}>{profile.label}</td>
                        <td className={`${TD} tabular-nums`}>{profile.kgPerM.toFixed(2).replace('.', ',')} kg/m</td>
                        <td className={`${TD} tabular-nums`}>{profile.lengths.map((length) => length.toFixed(2).replace('.', ',')).join(' · ')} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 flex gap-2 text-[11px] leading-5 text-white/40">
                <BookOpen size={13} className="mt-0.5 shrink-0 text-[#FFE600]" aria-hidden />
                Fuente: <a href={METALCON_SOURCES[3].href} target="_blank" rel="noopener noreferrer" className="text-[#FFE600]/80 underline underline-offset-2">Manual de Diseño Metalcon de Cintac</a>. La selección final del perfil sale del cálculo, no de la tabla.
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
