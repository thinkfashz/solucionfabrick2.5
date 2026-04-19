import type { Metadata } from 'next';
import Link from 'next/link';
import SectionPageShell from '@/components/SectionPageShell';

export const metadata: Metadata = {
  title: 'Mi Cuenta | Fabrick',
  description: 'Acceso y gestion de cuenta para clientes de Soluciones Fabrick.',
};

export default function MiCuentaPage() {
  return (
    <SectionPageShell
      eyebrow="Mi cuenta"
      title="Accede a tu espacio Fabrick"
      description="Ingresa para revisar seguimiento, guardar favoritos y continuar tu proceso con nuestro equipo."
      primaryAction={{ href: '/auth', label: 'Iniciar sesion' }}
      secondaryAction={{ href: '/contacto', label: 'Hablar con un asesor' }}
    >
      <div className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-10">
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Si aun no tienes acceso, puedes escribirnos desde la pagina de contacto y te ayudaremos a crear tu proceso de seguimiento.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/auth" className="rounded-full bg-yellow-400 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white">
            Ir a acceso
          </Link>
          <Link href="/soluciones" className="rounded-full border border-yellow-400/35 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-400 transition hover:bg-yellow-400/10">
            Ver catalogo
          </Link>
        </div>
      </div>
    </SectionPageShell>
  );
}
