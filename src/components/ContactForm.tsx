'use client';

import { useState } from 'react';

const PROJECT_TYPES = [
  { label: 'Construcción', value: 'Construcción o ampliación' },
  { label: 'Remodelación', value: 'Remodelación integral' },
  { label: 'Instalación', value: 'Instalación o reparación' },
  { label: 'Producto + instalación', value: 'Producto con instalación' },
] as const;

const fieldClass = 'w-full border-b border-[#08090A]/18 bg-transparent px-0 py-3.5 text-sm font-semibold text-[#08090A] outline-none transition placeholder:text-[#7C6658]/50 focus:border-[#08090A]';

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
    const nombre = String(formData.get('nombre') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const telefono = String(formData.get('telefono') || '').trim();
    const comuna = String(formData.get('comuna') || '').trim();
    const detalle = String(formData.get('mensaje') || '').trim();
    const preferencia = String(formData.get('preferencia') || 'WhatsApp').trim();
    const mensaje = [
      comuna ? `Comuna / ubicación: ${comuna}` : '',
      preferencia ? `Canal preferido: ${preferencia}` : '',
      detalle ? `Detalle: ${detalle}` : '',
    ].filter(Boolean).join('\n');

    if (!nombre || !email) {
      setStatus('error');
      setErrorMessage('Necesitamos tu nombre y correo para responder la consulta.');
      return;
    }

    setSending(true);
    setStatus(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, telefono, tipo_proyecto: projectType, mensaje }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'No pudimos enviar la consulta. Intenta nuevamente.');
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
      <div className="border-t border-[#08090A]/18 py-8 text-[#08090A]" role="status">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-800">Mensaje enviado</p>
        <h3 className="mt-3 text-3xl font-black tracking-[-.05em]">Ya sabemos qué necesitas.</h3>
        <p className="mt-3 max-w-lg text-sm leading-7 text-[#5f5853]">Te contactaremos para completar los datos que falten y conversar sobre el trabajo.</p>
        <button type="button" onClick={() => setStatus(null)} className="mt-6 rounded-full bg-[#08090A] px-6 py-3 text-xs font-black text-[#FFF9EE]">Enviar otra consulta</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre y apellido" required><input name="nombre" autoComplete="name" required placeholder="Tu nombre" className={fieldClass} /></Field>
        <Field label="Correo" required><input name="email" type="email" autoComplete="email" required placeholder="correo@ejemplo.cl" className={fieldClass} /></Field>
        <Field label="WhatsApp o teléfono"><input name="telefono" type="tel" autoComplete="tel" placeholder="+56 9..." className={fieldClass} /></Field>
        <Field label="Comuna / ubicación"><input name="comuna" autoComplete="address-level2" placeholder="Ej. Linares" className={fieldClass} /></Field>
      </div>

      <fieldset>
        <legend className="mb-3 text-xs font-black">¿Qué quieres resolver?</legend>
        <input type="hidden" name="tipo_proyecto" value={projectType} />
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map((type) => {
            const selected = projectType === type.value;
            return <button key={type.value} type="button" aria-pressed={selected} onClick={() => setProjectType(type.value)} className={`rounded-full px-4 py-2.5 text-xs font-black transition ${selected ? 'bg-[#08090A] text-[#FFF9EE]' : 'border border-[#08090A]/18 text-[#5B483A]'}`}>{type.label}</button>;
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-[.72fr_1.28fr]">
        <Field label="Prefiero que me contacten por">
          <select name="preferencia" className={`${fieldClass} appearance-none`} defaultValue="WhatsApp"><option>WhatsApp</option><option>Correo</option><option>Llamada</option></select>
        </Field>
        <Field label="Cuéntanos un poco más">
          <textarea name="mensaje" rows={4} placeholder="Medidas aproximadas, una breve descripción o cualquier detalle útil" className={`${fieldClass} min-h-28 resize-y`} />
        </Field>
      </div>

      {status === 'error' && errorMessage ? <p role="alert" className="border-l-2 border-red-700 pl-4 text-xs font-semibold text-red-800">{errorMessage}</p> : null}

      <div className="flex flex-col gap-3 border-t border-[#08090A]/18 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[10px] leading-5 text-[#6f5d50]">Tus datos se usan únicamente para responder tu consulta y mantener el contacto sobre este proyecto.</p>
        <button type="submit" disabled={sending} className="inline-flex min-h-13 items-center justify-center rounded-full bg-[#08090A] px-7 text-xs font-black text-[#FFF9EE] transition hover:bg-[#FFF9EE] hover:text-[#08090A] disabled:opacity-60">
          {sending ? 'Enviando…' : 'Enviar proyecto'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.12em] text-[#5B483A]">{label}{required ? <span className="ml-1 text-[#08090A]">*</span> : null}</span>{children}</label>;
}
