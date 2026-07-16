'use client';

import Link from 'next/link';
import {
  ArrowDown,
  CheckCircle2,
  FileCheck2,
  LineChart,
  MapPin,
  MessageCircle,
  Ruler,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import FabrickLogo from '@/components/FabrickLogo';
import ServiceQuoteFlow from '@/components/servicios/ServiceQuoteFlow';

const STEPS = [
  ['01', 'Selecciona el servicio', 'Kits, instalaciones y exteriores organizados por el tipo de medida que realmente importa.'],
  ['02', 'Indica el alcance', 'Metros cuadrados, metros lineales, puntos o unidades. Sin campos innecesarios.'],
  ['03', 'Revisa y cotiza', 'Una boleta con rango, inclusiones y exclusiones lista para enviar por WhatsApp.'],
] as const;

const METRICS = [
  ['09', 'servicios guiados'],
  ['03', 'pasos claros'],
  ['01', 'boleta orientativa'],
] as const;

export function ServiciosPageContent() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070707] text-white">
      <Navbar />

      <section className="relative isolate overflow-hidden border-b border-white/10 px-4 pb-14 pt-32 sm:px-6 lg:px-8 lg:pb-20 lg:pt-40">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,rgba(250,204,21,.14),transparent_22rem),radial-gradient(circle_at_8%_92%,rgba(249,115,22,.10),transparent_24rem),linear-gradient(135deg,#12100b_0%,#080808_48%,#050505_100%)]" />
        <div aria-hidden className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.28)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div aria-hidden className="absolute inset-0 bg-black/15" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/[.08] px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-yellow-200">
                <FileCheck2 className="h-3.5 w-3.5" /> Presupuesto orientativo
              </p>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[.94] tracking-[-.065em] text-white sm:text-6xl lg:text-7xl">
                El costo de construir, explicado con claridad.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 sm:text-lg">
                Elige el servicio, define una medida aproximada y recibe un rango útil antes de pedir una cotización real. Sin precios escondidos ni formularios eternos.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#cotizador" className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-6 py-4 text-sm font-black text-black transition hover:bg-white">
                  Calcular ahora <ArrowDown className="h-4 w-4" />
                </a>
                <a href="#referencias" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[.06] px-6 py-4 text-sm font-black text-white transition hover:border-yellow-300/60 hover:bg-white/[.12]">
                  Ver cómo se calcula
                </a>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-white/10 border-y border-white/10">
                {METRICS.map(([value, label]) => (
                  <div key={label} className="py-4 pr-3 first:pl-0 not-first:px-3">
                    <strong className="block text-2xl font-black tracking-[-.06em] text-yellow-200 sm:text-3xl">{value}</strong>
                    <span className="mt-1 block text-[9px] font-black uppercase tracking-[.16em] text-white/42">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#10100e]/75 p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-7">
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.23em] text-yellow-300">Panel de decisión</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-.045em]">Rango antes de la visita</h2>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-yellow-300/20 bg-yellow-300/[.08] text-yellow-200">
                  <LineChart className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-7 rounded-[1.35rem] border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.18em] text-white/42">
                  <span>Referencia de alcance</span><span className="text-yellow-200">Desde → hasta</span>
                </div>
                <svg viewBox="0 0 360 148" role="img" aria-label="Gráfico ilustrativo de rangos de precio" className="mt-4 h-auto w-full">
                  <defs>
                    <linearGradient id="service-line" x1="0" x2="1">
                      <stop offset="0%" stopColor="#facc15" stopOpacity=".25" />
                      <stop offset="55%" stopColor="#facc15" />
                      <stop offset="100%" stopColor="#fb923c" />
                    </linearGradient>
                    <linearGradient id="service-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#facc15" stopOpacity=".2" />
                      <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[28, 64, 100, 136].map((y) => <line key={y} x1="0" x2="360" y1={y} y2={y} stroke="rgba(255,255,255,.10)" strokeDasharray="3 6" />)}
                  <path d="M0 116 C42 106 56 112 92 91 S142 104 178 71 S229 82 263 48 S322 58 360 25 L360 148 L0 148 Z" fill="url(#service-fill)" />
                  <path d="M0 116 C42 106 56 112 92 91 S142 104 178 71 S229 82 263 48 S322 58 360 25" fill="none" stroke="url(#service-line)" strokeWidth="3" />
                  {[['92','91'], ['178','71'], ['263','48'], ['360','25']].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="4.5" fill="#facc15" stroke="#10100e" strokeWidth="3" />)}
                </svg>
                <div className="mt-2 flex justify-between text-[9px] font-black uppercase tracking-[.17em] text-white/38"><span>Medida</span><span>Materialidad</span><span>Acceso</span><span>Alcance</span></div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Metric icon={<Ruler className="h-4 w-4" />} label="Medida" value="M² / ML" />
                <Metric icon={<TrendingUp className="h-4 w-4" />} label="Rango" value="Visible" />
                <Metric icon={<Zap className="h-4 w-4" />} label="Contacto" value="Directo" />
              </div>
            </aside>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-3">
            {STEPS.map(([number, title, text]) => (
              <article key={number} className="group relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[.055] p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-yellow-300/45 hover:bg-white/[.08]">
                <span aria-hidden className="absolute right-4 top-0 text-6xl font-black leading-none tracking-[-.09em] text-white/[.045]">{number}</span>
                <p className="text-[10px] font-black tracking-[.24em] text-yellow-300">{number}</p>
                <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">{text}</p>
                <span className="mt-5 block h-px w-10 bg-yellow-300/55 transition-all group-hover:w-20" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <ServiceQuoteFlow />

      <section id="referencias" className="relative isolate overflow-hidden border-t border-white/10 bg-[#090909] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div aria-hidden className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_94%_10%,rgba(250,204,21,.12),transparent_24rem),radial-gradient(circle_at_4%_82%,rgba(249,115,22,.09),transparent_25rem)]" />

        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.78fr_1.22fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Referencia visible</p>
            <h2 className="mt-3 max-w-lg text-3xl font-black tracking-[-.055em] text-white sm:text-4xl">Un rango útil, no una promesa que luego cambia.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/60">
              El mínimo representa una ejecución estándar. El máximo contempla preparación, altura, distancia, materialidad, remates o complejidad. La boleta explica qué se debe validar antes de iniciar.
            </p>
            <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/[.07] p-5 backdrop-blur">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-yellow-300"><MapPin className="h-4 w-4" /> Región del Maule y alrededores</p>
              <p className="mt-3 text-sm leading-6 text-white/62">Traslados, accesos rurales, desniveles y trabajos fuera del estándar se informan antes de confirmar.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Reference title="Siding instalado" text="Sodimac publica instalación desde $25.990/m² e informa evaluación, instalación, perfilería y materiales del proyecto." href="https://www.sodimac.cl/sodimac-cl/content/instalacion-de-siding" />
            <Reference title="Techumbre estándar" text="Sodimac publica instalación desde $19.990/m² para zinc ondulado estándar; otras cubiertas y condiciones cambian el alcance." href="https://www.sodimac.cl/sodimac-cl/content/instalacion-de-techumbre" />
            <Reference title="Punto eléctrico" text="Cronoshare informa $25.000–$40.000 por punto de luz; recorridos, muros o tablero complejo deben revisarse." href="https://www.cronoshare.cl/cuanto-cuesta/instalar-punto-de-luz" />
            <Reference title="Aire acondicionado split" text="Cronoshare sitúa la instalación split en $250.000–$360.000; equipo y obras adicionales se cotizan por separado." href="https://www.cronoshare.cl/cuanto-cuesta/instalar-aire-acondicionado" />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[linear-gradient(110deg,#090806,#241806,#090806)] px-4 py-12 text-[#fff4dd] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-yellow-300">¿Tienes fotos o planos?</p>
            <h2 className="mt-2 text-2xl font-black">Envíalos y afinamos el alcance antes de cotizar.</h2>
          </div>
          <Link href="/contacto" className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-6 py-4 text-sm font-black text-black transition hover:bg-white">
            <MessageCircle className="h-4 w-4" /> Hablar con Fabrick
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#070707] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <FabrickLogo className="pointer-events-none" />
          <p className="text-center text-[10px] font-black uppercase tracking-[.16em] text-white/38">Soluciones Fabrick · Claridad antes de construir.</p>
        </div>
      </footer>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3">
      <span className="text-yellow-300">{icon}</span>
      <p className="mt-3 text-[9px] font-black uppercase tracking-[.15em] text-white/40">{label}</p>
      <p className="mt-1 text-xs font-black text-white">{value}</p>
    </div>
  );
}

function Reference({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group rounded-[1.4rem] border border-white/10 bg-white/[.06] p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-yellow-300/55 hover:bg-white/[.10] hover:shadow-[0_18px_40px_rgba(0,0,0,.28)]">
      <CheckCircle2 className="h-5 w-5 text-yellow-300" />
      <h3 className="mt-4 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
      <span className="mt-4 inline-block text-[10px] font-black uppercase tracking-[.18em] text-yellow-300">Abrir fuente ↗</span>
    </a>
  );
}
