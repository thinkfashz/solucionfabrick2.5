import Link from 'next/link';
import {
  isValidEmail,
  normalizeEmail,
  unsubscribeByEmail,
  verifyUnsubscribeToken,
} from '@/lib/newsletter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { title: 'Baja del boletín · Soluciones Fabrick', robots: { index: false } };

interface PageProps {
  searchParams: Promise<{ email?: string; token?: string }>;
}

export default async function NewsletterUnsubscribePage({ searchParams }: PageProps) {
  const { email: rawEmail, token } = await searchParams;
  const email = normalizeEmail(rawEmail ?? '');

  let status: 'ok' | 'invalid' | 'missing' = 'missing';
  if (email && token) {
    if (isValidEmail(email) && verifyUnsubscribeToken(email, token)) {
      const res = await unsubscribeByEmail(email);
      status = res.ok ? 'ok' : 'invalid';
    } else {
      status = 'invalid';
    }
  }

  return (
    <main
      style={{ backgroundColor: '#070707' }}
      className="min-h-screen w-full text-neutral-100 font-sans flex items-center justify-center px-6 py-16"
    >
      <div className="max-w-md w-full rounded-3xl border border-neutral-800 bg-neutral-950/60 backdrop-blur-md p-10 shadow-2xl">
        <p className="text-[11px] uppercase tracking-[0.32em] text-amber-400/80">Soluciones Fabrick</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {status === 'ok' && 'Listo. Te diste de baja.'}
          {status === 'invalid' && 'Enlace no válido'}
          {status === 'missing' && 'Confirma tu baja'}
        </h1>
        <div className="mt-5 text-sm leading-relaxed text-neutral-400 space-y-3">
          {status === 'ok' && (
            <>
              <p>
                <span className="text-neutral-200">{email}</span> dejó de recibir el boletín de Fabrick. No
                te enviaremos más boletines a esta dirección.
              </p>
              <p>Si fue un error, escríbenos y te volvemos a inscribir manualmente.</p>
            </>
          )}
          {status === 'invalid' && (
            <p>
              El enlace está incompleto o caducó. Vuelve al último correo que te enviamos y haz clic
              nuevamente en <em>“Darme de baja”</em>.
            </p>
          )}
          {status === 'missing' && (
            <p>
              Faltan parámetros para procesar la baja. Por favor abre el enlace exacto incluido al pie del
              correo del boletín.
            </p>
          )}
        </div>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 transition-colors"
        >
          Volver al sitio
        </Link>
      </div>
    </main>
  );
}
