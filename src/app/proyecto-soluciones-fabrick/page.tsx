import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Handshake,
  Hammer,
  Mail,
  MapPinned,
  Megaphone,
  PackageOpen,
  Sparkles,
  UsersRound,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Proyecto Soluciones Fabrick',
  description: 'Una propuesta de crecimiento para Soluciones Fabrick: construcción, servicios para el hogar, comercio y presencia local.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyecto-soluciones-fabrick' },
  robots: { index: false, follow: false },
};

const launchExpenses = [
  ['Movilidad y visitas', 'Bencina, recorridos y evaluación en terreno.', '$1.200.000'],
  ['Publicidad organizada', 'Contenido, campañas digitales y presencia local.', '$2.800.000'],
  ['Imagen y material de terreno', 'Uniformes, carteles, volantes y tarjetas.', '$1.100.000'],
  ['Formalización y operación', 'Orden administrativo, herramientas y puesta al día.', '$2.400.000'],
  ['Respaldo para activar trabajos', 'Anticipos, compras iniciales y contingencias.', '$2.500.000'],
] as const;

const fronts = [
  {
    title: 'Construcción y viviendas',
    text: 'Casas llave en mano, ampliaciones y soluciones a medida. Cada proyecto se cotiza según terminaciones, ubicación y materiales.',
    Icon: Building2,
  },
  {
    title: 'Reparación y remodelación',
    text: 'Trabajos independientes que permiten atender necesidades reales mientras se construye una cartera de proyectos mayores.',
    Icon: Hammer,
  },
  {
    title: 'Instalaciones para el hogar',
    text: 'Aire acondicionado, electricidad, gasfitería y mantenciones que generan movimiento constante y confianza.',
    Icon: Sparkles,
  },
  {
    title: 'Cocinas y terminaciones',
    text: 'Fabricación, montaje y mejoras que elevan el valor de una vivienda y abren nuevas conversaciones con clientes.',
    Icon: PackageOpen,
  },
  {
    title: 'E-commerce de apoyo',
    text: 'Una vitrina para ofrecer productos referenciales y alternativas de compra, con una experiencia similar a un marketplace.',
    Icon: CircleDollarSign,
  },
  {
    title: 'Calculadora y cotización',
    text: 'Herramientas para que las personas exploren lo que necesitan y lleguen con mejor contexto a una conversación.',
    Icon: Calculator,
  },
] as const;

const emailHref =
  'mailto:?subject=Proyecto%20Soluciones%20Fabrick&body=Te%20comparto%20el%20proyecto%20Soluciones%20Fabrick%3A%20https%3A%2F%2Fwww.solucionesfabrick.com%2Fproyecto-soluciones-fabrick';

export default function ProyectoSolucionesFabrickPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090A] text-[#FFF9EE] selection:bg-[#FFB000] selection:text-[#08090A]">
      <div className="border-b border-white/10 bg-[#08090A]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" aria-label="Volver al inicio de Soluciones Fabrick" className="relative block h-[38px] w-[182px] sm:h-[46px] sm:w-[225px]">
            <Image src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" fill priority sizes="225px" className="object-contain object-left" />
          </Link>
          <a
            href={emailHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#FFB000]/35 bg-[#FFB000]/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FFE2A3] transition hover:border-[#FFB000] hover:bg-[#FFB000] hover:text-[#08090A] sm:px-5"
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compartir por correo</span>
            <span className="sm:hidden">Compartir</span>
          </a>
        </div>
      </div>

      <section className="relative isolate border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_5%,rgba(255,176,0,.2),transparent_28rem),radial-gradient(circle_at_5%_35%,rgba(245,135,31,.14),transparent_26rem)]" />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.12fr_.88fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#FFB000]/30 bg-[#FFB000]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#FFD05A]">
              <Sparkles className="h-3.5 w-3.5" /> Proyecto Soluciones Fabrick
            </p>
            <h1 className="mt-6 max-w-3xl font-[Sora] text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] text-[#FFF9EE] sm:text-5xl md:text-6xl">
              Hola Daniela,
              <span className="block text-[#FFB000]">te presento esta propuesta.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#D9D2C5] md:text-lg">
              Decidí organizarla de esta manera para que tengas a la vista la idea, el orden de los gastos y el camino que quiero recorrer. Así puedes sacar tus propias conclusiones, decidir si te hace sentido participar o darme un consejo para seguir avanzando con este gran proyecto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#gastos" className="inline-flex items-center gap-2 rounded-full bg-[#FFB000] px-5 py-3 text-sm font-black text-[#08090A] transition hover:-translate-y-0.5 hover:bg-[#FFD05A]">
                Ver el plan <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/5">
                Conocer la marca
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[#FFB000]/25 bg-[#111214]/80 p-6 shadow-[0_28px_90px_rgba(0,0,0,.34)] backdrop-blur md:p-8">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#FFB000]">La idea central</p>
            <p className="mt-4 font-[Sora] text-2xl font-bold leading-tight text-white">
              Convertir presencia local y buen servicio en una marca confiable para el hogar.
            </p>
            <div className="mt-7 space-y-4 border-t border-white/10 pt-6 text-sm leading-6 text-[#CFC7B9]">
              <p className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB000]" />No depender de un único tipo de trabajo.</p>
              <p className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB000]" />Crear movimiento desde servicios concretos y cercanos.</p>
              <p className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB000]" />Llegar a viviendas mayores con una marca ya visible.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24" id="gastos">
        <div className="max-w-3xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#FFB000]">En qué se usaría el capital</p>
          <h2 className="mt-3 font-[Sora] text-3xl font-extrabold tracking-[-0.035em] text-white md:text-4xl">Ordenar la salida al mercado y trabajar con presencia.</h2>
          <p className="mt-4 text-base leading-7 text-[#CFC7B9]">La prioridad es movilizarse, mostrar el trabajo, atender consultas y dejar la operación lista para responder bien cuando lleguen los primeros clientes.</p>
        </div>
        <div className="mt-9 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111214]">
          {launchExpenses.map(([title, detail, amount], index) => (
            <div key={title} className="grid gap-2 border-b border-white/10 px-5 py-5 last:border-b-0 sm:grid-cols-[1fr_1.45fr_auto] sm:items-center sm:gap-6 sm:px-7">
              <div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#FFB000]/12 text-xs font-black text-[#FFB000]">0{index + 1}</span><strong className="text-sm text-white">{title}</strong></div>
              <p className="text-sm leading-6 text-[#AEA79C]">{detail}</p>
              <strong className="text-base text-[#FFD05A] sm:text-right">{amount}</strong>
            </div>
          ))}
          <div className="flex flex-col gap-2 bg-[#FFB000] px-5 py-5 text-[#08090A] sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <span className="text-sm font-black">Capital de lanzamiento estimado</span>
            <span className="font-[Sora] text-2xl font-extrabold">$10.000.000</span>
          </div>
        </div>
        <p className="mt-4 max-w-4xl text-xs leading-6 text-[#918A7F]">Los montos son una guía inicial y se respaldarían con cotizaciones, registro de uso y una conversación clara antes de tomar cualquier decisión.</p>
      </section>

      <section className="border-y border-white/10 bg-[#111214]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#FFB000]">Cómo se vendería</p>
            <h2 className="mt-3 font-[Sora] text-3xl font-extrabold tracking-[-0.035em] text-white md:text-4xl">Casas personalizadas, con valores que se entienden.</h2>
            <p className="mt-5 text-base leading-7 text-[#CFC7B9]">El cliente no compra una cifra fija: compra una solución pensada para su terreno, sus prioridades y su presupuesto. La calculadora ayuda a iniciar esa conversación y la cotización final define el alcance real.</p>
          </div>
          <div className="rounded-[2rem] border border-[#FFB000]/25 bg-[#08090A] p-7 md:p-9">
            <p className="text-sm font-bold text-[#D9D2C5]">Referencia inicial para vivienda</p>
            <p className="mt-4 font-[Sora] text-4xl font-extrabold tracking-[-0.05em] text-[#FFB000] md:text-5xl">$680 mil — $790 mil</p>
            <p className="mt-1 text-sm font-bold text-white">por m² aproximado</p>
            <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 text-sm text-[#CFC7B9] sm:grid-cols-3">
              <span>Terminaciones elegidas</span><span>Ubicación del proyecto</span><span>Materiales y alcance</span>
            </div>
            <Link href="/presupuesto" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#FFD05A] hover:text-white">Ir a la calculadora <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="max-w-3xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#FFB000]">Frentes que se complementan</p>
          <h2 className="mt-3 font-[Sora] text-3xl font-extrabold tracking-[-0.035em] text-white md:text-4xl">No solamente casas: una respuesta completa para el hogar.</h2>
          <p className="mt-4 text-base leading-7 text-[#CFC7B9]">Cada servicio puede sostener el aprendizaje, el flujo de consultas y los recursos mientras se avanza hacia proyectos de construcción llave en mano.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fronts.map(({ title, text, Icon }) => (
            <article key={title} className="rounded-[1.5rem] border border-white/10 bg-[#111214] p-6 transition hover:-translate-y-1 hover:border-[#FFB000]/35">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFB000]/12 text-[#FFB000]"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-extrabold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#AEA79C]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[linear-gradient(120deg,#17120A,#0B0B0C_55%,#15100A)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#FFB000]">El desafío inmediato</p>
            <h2 className="mt-3 font-[Sora] text-3xl font-extrabold tracking-[-0.035em] text-white md:text-4xl">Hoy el cuello de botella es que aún nos conoce poca gente.</h2>
            <p className="mt-5 text-base leading-7 text-[#D4CCBF]">La oportunidad no se resuelve esperando: se resuelve apareciendo de manera consistente. Publicidad mejor organizada, contenido que muestre el proceso y presencia en terreno permiten que más personas pregunten, coticen y recomienden.</p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#FFB000]/25 bg-black/25 p-4 text-sm leading-6 text-[#E7DDCC]"><Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB000]" />La meta inicial es transformar visibilidad en conversaciones calificadas, visitas y cotizaciones reales; no prometer ventas antes de medirlas.</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><MapPinned className="h-5 w-5 text-[#FFB000]" /><p className="mt-4 font-[Sora] text-2xl font-extrabold text-white">8–16 meses</p><p className="mt-1 text-sm leading-6 text-[#BDB5A8]">para mayor reconocimiento local y llegada a más comunas.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><UsersRound className="h-5 w-5 text-[#FFB000]" /><p className="mt-4 font-[Sora] text-2xl font-extrabold text-white">24–36 meses</p><p className="mt-1 text-sm leading-6 text-[#BDB5A8]">en un escenario más lento, para una operación estable y entrenada.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><Handshake className="h-5 w-5 text-[#FFB000]" /><p className="mt-4 font-[Sora] text-2xl font-extrabold text-white">9–12 meses</p><p className="mt-1 text-sm leading-6 text-[#BDB5A8]">plazo propuesto para devolver el capital, sujeto a un acuerdo claro y a la operación efectiva.</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8 md:py-24">
        <Handshake className="mx-auto h-8 w-8 text-[#FFB000]" />
        <h2 className="mt-5 font-[Sora] text-3xl font-extrabold tracking-[-0.04em] text-white md:text-4xl">La meta es crear algo que se sostenga con las personas.</h2>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#CFC7B9]">No se trata solo de juntar trabajadores y clientes. Se trata de formar un equipo que aprenda, reciba una buena recompensa por su esfuerzo y construya una comunidad que se nutra del conocimiento y los servicios que Soluciones Fabrick puede entregar.</p>
        <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-[#918A7F]">La retribución adicional y la forma de devolución se definen por escrito antes de cualquier transferencia, para que la decisión sea clara y cuidada para todos.</p>
        <a href={emailHref} className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#FFB000] px-6 py-3.5 text-sm font-black text-[#08090A] transition hover:-translate-y-0.5 hover:bg-[#FFD05A]">Compartir por correo <Mail className="h-4 w-4" /></a>
      </section>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-xs text-[#827B70]">Soluciones Fabrick · Construcción, reparación y soluciones para el hogar.</footer>
    </main>
  );
}
