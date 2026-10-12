'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const PROJECT_TYPES = [
  { label: 'Construcción', value: 'Construcción o ampliación' },
  { label: 'Remodelación', value: 'Remodelación integral' },
  { label: 'Instalación', value: 'Instalación o reparación' },
  { label: 'Producto + instalación', value: 'Producto con instalación' },
] as const;

type Tone = 'light' | 'dark';
type FieldName = 'nombre' | 'email' | 'telefono' | 'comuna' | 'preferencia' | 'mensaje';
type ValidatedField = 'nombre' | 'email' | 'telefono' | 'mensaje';
type Errors = Partial<Record<FieldName, string>>;

/** Un solo formulario para toda la web. `light` lo usa /tienda, `dark` la portada y /contacto. */
const TONE: Record<Tone, {
  root: string;
  field: string;
  label: string;
  error: string;
  errorBox: string;
  rule: string;
  pillIdle: string;
  pillActive: string;
  submit: string;
  okBody: string;
  okBadge: string;
  okAction: string;
  legal: string;
}> = {
  light: {
    root: 'text-[#08090A]',
    field: 'w-full border-b border-[#08090A]/18 bg-transparent px-0 py-3.5 text-sm font-semibold text-[#08090A] outline-none placeholder:text-[#7C6658]/55 focus:border-[#08090A]',
    label: 'text-[10px] font-black uppercase tracking-[.12em] text-[#5B483A]',
    error: 'text-[11px] font-bold text-red-800',
    errorBox: 'flex items-start gap-2 text-xs font-semibold text-red-800',
    rule: 'border-[#08090A]/15',
    pillIdle: 'border border-[#08090A]/18 text-[#5B483A] hover:border-[#08090A]/40',
    pillActive: 'bg-[#08090A] text-[#FFF9EE]',
    submit: 'bg-[#08090A] text-[#FFF9EE] hover:bg-[#FFE600] hover:text-[#08090A]',
    okBody: 'text-[#5f5853]',
    okBadge: 'text-emerald-800',
    okAction: 'bg-[#08090A] text-[#FFF9EE]',
    legal: 'text-[#6f5d50]',
  },
  dark: {
    root: 'text-[#F5F2EC]',
    field: 'w-full border-b border-white/15 bg-transparent px-0 py-3.5 text-sm font-semibold text-[#F5F2EC] outline-none placeholder:text-[#8A867E] focus:border-[#FFE600]',
    label: 'text-[10px] font-black uppercase tracking-[.12em] text-[#A8A49C]',
    error: 'text-[11px] font-bold text-[#FF9B8A]',
    errorBox: 'flex items-start gap-2 text-xs font-semibold text-[#FF9B8A]',
    rule: 'border-white/15',
    pillIdle: 'border border-white/15 text-[#A8A49C] hover:border-white/35',
    pillActive: 'bg-[#FFE600] text-[#08090A]',
    submit: 'bg-[#FFE600] text-[#08090A] hover:bg-[#FFF45C]',
    okBody: 'text-[#A8A49C]',
    okBadge: 'text-[#FFE600]',
    okAction: 'bg-[#FFE600] text-[#08090A]',
    legal: 'text-[#A8A49C]',
  },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function validate(values: Record<ValidatedField, string>): Errors {
  const errors: Errors = {};
  if (values.nombre.trim().length < 2) errors.nombre = 'Escribe tu nombre para saber cómo dirigirnos.';
  if (!values.email.trim()) errors.email = 'Necesitamos un correo para responderte.';
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Revisa el correo: falta el @ o el dominio.';
  if (values.telefono.trim() && values.telefono.replace(/\D/g, '').length < 8) errors.telefono = 'El teléfono debe tener al menos 8 dígitos.';
  if (values.mensaje.trim().length > 1500) errors.mensaje = 'Acorta el mensaje a 1500 caracteres.';
  return errors;
}

export default function ContactForm({ tone = 'light' }: { tone?: Tone }) {
  const t = TONE[tone];
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | 'ok' | 'error'>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [projectType, setProjectType] = useState<(typeof PROJECT_TYPES)[number]['value']>(PROJECT_TYPES[0].value);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const read = (key: FieldName) => String(formData.get(key) || '');
    const values: Record<ValidatedField, string> = {
      nombre: read('nombre'),
      email: read('email'),
      telefono: read('telefono'),
      mensaje: read('mensaje'),
    };
    const found = validate(values);
    setErrors(found);
    setStatus(null);
    setErrorMessage(null);

    const firstInvalid = (Object.keys(found) as ValidatedField[])[0];
    if (firstInvalid) {
      setStatus('error');
      setErrorMessage('Revisa los campos marcados para enviar la consulta.');
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    const comuna = String(formData.get('comuna') || '').trim();
    const preferencia = String(formData.get('preferencia') || 'WhatsApp').trim();
    const detalle = values.mensaje.trim();
    const mensaje = [
      comuna ? `Comuna / ubicación: ${comuna}` : '',
      preferencia ? `Canal preferido: ${preferencia}` : '',
      detalle ? `Detalle: ${detalle}` : '',
    ].filter(Boolean).join('\n');

    setSending(true);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: values.nombre.trim(),
          email: values.email.trim(),
          telefono: values.telefono.trim(),
          tipo_proyecto: projectType,
          mensaje,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'No pudimos enviar la consulta. Intenta nuevamente.');
      }
      setStatus('ok');
      form.reset();
      setErrors({});
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
      <div className={`border-t py-8 ${t.rule} ${t.root}`} role="status">
        <p className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] ${t.okBadge}`}>
          <CheckCircle2 size={14} aria-hidden /> Mensaje enviado
        </p>
        <h3 className="mt-3 text-3xl font-black tracking-[-.04em]">Ya sabemos qué necesitas.</h3>
        <p className={`mt-3 max-w-lg text-sm leading-7 ${t.okBody}`}>Te contactaremos para completar los datos que falten y conversar sobre el trabajo.</p>
        <button type="button" onClick={() => setStatus(null)} className={`mt-6 inline-flex min-h-12 items-center rounded-full px-6 text-xs font-black transition-[background-color,color] duration-200 ${t.okAction}`}>Enviar otra consulta</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${t.root}`} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="nombre" label="Nombre y apellido" required tone={t} error={errors.nombre}>
          <input name="nombre" autoComplete="name" required aria-invalid={Boolean(errors.nombre)} aria-describedby={errors.nombre ? 'err-nombre' : undefined} placeholder="Tu nombre" className={t.field} onChange={() => setErrors((current) => ({ ...current, nombre: undefined }))} />
        </Field>
        <Field name="email" label="Correo" required tone={t} error={errors.email}>
          <input name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'err-email' : undefined} placeholder="correo@ejemplo.cl" className={t.field} onChange={() => setErrors((current) => ({ ...current, email: undefined }))} />
        </Field>
        <Field name="telefono" label="WhatsApp o teléfono" tone={t} error={errors.telefono}>
          <input name="telefono" type="tel" autoComplete="tel" placeholder="+56 9..." aria-invalid={Boolean(errors.telefono)} aria-describedby={errors.telefono ? 'err-telefono' : undefined} className={t.field} onChange={() => setErrors((current) => ({ ...current, telefono: undefined }))} />
        </Field>
        <Field name="comuna" label="Comuna / ubicación" tone={t}>
          <input name="comuna" autoComplete="address-level2" placeholder="Ej. Linares" className={t.field} />
        </Field>
      </div>

      <fieldset>
        <legend className={`mb-3 text-xs font-black ${t.label}`}>¿Qué quieres resolver?</legend>
        <input type="hidden" name="tipo_proyecto" value={projectType} />
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map((type) => {
            const selected = projectType === type.value;
            return <button key={type.value} type="button" aria-pressed={selected} onClick={() => setProjectType(type.value)} className={`min-h-11 rounded-full px-4 py-2.5 text-xs font-black transition-[background-color,color,border-color] duration-200 ${selected ? t.pillActive : t.pillIdle}`}>{type.label}</button>;
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-[.72fr_1.28fr]">
        <Field name="preferencia" label="Prefiero que me contacten por" tone={t}>
          <select name="preferencia" className={t.field} defaultValue="WhatsApp"><option>WhatsApp</option><option>Correo</option><option>Llamada</option></select>
        </Field>
        <Field name="mensaje" label="Cuéntanos un poco más" tone={t} error={errors.mensaje}>
          <textarea name="mensaje" rows={4} placeholder="Medidas aproximadas, una breve descripción o cualquier detalle útil" aria-invalid={Boolean(errors.mensaje)} aria-describedby={errors.mensaje ? 'err-mensaje' : undefined} className={`${t.field} min-h-28 resize-y`} onChange={() => setErrors((current) => ({ ...current, mensaje: undefined }))} />
        </Field>
      </div>

      {status === 'error' && errorMessage ? (
        <p role="alert" className={t.errorBox}>
          <AlertCircle size={15} className="mt-px shrink-0" aria-hidden /> {errorMessage}
        </p>
      ) : null}

      <div className={`flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between ${t.rule}`}>
        <p className={`max-w-md text-[10px] leading-5 ${t.legal}`}>Tus datos se usan únicamente para responder tu consulta y mantener el contacto sobre este proyecto.</p>
        <button type="submit" disabled={sending} className={`inline-flex min-h-13 items-center justify-center rounded-full px-7 text-xs font-black transition-[background-color,color,opacity] duration-200 disabled:opacity-60 ${t.submit}`}>
          {sending ? 'Enviando…' : 'Enviar proyecto'}
        </button>
      </div>
    </form>
  );
}

function Field({ name, label, tone, required = false, error, children }: {
  name: FieldName;
  label: string;
  tone: (typeof TONE)[Tone];
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={tone.label}>{label}{required ? <span className="ml-1 opacity-70">*</span> : null}</span>
      {children}
      {error ? <span id={`err-${name}`} className={tone.error}>{error}</span> : null}
    </label>
  );
}
