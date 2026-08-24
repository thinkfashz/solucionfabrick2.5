'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Fingerprint, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { AdminAccessLoader } from '@/components/admin/AdminAccessLoader';

type Screen = 'login' | 'setup-send' | 'setup-password' | 'init-account';

const PLATFORM_AREAS = [
  'Ventas y CRM',
  'Clientes',
  'Inventario',
  'Finanzas',
  'Marketing',
  'Fabrick Intelligence',
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [initSecret, setInitSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [success, setSuccess] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
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
        // The login form remains available if the session check is unreachable.
      }

      if (!cancelled) setCheckingSession(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  async function handlePasskeyLogin() {
    resetMessages();
    if (typeof window === 'undefined') return;

    if (!window.PublicKeyCredential || !navigator.credentials) {
      setError('Tu dispositivo no soporta autenticación biométrica.');
      return;
    }

    setLoading(true);
    try {
      const optRes = await fetch('/api/admin/passkeys/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() || undefined }),
      });
      const optData = (await optRes.json().catch(() => ({}))) as { error?: string };

      if (!optRes.ok) {
        setError(optData.error ?? 'No se pudo iniciar la autenticación biométrica.');
        return;
      }

      const { startAuthentication } = await import('@simplewebauthn/browser');
      let assertion;
      try {
        assertion = await startAuthentication({
          optionsJSON: optData as Parameters<typeof startAuthentication>[0]['optionsJSON'],
        });
      } catch (err) {
        const authError = err as Error;
        setError(
          authError.name === 'NotAllowedError'
            ? 'Operación cancelada.'
            : 'No se pudo completar la autenticación biométrica.',
        );
        return;
      }

      const verRes = await fetch('/api/admin/passkeys/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });
      const verData = (await verRes.json().catch(() => ({}))) as { error?: string };

      if (!verRes.ok) {
        setError(verData.error ?? 'Autenticación biométrica fallida.');
        if (verRes.status === 429) setIsBlocked(true);
        return;
      }

      router.replace('/admin');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(json.error ?? (res.status >= 500 ? 'Error del servidor.' : 'Error al iniciar sesión.'));
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

  async function handleSetupSend() {
    resetMessages();
    setLoading(true);

    try {
      const { error: sendError } = await insforge.auth.sendResetPasswordEmail({
        email: setupEmail.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/admin/login`,
      });

      if (sendError) {
        setError(sendError.message);
        return;
      }

      setOtp('');
      setSuccess('Código enviado. Revisa tu bandeja de entrada y la carpeta de spam.');
      setScreen('setup-password');
    } catch (err) {
      setError(`No se pudo enviar el código: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupPassword() {
    resetMessages();
    setLoading(true);

    try {
      const { data, error: exchangeError } = await insforge.auth.exchangeResetPasswordToken({
        email: setupEmail.trim().toLowerCase(),
        code: otp,
      });

      if (exchangeError || !data?.token) {
        setError(exchangeError?.message ?? 'Código inválido o expirado.');
        return;
      }

      const finalizeRes = await fetch('/api/admin/recover/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: setupEmail.trim().toLowerCase(),
          otp_token: data.token,
          newPassword,
        }),
      });
      const finalizeData = (await finalizeRes.json().catch(() => ({}))) as { error?: string };

      if (!finalizeRes.ok) {
        setError(finalizeData.error ?? 'No se pudo completar la recuperación.');
        return;
      }

      setEmail(setupEmail.trim().toLowerCase());
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión.');
      setScreen('login');
    } catch (err) {
      setError(`No se pudo completar la recuperación: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitAccount() {
    resetMessages();
    if (!initSecret.trim()) {
      setError('Ingresa el secreto de inicialización configurado para el entorno.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/init-account', {
        method: 'POST',
        headers: { 'x-admin-init-secret': initSecret.trim() },
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        alreadyExists?: boolean;
        message?: string;
      };

      if (!res.ok) {
        setError(json.error ?? 'Error al inicializar la cuenta.');
        return;
      }
      if (json.alreadyExists) {
        setError(json.message ?? 'La cuenta ya existe. Usa la opción de recuperación.');
        return;
      }

      setInitSecret('');
      setSuccess(json.message ?? 'Cuenta creada. Ya puedes iniciar sesión.');
      setScreen('login');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <AdminAccessLoader
        title="Verificando sesión"
        description="Comprobando tu acceso antes de mostrar el panel administrativo."
      />
    );
  }

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none transition focus:border-amber-400/45 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-400/15 disabled:opacity-40';

  return (
    <main className="min-h-screen bg-[#08090A] text-white lg:grid lg:grid-cols-[minmax(360px,0.82fr)_minmax(480px,1.18fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden border-r border-white/[0.06] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 top-16 h-[30rem] w-[30rem] rounded-full bg-amber-500/[0.08] blur-[120px]" />
        </div>

        <div className="relative z-10">
          <FabrickFullLogo priority tagline="Panel administrativo" theme="light" />
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300/70">Centro de control</p>
          <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-[-0.045em] xl:text-5xl">
            Tu operación,
            <br />
            en un solo lugar.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/42">
            Acceso directo a las áreas operativas que ya forman parte de Fabrick, sin pantallas de carga simuladas ni módulos ficticios.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-x-7 gap-y-4">
            {PLATFORM_AREAS.map((area) => (
              <div key={area} className="flex items-center gap-2.5 text-sm text-white/58">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                {area}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 border-t border-white/[0.06] pt-6 text-[10px] uppercase tracking-[0.22em] text-white/28">
          <ShieldCheck className="h-4 w-4 text-amber-300/70" />
          Sesión protegida · Acceso administrativo
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-[-8rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-amber-500/[0.07] blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-[430px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <FabrickFullLogo priority tagline="Panel administrativo" theme="light" />
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-zinc-900/55 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <header className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/[0.08]">
                  <Lock className="h-4 w-4 text-amber-300" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">
                    {screen === 'login'
                      ? 'Acceso seguro'
                      : screen === 'setup-send'
                        ? 'Recuperar acceso'
                        : screen === 'setup-password'
                          ? 'Nueva contraseña'
                          : 'Configuración inicial'}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/28">Panel Root Fabrick</p>
                </div>
              </div>
            </header>

            <div className="px-6 py-7 sm:px-8">
              {screen === 'login' && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {success && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3 text-[12px] text-emerald-200">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {success}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">Email</label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@tudominio.com"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">Contraseña</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="text-[10px] text-white/28 transition hover:text-white/55"
                      >
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12px] leading-5 text-red-200">
                      {error}
                      {isBlocked && (
                        <p className="mt-2 text-red-200/65">
                          Espera antes de volver a intentarlo o utiliza la recuperación por correo.
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-amber-200 disabled:opacity-55"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando…</> : 'Acceder al panel'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handlePasskeyLogin()}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.025] py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:bg-white/[0.05] hover:text-white/80 disabled:opacity-40"
                  >
                    <Fingerprint className="h-4 w-4" />
                    Huella / Face ID
                  </button>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { resetMessages(); setScreen('setup-send'); }}
                      className="text-center text-[11px] text-amber-300/65 transition hover:text-amber-300"
                    >
                      ¿Olvidaste tu contraseña? Recuperar →
                    </button>
                    <button
                      type="button"
                      onClick={() => { resetMessages(); setScreen('init-account'); }}
                      className="text-center text-[11px] text-white/22 transition hover:text-white/48"
                    >
                      Configuración inicial →
                    </button>
                  </div>
                </form>
              )}

              {screen === 'init-account' && (
                <div className="flex flex-col gap-4">
                  <p className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.055] px-4 py-3 text-[12px] leading-5 text-amber-100/62">
                    Esta opción está reservada para la creación inicial de la cuenta administrativa y deja de ser útil cuando la cuenta ya existe.
                  </p>
                  <input
                    type="password"
                    value={initSecret}
                    onChange={(event) => setInitSecret(event.target.value)}
                    placeholder="Secreto de inicialización"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={loading}
                    className={inputClass}
                  />
                  {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12px] text-red-200">{error}</div>}
                  {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3 text-[12px] text-emerald-200">{success}</div>}
                  <button
                    onClick={() => void handleInitAccount()}
                    disabled={loading || !initSecret.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-amber-200 disabled:opacity-55"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</> : 'Inicializar cuenta'}
                  </button>
                  <button onClick={() => { resetMessages(); setScreen('login'); }} className="text-center text-[11px] text-white/30 hover:text-white/60">← Volver</button>
                </div>
              )}

              {screen === 'setup-send' && (
                <div className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">Email del administrador</label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={setupEmail}
                      onChange={(event) => setSetupEmail(event.target.value)}
                      disabled={loading}
                      className={inputClass}
                      placeholder="admin@ejemplo.com"
                    />
                  </div>
                  <p className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white/38">
                    Enviaremos un código de 6 dígitos al correo registrado para establecer una nueva contraseña.
                  </p>
                  {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12px] text-red-200">{error}</div>}
                  {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3 text-[12px] text-emerald-200">{success}</div>}
                  <button
                    onClick={() => void handleSetupSend()}
                    disabled={loading || !setupEmail.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-amber-200 disabled:opacity-55"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : 'Enviar código'}
                  </button>
                  <button onClick={() => { resetMessages(); setScreen('login'); }} className="text-center text-[11px] text-white/30 hover:text-white/60">← Volver</button>
                </div>
              )}

              {screen === 'setup-password' && (
                <div className="flex flex-col gap-4">
                  <p className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white/38">
                    Código enviado a <span className="text-amber-300/80">{setupEmail}</span>.
                  </p>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">Código de 6 dígitos</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      disabled={loading}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-center text-2xl font-bold tracking-[0.48em] text-white placeholder-white/15 outline-none transition focus:border-amber-400/45 focus:ring-1 focus:ring-amber-400/15 disabled:opacity-40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">Nueva contraseña</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                  {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[12px] text-red-200">{error}</div>}
                  <button
                    onClick={() => void handleSetupPassword()}
                    disabled={loading || otp.length !== 6 || newPassword.length < 6}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-amber-200 disabled:opacity-55"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Establecer contraseña'}
                  </button>
                  <button onClick={() => { resetMessages(); setScreen('setup-send'); }} className="text-center text-[11px] text-white/30 hover:text-white/60">← Solicitar otro código</button>
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-[9px] uppercase tracking-[0.32em] text-white/16">
            Acceso exclusivo · Soluciones Fabrick
          </p>
        </div>
      </section>
    </main>
  );
}
