import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Droplet,
  Hammer,
  Home,
  Layers,
  PaintRoller,
  ShieldCheck,
  Zap,
  Wrench,
  Trees,
  Building2,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';
import AddServiceQuoteButton from '@/components/AddServiceQuoteButton';

const SERVICES = [
  {
    title: 'Cimientos y bases',
    description:
      'Ejecución precisa para dar estabilidad real desde el primer día de obra. Trabajamos con topografía verificada y hormigón certificado.',
    features: ['Estudio de suelo previo', 'Hormigón H-30 certificado', 'Supervisión estructural continua'],
    refPrice: 850000,
    unit: 'obra',
    icon: Hammer,
    href: null,
  },
  {
    title: 'Estructuras Metalcon',
    description:
      'Montaje técnico y controlado para proyectos residenciales modernos y seguros. Ideal para ampliaciones y obras nuevas de baja altura.',
    features: ['Perfiles galvanizados de 1ª calidad', 'Plano estructural incluido', 'Garantía de 5 años en estructura'],
    refPrice: 1200000,
    unit: 'obra',
    icon: Home,
    href: '/servicios/metalcon',
  },
  {
    title: 'Gasfitería certificada',
    description:
      'Instalaciones limpias, confiables y pensadas para durar. Certificación ESSBIO y SEC según normativa vigente.',
    features: ['Certificación SEC incluida', 'Materiales de primera marca', 'Prueba de presión post-instalación'],
    refPrice: 320000,
    unit: 'obra',
    icon: Droplet,
    href: '/servicios/gasfiteria',
  },
  {
    title: 'Revestimientos y aislación',
    description:
      'Confort térmico y acústico con terminaciones cuidadas. Reducimos el ruido exterior y optimizamos la temperatura interior.',
    features: ['Aislación lana de vidrio o roca', 'Placa Volcanita certificada', 'Reducción sonora de hasta 42 dB'],
    refPrice: 480000,
    unit: 'obra',
    icon: Layers,
    href: null,
  },
  {
    title: 'Pintura y acabados',
    description:
      'Terminaciones finas para espacios elegantes y funcionales. Trabajamos con pinturas premium de larga durabilidad.',
    features: ['Preparación de superficie incluida', 'Pinturas Sipa o Sherwin-Williams', 'Mínimo 2 manos de aplicación'],
    refPrice: 180000,
    unit: 'obra',
    icon: PaintRoller,
    href: null,
  },
  {
    title: 'Seguridad y domótica',
    description:
      'Control de accesos, automatización y protección para el hogar moderno. Tu casa inteligente y segura desde el día uno.',
    features: ['Cámaras IP 4K con almacenamiento', 'Cerradura digital con huella', 'App de control remoto incluida'],
    refPrice: 650000,
    unit: 'obra',
    icon: ShieldCheck,
    href: null,
  },
  {
    title: 'Instalaciones eléctricas',
    description:
      'Circuitos dimensionados correctamente, tablero termomagnético y certificación SEC. Seguridad eléctrica sin compromiso.',
    features: ['Plano eléctrico actualizado', 'Certificación SEC obligatoria', 'Tablero modular con diferencial'],
    refPrice: 290000,
    unit: 'obra',
    icon: Zap,
    href: '/servicios/electricidad',
  },
  {
    title: 'Mantención y reparaciones',
    description:
      'Servicio de mantención preventiva y correctiva para proteger tu inversión. Evita problemas mayores con revisiones periódicas.',
    features: ['Visita de diagnóstico incluida', 'Informe técnico escrito', 'Plan de mantención anual'],
    refPrice: 95000,
    unit: 'visita',
    icon: Wrench,
    href: null,
  },
  {
    title: 'Paisajismo y exteriores',
    description:
      'Diseño y ejecución de espacios exteriores que complementan la arquitectura. Terrazas, jardines y áreas de descanso premium.',
    features: ['Diseño de terraza o jardín', 'Iluminación exterior LED', 'Materiales resistentes a la intemperie'],
    refPrice: 420000,
    unit: 'obra',
    icon: Trees,
    href: null,
  },
  {
    title: 'Ampliaciones y remodelación integral',
    description:
      'Transformamos espacios completos coordinando todos los oficios. Un solo contrato, un solo equipo, cero dolores de cabeza.',
    features: ['Coordinación total del proyecto', 'Cronograma con hitos semanales', 'Garantía de entrega a tiempo'],
    refPrice: undefined,
    unit: 'obra',
    icon: Building2,
    href: '/servicios/ampliaciones',
  },
  {
    title: 'Inspección técnica',
    description:
      'Evaluación profesional de obra nueva o usada antes de comprar o remodelar. Detectamos fallas ocultas antes de que sean problemas.',
    features: ['Informe fotográfico completo', 'Estimación de costos de reparación', 'Entrega en 48 horas'],
    refPrice: 150000,
    unit: 'inspección',
    icon: ScanLine,
    href: null,
  },
  {
    title: 'Diseño de interiores',
    description:
      'Propuestas de diseño que integran estética, funcionalidad y el presupuesto real del cliente. Del concepto al resultado final.',
    features: ['Renders 3D del espacio', 'Selección de materiales premium', 'Coordinación con obra incluida'],
    refPrice: 380000,
    unit: 'proyecto',
    icon: Sparkles,
    href: null,
  },
] as const;

const STATS = [
  { value: '500+', label: 'Proyectos completados' },
  { value: '8', label: 'Años de experiencia' },
  { value: '100%', label: 'Clientes satisfechos' },
  { value: '15', label: 'Especialistas certificados' },
];

export const metadata: Metadata = {
  title: 'Servicios de Construcción',
  description:
    'Servicios integrales de construcción, remodelación y seguridad para el hogar en la Región del Maule, Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios' },
};

export default function ServiciosPage() {
  return (
    <SectionPageShell
      eyebrow="Servicios"
      title="Un equipo para todo el proyecto"
      description="Desde la base estructural hasta los detalles finales. Agrega los servicios que necesitas a tu cotización y arma la lista completa de tu obra — sin precios sorpresa, todo a medida."
      primaryAction={{ href: '/cotizaciones', label: 'Ver mi cotización' }}
      secondaryAction={{ href: '/juego', label: 'Diseñar mi casa' }}
    >
      {/* Stats strip */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map(({ value, label }) => (
          <div
            key={label}
            className="rounded-[1.5rem] border border-yellow-400/20 bg-black/60 p-6 text-center"
          >
            <p className="text-3xl font-black text-yellow-400 md:text-4xl">{value}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map(({ title, description, features, refPrice, unit, icon: Icon, href }) => (
          <article
            key={title}
            className="group flex flex-col rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 transition hover:border-yellow-400/30"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/20 bg-black transition group-hover:border-yellow-400/50 group-hover:bg-yellow-400/5">
              <Icon className="h-6 w-6 text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold uppercase tracking-[0.15em] text-white">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
            <ul className="mt-5 space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/5 pt-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Cotización personalizada
              </span>
              <AddServiceQuoteButton
                serviceTitle={title}
                description={description}
                refPrice={refPrice}
                unit={unit}
              />
            </div>
            {href ? (
              <Link
                href={href}
                className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400/80 hover:text-yellow-400 transition-colors"
              >
                Ver detalle del servicio →
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-black p-10 text-center md:p-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
          ¿Listo para comenzar?
        </p>
        <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          Arma tu casa con la lista completa
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Selecciona los servicios que necesitas y combínalos con el diseño 3D de tu casa para
          recibir una cotización integral en menos de 24 horas.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/cotizaciones"
            className="rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
          >
            Ver mi cotización
          </Link>
          <Link
            href="/contacto"
            className="rounded-full border border-yellow-400/35 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400 transition hover:bg-yellow-400/10"
          >
            Contactar al equipo
          </Link>
        </div>
      </div>
    </SectionPageShell>
  );
}
