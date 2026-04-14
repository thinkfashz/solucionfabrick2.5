import type { Metadata } from 'next';
import SectionPageShell from '@/components/SectionPageShell';

const REVIEWS = [
  {
    name: 'Juan P.',
    project: 'Remodelacion total',
    text: 'Fabrick tomo el proyecto completo y nos devolvio tranquilidad. No tuvimos que perseguir maestros ni coordinar materiales.',
  },
  {
    name: 'Maria S.',
    project: 'Seguridad y accesos',
    text: 'El cronograma fue claro y el resultado final supero lo esperado. Se noto control y preocupacion real por cada detalle.',
  },
  {
    name: 'Jose V.',
    project: 'Construccion estructural',
    text: 'La precision tecnica y el respaldo entregado me dieron confianza desde el primer dia.',
  },
];

export const metadata: Metadata = {
  title: 'Proyectos | Fabrick',
  description: 'Casos y testimonios de proyectos desarrollados por Soluciones Fabrick.',
};

export default function ProyectosPage() {
  return (
    <SectionPageShell
      eyebrow="Resultados"
      title="Confianza ganada en obra"
      description="Cada proyecto deja una huella concreta: orden, calidad y una experiencia mucho mas tranquila para la familia que nos contrata."
      primaryAction={{ href: '/contacto', label: 'Quiero un proyecto asi' }}
      secondaryAction={{ href: '/servicios', label: 'Ver servicios' }}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {REVIEWS.map((review) => (
          <article key={review.name} className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">{review.project}</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">&quot;{review.text}&quot;</p>
            <div className="mt-6 border-t border-white/5 pt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">
              {review.name}
            </div>
          </article>
        ))}
      </div>
    </SectionPageShell>
  );
}
