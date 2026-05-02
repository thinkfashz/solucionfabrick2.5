import type { Metadata } from 'next';
import Link from 'next/link';
import { buildWhatsAppLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Sin conexión',
  description: 'Parece que estás sin conexión. Podemos seguir ayudándote por WhatsApp.',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-black text-white">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-400 text-black shadow-[0_12px_40px_rgba(250,204,21,0.35)]">
          <span className="text-3xl font-black">F</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-3">
          Sin conexión
        </p>
        <h1 className="text-3xl md:text-4xl font-black mb-4">
          No hay internet ahora mismo
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          Revisa tu red y vuelve a intentarlo. Mientras tanto, puedes escribirnos por WhatsApp y
          te respondemos apenas tengas señal.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="rounded-full bg-yellow-400 py-3 px-6 text-xs font-black uppercase tracking-[0.2em] text-black hover:bg-yellow-300 transition-colors"
          >
            Reintentar
          </Link>
          <a
            href={buildWhatsAppLink('Hola Soluciones Fabrick, estoy sin conexión y quiero retomar la conversación cuando me llegue señal.')}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/15 py-3 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:text-white hover:border-white/30 transition-colors"
          >
            Escribir por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
