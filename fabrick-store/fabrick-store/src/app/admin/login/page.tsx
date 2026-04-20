'use client';

import { useState, useTransition } from 'react';
import { loginAdmin } from './actions';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await loginAdmin(email, password);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-[0.25em] uppercase mb-2"
            style={{ color: '#c9a96e' }}
          >
            SOLUCIONES FABRICK
          </h1>
          <p className="text-white/50 text-sm tracking-widest uppercase">
            Panel Administrativo
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col gap-5"
        >
          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-white/50 text-xs tracking-widest uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@fabrick.cl"
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c9a96e]/60 transition-colors duration-200"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-white/50 text-xs tracking-widest uppercase">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#c9a96e]/60 transition-colors duration-200"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 rounded-xl text-black text-sm font-bold tracking-[0.15em] uppercase transition-opacity duration-200 disabled:opacity-60"
            style={{ backgroundColor: '#c9a96e' }}
          >
            {isPending ? 'Verificando...' : 'Ingresar al Panel'}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-white/25 text-xs mt-6">
          Acceso restringido — Solo personal autorizado Fabrick
        </p>
      </div>
    </div>
  );
}
