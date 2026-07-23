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
  'Presupuesto explicado por alcance',
  'Alternativas según tu inversión',
  'Acompañamiento directo durante el proyecto',
] as const;

const PROJECT_PATH = [
  { label: '1. Define', text: 'Servicio, superficie y ubicación.' },
  { label: '2. Calcula', text: 'Obtén un rango comercial inmediato.' },
  { label: '3. Confirma', text: 'Validamos medidas, materiales y ejecución.' },
] as const;

export default function StaticConstructionHero({ coverUrl }: StaticConstructionHeroProps) {
  const customCover = coverUrl?.trim();

  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-[#080705] px-4 pb-14 pt-24 text-white sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
      {customCover ? (
        <img
          src={customCover}
          alt="Proyecto de construcción ejecutado por Soluciones Fabrick"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-[68%_center]"
        />
      ) : (
        <Image
          src={HERO_IMAGE}
          alt="Vivienda residencial en construcción con estructura Metalcon"
          className="-z-30 object-cover object-[68%_center] lg:object-center"
          fill
          priority
          quality={82}
          sizes="100vw"
        />
      )}

      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(6,5,3,.98),rgba(6,5,3,.9)_54%,rgba(6,5,3,.38)),linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.82))]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_28%,rgba(250,204,21,.12),transparent_28%),radial-gradient(circle_at_88%_76%,rgba(249,115,22,.1),transparent_30%)]" />

      <div className="mx-auto grid min-h-[650px] max-w-[1320px] items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.62fr)]">
        <div className="max-w-4xl py-8">
          <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-yellow-100 backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 text-yellow-300" />
            Construcción y remodelación en Maule y proyectos seleccionados en Santiago
          </p>

          <h1 data-reveal data-reveal-delay="0.05" className="mt-6 max-w-5xl text-[clamp(3rem,6.8vw,6.5rem)] font-black leading-[.91] tracking-[-.07em]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Construye con un presupuesto que entiendes
            <span className="mt-2 block bg-[linear-gradient(100deg,#fde047,#fb923c_62%,#fb7185)] bg-clip-text text-transparent">y un plan que puedes seguir.</span>
          </h1>

          <p data-reveal data-reveal-delay="0.1" className="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg sm:leading-8">
            Cotiza viviendas, ampliaciones, remodelaciones e instalaciones sin comenzar a ciegas. Te mostramos un rango, qué considera y cuál es el siguiente paso para convertir la idea en una obra ejecutable.
          </p>

          <div data-reveal data-reveal-delay="0.15" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#cotizador" className="fabrick-gradient-button inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-sm font-black text-black">
              Calcular inversión <Calculator className="h-4 w-4" />
            </Link>
            <Link href="#servicios" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/[.055] px-7 text-sm font-black text-white backdrop-blur-md transition hover:border-yellow-300/45 hover:bg-white/[.09] hover:text-yellow-100">
              Ver qué resolvemos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div data-reveal data-reveal-delay="0.2" className="mt-7 grid gap-2 sm:grid-cols-3">
            {VALUE_POINTS.map((point) => (
              <span key={point} className="flex items-start gap-2 text-xs leading-5 text-zinc-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
                {point}
              </span>
            ))}
          </div>
        </div>

        <aside data-reveal data-reveal-delay="0.12" className="rounded-[2rem] border border-white/12 bg-[#0d0b08]/88 p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-yellow-300">Ruta comercial Fabrick</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">De la consulta a una decisión concreta.</h2>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-black"><ShieldCheck className="h-5 w-5" /></span>
          </div>

          <div className="mt-5 space-y-3">
            {PROJECT_PATH.map((item) => (
              <div key={item.label} className="grid grid-cols-[86px_1fr] gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4">
                <strong className="text-xs text-yellow-200">{item.label}</strong>
                <p className="text-xs leading-5 text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>

          <a
            href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20evaluar%20un%20proyecto."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-yellow-300/22 bg-yellow-300/[.08] px-5 text-sm font-black text-yellow-100 transition hover:bg-yellow-300 hover:text-black"
          >
            Hablar con un asesor <MessageCircle className="h-4 w-4" />
          </a>
        </aside>
      </div>
    </section>
  );
}
