'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

type VisualTheme = 'scifi' | 'corporate';

const FUTURISTIC_CITY_VIDEO =
  'https://videos.pexels.com/video-files/3129957/3129957-hd_1920_1080_30fps.mp4';

export default function UnirsePage() {
  const [theme, setTheme] = useState<VisualTheme>('scifi');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const rawTheme = new URLSearchParams(window.location.search).get('theme');
    if (rawTheme === 'corporate' || rawTheme === 'scifi') {
      setTheme(rawTheme);
    }
  }, []);

  async function handleStep1() {
    resetMessages();
    if (!email || !codigo) {
      setError('Email y código son requeridos.');
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
      const res = await fetch('/api/admin/invitations/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), codigo, password, nombre }),
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
    ? 'bg-black/25 border border-white/20 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-white/45 focus:bg-black/35 transition-all disabled:opacity-40'
    : 'bg-black/40 border border-white/15 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-yellow-300/70 focus:bg-black/55 transition-all disabled:opacity-40';
  const buttonClass = isCorporate
    ? 'bg-white text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm shadow-[0_10px_24px_rgba(255,255,255,0.18)] hover:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
    : 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm shadow-[0_10px_24px_rgba(250,204,21,0.35)] hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed';

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
            : 'text-[10px] uppercase tracking-[0.34em] text-white/45'}>Evolution access panel</span>
        </div>

        {/* Card */}
        <div className={isCorporate
          ? 'w-full rounded-[2rem] border border-white/25 bg-zinc-900/65 p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl cinematic-panel-enter'
          : 'w-full rounded-[2rem] border border-white/20 bg-black/55 p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl cinematic-panel-enter'}>
        {step === 3 ? (
          <>
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-white text-xl font-bold tracking-wide">¡Registro Completado!</h1>
              <p className="text-zinc-500 text-xs mt-2 tracking-wider">TU ACCESO ESTÁ PENDIENTE DE APROBACIÓN</p>
            </div>

            <div className="mb-6 px-4 py-3 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs">
              Un superadministrador debe aprobar tu cuenta antes de que puedas iniciar sesión.
            </div>

            <Link href="/admin/login" className={buttonClass + " block text-center w-full"}>
              Ir al Login
            </Link>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-white text-xl font-bold tracking-wide">Únete al Panel</h1>
              <p className="text-zinc-500 text-xs mt-1 tracking-wider">CANJEA TU INVITACIÓN</p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-white/50 text-[10px] tracking-widest uppercase">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-white/50 text-[10px] tracking-widest uppercase">Código de 6 dígitos</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className={inputClass + " font-mono text-lg tracking-[0.5em] text-center"}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleStep1}
                  className={buttonClass + " w-full"}
                >
                  Continuar
                </button>

                <Link 
                  href="/admin/login" 
                  className="text-center text-xs text-zinc-500 hover:text-yellow-400 transition-colors"
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
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
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
                    placeholder="Mínimo 8 caracteres"
                    required
                    disabled={loading}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-white/50 text-[10px] tracking-widest uppercase">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    required
                    disabled={loading}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={buttonClass + " w-full"}
                >
                  {loading ? 'Procesando...' : 'Completar Registro'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="text-center text-xs text-zinc-500 hover:text-yellow-400 transition-colors"
                >
                  Volver
                </button>
              </form>
            )}
          </>
        )}
        </div>
      </div>

      <p className="relative z-10 mt-6 text-xs text-zinc-500 tracking-wider">
        © 2025 Soluciones Fabrick
      </p>
    </div>
  );
}
