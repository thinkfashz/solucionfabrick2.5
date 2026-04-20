'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function UnirsePage() {
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

  const inputClass = "bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 transition-all disabled:opacity-40";
  const buttonClass = "bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-yellow-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed";

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

      <p className="mt-6 text-xs text-zinc-600 tracking-wider">
        © 2025 Soluciones Fabrick
      </p>
    </div>
  );
}
