import type { Metadata } from 'next';
import SectionPageShell from '@/components/SectionPageShell';

const TIMELINE = [
  'Ayudante General: aprendizaje duro y disciplina en terreno.',
  'Maestro de Segunda: dominio de herramientas y control de ejecucion.',
  'Maestro de Primera: precision tecnica en estructuras y acabados.',
  'Lider de Proyectos: coordinacion de equipos y seguimiento de calidad.',
  'Contratista: direccion completa de obras residenciales.',
  'Ecosistema Fabrick: una propuesta integral para construir con confianza.',
];

export const metadata: Metadata = {
  title: 'Evolucion | Fabrick',
  description: 'La historia de crecimiento tecnico y operativo de Soluciones Fabrick.',
};

export default function EvolucionPage() {
  return (
    <SectionPageShell
      eyebrow="Evolucion"
      title="Experiencia construida en terreno"
      description="Nuestra autoridad nace del trabajo real, de la mejora continua y de la capacidad de responder con orden, detalle y respaldo."
      primaryAction={{ href: '/contacto', label: 'Hablar con Fabrick' }}
      secondaryAction={{ href: '/', label: 'Volver al inicio' }}
    >
      <div className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-12">
        <div className="space-y-6 border-l border-yellow-400/30 pl-6 md:pl-10">
          {TIMELINE.map((step, index) => (
            <div key={step} className="relative">
              <div className="absolute -left-[2.15rem] top-1.5 h-3.5 w-3.5 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.45)] md:-left-[2.65rem]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-400">Fase 0{index + 1}</p>
              <p className="mt-2 text-base leading-relaxed text-zinc-300">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionPageShell>
  );
}
