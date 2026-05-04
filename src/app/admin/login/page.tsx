'use client';

import { useEffect, useState } from 'react';
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
type VisualTheme = 'scifi' | 'corporate';

const FUTURISTIC_CITY_VIDEO =
  'https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_30fps.mp4';

export default function AdminLoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('login');
  const [theme, setTheme] = useState<VisualTheme>('scifi');
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
        // Ignore â€” fall through to the login form.
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
      setSuccess('Tu sesiÃ³n se cerrÃ³ automÃ¡ticamente tras 10 minutos de inactividad.');
    }
    const rawTheme = params.get('theme');
    if (rawTheme === 'corporate' || rawTheme === 'scifi') {
      setTheme(rawTheme);
    }
  }, []);

  function applyTheme(nextTheme: VisualTheme) {
    setTheme(nextTheme);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('theme', nextTheme);
    window.history.replaceState({}, '', url.toString());
  }

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
      // page, and `res.json()` would throw â€” masking the real HTTP status as a
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
            : 'Error al iniciar sesiÃ³n.';
        setError(json.error ?? fallback);
        if (res.status === 429) setIsBlocked(true);
        return;
      }

      router.replace('/admin');
    } catch {
      setError('Error de red. IntÃ©ntalo de nuevo.');
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
      setSuccess('Bloqueo eliminado. Ya puedes intentar iniciar sesiÃ³n.');
    } catch {
      setError('Error de red. IntÃ©ntalo de nuevo.');
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
      setSuccess('CÃ³digo enviado. Revisa tu bandeja de entrada (y carpeta de spam).');
      setOtp('');
      setScreen('setup-password');
    } catch (err) {
      // Surface the real cause instead of a blanket "Error de red" so the
      // operator can tell apart network failures from CSP blocks, missing
      // NEXT_PUBLIC_INSFORGE_* env vars (which make the SDK throw on first
      // use), or unexpected SDK errors.
      const message = err instanceof Error ? err.message : String(err);
      setError(`No se pudo enviar el cÃ³digo: ${message}`);
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
        setError(exchangeErr?.message ?? 'CÃ³digo invÃ¡lido o expirado.');
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

      setSuccess('Â¡ContraseÃ±a configurada! Ya puedes iniciar sesiÃ³n.');
      setEmail(setupEmail.trim().toLowerCase());
      setScreen('login');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`No se pudo completar la recuperaciÃ³n: ${message}`);
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
        // Account already exists â€” still clear any IP lockout so the user
        // can proceed directly to login / reset from here.
        await requestUnlock();
        setError(json.message ?? 'La cuenta ya existe. Usa la opciÃ³n de recuperaciÃ³n.');
        return;
      }

      await requestUnlock();

      setSuccess(json.message ?? 'Â¡Cuenta creada! Ya puedes iniciar sesiÃ³n.');
      setEmail('f.eduardomicolta@gmail.com');
      setScreen('login');
    } catch {
      setError('Error de red. IntÃ©ntalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const isCorporate = theme === 'corporate';

  const inputClass = isCorporate
    ? 'bg-black/25 border border-white/20 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-white/45 focus:bg-black/35 transition-all disabled:opacity-40'
    : 'bg-black/40 border border-white/15 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-yellow-300/70 focus:bg-black/55 transition-all disabled:opacity-40';

  const primaryButtonClass = isCorporate
    ? 'w-full py-4 rounded-full bg-white text-black text-sm font-bold tracking-[0.2em] uppercase shadow-[0_10px_24px_rgba(255,255,255,0.18)] hover:brightness-95 transition-all disabled:opacity-60'
    : 'w-full py-4 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 text-black text-sm font-bold tracking-[0.2em] uppercase shadow-[0_10px_24px_rgba(250,204,21,0.35)] hover:brightness-105 transition-all disabled:opacity-60';

  const biometricButtonClass = isCorporate
    ? 'w-full py-3 rounded-full border border-white/25 bg-white/10 text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/15 transition-colors disabled:opacity-60 mt-2'
    : 'w-full py-3 rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 text-xs font-bold tracking-[0.2em] uppercase hover:bg-cyan-300/20 transition-colors disabled:opacity-60 mt-2';

  if (checkingSession) {
    return <BootSecurityScreen />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-4 py-12">
      {!isCorporate && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          src={FUTURISTIC_CITY_VIDEO}
        />
      )}
      <div className={isCorporate
        ? 'absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(255,255,255,0.09),rgba(0,0,0,0)_38%),radial-gradient(circle_at_78%_85%,rgba(255,255,255,0.07),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.92))]'
        : 'absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(56,189,248,0.2),rgba(0,0,0,0)_38%),radial-gradient(circle_at_80%_85%,rgba(250,204,21,0.16),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(0,0,0,0.26),rgba(0,0,0,0.9))]'} />
      <div className={isCorporate
        ? 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_10px] opacity-15'
        : 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:100%_9px] opacity-20'} />
      <div className={isCorporate
        ? 'pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-white/10 blur-[90px]'
        : 'pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-sky-400/20 blur-[90px]'} />
      <div className={isCorporate
        ? 'pointer-events-none absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-zinc-200/10 blur-[90px]'
        : 'pointer-events-none absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-yellow-300/20 blur-[90px]'} />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-center">
        <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-black/35 p-1 text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => applyTheme('corporate')}
            className={`rounded-full px-3 py-1 font-semibold transition ${isCorporate ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'}`}
          >
            Sobrio
          </button>
          <button
            type="button"
            onClick={() => applyTheme('scifi')}
            className={`rounded-full px-3 py-1 font-semibold transition ${!isCorporate ? 'bg-yellow-400 text-black' : 'text-zinc-300 hover:text-white'}`}
          >
            Sci-Fi
          </button>
        </div>

        {/* Logo */}
        <div className="mb-7 flex flex-col items-center gap-3 select-none">
          <span className={isCorporate
            ? 'relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_10px_34px_rgba(255,255,255,0.22)]'
            : 'relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/40 bg-yellow-400 shadow-[0_10px_34px_rgba(250,204,21,0.45)]'}>
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.45),rgba(255,255,255,0)_56%)]" />
            <span className="relative text-sm font-black uppercase tracking-[0.28em] text-black">SF</span>
          </span>
          <span className={isCorporate
            ? 'font-playfair text-xl font-black tracking-[0.24em] text-white'
            : 'font-playfair text-xl font-black tracking-[0.24em] text-yellow-300'}>
            SOLUCIONES FABRICK
          </span>
          <span className={isCorporate
            ? 'text-[10px] uppercase tracking-[0.34em] text-white/55'
            : 'text-[10px] uppercase tracking-[0.34em] text-white/45'}>Control room access</span>
        </div>

        {/* Card */}
        <div className={isCorporate
          ? 'w-full rounded-[2rem] border border-white/25 bg-zinc-900/65 p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl cinematic-panel-enter'
          : 'w-full rounded-[2rem] border border-white/20 bg-black/55 p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl cinematic-panel-enter'}>
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-6">
          <LockIcon />
        </div>

        {/* â”€â”€ LOGIN â”€â”€ */}
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
                <label className="text-white/50 text-[10px] tracking-widest uppercase">ContraseÃ±a</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                className={`${primaryButtonClass} mt-1`}
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
                  setSuccess('Registra tu huella desde /admin/equipo (prÃ³ximamente).');
                }}
                disabled={loading}
                className={biometricButtonClass}
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
                Â¿ContraseÃ±a olvidada? Recuperar â†’
              </button>
              <button
                onClick={() => { resetMessages(); setScreen('init-account'); }}
                className="w-full text-center text-zinc-500 hover:text-zinc-300 text-xs transition-colors duration-300"
              >
                Primera vez Â· Crear cuenta â†’
              </button>
            </div>
          </>
        )}

        {/* â”€â”€ INIT ACCOUNT (primera vez) â”€â”€ */}
        {screen === 'init-account' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Crear Cuenta Admin</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">PRIMERA CONFIGURACIÃ“N</p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-yellow-400/5 border border-yellow-400/20 text-yellow-200/70 text-xs leading-relaxed">
              Esto crearÃ¡ la cuenta de administrador en InsForge con la contraseÃ±a configurada y la sincronizarÃ¡ con la base de datos. Solo funciona si la cuenta aÃºn no existe.
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
              className={primaryButtonClass}
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
              â† Volver al inicio de sesiÃ³n
            </button>
          </div>
        )}

        {/* â”€â”€ SETUP: ENVIAR CÃ“DIGO â”€â”€ */}
        {screen === 'setup-send' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Recuperar ContraseÃ±a</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">VERIFICACIÃ“N POR EMAIL</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[10px] tracking-widest uppercase">Email del administrador</label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="admin@ejemplo.com"
                title="Email del administrador"
              />
            </div>

            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-xs leading-relaxed">
              Se enviarÃ¡ un cÃ³digo de verificaciÃ³n de 6 dÃ­gitos a tu correo para que puedas establecer una nueva contraseÃ±a.
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
              className={primaryButtonClass}
            >
              {loading ? 'Enviando...' : 'Enviar cÃ³digo de verificaciÃ³n'}
            </button>

            <button
              onClick={() => { resetMessages(); setScreen('login'); }}
              className="text-zinc-500 hover:text-white text-xs text-center transition-colors"
            >
              â† Volver al inicio de sesiÃ³n
            </button>
          </div>
        )}

        {/* â”€â”€ SETUP: NUEVA CONTRASEÃ‘A (cÃ³digo recibido por email + nueva contraseÃ±a) â”€â”€ */}
        {screen === 'setup-password' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-wide">Nueva ContraseÃ±a</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">ADMINISTRADOR Â· FABRICK</p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-xs leading-relaxed">
              Ingresa el cÃ³digo de 6 dÃ­gitos enviado a <span className="text-yellow-400/80">{setupEmail}</span> y tu nueva contraseÃ±a.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[10px] tracking-widest uppercase">CÃ³digo de verificaciÃ³n</label>
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
              <label className="text-white/50 text-[10px] tracking-widest uppercase">Nueva contraseÃ±a</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="MÃ­nimo 6 caracteres"
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
              className={primaryButtonClass}
            >
              {loading ? 'Guardando...' : 'Establecer contraseÃ±a'}
            </button>

            <button
              onClick={() => { resetMessages(); setScreen('setup-send'); }}
              className="text-zinc-500 hover:text-white text-xs text-center transition-colors"
            >
              â† Solicitar otro cÃ³digo
            </button>
          </div>
        )}
      </div>
      </div>

      <p className="relative z-10 mt-8 text-white/15 text-[10px] text-center tracking-widest uppercase">
        Acceso exclusivo Â· Soluciones Fabrick
      </p>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * BootSecurityScreen
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Pantalla de verificaciÃ³n de sesiÃ³n / arranque seguro inspirada en el
 * boot de MacBook / BlackBerry: logotipo central, barra de progreso fina
 * tipo Apple, lÃ­neas de estado secuenciadas (kernel Â· auth Â· vault), reloj
 * y ID de mÃ¡quina. Sustituye al spinner genÃ©rico anterior.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BootSecurityScreen() {
  const STEPS = [
    'Boot ROM Â· verificando firma criptogrÃ¡fica',
    'Kernel Â· cargando mÃ³dulos seguros',
    'TLS 1.3 Â· estableciendo canal cifrado',
    'InsForge Â· sincronizando bÃ³veda',
    'Identidad Â· validando sesiÃ³n administrativa',
  ];
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [clock, setClock] = useState('');

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 2400;
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      const idx = Math.min(STEPS.length - 1, Math.floor((p / 100) * STEPS.length));
      setStepIndex(idx);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString('es-CL', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const machineId = 'SF-ADMIN-' + (typeof window !== 'undefined'
    ? (window.location.hostname.split('.')[0] || 'local').toUpperCase().slice(0, 8)
    : 'LOCAL');

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* â”€â”€ Fondo cinematogrÃ¡fico â”€â”€ */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.18),rgba(0,0,0,0.9)_46%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.10),rgba(0,0,0,0)_45%),linear-gradient(180deg,rgba(0,0,0,0.6),rgba(0,0,0,0.96))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:100%_3px] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      {/* â”€â”€ Status bar superior (BlackBerry vibe) â”€â”€ */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4 text-[9px] font-mono uppercase tracking-[0.28em] text-white/40">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Secure boot Â· v3.2.1
        </span>
        <span className="hidden sm:inline">{machineId}</span>
        <span className="tabular-nums">{clock || '--:--:--'}</span>
      </div>

      {/* â”€â”€ Contenido central â”€â”€ */}
      <div className="relative z-10 flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center px-6">
        {/* Logo SF estilo Apple boot */}
        <div className="relative mb-10 flex flex-col items-center gap-4">
          <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.7rem] border border-yellow-300/40 bg-yellow-400 shadow-[0_18px_60px_rgba(250,204,21,0.45)]">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.55),rgba(255,255,255,0)_58%)]" />
            <span
              className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent [animation:sf-boot-sweep_2.4s_ease-in-out_infinite]"
            />
            <span className="relative font-playfair text-2xl font-black uppercase tracking-[0.28em] text-black">SF</span>
          </span>
          <div className="flex flex-col items-center gap-1">
            <p className="font-playfair text-sm font-black tracking-[0.36em] text-yellow-300">SOLUCIONES FABRICK</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.42em] text-white/40">Secure Admin Â· macOS-style boot</p>
          </div>
        </div>

        {/* Barra de progreso estilo Apple */}
        <div className="relative w-[min(420px,82vw)]">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-200 to-white shadow-[0_0_14px_rgba(250,204,21,0.65)] transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.32em] text-white/45 tabular-nums">
            <span>{Math.round(progress).toString().padStart(3, '0')}%</span>
            <span>step {stepIndex + 1}/{STEPS.length}</span>
          </div>
        </div>

        {/* LÃ­nea de estado activa */}
        <p className="mt-6 min-h-[1.25rem] text-[11px] font-mono tracking-[0.18em] text-white/65">
          <span className="text-yellow-300">{'>'}</span> {STEPS[stepIndex]}
          <span
            className="ml-1 inline-block h-3 w-1.5 -translate-y-px bg-yellow-300/80 align-middle [animation:sf-boot-cursor_1s_steps(2)_infinite]"
          />
        </p>

        {/* Lista de chequeos completados (BlackBerry boot vibe) */}
        <div className="mt-8 flex w-[min(420px,82vw)] flex-col gap-1.5 text-[10px] font-mono tracking-[0.14em] text-white/45">
          {STEPS.slice(0, stepIndex).map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-green-400">âœ“</span>
              <span className="truncate">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="relative z-10 pb-5 text-center text-[9px] font-mono uppercase tracking-[0.42em] text-white/25">
        Â© Soluciones Fabrick Â· Encrypted control room
      </p>

      <style jsx>{`
        @keyframes sf-boot-sweep {
          0%   { transform: translateX(0%); }
          60%  { transform: translateX(420%); }
          100% { transform: translateX(420%); }
        }
        @keyframes sf-boot-cursor {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
