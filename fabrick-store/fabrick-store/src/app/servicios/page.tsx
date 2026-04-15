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

const SERVICES = [
  {
    title: 'Cimientos y bases',
    description: 'Ejecución precisa para dar estabilidad real desde el primer día de obra. Trabajamos con topografía verificada y hormigón certificado.',
    features: ['Estudio de suelo previo', 'Hormigón H-30 certificado', 'Supervisión estructural continua'],
    price: 'Desde $850.000',
    icon: Hammer,
  },
  {
    title: 'Estructuras Metalcon',
    description: 'Montaje técnico y controlado para proyectos residenciales modernos y seguros. Ideal para ampliaciones y obras nuevas de baja altura.',
    features: ['Perfiles galvanizados de 1ª calidad', 'Plano estructural incluido', 'Garantía de 5 años en estructura'],
    price: 'Desde $1.200.000',
    icon: Home,
  },
  {
    title: 'Gasfitería certificada',
    description: 'Instalaciones limpias, confiables y pensadas para durar. Certificación ESSBIO y SEC según normativa vigente.',
    features: ['Certificación SEC incluida', 'Materiales de primera marca', 'Prueba de presión post-instalación'],
    price: 'Desde $320.000',
    icon: Droplet,
  },
  {
    title: 'Revestimientos y aislación',
    description: 'Confort térmico y acústico con terminaciones cuidadas. Reducimos el ruido exterior y optimizamos la temperatura interior.',
    features: ['Aislación lana de vidrio o roca', 'Placa Volcanita certificada', 'Reducción sonora de hasta 42 dB'],
    price: 'Desde $480.000',
    icon: Layers,
  },
  {
    title: 'Pintura y acabados',
    description: 'Terminaciones finas para espacios elegantes y funcionales. Trabajamos con pinturas premium de larga durabilidad.',
    features: ['Preparación de superficie incluida', 'Pinturas Sipa o Sherwin-Williams', 'Mínimo 2 manos de aplicación'],
    price: 'Desde $180.000',
    icon: PaintRoller,
  },
  {
    title: 'Seguridad y domótica',
    description: 'Control de accesos, automatización y protección para el hogar moderno. Tu casa inteligente y segura desde el día uno.',
    features: ['Cámaras IP 4K con almacenamiento', 'Cerradura digital con huella', 'App de control remoto incluida'],
    price: 'Desde $650.000',
    icon: ShieldCheck,
  },
  {
    title: 'Instalaciones eléctricas',
    description: 'Circuitos dimensionados correctamente, tablero termomagnético y certificación SEC. Seguridad eléctrica sin compromiso.',
    features: ['Plano eléctrico actualizado', 'Certificación SEC obligatoria', 'Tablero modular con diferencial'],
    price: 'Desde $290.000',
    icon: Zap,
  },
  {
    title: 'Mantención y reparaciones',
    description: 'Servicio de mantención preventiva y correctiva para proteger tu inversión. Evita problemas mayores con revisiones periódicas.',
    features: ['Visita de diagnóstico incluida', 'Informe técnico escrito', 'Plan de mantención anual'],
    price: 'Desde $95.000',
    icon: Wrench,
  },
  {
    title: 'Paisajismo y exteriores',
    description: 'Diseño y ejecución de espacios exteriores que complementan la arquitectura. Terrazas, jardines y áreas de descanso premium.',
    features: ['Diseño de terraza o jardín', 'Iluminación exterior LED', 'Materiales resistentes a la intemperie'],
    price: 'Desde $420.000',
    icon: Trees,
  },
  {
    title: 'Remodelación integral',
    description: 'Transformamos espacios completos coordinando todos los oficios. Un solo contrato, un solo equipo, cero dolores de cabeza.',
    features: ['Coordinación total del proyecto', 'Cronograma con hitos semanales', 'Garantía de entrega a tiempo'],
    price: 'Cotización personalizada',
    icon: Building2,
  },
  {
    title: 'Inspección técnica',
    description: 'Evaluación profesional de obra nueva o usada antes de comprar o remodelar. Detectamos fallas ocultas antes de que sean problemas.',
    features: ['Informe fotográfico completo', 'Estimación de costos de reparación', 'Entrega en 48 horas'],
    price: 'Desde $150.000',
    icon: ScanLine,
  },
  {
    title: 'Diseño de interiores',
    description: 'Propuestas de diseño que integran estética, funcionalidad y el presupuesto real del cliente. Del concepto al resultado final.',
    features: ['Renders 3D del espacio', 'Selección de materiales premium', 'Coordinación con obra incluida'],
    price: 'Desde $380.000',
    icon: Sparkles,
  },
];

const STATS = [
  { value: '500+', label: 'Proyectos completados' },
  { value: '8', label: 'Años de experiencia' },
  { value: '100%', label: 'Clientes satisfechos' },
  { value: '15', label: 'Especialistas certificados' },
];

export const metadata: Metadata = {
  title: 'Servicios | Fabrick',
  description: 'Servicios integrales de construcción, remodelación y seguridad para el hogar. 500+ proyectos completados.',
};

export default function ServiciosPage() {
  return (
    <SectionPageShell
      eyebrow="Servicios"
      title="Un equipo para todo el proyecto"
      description="Desde la base estructural hasta los detalles finales, cada servicio opera bajo un mismo estándar de calidad y coordinación."
      primaryAction={{ href: '/contacto', label: 'Solicitar evaluación' }}
      secondaryAction={{ href: '/tienda', label: 'Ver tienda' }}
    >
      {/* Stats strip */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map(({ value, label }) => (
          <div key={label} className="rounded-[1.5rem] border border-yellow-400/20 bg-black/60 p-6 text-center">
            <p className="text-3xl font-black text-yellow-400 md:text-4xl">{value}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map(({ title, description, features, price, icon: Icon }) => (
          <article key={title} className="group flex flex-col rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 transition hover:border-yellow-400/30">
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
            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Precio referencial</span>
              <span className="text-sm font-bold text-yellow-400">{price}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-black p-10 text-center md:p-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">¿Listo para comenzar?</p>
        <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          ¿Listo para transformar tu espacio?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Cuéntanos tu proyecto y te preparamos una propuesta personalizada sin costo. Respondemos en menos de 24 horas.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/contacto"
            className="rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
          >
            Contactar ahora
          </Link>
          <Link
            href="/proyectos"
            className="rounded-full border border-yellow-400/35 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400 transition hover:bg-yellow-400/10"
          >
            Ver proyectos realizados
          </Link>
        </div>
      </div>
    </SectionPageShell>
  );
}
