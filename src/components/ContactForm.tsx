'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';

const PROJECT_TYPES = [
  { label: 'Construcción', value: 'Construcción o ampliación' },
  { label: 'Remodelación', value: 'Remodelación integral' },
  { label: 'Instalación', value: 'Instalación o reparación' },
  { label: 'Producto', value: 'Producto con instalación' },
] as const;

const fieldClass = 'w-full rounded-xl border border-white/12 bg-white/[.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-300/60 focus:bg-white/[.055] focus:ring-2 focus:ring-yellow-300/10';

export default function ContactForm() {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | 'ok' | 'error'>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setStatus('error');
      setErrorMessage('Necesitamos tu nombre y correo para responder la solicitud.');
      return;
    }

    setSending(true);
    setStatus(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'No pudimos enviar la solicitud. Intenta nuevamente.');
      }

      setStatus('ok');
      form.reset();
      setProjectType(PROJECT_TYPES[0].value);
    } catch (error) {
      setStatus('error');
      setErrorMessage((error as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (status === 'ok') {
    return (
      <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[.07] p-7 text-center" role="status">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-300 text-black"><CheckCircle2 className="h-7 w-7" /></span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.26em] text-emerald-200">Solicitud enviada</p>
        <h3 className="mt-2 text-2xl font-black text-white">Ya tenemos el punto de partida.</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">Revisaremos el tipo de proyecto y te contactaremos para confirmar ubicación, medidas y próximos pasos.</p>
        <button type="button" onClick={() => setStatus(null)} className="mt-6 rounded-full border border-emerald-300/30 px-6 py-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-300/10">Enviar otra solicitud</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required>
          <input name="nombre" autoComplete="name" required placeholder="Nombre y apellido" className={fieldClass} />
        </Field>
        <Field label="Correo" required>
          <input name="email" type="email" autoComplete="email" required placeholder="correo@ejemplo.cl" className={fieldClass} />
        </Field>
      </div>

      <Field label="WhatsApp o teléfono">
        <input name="telefono" type="tel" autoComplete="tel" placeholder="+56 9..." className={fieldClass} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-xs font-black text-white">Tipo de proyecto</legend>
        <input type="hidden" name="tipo_proyecto" value={projectType} />
        <div className="grid grid-cols-2 gap-2">
          {PROJECT_TYPES.map((type) => {
            const selected = projectType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setProjectType(type.value)}
                className={`min-h-11 rounded-xl border px-3 text-left text-xs font-black transition ${selected ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[.035] text-zinc-300 hover:border-white/25'}`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Datos para evaluar">
        <textarea
          name="mensaje"
          rows={4}
          placeholder="Comuna, superficie aproximada, estado actual y resultado que buscas"
          className={`${fieldClass} resize-y`}
        />
      </Field>

      {status === 'error' && errorMessage ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-200">{errorMessage}</p> : null}

      <button type="submit" disabled={sending} className="fabrick-gradient-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-[11px] font-black uppercase tracking-[.16em] text-black disabled:opacity-60">
        {sending ? 'Enviando solicitud…' : 'Solicitar evaluación'}
        {!sending ? <ArrowRight className="h-4 w-4" /> : null}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-yellow-300" /> Respuesta en horario hábil</span>
        <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-yellow-300" /> Tus datos se usan solo para responder</span>
      </div>
    </form>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-white">{label}{required ? <span className="ml-1 text-yellow-300">*</span> : null}</span>
      {children}
    </label>
  );
}
