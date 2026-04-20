import type { Metadata } from 'next';
import ContactMap from '@/components/ContactMap';
import ContactForm from '@/components/ContactForm';
import SectionPageShell from '@/components/SectionPageShell';

export const metadata: Metadata = {
  title: 'Contacto y Cotización',
  description:
    'Solicita una evaluación gratuita para tu proyecto de construcción o remodelación con Soluciones Fabrick en la Región del Maule, Chile. Respuesta en menos de 24 horas.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/contacto' },
};

export default function ContactoPage() {
  return (
    <SectionPageShell
      eyebrow="Contacto"
      title="Conversemos tu proyecto"
      description="Escríbenos y coordinamos una visita técnica. Evaluación gratuita, presupuesto en 24 horas y sin compromiso."
      primaryAction={{ href: '/soluciones', label: 'Ver servicios' }}
      secondaryAction={{ href: '/', label: 'Volver al inicio' }}
    >
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <ContactMap className="min-h-[26rem]" />
        <div className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 md:p-10">
          <h2 className="text-xl font-bold uppercase tracking-[0.18em] text-white">Solicita una evaluación</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Cuanto más detalle compartas, mejor podremos orientarte desde el primer contacto.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </SectionPageShell>
  );
}
