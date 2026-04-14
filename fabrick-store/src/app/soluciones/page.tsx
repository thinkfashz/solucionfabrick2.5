import type { Metadata } from 'next';
import TiendaSection from '@/components/TiendaSection';
import SectionPageShell from '@/components/SectionPageShell';

export const metadata: Metadata = {
  title: 'Soluciones | Fabrick',
  description: 'Catalogo de soluciones, materiales y productos conectados automaticamente con la tienda Fabrick.',
};

export default function SolucionesPage() {
  return (
    <SectionPageShell
      eyebrow="Soluciones"
      title="Catalogo completo de productos y materiales"
      description="Esta pagina muestra la misma base de productos que ves en la tienda, actualizada automaticamente para que el cliente siempre vea informacion vigente."
      primaryAction={{ href: '/tienda', label: 'Abrir tienda interactiva' }}
      secondaryAction={{ href: '/contacto', label: 'Solicitar asesoria' }}
    >
      <TiendaSection
        limit={0}
        title="Catalogo completo conectado"
        description="Todo el catalogo visible para el cliente, alimentado desde la base y sincronizado con la tienda en una sola experiencia."
        primaryCtaHref="/contacto"
        primaryCtaLabel="Hablar con un asesor"
        secondaryCtaHref="/tienda"
        secondaryCtaLabel="Ver experiencia tienda"
      />
    </SectionPageShell>
  );
}
