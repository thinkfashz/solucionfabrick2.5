import Link from 'next/link';
import { Calculator, ClipboardCheck, MessageCircle, Ruler, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: Ruler,
    step: '01',
    title: 'Mide lo real',
    text: 'Elige la especialidad y anota las medidas reales del trabajo: largo, ancho, alto, metros lineales o unidades. Sin cotas inventadas.',
  },
  {
    icon: Calculator,
    step: '02',
    title: 'Suma y compara',
    text: 'Cada partida usa su propia fórmula y se anota en un solo presupuesto con su rango de referencia. Compara antes de decidir.',
  },
  {
    icon: MessageCircle,
    step: '03',
    title: 'Pregunta con orden',
    text: 'Envía todo por WhatsApp con una referencia clara. El equipo separa partidas, detecta riesgos y te dice exactamente qué falta por resolver.',
  },
  {
    icon: Sparkles,
    step: '04',
    title: 'Ejecuta con certeza',
    text: 'Con alcance, condiciones y precio final confirmados, la obra parte ordenada: sin re-trabajos, sin permisos pendientes, sin sorpresas a mitad de camino.',
  },
] as const;

const ASSURANCES = [
  'Rangos referenciales según medidas reales',
  'Nunca confirmamos un precio sin entender el alcance',
  'Una sola plataforma: servicios, productos y coordinación',
] as const;

export default function LandingProcessSection() {
  return (
    <section id="como-funciona" className="relative scroll-mt-20 overflow-hidden bg-[#08090A] px-4 pb-24 pt-4 text-[#FFF9EE] sm:px-6 md:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(216,178,61,.14),transparent_26rem),radial-gradient(circle_at_6%_90%,rgba(204,177,150,.12),transparent_28rem)]" />

      <div className="relative mx-auto max-w-[1280px]">
        <header className="mx-auto max-w-3xl text-center">
          <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-[#FFB000]/22 bg-[#FFB000]/8 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-[#FFB000]">
            <Sparkles className="h-3.5 w-3.5" /> Proceso Fabrick en 4 pasos
          </p>
          <h2 data-split className="mt-5 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            De la idea al presupuesto sin perder el norte.
          </h2>
          <p data-reveal data-reveal-delay="0.15" className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#CFC2B7] sm:text-base">
            No comiences preguntando cuánto cuesta todo: comienza midiendo lo que tienes. Nuestro proceso convierte una idea vaga en partidas claras que puedes comparar, revisar y aprobar.
          </p>
        </header>

        <div data-reveal-group data-reveal-dir="up" className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-9 hidden h-px bg-[linear-gradient(90deg,transparent,#FFB000/35,#FFB000/60,#FFB000/35,transparent)] lg:block" />
          {STEPS.map(({ icon: Icon, step, title, text }, index) => (
            <article key={step} className="group relative overflow-hidden rounded-[2rem] border border-[#FFF9EE]/8 bg-gradient-to-b from-white/[.05] to-white/[.015] p-6 transition duration-300 hover:-translate-y-1.5 hover:border-[#FFB000]/35 hover:shadow-[0_24px_70px_rgba(0,0,0,.35)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFB000]/6 blur-2xl transition group-hover:bg-[#FFB000]/12" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF9EE] text-[#08090A] transition duration-300 group-hover:bg-[#FFB000]"><Icon className="h-5 w-5" strokeWidth={1.8} /><span className="absolute -bottom-2 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#FFB000]" /></span>
                  <span className="text-4xl font-black tracking-[-.06em] text-[#FFF9EE]/10 transition group-hover:text-[#FFB000]/25">{step}</span>
                </div>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-[#C6B9AE]">{text}</p>
              </div>
            </article>
          ))}
        </div>

        <div data-reveal data-reveal-dir="zoom" className="mt-10 grid items-center gap-5 rounded-[26px] bg-[linear-gradient(120deg,#FFB000,#C98F3C)] p-6 text-[#08090A] shadow-[0_24px_70px_rgba(216,178,59,.16)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h3 className="text-xl font-black tracking-[-.03em] sm:text-2xl">Empieza con una estimación, no con una promesa.</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {ASSURANCES.map((item) => (
                <span key={item} className="flex items-start gap-2 text-[11px] font-bold leading-5 text-[#3A2E22]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {item}
                </span>
              ))}
            </div>
          </div>
          <Link href="#cotizador" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#08090A] px-7 text-sm font-black text-[#FFB000] transition hover:bg-black hover:text-[#FFD05A]">
            Cotizar mi proyecto <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}