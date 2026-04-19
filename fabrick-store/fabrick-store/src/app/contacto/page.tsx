import type { Metadata } from 'next';
import ContactMap from '@/components/ContactMap';
import SectionPageShell from '@/components/SectionPageShell';

export const metadata: Metadata = {
  title: 'Contacto | Fabrick',
  description: 'Contacta a Soluciones Fabrick y revisa la ubicacion de la oficina central.',
};

export default function ContactoPage() {
  return (
    <SectionPageShell
      eyebrow="Contacto"
      title="Conversemos tu proyecto"
      description="Escribenos y revisa nuestra ubicacion en un mapa interactivo para coordinar visitas, reuniones y evaluaciones."
      primaryAction={{ href: '/soluciones', label: 'Ver catalogo' }}
      secondaryAction={{ href: '/', label: 'Volver al inicio' }}
    >
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <ContactMap className="min-h-[26rem]" />
        <div className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 md:p-10">
          <h2 className="text-xl font-bold uppercase tracking-[0.18em] text-white">Solicita una evaluacion</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Cuanto mas detalle compartas, mejor podremos orientarte desde el primer contacto.
          </p>
          <form action="/api/presupuesto" method="POST" className="mt-8 space-y-5">
            <input name="nombre" placeholder="Nombre completo" className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none" />
            <input name="email" type="email" placeholder="Correo de contacto" className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none" />
            <input name="telefono" type="tel" placeholder="Telefono" className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none" />
            <textarea name="descripcion" rows={5} placeholder="Cuéntanos sobre tu proyecto" className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none" />
            <button className="w-full rounded-2xl bg-yellow-400 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white">
              Enviar solicitud
            </button>
          </form>
        </div>
      </div>
    </SectionPageShell>
  );
}
