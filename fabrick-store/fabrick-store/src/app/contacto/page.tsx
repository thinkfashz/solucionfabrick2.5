'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Phone, Mail, Clock, MessageCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ContactMap from '@/components/ContactMap';
import SectionPageShell from '@/components/SectionPageShell';

const CONTACT_INFO = [
  {
    icon: Phone,
    label: 'Teléfono',
    value: '+56 9 1234 5678',
    sub: 'Lunes a viernes, 9:00 – 18:00',
  },
  {
    icon: Mail,
    label: 'Correo electrónico',
    value: 'contacto@fabrick.cl',
    sub: 'Respondemos en menos de 24 horas',
  },
  {
    icon: MapPin,
    label: 'Oficina central',
    value: 'Av. Providencia 1234, Of. 502',
    sub: 'Providencia, Santiago, Chile',
  },
  {
    icon: Clock,
    label: 'Horario de atención',
    value: 'Lun – Vie: 9:00 – 18:00',
    sub: 'Sáb: 10:00 – 14:00 · Dom: cerrado',
  },
];

const PROJECT_TYPES = [
  'Selecciona el tipo de proyecto',
  'Remodelación integral',
  'Ampliación residencial',
  'Construcción nueva',
  'Gasfitería y eléctrico',
  'Seguridad y domótica',
  'Pintura y terminaciones',
  'Paisajismo exterior',
  'Inspección técnica',
  'Diseño de interiores',
  'Otro',
];

function ContactoPageInner() {
  const searchParams = useSearchParams();
  const alreadySent = searchParams.get('enviado') === '1';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    alreadySent ? 'success' : 'idle',
  );
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    try {
      const res = await fetch('/api/presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus('success');
        formRef.current?.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <SectionPageShell
      eyebrow="Contacto"
      title="Conversemos tu proyecto"
      description="Escríbenos y revisa nuestra ubicación en el mapa. Respondemos en menos de 24 horas hábiles desde el primer mensaje."
      primaryAction={{ href: '/soluciones', label: 'Ver catálogo' }}
      secondaryAction={{ href: '/servicios', label: 'Ver servicios' }}
    >
      {/* Response time banner */}
      <div className="mb-8 flex items-center justify-center gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-6 py-4">
        <Clock className="h-4 w-4 shrink-0 text-yellow-400" />
        <p className="text-sm font-bold text-yellow-400">
          Respondemos en menos de 24 horas hábiles · Evaluación inicial sin costo
        </p>
      </div>

      {/* Contact info cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CONTACT_INFO.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-[1.5rem] border border-white/5 bg-zinc-950/85 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-black">
              <Icon className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-zinc-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Map + Form */}
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ContactMap className="min-h-[26rem]" />
          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/56912345678?text=Hola%20Fabrick%2C%20quiero%20información%20sobre%20un%20proyecto"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-2xl bg-green-500 px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-green-400"
          >
            <MessageCircle className="h-5 w-5" />
            Escribir por WhatsApp
          </a>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 md:p-10">
          <h2 className="text-xl font-bold uppercase tracking-[0.18em] text-white">Solicita una evaluación</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Cuanto más detalle compartas, mejor podremos orientarte desde el primer contacto.
          </p>

          {status === 'success' && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              <p className="text-sm font-semibold text-green-400">
                ¡Mensaje enviado! Nos pondremos en contacto en menos de 24 horas.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm font-semibold text-red-400">
                Ocurrió un error al enviar. Inténtalo nuevamente o escríbenos por WhatsApp.
              </p>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="nombre"
                placeholder="Nombre completo"
                required
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
              />
              <input
                name="telefono"
                type="tel"
                placeholder="Teléfono"
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
              />
            </div>
            <input
              name="email"
              type="email"
              placeholder="Correo de contacto"
              required
              className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
            />
            <select
              name="tipo_proyecto"
              className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-zinc-400 focus:border-yellow-400 focus:outline-none"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t === PROJECT_TYPES[0] ? '' : t}>
                  {t}
                </option>
              ))}
            </select>
            <textarea
              name="descripcion"
              rows={5}
              placeholder="Cuéntanos sobre tu proyecto: qué necesitas, superficie estimada, plazo deseado..."
              className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white disabled:opacity-60"
            >
              {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'loading' ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </form>
          <p className="mt-4 text-center text-[10px] text-zinc-600">
            Al enviar aceptas que Fabrick te contacte para coordinar la evaluación.
          </p>
        </div>
      </div>
    </SectionPageShell>
  );
}

export default function ContactoPage() {
  return (
    <Suspense fallback={null}>
      <ContactoPageInner />
    </Suspense>
  );
}
