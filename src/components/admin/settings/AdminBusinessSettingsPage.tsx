'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, KeyRound, LockKeyhole, Save, ShieldCheck, UserCog } from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { AdminBaseButton, AdminBaseCard, AdminBaseGrid, AdminBasePage } from '@/components/admin/baseui-kit';

type ToastState = { text: string; type: 'success' | 'error' } | null;

type BusinessConfig = {
  nombre: string;
  rut: string;
  direccion: string;
  ciudad: string;
  whatsapp: string;
  emailContacto: string;
  sitioWeb: string;
};

function Field({ label, value, onChange, type = 'text', placeholder, hint }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-300/45"
      />
      {hint ? <span className="mt-1 block text-xs text-zinc-600">{hint}</span> : null}
    </label>
  );
}

function Toast({ state }: { state: ToastState }) {
  if (!state) return null;
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${state.type === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-red-400/30 bg-red-400/10 text-red-200'}`}>{state.text}</div>;
}

export default function AdminBusinessSettingsPage() {
  const [business, setBusiness] = useState<BusinessConfig>({ nombre: '', rut: '', direccion: '', ciudad: '', whatsapp: '', emailContacto: '', sitioWeb: '' });
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessMsg, setBusinessMsg] = useState<ToastState>(null);

  const [pwdStep, setPwdStep] = useState<'email' | 'code'>('email');
  const [pwdEmail, setPwdEmail] = useState('');
  const [pwdCode, setPwdCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<ToastState>(null);

  useEffect(() => {
    async function loadAdminSession() {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        const json = res.ok ? await res.json() as { authenticated?: boolean; email?: string } : null;
        if (json?.authenticated && json.email) {
          setAdminEmail(json.email);
          setPwdEmail(json.email);
        }
      } finally {
        setLoadingAdmin(false);
      }
    }
    void loadAdminSession();
  }, []);

  useEffect(() => {
    async function loadBusinessConfig() {
      const { data, error } = await insforge.database
        .from('business_config')
        .select('id, nombre, rut, direccion, ciudad, whatsapp, email_contacto, sitio_web')
        .eq('id', 'main')
        .limit(1);
      if (error || !Array.isArray(data) || data.length === 0) return;
      const config = data[0] as Record<string, string | undefined>;
      setBusiness({
        nombre: config.nombre ?? '',
        rut: config.rut ?? '',
        direccion: config.direccion ?? '',
        ciudad: config.ciudad ?? '',
        whatsapp: config.whatsapp ?? '',
        emailContacto: config.email_contacto ?? '',
        sitioWeb: config.sitio_web ?? '',
      });
    }
    void loadBusinessConfig();
  }, []);

  async function saveBusiness(event: React.FormEvent) {
    event.preventDefault();
    setSavingBusiness(true);
    setBusinessMsg(null);
    const { error } = await insforge.database.from('business_config').upsert([
      {
        id: 'main',
        nombre: business.nombre,
        rut: business.rut,
        direccion: business.direccion,
        ciudad: business.ciudad,
        whatsapp: business.whatsapp,
        email_contacto: business.emailContacto,
        sitio_web: business.sitioWeb,
        updated_at: new Date().toISOString(),
      },
    ], { onConflict: 'id' });
    setSavingBusiness(false);
    setBusinessMsg(error ? { text: `Error al guardar: ${error.message}`, type: 'error' } : { text: 'Datos del negocio guardados correctamente.', type: 'success' });
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMsg(null);
    if (!pwdEmail) return setPasswordMsg({ text: 'Ingresa tu email de admin.', type: 'error' });
    setSavingPassword(true);
    await insforge.auth.sendResetPasswordEmail({ email: pwdEmail, redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin/configuracion` : '/admin/configuracion' });
    setSavingPassword(false);
    setPasswordMsg({ text: 'Si el correo existe, recibirás un código en minutos.', type: 'success' });
    setPwdStep('code');
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMsg(null);
    if (!pwdCode || !newPassword) return setPasswordMsg({ text: 'Completa todos los campos.', type: 'error' });
    if (newPassword !== confirmPassword) return setPasswordMsg({ text: 'Las contraseñas nuevas no coinciden.', type: 'error' });
    if (newPassword.length < 8) return setPasswordMsg({ text: 'La nueva contraseña debe tener al menos 8 caracteres.', type: 'error' });

    setSavingPassword(true);
    const { data: tokenData, error: tokenErr } = await insforge.auth.exchangeResetPasswordToken({ email: pwdEmail, code: pwdCode });
    if (tokenErr || !tokenData?.token) {
      setSavingPassword(false);
      setPasswordMsg({ text: tokenErr?.message ?? 'Código inválido o expirado.', type: 'error' });
      return;
    }
    const { error } = await insforge.auth.resetPassword({ newPassword, otp: tokenData.token });
    setSavingPassword(false);
    if (error) setPasswordMsg({ text: `Error: ${error.message}`, type: 'error' });
    else {
      setPasswordMsg({ text: 'Contraseña actualizada correctamente.', type: 'success' });
      setPwdStep('email');
      setPwdCode('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  return (
    <AdminBasePage
      eyebrow="Sistema"
      title="Configuración del negocio"
      description="Datos reales del negocio y acceso del admin. Las credenciales API se gestionan únicamente desde el Centro de Integraciones oficial."
      actions={<><AdminBaseButton href="/admin/integraciones">Centro de integraciones</AdminBaseButton><AdminBaseButton href="/admin/sesiones" variant="ghost">Sesiones</AdminBaseButton></>}
    >
      <AdminBaseGrid cols="3">
        <AdminBaseCard title="Sesión actual" description={loadingAdmin ? 'Cargando sesión…' : adminEmail ?? 'No se pudo leer la sesión.'} icon={UserCog} tone="gold" badge="admin" />
        <AdminBaseCard title="Credenciales API" description="El guardado de claves vive en /admin/integraciones para evitar duplicados." icon={KeyRound} tone="emerald" badge="único" href="/admin/integraciones" />
        <AdminBaseCard title="Seguridad" description="Sesiones, IPs, dispositivos y auditoría del panel." icon={ShieldCheck} tone="blue" badge="audit" href="/admin/sesiones" />
      </AdminBaseGrid>

      <form onSubmit={saveBusiness} className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-300 text-black"><Building2 className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-white">Datos del negocio</h2><p className="mt-1 text-sm text-zinc-500">Se guardan en la tabla real business_config.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del negocio" value={business.nombre} onChange={(v) => setBusiness((p) => ({ ...p, nombre: v }))} />
          <Field label="RUT empresa" value={business.rut} onChange={(v) => setBusiness((p) => ({ ...p, rut: v }))} />
          <Field label="Dirección" value={business.direccion} onChange={(v) => setBusiness((p) => ({ ...p, direccion: v }))} />
          <Field label="Ciudad" value={business.ciudad} onChange={(v) => setBusiness((p) => ({ ...p, ciudad: v }))} />
          <Field label="WhatsApp de contacto" type="tel" value={business.whatsapp} onChange={(v) => setBusiness((p) => ({ ...p, whatsapp: v }))} />
          <Field label="Email de contacto" type="email" value={business.emailContacto} onChange={(v) => setBusiness((p) => ({ ...p, emailContacto: v }))} />
          <div className="sm:col-span-2"><Field label="Sitio web" type="url" value={business.sitioWeb} onChange={(v) => setBusiness((p) => ({ ...p, sitioWeb: v }))} /></div>
        </div>
        <div className="mt-5 space-y-3"><Toast state={businessMsg} /><div className="flex justify-end"><button type="submit" disabled={savingBusiness} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60"><Save className="h-4 w-4" /> {savingBusiness ? 'Guardando…' : 'Guardar cambios'}</button></div></div>
      </form>

      <form onSubmit={pwdStep === 'email' ? sendCode : changePassword} className="rounded-[2rem] border border-white/10 bg-black/35 p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-300/25 bg-yellow-300/10 text-yellow-200"><LockKeyhole className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-white">Cambiar contraseña del admin</h2><p className="mt-1 text-sm text-zinc-500">Usa el flujo real de recuperación de InsForge Auth.</p></div></div>
        {pwdStep === 'email' ? (
          <div className="grid gap-4"><Field label="Email del admin" type="email" value={pwdEmail} onChange={setPwdEmail} /><Toast state={passwordMsg} /><div className="flex justify-end"><button type="submit" disabled={savingPassword} className="rounded-2xl border border-yellow-300/30 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-yellow-200 disabled:opacity-60">{savingPassword ? 'Enviando…' : 'Enviar código'}</button></div></div>
        ) : (
          <div className="grid gap-4"><p className="text-sm text-zinc-500">Código enviado a <span className="text-yellow-200">{pwdEmail}</span>. <button type="button" onClick={() => setPwdStep('email')} className="underline">Cambiar email</button></p><Field label="Código de 6 dígitos" value={pwdCode} onChange={(v) => setPwdCode(v.replace(/\D/g, '').slice(0, 6))} /><Field label="Nueva contraseña" type="password" value={newPassword} onChange={setNewPassword} /><Field label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} /><Toast state={passwordMsg} /><div className="flex justify-end"><button type="submit" disabled={savingPassword} className="rounded-2xl bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60">{savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}</button></div></div>
        )}
      </form>

      <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/[0.04] p-4 text-sm text-yellow-100">Las API keys ya no se administran desde esta pantalla. Usa <Link href="/admin/integraciones" className="font-black underline">/admin/integraciones</Link> para mantener una sola fuente oficial de credenciales.</div>
    </AdminBasePage>
  );
}
