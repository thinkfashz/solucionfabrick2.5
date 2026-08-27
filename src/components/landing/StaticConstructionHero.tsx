import Link from 'next/link';

interface StaticConstructionHeroProps {
  coverUrl?: string;
}

const NEEDS = [
  ['Construir', 'Casas, ampliaciones, radier y estructuras.'],
  ['Renovar', 'Baños, pisos, revestimientos, pintura y techumbre.'],
  ['Instalar', 'Electricidad, gasfitería, climatización y equipamiento.'],
] as const;

export default function StaticConstructionHero(_: StaticConstructionHeroProps) {
  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#08090A] px-4 pb-12 pt-20 text-[#FFF9EE] sm:px-6 sm:pb-16 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_10%,rgba(245,135,31,.16),transparent_30rem),radial-gradient(circle_at_88%_72%,rgba(255,176,0,.08),transparent_28rem)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.04] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="mx-auto grid max-w-[1320px] items-center gap-9 lg:min-h-[610px] lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,.62fr)] lg:gap-12">
        <div className="max-w-4xl">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000] sm:text-[10px] sm:tracking-[.24em]">Construcción · remodelación · soluciones para el hogar</p>
          <h1 className="mt-4 max-w-[11ch] text-[clamp(2.75rem,13vw,7.3rem)] font-black leading-[.87] tracking-[-.07em] sm:mt-5 sm:leading-[.84]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Haz realidad tu proyecto sin perderte entre mil cotizaciones.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#CFC4BB] sm:mt-7 sm:text-lg sm:leading-8">
            Calcula una referencia, compara mano de obra con servicio completo y encuentra productos para avanzar. Puedes resolver una partida puntual o construir el proyecto completo con Fabrick.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:gap-3">
            <Link href="#cotizador" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#F5871F] px-4 text-center text-[11px] font-black leading-4 text-[#08090A] transition hover:bg-[#FFB000] sm:min-h-14 sm:px-7 sm:text-sm">
              Calcular referencia
            </Link>
            <Link href="/proyectos" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-4 text-center text-[11px] font-black leading-4 text-[#FFF9EE] transition hover:border-[#FFB000]/45 hover:bg-white/[.05] sm:min-h-14 sm:px-7 sm:text-sm">
              Ver proyectos
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden border-y border-white/9 bg-white/9 sm:mt-10 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:border-t sm:border-b-0 sm:bg-transparent sm:pt-5">
            {['Mano de obra separada', 'Servicio completo', 'Precios con IVA de referencia'].map((item) => (
              <span key={item} className="bg-[#08090A] px-2 py-3 text-center text-[8px] font-bold uppercase leading-4 tracking-[.08em] text-white/42 sm:bg-transparent sm:px-0 sm:py-0 sm:text-left sm:text-[10px] sm:tracking-[.14em]">{item}</span>
            ))}
          </div>
        </div>

        <aside className="border-t border-[#FFB000]/30 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">¿Qué quieres hacer?</p>
          <div className="mt-3 divide-y divide-white/10 border-y border-white/10 sm:mt-4">
            {NEEDS.map(([title, text]) => (
              <div key={title} className="grid grid-cols-[92px_1fr] gap-3 py-4 sm:grid-cols-[110px_1fr] sm:py-5">
                <h2 className="text-sm font-black sm:text-lg">{title}</h2>
                <p className="text-xs leading-5 text-white/48 sm:leading-6">{text}</p>
              </div>
            ))}
          </div>
          <a href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20cotizar%20un%20proyecto." target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#FFF9EE] px-5 text-xs font-black text-[#08090A] transition hover:bg-[#FFB000] sm:min-h-12 sm:text-sm">
            Hablar por WhatsApp
          </a>
        </aside>
      </div>
    </section>
  );
}
