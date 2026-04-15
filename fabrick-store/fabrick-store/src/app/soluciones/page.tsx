import type { Metadata } from 'next';
import { Award, Clock, Shield, Truck, Users, Zap, ChevronRight } from 'lucide-react';
import TiendaSection from '@/components/TiendaSection';
import SectionPageShell from '@/components/SectionPageShell';

const DIFFERENTIALS = [
  {
    icon: Shield,
    title: 'Garantía real escrita',
    description: 'Todos nuestros proyectos incluyen garantía documental. Sin letra chica, sin excusas.',
  },
  {
    icon: Users,
    title: 'Equipo propio certificado',
    description: 'No subcontratamos. Cada profesional en tu obra pertenece a nuestro equipo y está certificado.',
  },
  {
    icon: Clock,
    title: 'Cronograma transparente',
    description: 'Recibes un plan detallado con hitos semanales. Sabes exactamente qué pasa y cuándo.',
  },
  {
    icon: Zap,
    title: 'Respuesta en 24 horas',
    description: 'Desde el primer contacto hasta la propuesta, nunca esperas más de un día hábil.',
  },
  {
    icon: Award,
    title: 'Materiales de primera línea',
    description: 'Trabajamos únicamente con marcas certificadas. La calidad empieza en los materiales.',
  },
  {
    icon: Truck,
    title: 'Logística coordinada',
    description: 'Gestionamos entregas, acopios y retiro de escombros. Tu espacio, siempre ordenado.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Fabrick no solo construyó nuestra ampliación — nos acompañó en cada decisión. La comunicación fue impecable de principio a fin.',
    name: 'Valentina R.',
    role: 'Propietaria, Las Condes',
    stars: 5,
  },
  {
    quote: 'Lo que más valoro es que cumplieron el plazo exacto. Nunca creí que una obra pudiera terminar cuando dijeron que terminaría.',
    name: 'Rodrigo M.',
    role: 'Arquitecto, Providencia',
    stars: 5,
  },
  {
    quote: 'El equipo llegó puntual cada día, mantuvo el sitio limpio y la calidad de terminaciones fue de nivel premium. Los recomiendo sin dudar.',
    name: 'Catalina S.',
    role: 'Diseñadora de interiores, Santiago',
    stars: 5,
  },
];

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Evaluación',
    description: 'Visitamos tu espacio sin costo, evaluamos el alcance real del proyecto y escuchamos tus objetivos y presupuesto.',
  },
  {
    step: '02',
    title: 'Diseño',
    description: 'Preparamos renders, planos y una propuesta económica detallada. Sin sorpresas en la ejecución.',
  },
  {
    step: '03',
    title: 'Ejecución',
    description: 'Nuestro equipo certificado trabaja con un cronograma claro. Tú recibes reportes de avance semanales.',
  },
  {
    step: '04',
    title: 'Entrega',
    description: 'Recepcionamos la obra contigo, revisamos cada detalle y entregamos garantías escritas antes de cerrar el proyecto.',
  },
];

export const metadata: Metadata = {
  title: 'Soluciones | Fabrick',
  description: 'Catálogo de soluciones, materiales y productos conectados automáticamente con la tienda Fabrick.',
};

export default function SolucionesPage() {
  return (
    <SectionPageShell
      eyebrow="Soluciones"
      title="Catálogo completo de productos y materiales"
      description="Esta página muestra la misma base de productos que ves en la tienda, actualizada automáticamente para que el cliente siempre vea información vigente."
      primaryAction={{ href: '/tienda', label: 'Abrir tienda interactiva' }}
      secondaryAction={{ href: '/contacto', label: 'Solicitar asesoría' }}
    >
      {/* What makes Fabrick different */}
      <div className="mb-12">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Por qué elegirnos</p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          Lo que nos hace diferentes
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {DIFFERENTIALS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 transition hover:border-yellow-400/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-400/20 bg-black transition group-hover:border-yellow-400/50">
                <Icon className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-white">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="mb-12">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Testimonios</p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          Lo que dicen nuestros clientes
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, role, stars }) => (
            <blockquote key={name} className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: stars }).map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">&ldquo;{quote}&rdquo;</p>
              <footer className="mt-6 border-t border-white/5 pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">{name}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>

      {/* Product catalog */}
      <TiendaSection
        limit={0}
        title="Catálogo completo conectado"
        description="Todo el catálogo visible para el cliente, alimentado desde la base y sincronizado con la tienda en una sola experiencia."
        primaryCtaHref="/contacto"
        primaryCtaLabel="Hablar con un asesor"
        secondaryCtaHref="/tienda"
        secondaryCtaLabel="Ver experiencia tienda"
      />

      {/* Process section */}
      <div className="mt-12 rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-12">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Metodología</p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">¿Cómo trabajamos?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Un proceso claro, predecible y sin sorpresas. Así trabajamos en cada proyecto, sin importar el tamaño.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {PROCESS_STEPS.map(({ step, title, description }, index) => (
            <div key={step} className="relative flex flex-col">
              {index < PROCESS_STEPS.length - 1 && (
                <ChevronRight className="absolute -right-3 top-3 hidden h-5 w-5 text-yellow-400/30 md:block" />
              )}
              <span className="text-4xl font-black text-yellow-400/20">{step}</span>
              <h3 className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-white">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionPageShell>
  );
}
