'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import ContactMap from '@/components/ContactMap';
import SectionPageShell from '@/components/SectionPageShell';
import { buildWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';

const CONTACT_INFO = [
  {
    icon: Phone,
    label: 'WhatsApp directo',
    value: WHATSAPP_DISPLAY,
    sub: 'Coordinamos tu visita en terreno por aquí',
  },
  {
    icon: Mail,
    label: 'Correo electrónico',
    value: 'contacto@fabrick.cl',
    sub: 'Respondemos en menos de 24 horas',
  },
  {
    icon: MapPin,
    label: 'Visitas en terreno',
    value: 'Linares, Región del Maule',
    sub: 'Vamos a tu propiedad sin costo y armamos el presupuesto in-situ',
  },
  {
    icon: Clock,
    label: 'Horario de atención',
    value: 'Lun – Vie: 9:00 – 18:00',
    sub: 'Sáb: 10:00 – 14:00 · Dom: cerrado',
  },
];

const LEGACY_ERRORS: Record<string, string> = {
  campaign: 'El formulario está pausado temporalmente. Escríbenos por WhatsApp y te respondemos igual.',
  'rate-limit': 'Demasiadas solicitudes seguidas. Espera unos minutos o escríbenos por WhatsApp.',
  payload: 'No pudimos leer el formulario. Recarga la página e inténtalo de nuevo.',
  captcha: 'No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.',
};

function ContactoBody() {
  const searchParams = useSearchParams();
  const legacySent = searchParams.get('enviado') === '1';
  const legacyErrorKey = searchParams.get('error');
  const legacyError = legacyErrorKey === '1'
    ? 'No pudimos enviar tu consulta. Inténtalo de nuevo o escríbenos por WhatsApp.'
    : legacyErrorKey ? LEGACY_ERRORS[legacyErrorKey] : undefined;

  return (
    <SectionPageShell
      eyebrow="Contacto"
      title="Conversemos tu proyecto"
      description="Escríbenos y revisa nuestra ubicación en el mapa. Respondemos en menos de 24 horas hábiles desde el primer mensaje."
      primaryAction={{ href: '/servicios', label: 'Ver servicios' }}
      secondaryAction={{ href: '/presupuesto', label: 'Armar un presupuesto' }}
    >
      <div className="mb-8 flex items-center justify-center gap-3 rounded-2xl border border-[#FFE600]/20 bg-[#FFE600]/5 px-6 py-4">
        <Clock className="h-4 w-4 shrink-0 text-[#FFE600]" />
        <p className="text-sm font-bold text-[#FFE600]">
          Respondemos en menos de 24 horas hábiles · Evaluación inicial sin costo
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CONTACT_INFO.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-[1.5rem] border border-white/5 bg-zinc-950/85 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#FFE600]/20 bg-black">
              <Icon className="h-4 w-4 text-[#FFE600]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-zinc-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ContactMap className="min-h-[26rem]" />
          <a
            href={buildWhatsAppLink('Hola Soluciones Fabrick, quiero agendar una visita en Linares (Región del Maule) para que pasen a evaluar mi proyecto.')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#FFE600] px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-[background-color] duration-200 hover:bg-[#FFF45C]"
          >
            <MessageCircle className="h-5 w-5" />
            Agendar visita por WhatsApp
          </a>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-8 md:p-10">
          <h2 className="text-xl font-bold uppercase tracking-[0.18em] text-white">Solicita una evaluación</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Cuanto más detalle compartas, mejor podremos orientarte desde el primer contacto.
          </p>

          {legacySent ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#FFE600]/30 bg-[#FFE600]/10 px-5 py-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FFE600]" />
              <p className="text-sm font-semibold text-[#FFE600]">Mensaje enviado. Nos pondremos en contacto en menos de 24 horas.</p>
            </div>
          ) : null}

          {legacyError ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/[.04] px-5 py-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#FFE600]" />
              <p className="text-sm font-semibold text-zinc-200">{legacyError}</p>
            </div>
          ) : null}

          <div className="mt-8">
            <ContactForm tone="dark" />
          </div>
        </div>
      </div>
    </SectionPageShell>
  );
}

export default function ContactoClient() {
  return (
    <Suspense fallback={null}>
      <ContactoBody />
    </Suspense>
  );
}
