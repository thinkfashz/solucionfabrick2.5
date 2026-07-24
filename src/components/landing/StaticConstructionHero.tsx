import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

interface StaticConstructionHeroProps {
  coverUrl?: string;
}

const HERO_IMAGE = '/images/fabrick-construction-hero.webp';

const VALUE_POINTS = [
  'Calculadoras según las medidas reales del trabajo',
  'Servicios y productos reunidos en una sola plataforma',
  'Revisión humana antes de comprometer el precio final',
] as const;

const PROJECT_PATH = [
  { label: '01 · Define', text: 'Selecciona el servicio y describe el resultado que necesitas.' },
  { label: '02 · Mide', text: 'Ingresa largo, ancho, alto, metros lineales o unidades.' },
  { label: '03 · Avanza', text: 'Suma partidas y envía una solicitud ordenada por WhatsApp.' },
] as const;

export default function StaticConstructionHero({ coverUrl }: StaticConstructionHeroProps) {
  const customCover = coverUrl?.trim();

  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#171820] px-4 pb-14 pt-24 text-[#F8F0E9] sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
      {customCover ? (
        <img
          src={customCover}
          alt="Proyecto residencial desarrollado por Soluciones Fabrick"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-[68%_center]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      ) : (
        <Image
          src={HERO_IMAGE}
          alt="Vivienda residencial en construcción con estructura liviana"
          className="-z-30 object-cover object-[68%_center] lg:object-center"
          fill
          priority
          quality={72}
          sizes="100vw"
        />
      )}

      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(23,24,32,.99),rgba(23,24,32,.92)_52%,rgba(23,24,32,.38)),linear-gradient(180deg,rgba(23,24,32,.08),rgba(23,24,32,.9))]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_25%,rgba(204,177,150,.22),transparent_30%),radial-gradient(circle_at_88%_78%,rgba(182,144,108,.16),transparent_32%)]" />

      <div className="mx-auto grid min-h-[640px] max-w-[1320px] items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.62fr)]">
        <div className="max-w-4xl py-8">
          <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-[#CCB196]/22 bg-[#171820]/45 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#E7D4C1] backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 text-[#CCB196]" />
            Construcción, remodelación y soluciones para el hogar
          </p>

          <h1 data-reveal data-reveal-delay="0.05" className="mt-6 max-w-5xl text-[clamp(3rem,6.8vw,6.5rem)] font-black leading-[.91] tracking-[-.07em]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Tu proyecto empieza con claridad,
            <span className="mt-2 block bg-[linear-gradient(100deg,#F8F0E9,#CCB196_58%,#B6906C)] bg-clip-text text-transparent">no con improvisación.</span>
          </h1>

          <p data-reveal data-reveal-delay="0.1" className="mt-6 max-w-2xl text-base leading-7 text-[#DDD1C7] sm:text-lg sm:leading-8">
            Calcula servicios, compara rangos y reúne las partidas de tu obra en un solo presupuesto. Desde una reparación puntual hasta una vivienda completa, te ayudamos a ordenar la inversión antes de ejecutar.
          </p>

          <div data-reveal data-reveal-delay="0.15" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#cotizador" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#CCB196] px-7 text-sm font-black text-[#171820] shadow-[0_16px_42px_rgba(182,144,108,.22)] transition hover:-translate-y-0.5 hover:bg-[#F8F0E9]">
              Calcular mi proyecto <Calculator className="h-4 w-4" />
            </Link>
            <Link href="#servicios" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#F8F0E9]/16 bg-[#F8F0E9]/[.055] px-7 text-sm font-black text-[#F8F0E9] backdrop-blur-md transition hover:border-[#CCB196]/50 hover:bg-[#F8F0E9]/[.1]">
              Explorar servicios <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div data-reveal data-reveal-delay="0.2" className="mt-7 grid gap-2 sm:grid-cols-3">
            {VALUE_POINTS.map((point) => (
              <span key={point} className="flex items-start gap-2 text-xs leading-5 text-[#D1C4BA]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#CCB196]" />
                {point}
              </span>
            ))}
          </div>
        </div>

        <aside data-reveal data-reveal-delay="0.12" className="rounded-[2rem] bg-[#F8F0E9]/95 p-5 text-[#171820] shadow-[0_28px_90px_rgba(0,0,0,.38)] backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[#171820]/10 pb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#895E3D]">Antes de gastar</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Convierte la idea en una ruta concreta.</h2>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><ShieldCheck className="h-5 w-5" /></span>
          </div>

          <div className="mt-5 space-y-3">
            {PROJECT_PATH.map((item) => (
              <div key={item.label} className="grid grid-cols-[92px_1fr] gap-3 rounded-2xl bg-[#EADBCB]/70 p-4">
                <strong className="text-xs text-[#76543A]">{item.label}</strong>
                <p className="text-xs leading-5 text-[#655A52]">{item.text}</p>
              </div>
            ))}
          </div>

          <a
            href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20ordenar%20y%20evaluar%20mi%20proyecto."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#B6906C] px-5 text-sm font-black text-[#171820] transition hover:bg-[#171820] hover:text-[#F8F0E9]"
          >
            Hablar con un asesor <MessageCircle className="h-4 w-4" />
          </a>
        </aside>
      </div>
    </section>
  );
}
