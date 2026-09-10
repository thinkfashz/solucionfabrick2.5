import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Herramientas de construcción | Soluciones Fabrick',
  description:
    'Calculadoras y simuladores gratuitos para radier, climatización y comportamiento sísmico de viviendas.',
  alternates: {
    canonical: 'https://www.solucionesfabrick.com/herramientas',
  },
};

const tools = [
  {
    href: '/herramientas/radier',
    eyebrow: 'Cubicación y presupuesto',
    title: 'Calculadora de radier',
    description:
      'Calcula superficie, volumen de hormigón, materiales, espesores y una estimación inicial de costos.',
    action: 'Calcular radier',
    number: '01',
  },
  {
    href: '/herramientas/aire-acondicionado',
    eyebrow: 'Climatización',
    title: 'Calculadora de aire acondicionado',
    description:
      'Estima los BTU recomendados según las dimensiones del espacio y compara alternativas de instalación.',
    action: 'Calcular BTU',
    number: '02',
  },
  {
    href: '/herramientas/simulador-sismico',
    eyebrow: 'Laboratorio interactivo 3D',
    title: 'Simulador sísmico',
    description:
      'Explora de forma educativa cómo cambian el movimiento y el daño visual según el suelo, la frecuencia y los anclajes.',
    action: 'Abrir simulador',
    number: '03',
  },
] as const;

export default function HerramientasPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(250,204,21,.2),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(255,255,255,.08),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs font-black uppercase tracking-[.2em] text-white/70 transition hover:border-yellow-300/50 hover:text-yellow-200"
          >
            <span aria-hidden="true">←</span>
            Volver al inicio
          </Link>

          <div className="mt-10 max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.3em] text-yellow-300">
              Soluciones Fabrick · Herramientas gratuitas
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              Calcula, compara y entiende mejor tu proyecto.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/62 sm:text-lg">
              Utiliza nuestras calculadoras y experiencias interactivas para obtener una primera referencia antes de cotizar o ejecutar una obra.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative flex min-h-[330px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.045] p-6 transition duration-300 hover:-translate-y-1 hover:border-yellow-300/45 hover:bg-yellow-300/[.07] sm:p-8"
            >
              <div className="absolute right-5 top-4 text-7xl font-black text-white/[.035] transition group-hover:text-yellow-300/[.08]">
                {tool.number}
              </div>

              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[.25em] text-yellow-300">
                  {tool.eyebrow}
                </p>
                <h2 className="mt-4 max-w-sm text-3xl font-black tracking-tight">
                  {tool.title}
                </h2>
                <p className="mt-5 max-w-md leading-relaxed text-white/58">
                  {tool.description}
                </p>
              </div>

              <div className="relative mt-auto flex items-center justify-between border-t border-white/10 pt-6 font-black">
                <span>{tool.action}</span>
                <span
                  aria-hidden="true"
                  className="text-xl text-yellow-300 transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[.06] p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-white/62">
            <strong className="text-yellow-300">Importante:</strong> estas herramientas entregan estimaciones educativas y comerciales iniciales. Las cantidades, costos y resultados deben validarse según terreno, materiales, normativa y condiciones reales de ejecución.
          </p>
        </div>
      </section>
    </main>
  );
}
