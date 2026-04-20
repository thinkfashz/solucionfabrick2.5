'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function LockIcon() {
  return (
    <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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

        <div className="text-center mb-8">
          <h1 className="text-white text-xl font-bold tracking-wide">Panel Administrador</h1>
          <p className="text-zinc-500 text-xs mt-1 tracking-wider">ACCESO RESTRINGIDO</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-white/50 text-[10px] tracking-widest uppercase">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@fabrick.cl"
              required
              disabled={loading}
              className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all disabled:opacity-40"
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
              className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-yellow-400/60 transition-all disabled:opacity-40"
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
      </div>

      <p className="relative z-10 mt-8 text-white/15 text-[10px] text-center tracking-widest uppercase">
        Acceso exclusivo · Soluciones Fabrick
      </p>
    </div>
  );
}
