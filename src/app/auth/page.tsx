'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

type Screen = 'login' | 'register' | 'verify' | 'reset-send' | 'reset-code' | 'reset-password';

type FieldProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  icon: React.ComponentType<{ className?: string }>;
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

function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, icon: Icon }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#6f6259]">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(23,24,32,.1)] transition focus-within:shadow-[inset_0_0_0_2px_rgba(154,111,79,.55),0_12px_34px_rgba(23,24,32,.06)]">
        <Icon className="h-4 w-4 shrink-0 text-[#9a6f4f]" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#171820] outline-none placeholder:text-[#9b9088]"
        />
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

function PrimaryButton({ loading, children, onClick }: { loading: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#b6906c] px-5 text-xs font-black uppercase tracking-[.16em] text-[#171820] shadow-[0_16px_42px_rgba(94,65,43,.18)] transition hover:bg-[#ccb196] disabled:opacity-55">
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171820]/25 border-t-[#171820]" /> : null}
      {loading ? 'Procesando…' : children}
      {!loading ? <ArrowRight className="h-4 w-4" /> : null}
    </button>
  );
}

export default function AuthPage() {
  const router = useRouter();
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
    setLoading(true);
    const { data, error: authError } = await insforge.auth.verifyEmail({ email, otp });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data) {
      setSuccess('Correo verificado. Abriendo tu cuenta…');
      window.setTimeout(() => router.push('/mi-cuenta'), 900);
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
    setLoading(true);
    const { data, error: authError } = await insforge.auth.resetPassword({ newPassword, otp: resetToken });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data) {
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión.');
      window.setTimeout(() => setScreen('login'), 900);
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
    <main className="relative min-h-screen overflow-hidden bg-[#f8f0e9] px-4 py-8 text-[#171820] sm:px-6 lg:py-12">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(182,144,108,.28),transparent_30rem),radial-gradient(circle_at_92%_85%,rgba(204,177,150,.32),transparent_30rem)]" />
      <div aria-hidden className="absolute inset-0 opacity-[.045] [background-image:linear-gradient(#171820_1px,transparent_1px),linear-gradient(90deg,#171820_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1180px] overflow-hidden rounded-[2.5rem] bg-white/60 shadow-[0_35px_120px_rgba(23,24,32,.18)] ring-1 ring-[#171820]/10 backdrop-blur-xl lg:grid-cols-[.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden bg-[#171820] p-9 text-[#f8f0e9] lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(204,177,150,.24),transparent_25rem),linear-gradient(155deg,transparent,rgba(182,144,108,.08))]" />
          <div className="relative">
            <button type="button" onClick={() => router.push('/')} className="rounded-2xl bg-[#f8f0e9]/5 p-4 ring-1 ring-[#f8f0e9]/10 transition hover:bg-[#f8f0e9]/10" aria-label="Volver al inicio">
              <FabrickFullLogo compact priority theme="light" />
            </button>
            <p className="mt-12 text-[10px] font-black uppercase tracking-[.26em] text-[#ccb196]">Cuenta Fabrick</p>
            <h1 className="mt-4 text-5xl font-black leading-[.94] tracking-[-.06em]">Tus proyectos, pedidos y presupuestos en un mismo lugar.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#c6bab1]">Accede para revisar compras, seguir solicitudes y conservar la información que necesitas para avanzar con mayor orden.</p>
          </div>
          <div className="relative grid gap-3">
            {['Acceso protegido', 'Historial de pedidos', 'Seguimiento y soporte'].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#f8f0e9]/5 px-4 py-3 text-xs font-bold ring-1 ring-[#f8f0e9]/8"><CheckCircle2 className="h-4 w-4 text-[#ccb196]" />{item}</div>)}
          </div>
        </aside>

        <section className="flex flex-col justify-center p-5 sm:p-9 lg:p-12">
          <div className="mb-8 flex justify-center lg:hidden">
            <button type="button" onClick={() => router.push('/')} aria-label="Volver al inicio" className="rounded-2xl bg-[#171820] p-3 shadow-lg"><FabrickFullLogo compact priority theme="light" /></button>
          </div>

          <div className="mx-auto w-full max-w-[520px]">
            {step ? (
              <div className="mb-5 flex items-center justify-between gap-4">
                <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#9a6f4f]">Paso {step.current} de {step.total}</p><p className="mt-1 text-sm font-black">{step.label}</p></div>
                <div className="flex gap-1.5">{Array.from({ length: step.total }).map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index < step.current ? 'w-7 bg-[#b6906c]' : 'w-3 bg-[#171820]/10'}`} />)}</div>
              </div>
            ) : null}

            {(login || register) ? (
              <div className="mb-7">
                <p className="inline-flex items-center gap-2 rounded-full bg-[#ccb196]/35 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-[#765438]"><Sparkles className="h-3.5 w-3.5" /> {login ? 'Bienvenido de vuelta' : 'Crea tu acceso'}</p>
                <h2 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-5xl">{login ? 'Ingresa a tu cuenta.' : 'Regístrate en Fabrick.'}</h2>
                <p className="mt-3 text-sm leading-6 text-[#6b625c]">{login ? 'Consulta tus pedidos, datos y herramientas guardadas.' : 'Crea una cuenta para organizar compras y solicitudes.'}</p>
              </div>
            ) : null}

            {(login || register) ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => void handleOAuth('google')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-[#171820] shadow-sm ring-1 ring-[#171820]/10 transition hover:bg-[#f7f2ed]"><GoogleIcon /> Google</button>
                <button type="button" onClick={() => void handleOAuth('github')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#171820] text-sm font-black text-[#f8f0e9] transition hover:bg-[#2a2c37]"><GithubIcon /> GitHub</button>
              </div>
            ) : null}

            {(login || register) ? <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-[#171820]/10" /><span className="text-[9px] font-black uppercase tracking-[.2em] text-[#978a81]">o continúa con correo</span><span className="h-px flex-1 bg-[#171820]/10" /></div> : null}

            <div className="grid gap-4">
              {register ? <Field label="Nombre completo" value={name} onChange={setName} placeholder="Nombre y apellido" autoComplete="name" icon={User} /> : null}
              {(login || register || screen === 'reset-send') ? <Field label="Correo" type="email" value={email} onChange={setEmail} placeholder="correo@ejemplo.cl" autoComplete="email" icon={Mail} /> : null}
              {(login || register) ? <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder={register ? 'Mínimo 6 caracteres' : 'Tu contraseña'} autoComplete={register ? 'new-password' : 'current-password'} icon={LockKeyhole} /> : null}

              {screen === 'verify' || screen === 'reset-code' ? (
                <div>
                  <div className="mb-6 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#171820] text-[#ccb196]"><Mail className="h-6 w-6" /></span><h2 className="mt-4 text-3xl font-black">{screen === 'verify' ? 'Confirma tu correo' : 'Ingresa el código'}</h2><p className="mt-2 text-sm text-[#6b625c]">Enviado a <b className="text-[#765438]">{email}</b></p></div>
                  <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.2em] text-[#6f6259]">Código de 6 dígitos</span><span className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(23,24,32,.1)] focus-within:shadow-[inset_0_0_0_2px_rgba(154,111,79,.55)]"><KeyRound className="h-4 w-4 text-[#9a6f4f]" /><input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" className="min-w-0 flex-1 bg-transparent text-center text-2xl font-black tracking-[.35em] text-[#171820] outline-none placeholder:text-[#b6aaa1]" /></span></label>
                </div>
              ) : null}

              {screen === 'reset-send' ? <div className="mb-1 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#171820] text-[#ccb196]"><ShieldCheck className="h-6 w-6" /></span><h2 className="mt-4 text-3xl font-black">Recupera tu acceso</h2><p className="mt-2 text-sm leading-6 text-[#6b625c]">Te enviaremos un código para crear una nueva contraseña.</p></div> : null}
              {screen === 'reset-password' ? <><div className="mb-1 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#171820] text-[#ccb196]"><LockKeyhole className="h-6 w-6" /></span><h2 className="mt-4 text-3xl font-black">Nueva contraseña</h2><p className="mt-2 text-sm text-[#6b625c]">Elige una clave de al menos 6 caracteres.</p></div><Field label="Nueva contraseña" type="password" value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 caracteres" autoComplete="new-password" icon={LockKeyhole} /></> : null}

              <Notice type="error" text={error} />
              <Notice type="success" text={success} />

              {login ? <PrimaryButton loading={loading} onClick={handleLogin}>Acceder a Fabrick</PrimaryButton> : null}
              {register ? <PrimaryButton loading={loading} onClick={handleRegister}>Crear cuenta</PrimaryButton> : null}
              {screen === 'verify' ? <PrimaryButton loading={loading} onClick={handleVerify}>Confirmar código</PrimaryButton> : null}
              {screen === 'reset-send' ? <PrimaryButton loading={loading} onClick={handleResetSend}>Enviar código</PrimaryButton> : null}
              {screen === 'reset-code' ? <PrimaryButton loading={loading} onClick={handleResetCode}>Verificar código</PrimaryButton> : null}
              {screen === 'reset-password' ? <PrimaryButton loading={loading} onClick={handleResetPassword}>Actualizar contraseña</PrimaryButton> : null}
            </div>

            {login ? <button type="button" onClick={() => changeScreen('reset-send')} className="mt-4 w-full text-right text-xs font-bold text-[#765438] transition hover:text-[#171820]">¿Olvidaste tu contraseña?</button> : null}
            {screen === 'verify' ? <button type="button" onClick={() => void handleResend()} className="mt-4 w-full text-center text-xs font-bold text-[#765438]">Reenviar código</button> : null}

            {(login || register) ? (
              <p className="mt-7 text-center text-sm text-[#6b625c]">{login ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}<button type="button" onClick={() => changeScreen(login ? 'register' : 'login')} className="font-black text-[#765438] hover:text-[#171820]">{login ? 'Crear cuenta' : 'Iniciar sesión'}</button></p>
            ) : (
              <button type="button" onClick={() => changeScreen('login')} className="mt-6 inline-flex w-full items-center justify-center gap-2 text-xs font-black text-[#6b625c] transition hover:text-[#171820]"><ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión</button>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-semibold text-[#887d75]"><ShieldCheck className="h-4 w-4 text-[#9a6f4f]" /> Plataforma protegida · Soluciones Fabrick</div>
          </div>
        </section>
      </div>
    </main>
  );
}
