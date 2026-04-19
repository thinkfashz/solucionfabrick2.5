'use client';

import { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import { Save, Eye, EyeOff, Check } from 'lucide-react';

/* ── Input reutilizable ── */
function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 transition-colors disabled:opacity-40 pr-12"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  if (!msg) return null;
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      }`}
    >
      {type === 'success' && <Check className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  );
}

/* ── Sección de card ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════ */
export default function ConfiguracionPage() {
  /* ── Estado del negocio ── */
  const [negocio, setNegocio] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    ciudad: '',
    whatsapp: '',
    emailContacto: '',
    sitioWeb: '',
  });

  const [savingNegocio, setSavingNegocio] = useState(false);
  const [negocioMsg, setNegocioMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  /* ── Estado de contraseña ── */
  type PwdStep = 'email' | 'code';
  const [pwdStep, setPwdStep] = useState<PwdStep>('email');
  const [pwdEmail, setPwdEmail] = useState('');
  const [pwdCode, setPwdCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadBusinessConfig() {
      const { data, error } = await insforge.database
        .from('business_config')
        .select('id, nombre, rut, direccion, ciudad, whatsapp, email_contacto, sitio_web')
        .eq('id', 'main')
        .limit(1);

      if (error || !Array.isArray(data) || data.length === 0) {
        return;
      }

      const config = data[0] as {
        nombre?: string;
        rut?: string;
        direccion?: string;
        ciudad?: string;
        whatsapp?: string;
        email_contacto?: string;
        sitio_web?: string;
      };

      setNegocio({
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

  /* ── Guardar datos del negocio (upsert en tabla business_config) ── */
  async function handleSaveNegocio(e: React.FormEvent) {
    e.preventDefault();
    setSavingNegocio(true);
    setNegocioMsg(null);

    const { error } = await insforge.database
      .from('business_config')
      .upsert([
        {
          id: 'main',
          nombre: negocio.nombre,
          rut: negocio.rut,
          direccion: negocio.direccion,
          ciudad: negocio.ciudad,
          whatsapp: negocio.whatsapp,
          email_contacto: negocio.emailContacto,
          sitio_web: negocio.sitioWeb,
          updated_at: new Date().toISOString(),
        },
      ]);

    setSavingNegocio(false);
    if (error) {
      setNegocioMsg({ text: `Error al guardar: ${error.message}`, type: 'error' });
    } else {
      setNegocioMsg({ text: 'Datos del negocio guardados correctamente.', type: 'success' });
    }
  }

  /* ── Enviar código de reseteo ── */
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (!pwdEmail) { setPasswordMsg({ text: 'Ingresa tu email de admin.', type: 'error' }); return; }
    setSavingPassword(true);
    await insforge.auth.sendResetPasswordEmail({
      email: pwdEmail,
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin/configuracion` : '/admin/configuracion',
    });
    setSavingPassword(false);
    setPasswordMsg({ text: 'Si el correo existe, recibirás un código en minutos.', type: 'success' });
    setPwdStep('code');
  }

  /* ── Cambiar contraseña del admin ── */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (!pwdCode || !newPassword) {
      setPasswordMsg({ text: 'Completa todos los campos.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Las contraseñas nuevas no coinciden.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    setSavingPassword(true);

    // Intercambiar código por token
    const { data: tokenData, error: tokenErr } = await insforge.auth.exchangeResetPasswordToken({
      email: pwdEmail,
      code: pwdCode,
    });

    if (tokenErr || !tokenData?.token) {
      setSavingPassword(false);
      setPasswordMsg({ text: tokenErr?.message ?? 'Código inválido o expirado.', type: 'error' });
      return;
    }

    const { error } = await insforge.auth.resetPassword({
      newPassword,
      otp: tokenData.token,
    });

    setSavingPassword(false);

    if (error) {
      setPasswordMsg({ text: `Error: ${error.message}`, type: 'error' });
    } else {
      setPasswordMsg({ text: 'Contraseña actualizada correctamente.', type: 'success' });
      setPwdStep('email');
      setPwdEmail('');
      setPwdCode('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-4xl font-bold text-white">Configuración</h1>
        <p className="text-zinc-400 text-sm mt-1">Gestiona los datos de tu negocio y credenciales de acceso.</p>
      </div>

      <div className="flex flex-col gap-8 max-w-2xl">
        {/* ── Datos del negocio ── */}
        <form onSubmit={handleSaveNegocio}>
          <Section title="Datos del negocio">
            <Field
              label="Nombre del negocio"
              value={negocio.nombre}
              onChange={(v) => setNegocio((p) => ({ ...p, nombre: v }))}
              placeholder="Fabrick Ingeniería Residencial"
            />
            <Field
              label="RUT empresa"
              value={negocio.rut}
              onChange={(v) => setNegocio((p) => ({ ...p, rut: v }))}
              placeholder="76.543.210-9"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label="Dirección"
                value={negocio.direccion}
                onChange={(v) => setNegocio((p) => ({ ...p, direccion: v }))}
                placeholder="Av. Principal 1234"
              />
              <Field
                label="Ciudad"
                value={negocio.ciudad}
                onChange={(v) => setNegocio((p) => ({ ...p, ciudad: v }))}
                placeholder="Santiago"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label="WhatsApp de contacto"
                type="tel"
                value={negocio.whatsapp}
                onChange={(v) => setNegocio((p) => ({ ...p, whatsapp: v }))}
                placeholder="+56 9 1234 5678"
                hint="Se usará para el botón de contacto directo."
              />
              <Field
                label="Email de contacto"
                type="email"
                value={negocio.emailContacto}
                onChange={(v) => setNegocio((p) => ({ ...p, emailContacto: v }))}
                placeholder="contacto@fabrick.cl"
                hint="Correo visible para clientes."
              />
            </div>
            <Field
              label="Sitio web"
              type="url"
              value={negocio.sitioWeb}
              onChange={(v) => setNegocio((p) => ({ ...p, sitioWeb: v }))}
              placeholder="https://fabrick.cl"
            />

            {negocioMsg && <Toast msg={negocioMsg.text} type={negocioMsg.type} />}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingNegocio}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black text-sm font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors disabled:opacity-60"
              >
                {savingNegocio ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </Section>
        </form>

        {/* ── Cambiar contraseña ── */}
        <form onSubmit={pwdStep === 'email' ? handleSendCode : handleChangePassword}>
          <Section title="Cambiar contraseña del admin">
            {pwdStep === 'email' ? (
              <>
                <Field
                  label="Email del admin"
                  type="email"
                  value={pwdEmail}
                  onChange={setPwdEmail}
                  placeholder="admin@fabrick.cl"
                  hint="Recibirás un código de verificación en este correo."
                />
                {passwordMsg && <Toast msg={passwordMsg.text} type={passwordMsg.type} />}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex items-center gap-2 px-6 py-3 rounded-full border border-yellow-400/30 text-yellow-400 text-sm font-bold uppercase tracking-widest hover:bg-yellow-400/10 transition-colors disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Enviando…
                      </>
                    ) : (
                      'Enviar código de verificación'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  Se envió un código a <span className="text-yellow-400">{pwdEmail}</span>.{' '}
                  <button type="button" onClick={() => { setPwdStep('email'); setPasswordMsg(null); }} className="underline hover:text-zinc-300 transition-colors">
                    Cambiar email
                  </button>
                </p>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Código de 6 dígitos</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pwdCode}
                    onChange={(e) => setPwdCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-bold tracking-[0.5em] text-center placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
                  />
                </div>
                <Field
                  label="Nueva contraseña"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
                />
                <Field
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repite la nueva contraseña"
                />
                {passwordMsg && <Toast msg={passwordMsg.text} type={passwordMsg.type} />}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex items-center gap-2 px-6 py-3 rounded-full border border-yellow-400/30 text-yellow-400 text-sm font-bold uppercase tracking-widest hover:bg-yellow-400/10 transition-colors disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Actualizando…
                      </>
                    ) : (
                      'Cambiar contraseña'
                    )}
                  </button>
                </div>
              </>
            )}
          </Section>
        </form>
      </div>
    </div>
  );
}
