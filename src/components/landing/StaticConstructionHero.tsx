import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calculator,
  CheckCircle2,
  HardHat,
  Layers3,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import FabrickLogo3D from '@/components/FabrickLogo3D';

type Props = { coverUrl?: string };

const HERO_IMAGE = '/images/fabrick-construction-hero.webp';

const SOLUTION_ROUTES = [
  { number: '01', title: 'Calcula', note: 'Obtén un rango y entiende el alcance antes de invertir.', icon: Calculator },
  { number: '02', title: 'Compara', note: 'Revisa alternativas, materiales y partidas incluidas.', icon: Layers3 },
  { number: '03', title: 'Valida', note: 'Confirma medidas, terreno y precio con revisión técnica.', icon: BadgeCheck },
] as const;

const PROOF_POINTS = ['Rango en minutos', 'Incluidos visibles', 'Revisión humana'] as const;

export default function StaticConstructionHero({ coverUrl }: Props) {
  const customCover = coverUrl?.trim();

  return (
    <section id="inicio" className="relative isolate min-h-[760px] overflow-hidden bg-[#070604] px-4 pb-10 pt-24 text-white sm:px-6 lg:min-h-[820px] lg:px-8 lg:pt-28">
      {customCover ? (
        <img src={customCover} alt="Proyecto residencial Soluciones Fabrick en construcción" className="absolute inset-0 -z-40 h-full w-full object-cover object-[66%_center]" />
      ) : (
        <Image src={HERO_IMAGE} alt="Vivienda residencial en construcción con estructura Metalcon" className="-z-40 object-cover object-[70%_center] lg:object-center" fill priority quality={88} sizes="100vw" />
      )}

      <div className="absolute inset-0 -z-30 bg-[linear-gradient(90deg,rgba(5,5,4,.99),rgba(5,5,4,.9)_47%,rgba(5,5,4,.3)),linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.9))]" />
      <div className="absolute inset-0 -z-20 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:68px_68px] [mask-image:linear-gradient(90deg,black,transparent_82%)]" />
      <div data-parallax="-16" className="pointer-events-none absolute -left-28 top-20 -z-10 h-80 w-80 rounded-full bg-yellow-300/14 blur-[110px]" />
      <div data-parallax="12" className="pointer-events-none absolute -right-32 bottom-0 -z-10 h-[32rem] w-[32rem] rounded-full bg-orange-500/12 blur-[145px]" />

      <div className="mx-auto grid min-h-[calc(760px-7rem)] max-w-[1380px] items-center gap-10 lg:min-h-[calc(820px-7rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,.62fr)]">
        <div className="max-w-4xl py-8">
          <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-yellow-100 backdrop-blur-xl">
            <ShieldCheck className="h-3.5 w-3.5 text-yellow-300" />
            Diseño, cálculo y ejecución en una sola ruta
          </p>

          <h1 data-reveal data-reveal-delay="0.06" className="mt-6 max-w-5xl text-[clamp(3.1rem,7.4vw,7rem)] font-black leading-[.87] tracking-[-.075em]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Tu proyecto no necesita más dudas.
            <span className="mt-2 block bg-[linear-gradient(100deg,#fde047,#fb923c_58%,#fb7185)] bg-clip-text text-transparent">Necesita una ruta clara.</span>
          </h1>

          <p data-reveal data-reveal-delay="0.12" className="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg sm:leading-8">
            Convierte una idea en una decisión informada: calcula rangos, compara soluciones y entiende qué incluye cada etapa antes de invertir. Fabrick conecta diseño, materiales, instalación y validación técnica en un mismo proceso.
          </p>

          <div data-reveal data-reveal-delay="0.18" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#calculadora-m2" className="fabrick-gradient-button inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-sm font-black text-black">
              Calcular mi proyecto <Calculator className="h-4 w-4" />
            </Link>
            <a href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20orientaci%C3%B3n%20para%20mi%20proyecto." target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[.055] px-7 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-yellow-300/55 hover:bg-white/[.09] hover:text-yellow-100">
              Hablar por WhatsApp <MessageCircle className="h-4 w-4" />
            </a>
          </div>

          <div data-reveal data-reveal-delay="0.24" className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/12 pt-5">
            {PROOF_POINTS.map((point) => (
              <span key={point} className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-yellow-300" />{point}
              </span>
            ))}
          </div>
        </div>

        <div data-reveal data-reveal-delay="0.16" className="relative hidden min-h-[560px] lg:block [perspective:1400px]">
          <div className="absolute inset-8 rounded-[2.4rem] border border-yellow-300/15 bg-yellow-300/[.035] blur-[1px] [transform:rotate(-5deg)_translateZ(-80px)]" />
          <aside data-parallax="-7" className="fabrick-glass relative min-h-[535px] overflow-hidden rounded-[2.25rem] p-5 [transform:rotateY(-7deg)_rotateX(3deg)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(250,204,21,.2),transparent_30%),radial-gradient(circle_at_86%_92%,rgba(249,115,22,.18),transparent_34%)]" />
            <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.27em] text-yellow-300">Fabrick Project Flow</p>
                <p className="mt-1 text-xs text-zinc-400">Tu obra, entendida antes de comenzar</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-emerald-200 ring-1 ring-emerald-300/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Activo
              </span>
            </div>

            <div className="relative mt-3 h-40 overflow-hidden rounded-[1.7rem] border border-white/8 bg-black/28">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(250,204,21,.08),transparent_48%)]" />
              <FabrickLogo3D height="100%" interactive={false} showHint={false} transparent showText={false} cameraZ={16} />
            </div>

            <div className="relative mt-4 space-y-2.5">
              {SOLUTION_ROUTES.map(({ number, title, note, icon: Icon }, index) => (
                <div key={number} className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border p-3.5 ${index === 0 ? 'border-yellow-300/24 bg-yellow-300/[.09]' : 'border-white/8 bg-black/18'}`}>
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${index === 0 ? 'bg-yellow-300 text-black' : 'bg-white/[.06] text-yellow-200'}`}><Icon className="h-4.5 w-4.5" /></span>
                  <span><b className="block text-sm">{number} · {title}</b><small className="mt-1 block leading-4 text-zinc-500">{note}</small></span>
                  {index === 0 ? <Sparkles className="h-4 w-4 text-yellow-300" /> : <ArrowUpRight className="h-4 w-4 text-white/28" />}
                </div>
              ))}
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <MiniMetric icon={Ruler} label="Medidas" value="Visibles" />
              <MiniMetric icon={Building2} label="Alcance" value="Ordenado" />
              <MiniMetric icon={HardHat} label="Ejecución" value="Validada" />
            </div>
          </aside>
        </div>
      </div>

      <a href="#confianza" aria-label="Descubrir Soluciones Fabrick" className="absolute bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/45 text-yellow-300 backdrop-blur-xl transition hover:border-yellow-300/45 hover:bg-yellow-300 hover:text-black">
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[.035] p-3">
      <Icon className="h-4 w-4 text-yellow-300" />
      <span className="mt-2 block text-[8px] font-black uppercase tracking-[.15em] text-zinc-500">{label}</span>
      <b className="mt-1 block text-[11px] text-zinc-200">{value}</b>
    </div>
  );
}
