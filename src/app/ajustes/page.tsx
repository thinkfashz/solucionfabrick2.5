import type { Metadata } from 'next';
import SectionPageShell from '@/components/SectionPageShell';

export const metadata: Metadata = {
  title: 'Ajustes | Fabrick',
  description: 'Preferencias de experiencia y acceso rapido dentro de Fabrick.',
};

export default function AjustesPage() {
  return (
    <SectionPageShell
      eyebrow="Ajustes"
      title="Personaliza tu experiencia"
      description="Instala la app en tu movil, vuelve rapidamente a las paginas clave y continua tu recorrido sin perder contexto."
      primaryAction={{ href: '/', label: 'Ir al inicio' }}
      secondaryAction={{ href: '/contacto', label: 'Pedir ayuda' }}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {[
          'Instala Fabrick en tu pantalla de inicio para usarla como una app.',
          'Accede mas rapido a catalogo, contacto y seguimiento.',
          'Disfruta una interfaz adaptada a movil con sensacion de app nativa.',
        ].map((item) => (
          <div key={item} className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 text-sm leading-relaxed text-zinc-300">
            {item}
          </div>
        ))}
      </div>
    </SectionPageShell>
  );
}
