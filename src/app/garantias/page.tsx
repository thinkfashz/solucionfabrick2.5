import type { Metadata } from 'next';
import SectionPageShell from '@/components/SectionPageShell';

const GUARANTEES = [
  'Respaldo real de largo plazo para ajustes y postventa.',
  'Comunicación clara durante todo el proceso.',
  'Control técnico en materiales, ejecución y terminaciones.',
  'Compromiso con seguridad estructural y confianza familiar.',
];

export const metadata: Metadata = {
  title: 'Garantías',
  description: 'Respaldo, postventa y tranquilidad en cada proyecto Fabrick.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/garantias' },
};

export default function GarantiasPage() {
  return (
    <SectionPageShell
      eyebrow="Garantías"
      title="Tu tranquilidad también es parte del servicio"
      description="El valor de Fabrick no termina cuando se entrega una obra: continúa en el respaldo, el seguimiento y la claridad con la que respondemos."
      primaryAction={{ href: '/contacto', label: 'Pedir asesoría' }}
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
