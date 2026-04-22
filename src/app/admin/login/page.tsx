'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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

type Screen = 'login' | 'setup-send' | 'setup-password' | 'init-account';

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
  const [isBlocked, setIsBlocked] = useState(false);
  const [success, setSuccess] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // If a valid admin cookie already exists, bypass the login screen entirely.
  // This prevents the login form from being shown after a successful sign-in
  // when the user revisits /admin/login (e.g. via browser history or a stale tab).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { authenticated?: boolean };
          if (json.authenticated) {
            router.replace('/admin');
            return;
          }
        }
      } catch {
        // Ignore — fall through to the login form.
      }
      if (!cancelled) setCheckingSession(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Show a friendly message when the user was auto-logged out for being idle.
  // Read the search param directly from window to avoid the Suspense requirement
  // that Next.js enforces on `useSearchParams` in client pages.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('idle') === '1') {
      setSuccess('Tu sesión se cerró automáticamente tras 10 minutos de inactividad.');
    }
  }, []);

  function resetMessages() {
    setError('');
    setSuccess('');
    setIsBlocked(false);
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

      // Parse body defensively: the server normally returns JSON, but if an
      // unhandled error escapes the route handler Next.js returns an HTML error
      // page, and `res.json()` would throw — masking the real HTTP status as a
      // generic "network error".
      let json: { error?: string; code?: string } = {};
      try {
        json = await res.json();
      } catch {
        // Non-JSON body (likely an HTML 5xx error page). Leave json empty and
        // fall through so the status-based branch below renders a real message.
      }

      if (!res.ok) {
        const fallback =
          res.status >= 500
            ? 'Error del servidor. Intenta nuevamente en unos segundos.'
            : 'Error al iniciar sesión.';
        setError(json.error ?? fallback);
        if (res.status === 429) setIsBlocked(true);
        return;
      }

      router.replace('/admin');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  /** Best-effort call to clear the caller's IP rate-limit block. */
  async function requestUnlock(): Promise<void> {
    try {
      await fetch('/api/admin/unlock', { method: 'POST' });
    } catch {
      // Non-fatal: if unlock fails the user can still wait for the window to expire.
    }
  }

  /** Clears the IP rate-limit block after the user has recovered their password. */
  async function handleUnlock() {
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/unlock', { method: 'POST' });
      if (!res.ok) {
        setError('No se pudo desbloquear. Intenta nuevamente en unos segundos.');
        return;
      }
      setSuccess('Bloqueo eliminado. Ya puedes intentar iniciar sesión.');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  /** Requests a password-reset code using InsForge's native auth flow. */
  async function handleSetupSend() {
    resetMessages();
    setLoading(true);

    try {
      const { error: sendErr } = await insforge.auth.sendResetPasswordEmail({
        email: setupEmail.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (sendErr) {
        setError(sendErr.message);
        return;
      }
      setSuccess('Código enviado. Revisa tu bandeja de entrada (y carpeta de spam).');
      setOtp('');
      setScreen('setup-password');
    } catch (err) {
      // Surface the real cause instead of a blanket "Error de red" so the
      // operator can tell apart network failures from CSP blocks, missing
      // NEXT_PUBLIC_INSFORGE_* env vars (which make the SDK throw on first
      // use), or unexpected SDK errors.
      const message = err instanceof Error ? err.message : String(err);
      setError(`No se pudo enviar el código: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  /** Exchanges the reset code for a token, then sets the new password. */
  async function handleSetupPassword() {
    resetMessages();
    setLoading(true);

    try {
      // Exchange the reset code for a token
      const { data, error: exchangeErr } = await insforge.auth.exchangeResetPasswordToken({
        email: setupEmail.trim().toLowerCase(),
        code: otp,
      });
      if (exchangeErr || !data?.token) {
        setError(exchangeErr?.message ?? 'Código inválido o expirado.');
        return;
      }

      const { error: resetErr } = await insforge.auth.resetPassword({ newPassword, otp: data.token });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }

      // The user just proved control of the admin email, so clear any
      // previous rate-limit block for this IP to let them log in immediately.
      await requestUnlock();

      setSuccess('¡Contraseña configurada! Ya puedes iniciar sesión.');
      setEmail(setupEmail.trim().toLowerCase());
      setScreen('login');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`No se pudo completar la recuperación: ${message}`);
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
        // Account already exists — still clear any IP lockout so the user
        // can proceed directly to login / reset from here.
        await requestUnlock();
        setError(json.message ?? 'La cuenta ya existe. Usa la opción de recuperación.');
        return;
      }

      await requestUnlock();

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

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="flex h-12 w-12 animate-spin items-center justify-center">
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#facc15" strokeWidth="4" />
            <path className="opacity-90" fill="#facc15" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.35em] text-yellow-400/70">Verificando sesión…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {/* Background orb */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-yellow-400/5 blur-[80px] pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-3 select-none">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 p-2 shadow-[0_6px_24px_rgba(250,204,21,0.35)]">
          <Image
            src="/logo-soluciones-fabrick-monocromo-claro.svg"
            alt="Soluciones Fabrick"
            width={128}
            height={32}
            className="h-auto w-full"
            priority
          />
        </span>
        <span className="font-playfair text-2xl font-black tracking-[0.35em] text-yellow-400">
          FABRICK
        </span>
      </div>

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
                  {isBlocked && (
                    <button
                      type="button"
                      onClick={() => void handleUnlock()}
                      disabled={loading}
                      className="mt-3 w-full py-2 rounded-full border border-red-400/40 text-red-200 hover:bg-red-500/10 transition-colors text-[11px] tracking-widest uppercase disabled:opacity-60"
                    >
                      Desbloquear ahora
                    </button>
                  )}
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

              <button
                type="button"
                onClick={() => {
                  if (typeof window === 'undefined') return;
                  if (!window.PublicKeyCredential || !navigator.credentials) {
                    setError('Tu navegador no soporta huella digital.');
                    return;
                  }
                  setSuccess('Registra tu huella desde /admin/equipo (próximamente).');
                }}
                disabled={loading}
                className="w-full py-3 rounded-full border border-white/10 bg-white/5 text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/10 transition-colors disabled:opacity-60 mt-2"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zM12 15c-2.7 0-5.8 1.3-6 2h12c-.2-.7-3.3-2-6-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C9.2 2 7 4.2 7 7v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-1V7c0-2.8-2.2-5-5-5z" />
                </svg>
                Huella Digital
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
              Se enviará un código de verificación de 6 dígitos a tu correo para que puedas establecer una nueva contraseña.
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

        {/* ── SETUP: NUEVA CONTRASEÑA (código recibido por email + nueva contraseña) ── */}
        {screen === 'setup-password' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Nueva Contraseña</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">ADMINISTRADOR · FABRICK</p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-xs leading-relaxed">
              Ingresa el código de 6 dígitos enviado a <span className="text-yellow-400/80">{setupEmail}</span> y tu nueva contraseña.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[10px] tracking-widest uppercase">Código de verificación</label>
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
