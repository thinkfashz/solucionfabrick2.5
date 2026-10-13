'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { markRadierUnlocked, radierSummaryLine, type RadierQuote } from './useRadierQuote';
import { rememberRadierClient } from './RadierBudgetSheet';
import GoogleSignInButton, { type GoogleProfile } from './GoogleSignInButton';

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Puerta de la guía completa. Guarda el contacto en el CRM (`/api/leads`) y al
 * confirmar desbloquea el PDF y las etapas restantes para estas medidas.
 */
export default function RadierGuideGate({ result, onUnlock }: { result: RadierQuote; onUnlock: () => void }) {
  const [sending, setSending] = useState(false);
  const [googleSending, setGoogleSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fields, setFields] = useState({ nombre: '', email: '', telefono: '' });
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string; email?: string; telefono?: string }>({});

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submitLead(payload: { nombre: string; email: string; telefono: string; via: string }) {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: payload.nombre,
        email: payload.email,
        telefono: payload.telefono,
        tipo_proyecto: 'Radier — guía completa y presupuesto',
        mensaje: `${payload.via}\n${radierSummaryLine(result)}\nEspesores: losa ${result.thickness} cm · base ${result.baseDepth} cm · gravilla ${result.gravelDepth} cm.`,
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || 'No pudimos registrar tus datos. Intenta nuevamente.');
    }
  }

  async function useGoogleProfile(profile: GoogleProfile) {
    if (googleSending || sending) return;
    setGoogleSending(true);
    setError(null);
    try {
      await submitLead({ nombre: profile.nombre, email: profile.email, telefono: '', via: 'Registro con Google (email verificado).' });
      markRadierUnlocked(result);
      rememberRadierClient(profile.nombre);
      setFields((current) => ({ ...current, nombre: profile.nombre, email: profile.email }));
      setDone(true);
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos registrar tus datos.');
    } finally {
      setGoogleSending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const found: typeof fieldErrors = {};
    if (fields.nombre.trim().length < 2) found.nombre = 'Escribe tu nombre.';
    if (!EMAIL.test(fields.email.trim())) found.email = 'Revisa el correo.';
    if (fields.telefono.trim() && fields.telefono.replace(/\D/g, '').length < 8) found.telefono = 'Mínimo 8 dígitos.';
    setFieldErrors(found);
    setError(null);
    if (Object.keys(found).length) return;

    setSending(true);
    try {
      await submitLead({
        nombre: fields.nombre.trim(),
        email: fields.email.trim(),
        telefono: fields.telefono.trim(),
        via: 'Quiere la guía completa y el PDF.',
      });
      markRadierUnlocked(result);
      rememberRadierClient(fields.nombre.trim());
      setDone(true);
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos registrar tus datos.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[1.4rem] border border-[#F6C64A]/35 bg-[#F6C64A]/[.07] p-5" role="status">
        <p className="flex items-center gap-2 text-xs font-black text-[#F6C64A]"><CheckCircle2 size={15} aria-hidden /> Guía desbloqueada</p>
        <p className="mt-2 text-sm leading-6 text-white/70">Guardamos tus datos. Ya puedes descargar el PDF con tu presupuesto y ver las {10} etapas, y si prefieres te escribimos por WhatsApp.</p>
      </div>
    );
  }

  return (
    <section id="guia-completa" aria-labelledby="gate-title" className="scroll-mt-24 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0A0F13]">
      <div className="border-b border-white/10 bg-white/[.02] px-5 py-4 sm:px-6">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.22em] text-[#F6C64A]"><Lock size={12} aria-hidden /> Guía completa + PDF</p>
        <h2 id="gate-title" className="mt-1.5 text-xl font-black tracking-[-.03em] sm:text-2xl">Desbloquea tu presupuesto completo.</h2>
        <p className="mt-1.5 text-xs leading-5 text-white/50">Deja tus datos y te abrimos las 10 etapas, el PDF descargable y la atención por WhatsApp con tus medidas listas.</p>
      </div>
      <form onSubmit={submit} noValidate className="grid gap-4 px-5 py-5 sm:px-6">
        <div className="grid gap-3">
          <GoogleSignInButton onProfile={useGoogleProfile} onError={(message) => setError(message)} />
          {googleSending ? <p role="status" className="text-center text-[11px] font-bold text-[#F6C64A]">Registrando tu cuenta de Google…</p> : null}
          <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.14em] text-white/30" aria-hidden>
            <span className="h-px flex-1 bg-white/10" /> o completa tus datos <span className="h-px flex-1 bg-white/10" />
          </p>
        </div>
        <label className="grid gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">Nombre y apellido *</span>
          <input name="nombre" autoComplete="name" value={fields.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Tu nombre" aria-invalid={Boolean(fieldErrors.nombre)} className="w-full border-b border-white/15 bg-transparent px-0 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F6C64A]" />
          {fieldErrors.nombre ? <span className="text-[11px] font-bold text-[#FF9B8A]">{fieldErrors.nombre}</span> : null}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">Correo *</span>
            <input name="email" type="email" autoComplete="email" value={fields.email} onChange={(e) => set('email', e.target.value)} placeholder="correo@ejemplo.cl" aria-invalid={Boolean(fieldErrors.email)} className="w-full border-b border-white/15 bg-transparent px-0 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F6C64A]" />
            {fieldErrors.email ? <span className="text-[11px] font-bold text-[#FF9B8A]">{fieldErrors.email}</span> : null}
          </label>
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">WhatsApp</span>
            <input name="telefono" type="tel" autoComplete="tel" value={fields.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+56 9..." aria-invalid={Boolean(fieldErrors.telefono)} className="w-full border-b border-white/15 bg-transparent px-0 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#F6C64A]" />
            {fieldErrors.telefono ? <span className="text-[11px] font-bold text-[#FF9B8A]">{fieldErrors.telefono}</span> : null}
          </label>
        </div>
        {error ? <p role="alert" className="flex items-start gap-2 text-xs font-semibold text-[#FF9B8A]"><AlertCircle size={15} className="mt-px shrink-0" aria-hidden />{error}</p> : null}
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[10px] leading-5 text-white/40">Solo usamos tus datos para enviarte la guía y contactarte por este proyecto.</p>
          <button type="submit" disabled={sending} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#F6C64A] px-7 text-xs font-black text-black transition disabled:opacity-60">
            {sending ? 'Guardando…' : 'Desbloquear guía y PDF'}
          </button>
        </div>
      </form>
    </section>
  );
}
