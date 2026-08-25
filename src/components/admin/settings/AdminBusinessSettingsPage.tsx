'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, KeyRound, LockKeyhole, Save, ShieldCheck, UserCog } from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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

const inputClass = 'w-full rounded-xl border border-black/10 bg-white/75 px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none transition focus:border-[#c77a00]/40 focus:bg-white';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]';

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
      <span className={labelClass}>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
      {hint ? <span className="mt-1 block text-[11px] leading-5 text-[#8f887c]">{hint}</span> : null}
    </label>
  );
}

function Toast({ state }: { state: ToastState }) {
  if (!state) return null;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${state.type === 'success' ? 'border-emerald-600/15 bg-emerald-500/8 text-emerald-900' : 'border-rose-600/15 bg-rose-500/8 text-rose-900'}`}>
      {state.text}
    </div>
  );
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
        const response = await fetch('/api/admin/me', { cache: 'no-store' });
        const json = response.ok ? await response.json() as { authenticated?: boolean; email?: string } : null;
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
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' });
        const json = await response.json() as { settings?: Record<string, string>; error?: string };
        if (!response.ok) throw new Error(json.error || 'No se pudo cargar la configuración.');
        const settings = json.settings ?? {};
        setBusiness({
          nombre: settings.nombre_empresa ?? '',
          rut: settings.rut_empresa ?? '',
          direccion: settings.direccion ?? '',
          ciudad: settings.ciudad ?? '',
          whatsapp: settings.whatsapp ?? '',
          emailContacto: settings.email_contacto ?? '',
          sitioWeb: settings.sitio_web ?? '',
        });
      } catch (error) {
        setBusinessMsg({ text: error instanceof Error ? error.message : 'No se pudo cargar la configuración.', type: 'error' });
      }
    }
    void loadBusinessConfig();
  }, []);

  async function saveBusiness(event: React.FormEvent) {
    event.preventDefault();
    setSavingBusiness(true);
    setBusinessMsg(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            nombre_empresa: business.nombre,
            rut_empresa: business.rut,
            direccion: business.direccion,
            ciudad: business.ciudad,
            whatsapp: business.whatsapp,
            email_contacto: business.emailContacto,
            sitio_web: business.sitioWeb,
          },
        }),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar la configuración.');
      setBusinessMsg({ text: 'Datos del negocio guardados correctamente.', type: 'success' });
    } catch (error) {
      setBusinessMsg({ text: `Error al guardar: ${error instanceof Error ? error.message : 'Error inesperado'}`, type: 'error' });
    } finally {
      setSavingBusiness(false);
    }
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Empresa"
        title="Configuración del negocio"
        description="Administra los datos comerciales y el acceso del administrador. Las credenciales externas permanecen centralizadas en Integraciones."
        icon={Building2}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/integraciones" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-bold text-[#625b50] transition hover:bg-white"><KeyRound className="h-4 w-4" /> Integraciones</Link>
            <Link href="/admin/sesiones" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><ShieldCheck className="h-4 w-4" /> Sesiones</Link>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStat label="Sesión" value={loadingAdmin ? '…' : adminEmail ? 'Activa' : 'Sin leer'} icon={UserCog} accent={adminEmail ? 'emerald' : 'rose'} />
        <AdminStat label="Credenciales API" value="Centralizadas" icon={KeyRound} />
        <AdminStat label="Auditoría" value="Activa" icon={ShieldCheck} accent="cyan" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <form onSubmit={saveBusiness}>
          <AdminCard className="h-full p-0 sm:p-0">
            <div className="flex items-start gap-3 border-b border-black/8 p-4 sm:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Building2 className="h-4 w-4" /></span>
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Datos legales y contacto</p><h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Información del negocio</h2><p className="mt-1 text-xs leading-5 text-[#817a6f]">Se guarda en la configuración tenant-aware utilizada por el sitio.</p></div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Nombre del negocio" value={business.nombre} onChange={(value) => setBusiness((previous) => ({ ...previous, nombre: value }))} />
              <Field label="RUT empresa" value={business.rut} onChange={(value) => setBusiness((previous) => ({ ...previous, rut: value }))} />
              <Field label="Dirección" value={business.direccion} onChange={(value) => setBusiness((previous) => ({ ...previous, direccion: value }))} />
              <Field label="Ciudad" value={business.ciudad} onChange={(value) => setBusiness((previous) => ({ ...previous, ciudad: value }))} />
              <Field label="WhatsApp de contacto" type="tel" value={business.whatsapp} onChange={(value) => setBusiness((previous) => ({ ...previous, whatsapp: value }))} />
              <Field label="Email de contacto" type="email" value={business.emailContacto} onChange={(value) => setBusiness((previous) => ({ ...previous, emailContacto: value }))} />
              <div className="sm:col-span-2"><Field label="Sitio web" type="url" value={business.sitioWeb} onChange={(value) => setBusiness((previous) => ({ ...previous, sitioWeb: value }))} /></div>
              <div className="sm:col-span-2"><Toast state={businessMsg} /></div>
              <div className="sm:col-span-2 flex justify-end"><button type="submit" disabled={savingBusiness} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {savingBusiness ? 'Guardando…' : 'Guardar cambios'}</button></div>
            </div>
          </AdminCard>
        </form>

        <form onSubmit={pwdStep === 'email' ? sendCode : changePassword}>
          <AdminCard className="h-full p-0 sm:p-0">
            <div className="flex items-start gap-3 border-b border-black/8 p-4 sm:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><LockKeyhole className="h-4 w-4" /></span>
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Cuenta administrativa</p><h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Cambiar contraseña</h2><p className="mt-1 text-xs leading-5 text-[#817a6f]">Usa el flujo oficial de recuperación de InsForge Auth.</p></div>
            </div>
            <div className="grid gap-4 p-4 sm:p-5">
              {pwdStep === 'email' ? (
                <>
                  <Field label="Email del admin" type="email" value={pwdEmail} onChange={setPwdEmail} />
                  <Toast state={passwordMsg} />
                  <button type="submit" disabled={savingPassword} className="min-h-10 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">{savingPassword ? 'Enviando…' : 'Enviar código de recuperación'}</button>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-black/8 bg-white/45 p-3 text-xs leading-5 text-[#716b60]">Código enviado a <strong className="text-[#27241f]">{pwdEmail}</strong>. <button type="button" onClick={() => setPwdStep('email')} className="font-black text-[#8a620f] underline">Cambiar email</button></div>
                  <Field label="Código de 6 dígitos" value={pwdCode} onChange={(value) => setPwdCode(value.replace(/\D/g, '').slice(0, 6))} />
                  <Field label="Nueva contraseña" type="password" value={newPassword} onChange={setNewPassword} />
                  <Field label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} />
                  <Toast state={passwordMsg} />
                  <button type="submit" disabled={savingPassword} className="min-h-10 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">{savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}</button>
                </>
              )}
            </div>
          </AdminCard>
        </form>
      </div>

      <div className="flex items-start gap-3 border-y border-[#c77a00]/12 bg-[#ffb000]/6 px-1 py-4 text-sm leading-6 text-[#6d5a34]">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#a56600]" />
        <p>Las API keys ya no se administran aquí. Usa <Link href="/admin/integraciones" className="font-black underline">Centro de Integraciones</Link> para conservar una única fuente de credenciales.</p>
      </div>
    </AdminPage>
  );
}