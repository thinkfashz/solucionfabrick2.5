import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Ruler,
} from 'lucide-react';

interface StaticConstructionHeroProps {
  coverUrl?: string;
}

const HERO_IMAGE = '/images/fabrick-construction-hero.webp';

const VALUE_POINTS = [
  'Cada especialidad usa su propia fórmula, con medidas reales',
  'Un solo presupuesto para todas las partidas de tu proyecto',
  'Revisión humana del alcance antes de confirmar cualquier precio',
] as const;

const PROJECT_PATH = [
  { label: '01 · Define', text: 'Elige el servicio y describe el resultado que necesitas: reparar, construir o remodelar.' },
  { label: '02 · Mide', text: 'Ingresa largo, ancho, alto, metros lineales o unidades: el precio sale de tus medidas reales.' },
  { label: '03 · Confirma', text: 'Envía el detalle por WhatsApp y afinamos alcance, condiciones y precio final contigo.' },
] as const;

const TRUST_STRIP = [
  { icon: Ruler, label: 'Fórmula por especialidad', text: 'Tarifas propias para 9+ partidas' },
  { icon: ShieldCheck, label: 'Evaluación previa', text: 'Ningún precio sin revisión del alcance' },
  { icon: Sparkles, label: 'Obra ordenada', text: 'Servicios, productos y tienda en un solo lugar' },
] as const;

export default function StaticConstructionHero({ coverUrl }: StaticConstructionHeroProps) {
  const customCover = coverUrl?.trim();

  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#171820] pb-16 pt-24 text-[#F8F0E9] sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
      {customCover ? (
        <img
          src={customCover}
          alt="Proyecto residencial desarrollado por Soluciones Fabrick"
          data-parallax="-10"
          className="absolute inset-0 -z-30 h-[115%] w-full object-cover object-[68%_center]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      ) : (
        <Image
          src={HERO_IMAGE}
          alt="Vivienda residencial en construcción con estructura liviana"
          data-parallax="-10"
          className="-z-30 h-[115%] object-cover object-[68%_center] lg:object-center"
          fill
          priority
          quality={72}
          sizes="100vw"
        />
      )}

      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(23,24,32,.99),rgba(23,24,32,.9)_55%,rgba(23,24,32,.42)),linear-gradient(180deg,rgba(23,24,32,.06),rgba(23,24,32,.94))]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_22%,rgba(204,177,150,.22),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(182,144,108,.16),transparent_34%)]" />

      <div className="mx-auto grid min-h-[640px] max-w-[1320px] items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.62fr)]">
        <div className="max-w-4xl pb-4">
          <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-[#CCB196]/22 bg-[#171820]/45 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-[#E7D4C1] backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 text-[#CCB196]" />
            Construcción y remodelación · Región del Maule y Santiago
          </p>

          <h1 data-reveal data-reveal-delay="0.05" className="mt-6 text-[clamp(2.9rem,6.2vw,5.9rem)] font-black leading-[.92] tracking-[-.065em]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Toma decisiones con números claros,{' '}
            <span className="mt-1 block bg-[linear-gradient(100deg,#F8F0E9,#CCB196_58%,#B6906C)] bg-clip-text pb-1 text-transparent">
              no con improvisación.
            </span>
          </h1>

          <p data-reveal data-reveal-delay="0.1" className="mt-6 max-w-xl text-base leading-7 text-[#DDD1C7] sm:text-lg sm:leading-8">
            Conoce el costo real de cada especialidad según sus medidas, reúne las partidas de tu obra y confirma el precio final con un equipo que revisa alcance, ubicación y condiciones antes de ejecutar.
          </p>

          <div data-reveal data-reveal-delay="0.15" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#cotizador" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#D8B23D] px-7 text-sm font-black text-[#171820] shadow-[0_16px_42px_rgba(182,144,108,.25)] transition hover:-translate-y-0.5 hover:bg-[#F4D98B]">
              Cotizar mi proyecto <Calculator className="h-4 w-4" />
            </Link>
            <Link href="#servicios" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#F8F0E9]/16 bg-[#F8F0E9]/[.055] px-7 text-sm font-black text-[#F8F0E9] backdrop-blur-md transition hover:border-[#CCB196]/50 hover:bg-[#F8F0E9]/[.1]">
              Explorar servicios <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div data-reveal-group data-reveal-dir="up" data-reveal-delay="0.2" className="mt-8 grid gap-2 sm:grid-cols-3">
            {VALUE_POINTS.map((point) => (
              <span key={point} className="flex items-start gap-2 text-xs leading-5 text-[#D1C4BA]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#D8B23D]" />
                {point}
              </span>
            ))}
          </div>
        </div>

        <aside data-reveal data-reveal-dir="right" data-reveal-delay="0.12" className="rounded-[2rem] bg-[#F8F0E9]/95 p-5 text-[#171820] shadow-[0_28px_90px_rgba(0,0,0,.38)] backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[#171820]/10 pb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#895E3D]">Antes de gastar</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Una ruta concreta, sin sorpresas.</h2>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#171820] text-[#D8B23D]"><ShieldCheck className="h-5 w-5" /></span>
          </div>

          <div className="mt-5 space-y-3">
            {PROJECT_PATH.map((item) => (
              <div key={item.label} className="grid grid-cols-[92px_1fr] gap-3 rounded-2xl bg-[#EADBCB]/70 p-4">
                <strong className="text-[10px] leading-5 text-[#76543A]">{item.label}</strong>
                <p className="text-xs leading-5 text-[#655A52]">{item.text}</p>
              </div>
            ))}
          </div>

          <a
            href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20ordenar%20y%20evaluar%20mi%20proyecto."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#171820] px-5 text-sm font-black text-[#D8B23D] transition hover:bg-[#D8B23D] hover:text-[#171820]"
          >
            Hablar con un asesor <MessageCircle className="h-4 w-4" />
          </a>
        </aside>
      </div>

      <div data-reveal className="mx-auto mt-14 grid max-w-[1320px] gap-3 sm:grid-cols-3">
        {TRUST_STRIP.map(({ icon: Icon, label, text }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#F8F0E9]/9 bg-[#171820]/55 px-4 py-3.5 backdrop-blur-md">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D8B23D]/12 text-[#D8B23D]"><Icon className="h-5 w-5" /></span>
            <div><p className="text-[11px] font-black text-[#F8F0E9]">{label}</p><p className="mt-0.5 text-[10px] text-[#B0A49A]">{text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}