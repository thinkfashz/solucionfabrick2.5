'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import FabrickLogo from '@/components/FabrickLogo';

/* ── Tipos de pantalla ── */
type Screen =
  | 'login'
  | 'register'
  | 'verify'
  | 'reset-send'
  | 'reset-code'
  | 'reset-password';

/* ── Íconos inline ── */
const IconGoogle = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const IconGithub = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const IconShield = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

/* ── Input reutilizable ── */
function Input({
  label, type = 'text', name, value, onChange, placeholder, disabled,
}: {
  label: string; type?: string; name: string; value: string;
  onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-xs tracking-widest uppercase transition-colors duration-200 ${focused ? 'text-yellow-400/70' : 'text-white/40'}`}>
        {label}
      </label>
      <div className={`relative rounded-2xl transition-all duration-300 ${focused ? 'ring-1 ring-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.08)]' : ''}`}>
        <input
          type={type} name={name} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-yellow-400/30 transition-all duration-300 disabled:opacity-40"
        />
      </div>
    </div>
  );
}

/* ── Botón primario ── */
function PrimaryBtn({ children, loading, onClick, type = 'button' }: {
  children: React.ReactNode; loading?: boolean; onClick?: () => void; type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={loading}
      className="relative w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.18em] uppercase overflow-hidden group transition-all duration-300 hover:bg-yellow-300 disabled:opacity-60 glow-pulse"
    >
      {/* shimmer sweep */}
      <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Procesando...
        </span>
      ) : children}
    </button>
  );
}

/* ── Error ── */
function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-red-500/8 border border-red-500/25 text-red-400 text-xs leading-relaxed animate-[fadeSlideUp_0.3s_ease_forwards]">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

/* ── Success ── */
function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 text-emerald-400 text-xs leading-relaxed animate-[fadeSlideUp_0.3s_ease_forwards]">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

/* ── Separador OAuth ── */
function OAuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="text-white/20 text-xs font-medium tracking-widest uppercase">o</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

/* ── Botones OAuth ── */
function OAuthButtons({ onOAuth }: { onOAuth: (p: 'google' | 'github') => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {([
        { id: 'google' as const, label: 'Google', Icon: IconGoogle },
        { id: 'github' as const, label: 'GitHub', Icon: IconGithub },
      ]).map(({ id, label, Icon }) => (
        <button key={id} onClick={() => onOAuth(id)}
          className="flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-white/8 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] text-white/80 hover:text-white text-sm font-medium transition-all duration-300 group">
          <span className="transition-transform duration-200 group-hover:scale-110"><Icon /></span>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Input OTP de dígitos individuales ── */
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handleChange(i: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      const next = digits.map((d, idx) => (idx === i ? '' : d)).join('').padEnd(0, '');
      onChange(next.trimEnd() === '' ? '' : digits.map((d, idx) => (idx === i ? '' : d)).join(''));
      return;
    }
    // handle paste
    if (cleaned.length > 1) {
      onChange(cleaned.slice(0, 6));
      inputs.current[Math.min(cleaned.length, 5)]?.focus();
      return;
    }
    const next = digits.map((d, idx) => (idx === i ? cleaned : d)).join('');
    onChange(next);
    if (i < 5) inputs.current[i + 1]?.focus();
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          disabled={disabled}
          aria-label={`Dígito ${i + 1} de 6`}
          title={`Dígito ${i + 1}`}
          className={`w-11 h-14 text-center text-xl font-bold rounded-2xl border transition-all duration-200 focus:outline-none bg-white/[0.04] text-white disabled:opacity-40
            ${digits[i] ? 'border-yellow-400/50 bg-yellow-400/5 shadow-[0_0_12px_rgba(250,204,21,0.15)]' : 'border-white/10 focus:border-yellow-400/40 focus:bg-white/[0.06]'}`}
        />
      ))}
    </div>
  );
}

/* ── Indicador de pasos ── */
const STEP_SCREENS: Record<string, { step: number; total: number; label: string }> = {
  'verify':         { step: 2, total: 2, label: 'Verificar email' },
  'reset-send':     { step: 1, total: 3, label: 'Enviar código' },
  'reset-code':     { step: 2, total: 3, label: 'Ingresar código' },
  'reset-password': { step: 3, total: 3, label: 'Nueva contraseña' },
};

function StepIndicator({ screen }: { screen: Screen }) {
  const info = STEP_SCREENS[screen];
  if (!info) return null;
  return (
    <div className="flex items-center justify-between mb-1">
      <span className="text-white/25 text-[11px] tracking-widest uppercase">{info.label}</span>
      <div className="flex gap-1.5">
        {Array.from({ length: info.total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i < info.step ? 'bg-yellow-400 w-6' : 'bg-white/15 w-3'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Wrapper con transición entre pantallas ── */
function ScreenTransition({ children, screenKey }: { children: React.ReactNode; screenKey: string }) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState(children);
  const [key, setKey] = useState(screenKey);

  useEffect(() => {
    if (screenKey !== key) {
      setVisible(false);
      const t = setTimeout(() => {
        setContent(children);
        setKey(screenKey);
        requestAnimationFrame(() => setVisible(true));
      }, 180);
      return () => clearTimeout(t);
    }
    setVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey, children]);

  return (
    <div
      className={`transition-all duration-200 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
      }`}
    >
      {content}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════ */
export default function AuthPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* Campos */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  const reset = () => { setError(''); setSuccess(''); };

  /* ── REGISTRO ── */
  async function handleRegister() {
    reset(); setLoading(true);
    const { data, error: err } = await insforge.auth.signUp({
      email, password, name,
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data?.requireEmailVerification) {
      setSuccess('Te enviamos un código de 6 dígitos a tu correo.');
      setScreen('verify');
    } else {
      router.push('/');
    }
  }

  /* ── LOGIN ── */
  async function handleLogin() {
    reset(); setLoading(true);
    const { data, error: err } = await insforge.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data) router.push('/mi-cuenta');
  }

  /* ── VERIFICAR EMAIL ── */
  async function handleVerify() {
    reset(); setLoading(true);
    const { data, error: err } = await insforge.auth.verifyEmail({ email, otp });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data) { setSuccess('¡Email verificado! Redirigiendo...'); setTimeout(() => router.push('/mi-cuenta'), 1500); }
  }

  /* ── REENVIAR CÓDIGO ── */
  async function handleResend() {
    reset(); setLoading(true);
    await insforge.auth.resendVerificationEmail({ email, redirectTo: `${window.location.origin}/auth` });
    setLoading(false);
    setSuccess('Código reenviado. Revisa tu bandeja de entrada.');
  }

  /* ── RESET: ENVIAR EMAIL ── */
  async function handleResetSend() {
    reset(); setLoading(true);
    await insforge.auth.sendResetPasswordEmail({
      email,
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    setSuccess('Si el correo existe, recibirás un código en minutos.');
    setScreen('reset-code');
  }

  /* ── RESET: VERIFICAR CÓDIGO ── */
  async function handleResetCode() {
    reset(); setLoading(true);
    const { data, error: err } = await insforge.auth.exchangeResetPasswordToken({ email, code: otp });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data?.token) {
      setResetToken(data.token);
      setScreen('reset-password');
    }
  }

  /* ── RESET: NUEVA CONTRASEÑA ── */
  async function handleResetPassword() {
    reset(); setLoading(true);
    const { data, error: err } = await insforge.auth.resetPassword({ newPassword, otp: resetToken });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data) { setSuccess('Contraseña actualizada. Inicia sesión.'); setTimeout(() => setScreen('login'), 1500); }
  }

  /* ── OAUTH ── */
  async function handleOAuth(provider: 'google' | 'github') {
    reset();
    await insforge.auth.signInWithOAuth({
      provider,
      redirectTo: `${window.location.origin}/mi-cuenta`,
    });
  }

  /* ════════ RENDER ════════ */
  return (
    <div className="min-h-screen bg-black bg-grid flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">

      {/* ── Orbes de fondo en profundidad ── */}
      <div className="fixed inset-0 pointer-events-none select-none" aria-hidden>
        {/* central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-yellow-400/[0.04] blur-[120px]" />
        {/* top-left accent */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-yellow-400/[0.06] blur-[90px] animate-[float_8s_ease-in-out_infinite]" />
        {/* bottom-right accent */}
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-500/[0.05] blur-[80px] animate-[float_11s_ease-in-out_infinite_2s]" />
        {/* top-right subtle */}
        <div className="absolute top-20 right-1/4 w-48 h-48 rounded-full bg-yellow-300/[0.03] blur-[60px] animate-[float_14s_ease-in-out_infinite_1s]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-10 flex justify-center anim-enter-logo">
        <FabrickLogo animate onClick={() => { window.location.href = '/'; }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md anim-enter-card">
        {/* step indicator */}
        <div className="px-1 mb-3">
          <StepIndicator screen={screen} />
        </div>

        <div className="glass-card rounded-[2rem] p-8 md:p-10">
          <ScreenTransition screenKey={screen}>
            <div>

              {/* ── LOGIN ── */}
              {screen === 'login' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <h1 className="font-playfair text-3xl font-bold text-white mb-1.5">Bienvenido</h1>
                    <p className="text-white/35 text-sm">Ingresa a tu cuenta Fabrick</p>
                  </div>

                  <OAuthButtons onOAuth={handleOAuth} />
                  <OAuthDivider />

                  <Input label="Email" type="email" name="email" value={email} onChange={setEmail} placeholder="tu@correo.cl" />
                  <Input label="Contraseña" type="password" name="password" value={password} onChange={setPassword} placeholder="••••••••" />

                  <button onClick={() => { reset(); setScreen('reset-send'); }}
                    className="text-yellow-400/50 hover:text-yellow-400 text-xs text-right transition-colors duration-300 -mt-3">
                    ¿Olvidaste tu contraseña?
                  </button>

                  <ErrorMsg msg={error} />
                  <SuccessMsg msg={success} />

                  <PrimaryBtn loading={loading} onClick={handleLogin}>Acceder a Fabrick</PrimaryBtn>

                  <p className="text-center text-white/25 text-sm">
                    ¿No tienes cuenta?{' '}
                    <button onClick={() => { reset(); setScreen('register'); }} className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                      Registrarse
                    </button>
                  </p>
                </div>
              )}

              {/* ── REGISTRO ── */}
              {screen === 'register' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <h1 className="font-playfair text-3xl font-bold text-white mb-1.5">Crear Cuenta</h1>
                    <p className="text-white/35 text-sm">Únete a la plataforma Fabrick</p>
                  </div>

                  <OAuthButtons onOAuth={handleOAuth} />
                  <OAuthDivider />

                  <Input label="Nombre Completo" name="name" value={name} onChange={setName} placeholder="Arquitecto García" />
                  <Input label="Email" type="email" name="email" value={email} onChange={setEmail} placeholder="tu@correo.cl" />
                  <Input label="Contraseña" type="password" name="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />

                  <ErrorMsg msg={error} />
                  <SuccessMsg msg={success} />

                  <PrimaryBtn loading={loading} onClick={handleRegister}>Crear Cuenta Fabrick</PrimaryBtn>

                  <p className="text-center text-white/25 text-sm">
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={() => { reset(); setScreen('login'); }} className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                      Acceder
                    </button>
                  </p>
                </div>
              )}

              {/* ── VERIFICAR EMAIL ── */}
              {screen === 'verify' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center mx-auto mb-4 animate-[float_3s_ease-in-out_infinite]">
                      <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <h1 className="font-playfair text-2xl font-bold text-white mb-1.5">Verifica tu Email</h1>
                    <p className="text-white/35 text-sm">Código enviado a<br /><span className="text-yellow-400/80 font-medium">{email}</span></p>
                  </div>

                  <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                  <ErrorMsg msg={error} />
                  <SuccessMsg msg={success} />

                  <PrimaryBtn loading={loading} onClick={handleVerify}>Confirmar Código</PrimaryBtn>

                  <div className="flex items-center justify-between text-sm">
                    <button onClick={() => { reset(); setScreen('register'); }} className="text-white/25 hover:text-white transition-colors">
                      ← Volver
                    </button>
                    <button onClick={handleResend} className="text-yellow-400/50 hover:text-yellow-400 transition-colors text-xs">
                      Reenviar código
                    </button>
                  </div>
                </div>
              )}

              {/* ── RESET: ENVIAR EMAIL ── */}
              {screen === 'reset-send' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                      </svg>
                    </div>
                    <h1 className="font-playfair text-2xl font-bold text-white mb-1.5">Recuperar Acceso</h1>
                    <p className="text-white/35 text-sm">Te enviaremos un código de recuperación</p>
                  </div>

                  <Input label="Email de tu cuenta" type="email" name="email" value={email} onChange={setEmail} placeholder="tu@correo.cl" />

                  <ErrorMsg msg={error} />
                  <SuccessMsg msg={success} />

                  <PrimaryBtn loading={loading} onClick={handleResetSend}>Enviar Código</PrimaryBtn>

                  <button onClick={() => { reset(); setScreen('login'); }} className="text-white/25 hover:text-white text-sm text-center transition-colors">
                    ← Volver al inicio de sesión
                  </button>
                </div>
              )}

              {/* ── RESET: CÓDIGO ── */}
              {screen === 'reset-code' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <h1 className="font-playfair text-2xl font-bold text-white mb-1.5">Ingresar Código</h1>
                    <p className="text-white/35 text-sm">Código enviado a <span className="text-yellow-400/80">{email}</span></p>
                  </div>

                  <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                  <ErrorMsg msg={error} />
                  <SuccessMsg msg={success} />

                  <PrimaryBtn loading={loading} onClick={handleResetCode}>Verificar Código</PrimaryBtn>
                </div>
              )}

              {/* ── RESET: NUEVA CONTRASEÑA ── */}
              {screen === 'reset-password' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center">
                    <h1 className="font-playfair text-2xl font-bold text-white mb-1.5">Nueva Contraseña</h1>
                    <p className="text-white/35 text-sm">Elige una contraseña segura</p>
                  </div>

                  <Input label="Nueva Contraseña" type="password" name="newPassword" value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 caracteres" />

                  <ErrorMsg msg={error} />
                  <SuccessMsg msg={success} />

                  <PrimaryBtn loading={loading} onClick={handleResetPassword}>Actualizar Contraseña</PrimaryBtn>
                </div>
              )}

            </div>
          </ScreenTransition>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex flex-col items-center gap-2 anim-enter-footer">
        <div className="flex items-center gap-1.5 text-white/15 text-xs">
          <IconShield />
          <span>Plataforma segura</span>
        </div>
        <p className="text-white/15 text-xs text-center">
          © {new Date().getFullYear()} CASAS FABRICK
        </p>
      </div>
    </div>
  );
}
