import type { Metadata } from 'next';
import { Droplet, Hammer, Home, Layers, PaintRoller, ShieldCheck } from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';

const SERVICES = [
  {
    title: 'Cimientos y bases',
    description: 'Ejecucion precisa para dar estabilidad real desde el primer dia de obra.',
    icon: Hammer,
  },
  {
    title: 'Estructuras Metalcon',
    description: 'Montaje tecnico y controlado para proyectos residenciales modernos y seguros.',
    icon: Home,
  },
  {
    title: 'Gasfiteria certificada',
    description: 'Instalaciones limpias, confiables y pensadas para durar.',
    icon: Droplet,
  },
  {
    title: 'Revestimientos y aislacion',
    description: 'Confort termico y acustico con terminaciones cuidadas.',
    icon: Layers,
  },
  {
    title: 'Pintura y acabados',
    description: 'Terminaciones finas para espacios elegantes y funcionales.',
    icon: PaintRoller,
  },
  {
    title: 'Seguridad y domotica',
    description: 'Control de accesos, automatizacion y proteccion para el hogar moderno.',
    icon: ShieldCheck,
  },
];

export const metadata: Metadata = {
  title: 'Servicios | Fabrick',
  description: 'Servicios integrales de construccion, remodelacion y seguridad para el hogar.',
};

export default function ServiciosPage() {
  return (
    <SectionPageShell
      eyebrow="Servicios"
      title="Un equipo para todo el proyecto"
      description="Desde la base estructural hasta los detalles finales, cada servicio opera bajo un mismo estandar de calidad y coordinacion."
      primaryAction={{ href: '/contacto', label: 'Solicitar evaluacion' }}
      secondaryAction={{ href: '/tienda', label: 'Ver tienda' }}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map(({ title, description, icon: Icon }) => (
          <article key={title} className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 transition hover:border-yellow-400/30">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/20 bg-black">
              <Icon className="h-6 w-6 text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold uppercase tracking-[0.15em] text-white">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
          </article>
        ))}
      </div>
    </SectionPageShell>
  );
}
