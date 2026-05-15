'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';

type VisualTheme = 'scifi' | 'corporate';

const FUTURISTIC_CITY_VIDEO =
  'https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_30fps.mp4';

export default function UnirsePage() {
  const [theme, setTheme] = useState<VisualTheme>('scifi');
  // step 1 = email+code, step 2 = password form, step 3 = success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function resetMessages() {
    setError('');
  }

  function applyTheme(nextTheme: VisualTheme) {
    setTheme(nextTheme);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('theme', nextTheme);
    window.history.replaceState({}, '', url.toString());
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const rawTheme = params.get('theme');
    if (rawTheme === 'corporate' || rawTheme === 'scifi') setTheme(rawTheme);

    // If the invite link includes ?token=xxx, skip the email/code step entirely
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
      setStep(2);
    }
  }, []);

  async function handleStep1() {
    resetMessages();
    if (!email || !codigo) {
      setError('Email y código son requeridos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un email válido.');
      return;
    }
    if (codigo.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();

    if (!password || !confirmPassword) {
      setError('Contraseña es requerida.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const body = token
        ? { token, password, nombre }
        : { email: email.trim().toLowerCase(), codigo, password, nombre };

      const res = await fetch('/api/admin/invitations/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al canjear invitación.');
        return;
      }

      setStep(3);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const isCorporate = theme === 'corporate';

  const inputClass = isCorporate
    ? 'w-full bg-black/25 border border-white/20 rounded-2xl px-4 py-4 text-white text-base placeholder:text-white/35 focus:outline-none focus:border-white/45 focus:bg-black/35 transition-all disabled:opacity-40 min-h-[52px]'
    : 'w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-4 text-white text-base placeholder:text-white/35 focus:outline-none focus:border-yellow-300/70 focus:bg-black/55 transition-all disabled:opacity-40 min-h-[52px]';
  const buttonClass = isCorporate
    ? 'w-full bg-white text-black font-bold uppercase tracking-widest rounded-full px-6 py-4 text-sm shadow-[0_10px_24px_rgba(255,255,255,0.18)] hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px]'
    : 'w-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 text-black font-bold uppercase tracking-widest rounded-full px-6 py-4 text-sm shadow-[0_10px_24px_rgba(250,204,21,0.35)] hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px]';

  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-hidden bg-black">
      {!isCorporate && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover opacity-30 pointer-events-none"
          src={FUTURISTIC_CITY_VIDEO}
        />
      )}
      <div className={isCorporate
        ? 'absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(255,255,255,0.09),rgba(0,0,0,0)_38%),radial-gradient(circle_at_78%_85%,rgba(255,255,255,0.07),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.92))]'
        : 'absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(56,189,248,0.2),rgba(0,0,0,0)_38%),radial-gradient(circle_at_80%_85%,rgba(250,204,21,0.16),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(0,0,0,0.26),rgba(0,0,0,0.9))]'} />
      <div className={isCorporate
        ? 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_10px] opacity-15'
        : 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:100%_9px] opacity-20'} />

      {/* Scroll container — handles keyboard-safe layout on iOS */}
      <div className="relative z-10 flex min-h-screen min-h-[100dvh] flex-col items-center justify-start overflow-y-auto px-4 py-10 sm:justify-center">
        <div className="w-full max-w-md">

          {/* Theme toggle */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-black/35 p-1 text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm">
              <button
                type="button"
                onClick={() => applyTheme('corporate')}
                className={`rounded-full px-3 py-1.5 font-semibold transition ${isCorporate ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'}`}
              >
                Sobrio
              </button>
              <button
                type="button"
                onClick={() => applyTheme('scifi')}
                className={`rounded-full px-3 py-1.5 font-semibold transition ${!isCorporate ? 'bg-yellow-400 text-black' : 'text-zinc-300 hover:text-white'}`}
              >
                Sci-Fi
              </button>
            </div>
          </div>

          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-3 select-none">
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
              : 'text-[10px] uppercase tracking-[0.34em] text-white/45'}>Evolution access panel</span>
          </div>

          {/* Card */}
          <div className={isCorporate
            ? 'w-full rounded-[2rem] border border-white/25 bg-zinc-900/65 p-6 sm:p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl'
            : 'w-full rounded-[2rem] border border-white/20 bg-black/55 p-6 sm:p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl'}>

            {step === 3 ? (
              <>
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>

                <div className="text-center mb-8">
                  <h1 className="text-white text-xl font-bold tracking-wide">¡Acceso Concedido!</h1>
                  <p className="text-zinc-500 text-xs mt-2 tracking-wider">TU CUENTA ESTÁ LISTA</p>
                </div>

                <div className="mb-6 px-4 py-3 rounded-2xl bg-green-400/10 border border-green-400/30 text-green-400 text-sm">
                  Tu contraseña fue guardada. Ya puedes iniciar sesión con tu email y la contraseña que acabas de crear.
                </div>

                <Link href="/admin/login" className={buttonClass + ' block text-center'}>
                  Ir al Login
                </Link>
              </>
            ) : (
              <>
                <div className="text-center mb-7">
                  <h1 className="text-white text-xl font-bold tracking-wide">Únete al Panel</h1>
                  <p className="text-zinc-500 text-xs mt-1 tracking-wider">
                    {token ? 'CREA TU CONTRASEÑA' : 'CANJEA TU INVITACIÓN'}
                  </p>
                </div>

                {error && (
                  <div className="mb-5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {step === 1 && (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-white/50 text-[10px] tracking-widest uppercase">Email</label>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmail(email.trim().toLowerCase())}
                        placeholder="tu@email.com"
                        required
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-white/50 text-[10px] tracking-widest uppercase">Código de 6 dígitos</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        required
                        className={inputClass + ' font-mono text-xl tracking-[0.5em] text-center'}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleStep1}
                      className={buttonClass}
                    >
                      Continuar
                    </button>

                    <Link
                      href="/admin/login"
                      className="text-center text-sm text-zinc-500 hover:text-yellow-400 transition-colors py-1"
                    >
                      Ya tengo cuenta
                    </Link>
                  </div>
                )}

                {step === 2 && (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-white/50 text-[10px] tracking-widest uppercase">Nombre (opcional)</label>
                      <input
                        type="text"
                        autoComplete="name"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Tu nombre"
                        disabled={loading}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-white/50 text-[10px] tracking-widest uppercase">Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          required
                          disabled={loading}
                          className={inputClass + ' pr-12'}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors touch-manipulation"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-white/50 text-[10px] tracking-widest uppercase">Confirmar contraseña</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite tu contraseña"
                          required
                          disabled={loading}
                          className={inputClass + ' pr-12'}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors touch-manipulation"
                          aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password strength indicator */}
                    {password.length > 0 && (
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((level) => {
                          const strength = password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) ? 4
                            : password.length >= 10 && (/[A-Z]/.test(password) || /\d/.test(password)) ? 3
                            : password.length >= 8 ? 2 : 1;
                          return (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                level <= strength
                                  ? strength >= 4 ? 'bg-green-400' : strength >= 3 ? 'bg-yellow-400' : strength >= 2 ? 'bg-orange-400' : 'bg-red-400'
                                  : 'bg-white/10'
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={buttonClass}
                    >
                      {loading ? 'Procesando...' : 'Crear mi contraseña'}
                    </button>

                    {!token && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        disabled={loading}
                        className="text-center text-sm text-zinc-500 hover:text-yellow-400 transition-colors py-1"
                      >
                        Volver
                      </button>
                    )}
                  </form>
                )}
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600 tracking-wider pb-4">
            © 2025 Soluciones Fabrick
          </p>
        </div>
      </div>
    </div>
  );
}
