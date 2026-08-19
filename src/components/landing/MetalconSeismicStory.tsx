'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Braces,
  Check,
  FileCheck2,
  Ruler,
  ShieldCheck,
} from 'lucide-react';

const BENEFITS = [
  {
    icon: Braces,
    title: 'Materiales que duran',
    text: 'Perfiles de acero galvanizado y componentes definidos por especificación técnica: una base más durable para el sistema que se proyecta.',
  },
  {
    icon: ShieldCheck,
    title: 'Diseño sísmico integral',
    text: 'Fundación, anclajes, arriostramientos, uniones y estructura deben trabajar coordinados; ninguna pieza por sí sola protege una vivienda.',
  },
  {
    icon: FileCheck2,
    title: 'Respaldo verificable',
    text: 'Cada partida se revisa con ficha técnica y condiciones vigentes del fabricante, para que el respaldo material quede claro desde el presupuesto.',
  },
] as const;

const SYSTEM_STEPS = [
  ['01', 'Suelo y fundación', 'La solución comienza con una base adecuada al terreno, cargas y proyecto.'],
  ['02', 'Estructura y conexiones', 'Perfiles, anclajes, arriostramientos y fijaciones se coordinan como un conjunto.'],
  ['03', 'Materiales especificados', 'Se definen productos compatibles, con información técnica y trazabilidad de fabricante.'],
  ['04', 'Ejecución controlada', 'Una buena solución necesita instalación precisa, revisiones y decisiones técnicas oportunas.'],
] as const;

export default function MetalconSeismicStory() {
  return (
    <section
      aria-labelledby="sismo-title"
      className="relative overflow-hidden bg-[#08090A] px-4 py-16 text-[#FFF9EE] sm:px-6 md:px-12 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,176,0,.2),transparent_30rem),radial-gradient(circle_at_88%_80%,rgba(245,135,31,.13),transparent_32rem)]" />

      <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-center">
        <div>
          <p data-reveal className="text-[10px] font-black uppercase tracking-[.25em] text-[#FFB000]">
            Construcción sismorresistente
          </p>
          <h2
            id="sismo-title"
            data-split
            className="mt-4 text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl"
          >
            En Chile, construir bien es prepararse para el próximo sismo.
          </h2>
          <p data-reveal data-reveal-delay="0.15" className="mt-5 max-w-2xl text-sm leading-7 text-[#DDD7CD] sm:text-base">
            Elegir materiales duraderos importa, pero la seguridad nace de una decisión completa: cálculo estructural, suelo, fundaciones, anclajes, arriostramientos, uniones y una ejecución bien controlada.
          </p>
          <p data-reveal data-reveal-delay="0.2" className="mt-4 max-w-2xl text-sm leading-7 text-[#FFF9EE] sm:text-base">
            Una vivienda correctamente proyectada busca proteger a las personas, evitar fallas graves y acotar los daños reparables según la intensidad del evento. No existe una casa invulnerable: existe un sistema bien diseñado, bien especificado y bien construido.
          </p>

          <div data-reveal data-reveal-delay="0.25" className="mt-7 rounded-[1.5rem] border border-[#FFB000]/25 bg-[#FFB000]/10 p-4">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FFB000] text-[#08090A]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="text-xs leading-5 text-[#E4DED2]">
                <strong className="block text-sm font-black text-[#FFF9EE]">La resistencia se construye desde la base.</strong>
                La terminación es visible; la calidad real está en las decisiones estructurales que quedan dentro de muros, techumbre y fundaciones.
              </p>
            </div>
          </div>

          <div data-reveal data-reveal-delay="0.3" className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/presupuesto?servicio=metalcon"
              className="inline-flex min-h-13 items-center gap-2 rounded-full bg-[#FFB000] px-6 text-sm font-black text-[#08090A] transition hover:bg-[#FFD05A]"
            >
              Cotizar estructura Metalcon <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/servicios/metalcon"
              className="inline-flex min-h-13 items-center gap-2 rounded-full border border-[#FFB000]/55 bg-[#111214] px-6 text-sm font-black text-[#FFF9EE] transition hover:bg-[#FFB000] hover:text-[#08090A]"
            >
              Conocer el sistema
            </Link>
          </div>

          <p className="mt-5 flex max-w-2xl items-start gap-2 text-[10px] leading-5 text-white/55">
            <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB000]" />
            Toda solución estructural se confirma según proyecto, cálculo profesional, condiciones reales del terreno y normativa aplicable.
          </p>
        </div>

        <aside
          data-reveal
          data-reveal-dir="right"
          data-parallax="-5"
          className="relative overflow-hidden rounded-[2.4rem] border border-[#FFB000]/35 bg-[#111214] p-5 text-[#FFF9EE] shadow-[0_32px_100px_rgba(0,0,0,.42)] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#F5871F]">Criterio técnico</p>
              <h3 className="mt-2 text-2xl font-black leading-none tracking-[-.045em] sm:text-3xl">Un sistema completo, no una promesa vacía.</h3>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]">
              <BadgeCheck className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 grid gap-2">
            {SYSTEM_STEPS.map(([number, title, text]) => (
              <article key={number} className="flex gap-3 rounded-2xl bg-white/[.055] p-3.5 ring-1 ring-white/10">
                <span className="pt-0.5 text-[10px] font-black tracking-[.14em] text-[#F5871F]">{number}</span>
                <div>
                  <h4 className="text-sm font-black">{title}</h4>
                  <p className="mt-1 text-xs leading-5 text-[#D6D0C6]">{text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#FFB000]/20 bg-[#08090A] p-4 text-[#FFF9EE]">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFB000] text-[#08090A]">
                <FileCheck2 className="h-4.5 w-4.5" />
              </span>
              <div>
                <h4 className="text-sm font-black">Garantías del fabricante, claras y por escrito.</h4>
                <p className="mt-1 text-xs leading-5 text-[#E4DED2]">
                  Cuando un producto contemple garantía de larga duración o de por vida, se entrega con la marca, alcance, vigencia y condiciones que define su fabricante. Así sabes exactamente qué respaldo recibes.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-[#08090A] p-3.5 shadow-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F5871F] text-[#08090A]">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black">{title}</h4>
                  <p className="mt-1 text-[10px] leading-4 text-[#BFB8AC]">{text}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 flex items-start gap-2 text-[10px] leading-5 text-[#BFB8AC]">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5871F]" />
            Diseñamos para una respuesta estructural responsable: proteger la vida y reducir daños esperables, no asegurar daño cero frente a un terremoto.
          </p>
        </aside>
      </div>
    </section>
  );
}
