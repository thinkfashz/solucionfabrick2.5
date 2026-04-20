import type { Metadata } from 'next';
import ContentListPage from '@/components/ContentListPage';
import { listContent } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Casos de estudio',
  description:
    'Proyectos reales ejecutados por Soluciones Fabrick en la Región del Maule: ampliaciones, remodelaciones y obras nuevas con resultados medibles.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/casos' },
  openGraph: {
    title: 'Casos de estudio | Soluciones Fabrick',
    description: 'Proyectos reales con resultados medibles en el Maule.',
    url: 'https://www.solucionesfabrick.com/casos',
    type: 'website',
  },
};

export default function CasosIndexPage() {
  const items = listContent('casos');
  return (
    <ContentListPage
      type="casos"
      title="Obras que hablan por nosotros"
      description="Cada caso muestra alcance técnico, plazos reales, partidas ejecutadas y resultado final. Sin retoques ni promesas vacías."
      items={items}
    />
  );
}
