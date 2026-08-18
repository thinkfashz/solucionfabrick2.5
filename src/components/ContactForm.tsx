'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';

const PROJECT_TYPES = [
  { label: 'Construcción', value: 'Construcción o ampliación' },
  { label: 'Remodelación', value: 'Remodelación integral' },
  { label: 'Instalación', value: 'Instalación o reparación' },
  { label: 'Producto', value: 'Producto con instalación' },
] as const;

const fieldClass = 'w-full rounded-2xl border border-[#171820]/12 bg-white/75 px-4 py-4 text-sm font-semibold text-[#171820] shadow-[inset_0_1px_0_rgba(255,255,255,.75)] outline-none transition placeholder:text-[#8e8279] focus:border-[#D8B23D]/70 focus:bg-white focus:ring-4 focus:ring-[#D8B23D]/15';

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
      <div className="rounded-[1.75rem] bg-[#edf4ee] p-7 text-center text-[#171820] ring-1 ring-emerald-700/15" role="status">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#171820] text-[#f8f0e9]"><CheckCircle2 className="h-7 w-7" /></span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.26em] text-emerald-800">Solicitud enviada</p>
        <h3 className="mt-2 text-2xl font-black">Ya tenemos el punto de partida.</h3>
        <p className="mt-2 text-sm leading-6 text-[#5f5853]">Revisaremos tu proyecto y te contactaremos para confirmar ubicación, medidas y próximos pasos.</p>
        <button type="button" onClick={() => setStatus(null)} className="mt-6 rounded-full bg-[#b6906c] px-6 py-3 text-xs font-black text-[#171820] transition hover:bg-[#ccb196]">Enviar otra solicitud</button>
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
        <legend className="mb-2 text-xs font-black text-[#171820]">Tipo de proyecto</legend>
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
                className={`min-h-12 rounded-2xl px-3 text-left text-xs font-black transition ring-1 ${selected ? 'bg-[#171820] text-[#f8f0e9] ring-[#171820]' : 'bg-white/60 text-[#615852] ring-[#171820]/10 hover:bg-white hover:text-[#171820]'}`}
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
          className={`${fieldClass} min-h-32 resize-y`}
        />
      </Field>

      {status === 'error' && errorMessage ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 ring-1 ring-red-700/15">{errorMessage}</p> : null}

      <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D8B23D] px-5 py-4 text-[11px] font-black uppercase tracking-[.16em] text-[#171820] shadow-[0_16px_40px_rgba(216,178,61,.22)] transition hover:bg-[#F4D98B] disabled:opacity-60">
        {sending ? 'Enviando solicitud…' : 'Solicitar evaluación'}
        {!sending ? <ArrowRight className="h-4 w-4" /> : null}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-[#6f6660]">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#9a6f4f]" /> Respuesta en horario hábil</span>
        <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-[#9a6f4f]" /> Tus datos se usan solo para responder</span>
      </div>
    </form>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-[#171820]">{label}{required ? <span className="ml-1 text-[#9a6f4f]">*</span> : null}</span>
      {children}
    </label>
  );
}
