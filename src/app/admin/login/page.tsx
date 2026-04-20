'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';

function LockIcon() {
  return (
    <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

type Screen = 'login' | 'setup-send' | 'setup-code' | 'setup-password' | 'init-account';

export default function AdminLoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupEmail, setSetupEmail] = useState('f.eduardomicolta@gmail.com');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function resetMessages() {
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al iniciar sesión.');
        return;
      }

      router.replace('/admin');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  /** Sends OTP via InsForge emails.send() through our server endpoint */
  async function handleSetupSend() {
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: setupEmail.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Error al enviar el código.');
        return;
      }
      setSuccess('Código enviado. Revisa tu bandeja de entrada (y carpeta de spam).');
      setScreen('setup-code');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  /** Verifies our custom OTP server-side, then exchanges InsForge reset token */
  async function handleSetupCode() {
    resetMessages();
    setLoading(true);

    try {
      // Step 1: verify our custom OTP
      const verifyRes = await fetch('/api/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: setupEmail.trim().toLowerCase(), code: otp }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyJson.error ?? 'Código incorrecto.');
        return;
      }

      // Step 2: OTP verified — now request InsForge's reset token via their native flow
      const { error: sendErr } = await insforge.auth.sendResetPasswordEmail({
        email: setupEmail.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (sendErr) {
        setError(sendErr.message);
        return;
      }

      setSuccess('Identidad verificada. Ahora recibirás el código de restablecimiento de InsForge. Ingrésalo a continuación.');
      setScreen('setup-password');
      setOtp('');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  /** Exchanges InsForge OTP for a reset token, then sets the new password */
  async function handleSetupPassword() {
    resetMessages();
    setLoading(true);

    try {
      // Exchange the InsForge reset code for a token
      const { data, error: exchangeErr } = await insforge.auth.exchangeResetPasswordToken({
        email: setupEmail.trim().toLowerCase(),
        code: otp,
      });
      if (exchangeErr || !data?.token) {
        setError(exchangeErr?.message ?? 'Código InsForge inválido o expirado.');
        return;
      }

      const { error: resetErr } = await insforge.auth.resetPassword({ newPassword, otp: data.token });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }

      setSuccess('¡Contraseña configurada! Ya puedes iniciar sesión.');
      setEmail(setupEmail.trim().toLowerCase());
      setScreen('login');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  /** Creates the admin InsForge account with the default password and syncs admin_users */
  async function handleInitAccount() {
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/init-account', { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al inicializar la cuenta.');
        return;
      }

      if (json.alreadyExists) {
        setError(json.message ?? 'La cuenta ya existe. Usa la opción de recuperación.');
        return;
      }

      setSuccess(json.message ?? '¡Cuenta creada! Ya puedes iniciar sesión.');
      setEmail('f.eduardomicolta@gmail.com');
      setScreen('login');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all disabled:opacity-40";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {/* Background orb */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-yellow-400/5 blur-[80px] pointer-events-none" />

      {/* Logo */}
      <span className="relative z-10 font-playfair text-2xl font-black tracking-[0.35em] text-yellow-400 mb-10 select-none">
        FABRICK
      </span>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-[2rem] border border-white/10 bg-zinc-950/90 p-8 shadow-2xl">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-6">
          <LockIcon />
        </div>

        {/* ── LOGIN ── */}
        {screen === 'login' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-white text-xl font-bold tracking-wide">Panel Administrador</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">ACCESO RESTRINGIDO</p>
            </div>

            {success && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-[10px] tracking-widest uppercase">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="f.eduardomicolta@gmail.com"
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-[10px] tracking-widest uppercase">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors disabled:opacity-60 mt-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verificando...
                  </span>
                ) : 'Acceder'}
              </button>
            </form>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => { resetMessages(); setScreen('setup-send'); }}
                className="w-full text-center text-yellow-400/60 hover:text-yellow-400 text-xs transition-colors duration-300"
              >
                ¿Contraseña olvidada? Recuperar →
              </button>
              <button
                onClick={() => { resetMessages(); setScreen('init-account'); }}
                className="w-full text-center text-zinc-500 hover:text-zinc-300 text-xs transition-colors duration-300"
              >
                Primera vez · Crear cuenta →
              </button>
            </div>
          </>
        )}

        {/* ── INIT ACCOUNT (primera vez) ── */}
        {screen === 'init-account' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Crear Cuenta Admin</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">PRIMERA CONFIGURACIÓN</p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-yellow-400/5 border border-yellow-400/20 text-yellow-200/70 text-xs leading-relaxed">
              Esto creará la cuenta de administrador en InsForge con la contraseña configurada y la sincronizará con la base de datos. Solo funciona si la cuenta aún no existe.
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
                {success}
              </div>
            )}

            <button
              onClick={() => void handleInitAccount()}
              disabled={loading}
              className="w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creando cuenta...
                </span>
              ) : 'Inicializar cuenta de administrador'}
            </button>

            <button
              onClick={() => { resetMessages(); setScreen('login'); }}
              className="text-zinc-500 hover:text-white text-xs text-center transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* ── SETUP: ENVIAR CÓDIGO ── */}
        {screen === 'setup-send' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Recuperar Contraseña</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">VERIFICACIÓN POR EMAIL</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[10px] tracking-widest uppercase">Email del administrador</label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-xs leading-relaxed">
              Se enviará un código de verificación directamente a tu correo a través de nuestro sistema de email.
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
                {success}
              </div>
            )}

            <button
              onClick={() => void handleSetupSend()}
              disabled={loading}
              className="w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar código de verificación'}
            </button>

            <button
              onClick={() => { resetMessages(); setScreen('login'); }}
              className="text-zinc-500 hover:text-white text-xs text-center transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* ── SETUP: VERIFICAR CÓDIGO (nuestro OTP) ── */}
        {screen === 'setup-code' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Ingresar Código</h1>
              <p className="text-zinc-500 text-xs mt-1">Código enviado a <span className="text-yellow-400/80">{setupEmail}</span></p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[10px] tracking-widest uppercase">Código de 6 dígitos</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={loading}
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-bold tracking-[0.5em] text-center placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all disabled:opacity-40"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              onClick={() => void handleSetupCode()}
              disabled={loading || otp.length !== 6}
              className="w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors disabled:opacity-60"
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <button
              onClick={() => { resetMessages(); setScreen('setup-send'); }}
              className="text-zinc-500 hover:text-white text-xs text-center transition-colors"
            >
              ← Volver
            </button>
          </div>
        )}

        {/* ── SETUP: NUEVA CONTRASEÑA (código InsForge + nueva contraseña) ── */}
        {screen === 'setup-password' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Nueva Contraseña</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">ADMINISTRADOR · FABRICK</p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-xs leading-relaxed">
              Ingresa el código de restablecimiento que InsForge envió a <span className="text-yellow-400/80">{setupEmail}</span> y tu nueva contraseña.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[10px] tracking-widest uppercase">Código InsForge (6 dígitos)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={loading}
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-bold tracking-[0.5em] text-center placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all disabled:opacity-40"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[10px] tracking-widest uppercase">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              onClick={() => void handleSetupPassword()}
              disabled={loading || otp.length !== 6 || newPassword.length < 6}
              className="w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-yellow-300 transition-colors disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Establecer contraseña'}
            </button>

            <button
              onClick={() => { resetMessages(); setScreen('setup-send'); }}
              className="text-zinc-500 hover:text-white text-xs text-center transition-colors"
            >
              ← Solicitar otro código
            </button>
          </div>
        )}
      </div>

      <p className="relative z-10 mt-8 text-white/15 text-[10px] text-center tracking-widest uppercase">
        Acceso exclusivo · Soluciones Fabrick
      </p>
    </div>
  );
}
