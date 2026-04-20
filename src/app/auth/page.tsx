'use client';

import { useState } from 'react';
import Link from 'next/link';
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

/* ── Input reutilizable ── */
function Input({
  label, type = 'text', name, value, onChange, placeholder, disabled,
}: {
  label: string; type?: string; name: string; value: string;
  onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-white/50 text-xs tracking-widest uppercase">{label}</label>
      <input
        type={type} name={name} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all duration-300 disabled:opacity-40"
      />
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
      className="w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors duration-300 disabled:opacity-60 glow-pulse"
    >
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
    <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
      {msg}
    </div>
  );
}

/* ── Success ── */
function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
      {msg}
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
    <div className="min-h-screen bg-black bg-grid flex flex-col items-center justify-center px-4 py-20">
      {/* Orbe de fondo */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-yellow-400/5 blur-[100px] pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 mb-10 flex justify-center">
        <FabrickLogo animate onClick={() => { window.location.href = '/'; }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md glass-card rounded-5xl p-8 md:p-10">

        {/* ── LOGIN ── */}
        {screen === 'login' && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="font-playfair text-3xl font-bold text-white mb-1">Acceder</h1>
              <p className="text-white/40 text-sm">Ingresa a tu cuenta Fabrick</p>
            </div>

            {/* OAuth */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-white/10 hover:border-white/25 bg-white/5 text-white text-sm font-medium transition-all duration-300">
                <IconGoogle /> Google
              </button>
              <button onClick={() => handleOAuth('github')}
                className="flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-white/10 hover:border-white/25 bg-white/5 text-white text-sm font-medium transition-all duration-300">
                <IconGithub /> GitHub
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/25 text-xs">o con email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Input label="Email" type="email" name="email" value={email} onChange={setEmail} placeholder="tu@correo.cl" />
            <Input label="Contraseña" type="password" name="password" value={password} onChange={setPassword} placeholder="••••••••" />

            <button onClick={() => { reset(); setScreen('reset-send'); }}
              className="text-yellow-400/60 hover:text-yellow-400 text-xs text-right transition-colors duration-300 -mt-3">
              ¿Olvidaste tu contraseña?
            </button>

            <ErrorMsg msg={error} />
            <SuccessMsg msg={success} />

            <PrimaryBtn loading={loading} onClick={handleLogin}>Acceder a Fabrick</PrimaryBtn>

            <p className="text-center text-white/30 text-sm">
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
              <h1 className="font-playfair text-3xl font-bold text-white mb-1">Registro</h1>
              <p className="text-white/40 text-sm">Crea tu cuenta Fabrick</p>
            </div>

            {/* OAuth */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-white/10 hover:border-white/25 bg-white/5 text-white text-sm font-medium transition-all duration-300">
                <IconGoogle /> Google
              </button>
              <button onClick={() => handleOAuth('github')}
                className="flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-white/10 hover:border-white/25 bg-white/5 text-white text-sm font-medium transition-all duration-300">
                <IconGithub /> GitHub
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/25 text-xs">o con email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Input label="Nombre Completo" name="name" value={name} onChange={setName} placeholder="Arquitecto García" />
            <Input label="Email" type="email" name="email" value={email} onChange={setEmail} placeholder="tu@correo.cl" />
            <Input label="Contraseña" type="password" name="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />

            <ErrorMsg msg={error} />
            <SuccessMsg msg={success} />

            <PrimaryBtn loading={loading} onClick={handleRegister}>Crear Cuenta Fabrick</PrimaryBtn>

            <p className="text-center text-white/30 text-sm">
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
              <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h1 className="font-playfair text-3xl font-bold text-white mb-1">Verificar Email</h1>
              <p className="text-white/40 text-sm">Ingresa el código de 6 dígitos enviado a<br /><span className="text-yellow-400/80">{email}</span></p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-xs tracking-widest uppercase">Código de Verificación</label>
              <input
                type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-bold tracking-[0.5em] text-center placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all duration-300"
              />
            </div>

            <ErrorMsg msg={error} />
            <SuccessMsg msg={success} />

            <PrimaryBtn loading={loading} onClick={handleVerify}>Confirmar Código</PrimaryBtn>

            <div className="flex items-center justify-between text-sm">
              <button onClick={() => { reset(); setScreen('register'); }} className="text-white/30 hover:text-white transition-colors">
                ← Volver
              </button>
              <button onClick={handleResend} className="text-yellow-400/60 hover:text-yellow-400 transition-colors">
                Reenviar código
              </button>
            </div>
          </div>
        )}

        {/* ── RESET: ENVIAR EMAIL ── */}
        {screen === 'reset-send' && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="font-playfair text-3xl font-bold text-white mb-1">Recuperar Acceso</h1>
              <p className="text-white/40 text-sm">Te enviaremos un código de recuperación</p>
            </div>

            <Input label="Email de tu cuenta" type="email" name="email" value={email} onChange={setEmail} placeholder="tu@correo.cl" />

            <ErrorMsg msg={error} />
            <SuccessMsg msg={success} />

            <PrimaryBtn loading={loading} onClick={handleResetSend}>Enviar Código</PrimaryBtn>

            <button onClick={() => { reset(); setScreen('login'); }} className="text-white/30 hover:text-white text-sm text-center transition-colors">
              ← Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* ── RESET: CÓDIGO ── */}
        {screen === 'reset-code' && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="font-playfair text-3xl font-bold text-white mb-1">Ingresar Código</h1>
              <p className="text-white/40 text-sm">Código enviado a <span className="text-yellow-400/80">{email}</span></p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-xs tracking-widest uppercase">Código de 6 dígitos</label>
              <input
                type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-bold tracking-[0.5em] text-center placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all duration-300"
              />
            </div>

            <ErrorMsg msg={error} />
            <SuccessMsg msg={success} />

            <PrimaryBtn loading={loading} onClick={handleResetCode}>Verificar Código</PrimaryBtn>
          </div>
        )}

        {/* ── RESET: NUEVA CONTRASEÑA ── */}
        {screen === 'reset-password' && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="font-playfair text-3xl font-bold text-white mb-1">Nueva Contraseña</h1>
              <p className="text-white/40 text-sm">Elige una contraseña segura</p>
            </div>

            <Input label="Nueva Contraseña" type="password" name="newPassword" value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 caracteres" />

            <ErrorMsg msg={error} />
            <SuccessMsg msg={success} />

            <PrimaryBtn loading={loading} onClick={handleResetPassword}>Actualizar Contraseña</PrimaryBtn>
          </div>
        )}

      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-white/20 text-xs text-center">
        © {new Date().getFullYear()} CASAS FABRICK · Plataforma Segura
      </p>
    </div>
  );
}
