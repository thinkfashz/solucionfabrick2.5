'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';
import AnimatedButton from '@/components/ui/animated-button';

const PROJECT_TYPES = [
  { label: 'Construir', value: 'Kit, cabaña o casa' },
  { label: 'Remodelar', value: 'Ampliación o remodelación' },
  { label: 'Instalar', value: 'Instalación o equipamiento' },
  { label: 'Otro', value: 'Otro proyecto' },
] as const;

const fieldClass = 'w-full rounded-xl border border-white/12 bg-white/[.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-300/60 focus:bg-white/[.055] focus:ring-2 focus:ring-yellow-300/10';

export default function ContactForm() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<null | 'ok' | 'error'>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<(typeof PROJECT_TYPES)[number]['value']>(PROJECT_TYPES[0].value);

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
      setErrorMsg('Completa tu nombre y correo para poder responderte.');
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
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || 'No pudimos enviar tu solicitud.');
      }
      setDone('ok');
      form.reset();
      setProjectType(PROJECT_TYPES[0].value);
    } catch (err) {
      setDone('error');
      setErrorMsg((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (done === 'ok') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[.07] p-7 text-center"
        role="status"
      >
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-300 text-black">
          <CheckCircle2 className="h-7 w-7" />
        </motion.span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">Solicitud recibida</p>
        <h3 className="mt-2 text-2xl font-black text-white">Ya podemos revisar tu proyecto.</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">Te contactaremos para confirmar ubicación, alcance y próximos pasos.</p>
        <AnimatedButton type="button" onClick={() => setDone(null)} className="mt-6 rounded-full border border-emerald-300/30 px-6 py-3 text-xs font-black text-emerald-100 hover:bg-emerald-300/10">Enviar otra solicitud</AnimatedButton>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required>
          <input name="nombre" autoComplete="name" required placeholder="Tu nombre completo" className={fieldClass} />
        </Field>
        <Field label="Correo" required>
          <input name="email" type="email" autoComplete="email" required placeholder="correo@ejemplo.cl" className={fieldClass} />
        </Field>
      </div>

      <Field label="WhatsApp o teléfono">
        <input name="telefono" type="tel" autoComplete="tel" placeholder="+56 9..." className={fieldClass} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-xs font-black text-white">¿Qué necesitas?</legend>
        <input type="hidden" name="tipo_proyecto" value={projectType} />
        <div className="grid grid-cols-2 gap-2">
          {PROJECT_TYPES.map((type) => {
            const selected = projectType === type.value;
            return (
              <button key={type.value} type="button" aria-pressed={selected} onClick={() => setProjectType(type.value)} className={`min-h-11 rounded-xl border px-3 text-left text-xs font-black transition ${selected ? 'border-yellow-300 bg-yellow-300 text-black shadow-[0_10px_28px_rgba(250,204,21,.12)]' : 'border-white/10 bg-white/[.035] text-zinc-300 hover:border-white/25'}`}>{type.label}</button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Cuéntanos lo esencial">
        <textarea name="mensaje" rows={4} placeholder="Comuna, superficie aproximada y qué resultado buscas" className={`${fieldClass} resize-y`} />
      </Field>

      {done === 'error' && errorMsg ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-200">{errorMsg}</p> : null}

      <AnimatedButton type="submit" disabled={sending} className="w-full rounded-xl bg-yellow-300 px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60">{sending ? 'Enviando…' : 'Solicitar orientación'}</AnimatedButton>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-zinc-400">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-yellow-300" /> Respuesta en 24 h hábiles</span>
        <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-yellow-300" /> Datos usados solo para responderte</span>
      </div>
    </form>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-xs font-black text-white">{label}{required ? <span className="ml-1 text-yellow-300">*</span> : null}</span>{children}</label>;
}
