'use client';

import { useState } from 'react';
import AnimatedButton from '@/components/ui/animated-button';

const PROJECT_TYPES = [
  'Ampliación de vivienda',
  'Remodelación de interiores',
  'Instalación eléctrica',
  'Gasfitería',
  'Estructura Metalcon',
  'Proyecto llave en mano',
  'Otro',
];

export default function ContactForm() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | 'ok' | 'error'>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      nombre: String(formData.get('nombre') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      telefono: String(formData.get('telefono') || '').trim(),
      tipo_proyecto: String(formData.get('tipo_proyecto') || '').trim(),
      mensaje: String(formData.get('mensaje') || '').trim(),
    };

    if (!payload.nombre || !payload.email) {
      setDone('error');
      setErrorMsg('Nombre y correo son obligatorios.');
      return;
    }

    setSending(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Any 2xx (including 201 on write, 202 on graceful fallback) is success.
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || 'No pudimos enviar tu solicitud.');
      }
      setDone('ok');
      form.reset();
    } catch (err) {
      setDone('error');
      setErrorMsg((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (done === 'ok') {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-400">
          Solicitud enviada
        </p>
        <h3 className="mt-3 text-lg font-black uppercase text-white">
          Recibimos tu solicitud
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
          Te contactamos en menos de 24 horas.
        </p>
        <AnimatedButton
          type="button"
          onClick={() => setDone(null)}
          className="mt-6 rounded-full border border-emerald-400/30 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300 hover:bg-emerald-500/10"
        >
          Enviar otra solicitud
        </AnimatedButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <input
        name="nombre"
        required
        placeholder="Nombre completo"
        className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Correo de contacto"
        className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
      />
      <input
        name="telefono"
        type="tel"
        placeholder="Teléfono (WhatsApp de preferencia)"
        className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
      />
      <div className="relative">
        <label htmlFor="tipo_proyecto" className="sr-only">
          ¿Qué necesitas?
        </label>
        <select
          id="tipo_proyecto"
          name="tipo_proyecto"
          defaultValue=""
          className="w-full appearance-none rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none"
        >
          <option value="" disabled className="text-zinc-500">
            ¿Qué necesitas?
          </option>
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t} className="bg-zinc-950 text-white">
              {t}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-yellow-400"
        >
          ▾
        </span>
      </div>
      <textarea
        name="mensaje"
        rows={5}
        placeholder="Cuéntanos sobre tu proyecto"
        className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
      />
      {done === 'error' && errorMsg ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {errorMsg}
        </p>
      ) : null}
      <AnimatedButton
        type="submit"
        disabled={sending}
        className="w-full rounded-2xl bg-yellow-400 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white disabled:opacity-60"
      >
        {sending ? 'Enviando…' : 'Enviar solicitud'}
      </AnimatedButton>
      <p className="text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        ✓ Evaluación gratuita · ✓ Respuesta en 24h · ✓ Sin compromiso
      </p>
    </form>
  );
}
