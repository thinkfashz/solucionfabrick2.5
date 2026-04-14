import type { Metadata } from 'next';
import SectionPageShell from '@/components/SectionPageShell';

const GUARANTEES = [
  'Respaldo real de largo plazo para ajustes y postventa.',
  'Comunicacion clara durante todo el proceso.',
  'Control tecnico en materiales, ejecucion y terminaciones.',
  'Compromiso con seguridad estructural y confianza familiar.',
];

export const metadata: Metadata = {
  title: 'Garantias | Fabrick',
  description: 'Respaldo, postventa y tranquilidad en cada proyecto Fabrick.',
};

export default function GarantiasPage() {
  return (
    <SectionPageShell
      eyebrow="Garantias"
      title="Tu tranquilidad tambien es parte del servicio"
      description="El valor de Fabrick no termina cuando se entrega una obra: continua en el respaldo, el seguimiento y la claridad con la que respondemos."
      primaryAction={{ href: '/contacto', label: 'Pedir asesoria' }}
      secondaryAction={{ href: '/proyectos', label: 'Ver resultados' }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {GUARANTEES.map((item) => (
          <div key={item} className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 text-sm leading-relaxed text-zinc-300">
            {item}
          </div>
        ))}
      </div>
    </SectionPageShell>
  );
}
