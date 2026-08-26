'use client';

import { useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { useTenantBranding } from '@/hooks/useTenantBranding';

type Screen = 'login' | 'register' | 'verify' | 'reset-send' | 'reset-code' | 'reset-password';

type FieldProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  icon: ComponentType<{ className?: string }>;
  trailing?: ReactNode;
};

const steps: Record<Exclude<Screen, 'login' | 'register'>, { current: number; total: number; label: string }> = {
  verify: { current: 2, total: 2, label: 'Verifica tu correo' },
  'reset-send': { current: 1, total: 3, label: 'Recuperar acceso' },
  'reset-code': { current: 2, total: 3, label: 'Ingresar código' },
  'reset-password': { current: 3, total: 3, label: 'Nueva contraseña' },
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, icon: Icon, trailing }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#665d55]">{label}</span>
      <span className="flex min-h-14 items-center gap-3 rounded-[1.15rem] border border-black/10 bg-white px-4 shadow-[0_10px_30px_rgba(25,20,14,.035)] transition focus-within:border-[var(--auth-accent)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--auth-accent)_12%,transparent)]">
        <Icon className="h-4 w-4 shrink-0 text-[var(--auth-accent)]" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#11100e] outline-none placeholder:text-[#aaa29a]"
        />
        {trailing}
      </span>
    </label>
  );
}

function Notice({ type, text }: { type: 'error' | 'success'; text: string }) {
  if (!text) return null;
  const success = type === 'success';
  return (
    <div className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-xs font-semibold leading-5 ${success ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-700/15' : 'bg-red-50 text-red-800 ring-1 ring-red-700/15'}`}>
      {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      {text}
    </div>
  );
}

function PrimaryButton({ loading, children, onClick }: { loading: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.15rem] bg-[var(--auth-accent)] px-5 text-xs font-black uppercase tracking-[.16em] text-[#090909] shadow-[0_18px_42px_color-mix(in_srgb,var(--auth-accent)_24%,transparent)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-55"
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : null}
      {loading ? 'Procesando…' : children}
      {!loading ? <ArrowRight className="h-4 w-4" /> : null}
    </button>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const brandName = branding.name || 'Soluciones Fabrick';
  const accent = branding.primaryColor || '#F5871F';
  const contactEmail = branding.contactEmail || branding.ownerEmail || 'contacto@solucionesfabrick.com';
  const brandStyle = useMemo(() => ({ '--auth-accent': accent } as CSSProperties), [accent]);

  const clearMessages = () => { setError(''); setSuccess(''); };
  const changeScreen = (next: Screen) => { clearMessages(); setScreen(next); };

  async function handleRegister() {
    clearMessages();
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Ingresa tu nombre, un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { data, error: authError } = await insforge.auth.signUp({ email, password, name, redirectTo: `${window.location.origin}/auth` });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    void fetch('/api/auth/welcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name }) }).catch(() => undefined);
    if (data?.requireEmailVerification) {
      setSuccess('Te enviamos un código de 6 dígitos a tu correo.');
      setScreen('verify');
    } else {
      router.push('/mi-cuenta');
    }
  }

  async function handleLogin() {
    clearMessages();
    if (!email.trim() || !password) { setError('Ingresa tu correo y contraseña.'); return; }
    setLoading(true);
    const { data, error: authError } = await insforge.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data) router.push('/mi-cuenta');
  }

  async function handleVerify() {
    clearMessages();
    if (otp.trim().length < 4) { setError('Ingresa el código recibido por correo.'); return; }
    setLoading(true);
    const { data, error: authError } = await insforge.auth.verifyEmail({ email, otp });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data) {
      setSuccess('Correo verificado. Abriendo tu cuenta…');
      window.setTimeout(() => router.push('/mi-cuenta'), 700);
    }
  }

  async function handleResend() {
    clearMessages();
    setLoading(true);
    await insforge.auth.resendVerificationEmail({ email, redirectTo: `${window.location.origin}/auth` });
    setLoading(false);
    setSuccess('Código reenviado. Revisa tu bandeja de entrada.');
  }

  async function handleResetSend() {
    clearMessages();
    if (!email.trim()) { setError('Ingresa el correo asociado a tu cuenta.'); return; }
    setLoading(true);
    await insforge.auth.sendResetPasswordEmail({ email, redirectTo: `${window.location.origin}/auth` });
    setLoading(false);
    setSuccess('Si el correo existe, recibirás un código en minutos.');
    setScreen('reset-code');
  }

  async function handleResetCode() {
    clearMessages();
    setLoading(true);
    const { data, error: authError } = await insforge.auth.exchangeResetPasswordToken({ email, code: otp });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data?.token) {
      setResetToken(data.token);
      setScreen('reset-password');
    }
  }

  async function handleResetPassword() {
    clearMessages();
    if (newPassword.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    const { data, error: authError } = await insforge.auth.resetPassword({ newPassword, otp: resetToken });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data) {
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión.');
      window.setTimeout(() => setScreen('login'), 800);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    clearMessages();
    await insforge.auth.signInWithOAuth({ provider, redirectTo: `${window.location.origin}/mi-cuenta` });
  }

  const step = screen !== 'login' && screen !== 'register' ? steps[screen] : null;
  const login = screen === 'login';
  const register = screen === 'register';

  return (
    <main style={brandStyle} className="relative min-h-[100dvh] overflow-hidden bg-[#f6f0e5] text-[#11100e]">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,255,255,.95),transparent_27rem),radial-gradient(circle_at_92%_88%,rgba(191,159,103,.22),transparent_28rem)]" />
      <div aria-hidden className="absolute inset-0 opacity-[.035] [background-image:linear-gradient(#111_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-[1280px] lg:grid-cols-[.78fr_1.22fr] lg:items-stretch lg:px-6 lg:py-6">
        <aside className="relative hidden overflow-hidden rounded-[2rem] bg-[#0c0d0f] p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--auth-accent)_28%,transparent),transparent_26rem),linear-gradient(160deg,transparent,rgba(255,255,255,.025))]" />
          <div className="relative">
            <button type="button" onClick={() => router.push('/')} className="inline-flex max-w-[300px] items-center rounded-2xl bg-white/[.035] px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/[.07]" aria-label="Volver al inicio">
              {branding.logoUrl ? <img src={branding.logoUrl} alt={brandName} className="h-16 w-auto max-w-full object-contain" /> : <FabrickFullLogo compact priority theme="light" />}
            </button>
            <p className="mt-12 text-[10px] font-black uppercase tracking-[.26em] text-[var(--auth-accent)]">Cuenta segura</p>
            <h1 className="mt-4 max-w-lg text-5xl font-black leading-[.94] tracking-[-.06em]">Todo lo que necesitas para seguir avanzando con {brandName}.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/58">Pedidos, cotizaciones, proyectos guardados y soporte reunidos en un solo acceso.</p>
          </div>
          <div className="relative grid gap-3">
            {['Acceso protegido', 'Historial y seguimiento', `Soporte: ${contactEmail}`].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[.045] px-4 py-3 text-xs font-bold ring-1 ring-white/8"><CheckCircle2 className="h-4 w-4 text-[var(--auth-accent)]" />{item}</div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[100dvh] items-center justify-center px-4 py-5 sm:px-6 lg:min-h-0 lg:px-10 lg:py-8">
          <div className="w-full max-w-[590px] rounded-[2rem] border border-black/[.07] bg-[#fffaf1]/94 p-5 shadow-[0_26px_90px_rgba(42,32,18,.12)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
              <button type="button" onClick={() => router.push('/')} className="flex min-w-0 items-center gap-3" aria-label="Volver al inicio">
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0c0d0f]">
                  {branding.logoUrl ? <img src={branding.logoUrl} alt={brandName} className="h-9 w-9 object-contain" /> : <ShieldCheck className="h-5 w-5 text-[var(--auth-accent)]" />}
                </span>
                <span className="min-w-0 text-left"><span className="block truncate text-sm font-black">{brandName}</span><span className="block text-[9px] font-black uppercase tracking-[.16em] text-[#948a80]">Cuenta de cliente</span></span>
              </button>
              <button type="button" onClick={() => router.push('/')} className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white" aria-label="Volver"><ArrowLeft className="h-4 w-4" /></button>
            </div>

            {step ? (
              <div className="mb-6">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.18em] text-[#948a80]"><span>{step.label}</span><span>{step.current}/{step.total}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[var(--auth-accent)] transition-all" style={{ width: `${(step.current / step.total) * 100}%` }} /></div>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--auth-accent)_14%,white)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#7b5a1f]"><Sparkles className="h-3.5 w-3.5" />{login ? 'Bienvenido de vuelta' : register ? 'Crear cuenta' : step?.label}</div>
                <h2 className="mt-4 text-[clamp(2rem,7vw,3rem)] font-black leading-[.96] tracking-[-.055em]">
                  {login ? 'Ingresa a tu cuenta.' : register ? 'Crea tu espacio.' : screen === 'verify' ? 'Confirma tu correo.' : screen === 'reset-send' ? 'Recupera tu acceso.' : screen === 'reset-code' ? 'Verifica el código.' : 'Define una nueva clave.'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#8e857d]">
                  {login ? 'Consulta pedidos, datos y herramientas guardadas.' : register ? `Tu cuenta queda conectada con ${brandName}.` : 'Sigue los pasos y vuelve a tu cuenta de forma segura.'}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4">
              {(login || register) ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => void handleOAuth('google')} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white text-sm font-black transition hover:-translate-y-0.5"><GoogleIcon /> Google</button>
                    <button type="button" onClick={() => void handleOAuth('github')} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#0c0d0f] text-sm font-black text-white transition hover:-translate-y-0.5"><GithubIcon /> GitHub</button>
                  </div>
                  <div className="flex items-center gap-3"><span className="h-px flex-1 bg-black/10" /><span className="text-[9px] font-black uppercase tracking-[.18em] text-[#9a9189]">o continúa con correo</span><span className="h-px flex-1 bg-black/10" /></div>
                </>
              ) : null}

              {register ? <Field label="Nombre" value={name} onChange={setName} placeholder="Tu nombre" autoComplete="name" icon={User} /> : null}
              {(login || register || screen === 'reset-send') ? <Field label="Correo" type="email" value={email} onChange={setEmail} placeholder="correo@ejemplo.cl" autoComplete="email" icon={Mail} /> : null}
              {(login || register) ? <Field label="Contraseña" type={showPassword ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Tu contraseña" autoComplete={login ? 'current-password' : 'new-password'} icon={LockKeyhole} trailing={<button type="button" onClick={() => setShowPassword((value) => !value)} className="text-[#9d958d]" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} /> : null}
              {(screen === 'verify' || screen === 'reset-code') ? <Field label="Código" value={otp} onChange={setOtp} placeholder="000000" autoComplete="one-time-code" icon={KeyRound} /> : null}
              {screen === 'reset-password' ? <Field label="Nueva contraseña" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 caracteres" autoComplete="new-password" icon={LockKeyhole} trailing={<button type="button" onClick={() => setShowPassword((value) => !value)} className="text-[#9d958d]" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} /> : null}

              <Notice type="error" text={error} />
              <Notice type="success" text={success} />

              {login ? <PrimaryButton loading={loading} onClick={handleLogin}>Acceder</PrimaryButton> : null}
              {register ? <PrimaryButton loading={loading} onClick={handleRegister}>Crear cuenta</PrimaryButton> : null}
              {screen === 'verify' ? <PrimaryButton loading={loading} onClick={handleVerify}>Verificar correo</PrimaryButton> : null}
              {screen === 'reset-send' ? <PrimaryButton loading={loading} onClick={handleResetSend}>Enviar código</PrimaryButton> : null}
              {screen === 'reset-code' ? <PrimaryButton loading={loading} onClick={handleResetCode}>Validar código</PrimaryButton> : null}
              {screen === 'reset-password' ? <PrimaryButton loading={loading} onClick={handleResetPassword}>Actualizar contraseña</PrimaryButton> : null}

              {login ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
                  <button type="button" onClick={() => changeScreen('register')} className="text-[#4e4842] hover:text-black">¿No tienes cuenta? <span className="text-[var(--auth-accent)]">Crear una</span></button>
                  <button type="button" onClick={() => changeScreen('reset-send')} className="text-[#9a6b1e]">¿Olvidaste tu contraseña?</button>
                </div>
              ) : null}
              {register ? <button type="button" onClick={() => changeScreen('login')} className="text-center text-xs font-bold text-[#625b54]">Ya tengo cuenta · <span className="text-[var(--auth-accent)]">Ingresar</span></button> : null}
              {screen === 'verify' ? <div className="flex items-center justify-between gap-3 text-xs font-bold"><button type="button" onClick={() => changeScreen('register')} className="text-[#625b54]">← Cambiar correo</button><button type="button" onClick={() => void handleResend()} className="text-[var(--auth-accent)]">Reenviar código</button></div> : null}
              {(screen === 'reset-send' || screen === 'reset-code' || screen === 'reset-password') ? <button type="button" onClick={() => changeScreen('login')} className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#625b54]"><ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión</button> : null}
            </div>

            <p className="mt-7 text-center text-[10px] leading-5 text-[#a0978e]">Acceso protegido · Al continuar aceptas las condiciones de uso y privacidad de {brandName}.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
