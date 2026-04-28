'use client';

/**
 * /cotizaciones/enviar — Formulario de envío de la cotización armada.
 *
 * Persiste la cotización vía POST /api/cotizaciones (que delega en
 * /api/quotes para reutilizar la tabla `quotes` existente). Tras éxito,
 * limpia el carrito y muestra el id de seguimiento.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuoteCart } from '@/context/QuoteCartContext';

export default function EnviarClient() {
  const router = useRouter();
  const { items, clear, totalItems } = useQuoteCart();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('Maule');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  if (items.length === 0 && !resultId) {
    return (
      <main className="min-h-screen bg-black text-white pt-24 pb-32 px-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-zinc-400 mb-6">No tienes ítems en tu cotización.</p>
          <Link
            href="/servicios"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
          >
            Explorar servicios
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Por favor completa nombre y email.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            region: region.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          items,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ??
            `No pudimos registrar tu cotización (HTTP ${res.status}).`,
        );
      }
      setResultId((data as { quote?: { id: string } }).quote?.id ?? 'pending');
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSending(false);
    }
  };

  if (resultId) {
    return (
      <main className="min-h-screen bg-black text-white pt-24 pb-32 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-400 mb-3">
            Solicitud enviada
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Recibimos tu cotización
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-md mx-auto mb-8">
            Te responderemos en menos de 24 horas con tu propuesta personalizada al
            email <span className="text-yellow-400 font-semibold">{email}</span>.
          </p>
          {resultId !== 'pending' && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-8">
              Folio de seguimiento:{' '}
              <span className="text-yellow-400">{resultId.slice(0, 8)}</span>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors"
            >
              Volver al inicio
            </button>
            <Link
              href="/cotizaciones"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-yellow-400/40 text-yellow-400 font-black uppercase tracking-widest text-xs hover:bg-yellow-400/10 transition-colors"
            >
              Nueva cotización
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pt-24 pb-32 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </button>

        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 mb-2">
          Solicitar Cotización
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
          Recibe tu propuesta personalizada
        </h1>
        <p className="text-zinc-400 text-sm md:text-base mb-8">
          {totalItems} ítem{totalItems === 1 ? '' : 's'} listos para cotizar. Te
          enviaremos la propuesta detallada a tu email en menos de 24 horas.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[2rem] border border-white/8 bg-zinc-950/85 p-6 md:p-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-black border border-white/10 focus:border-yellow-400/50 focus:outline-none p-3 text-sm text-white placeholder-zinc-600"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-black border border-white/10 focus:border-yellow-400/50 focus:outline-none p-3 text-sm text-white placeholder-zinc-600"
                placeholder="tu@email.cl"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl bg-black border border-white/10 focus:border-yellow-400/50 focus:outline-none p-3 text-sm text-white placeholder-zinc-600"
                placeholder="+56 9 ..."
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
                Región / comuna
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl bg-black border border-white/10 focus:border-yellow-400/50 focus:outline-none p-3 text-sm text-white placeholder-zinc-600"
                placeholder="Maule, Linares…"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 block">
              Notas adicionales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-black border border-white/10 focus:border-yellow-400/50 focus:outline-none p-3 text-sm text-white placeholder-zinc-600 resize-none"
              placeholder="Plazo deseado, preferencias, dudas..."
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-yellow-400 text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(250,204,21,0.2)]"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Enviar para cotización'}
          </button>
          <p className="text-[10px] text-zinc-500 text-center mt-2">
            Al enviar aceptas que el equipo de Soluciones Fabrick se contacte contigo.
          </p>
        </form>
      </div>
    </main>
  );
}
