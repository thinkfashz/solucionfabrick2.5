'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ShieldOff, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export default function AccesoDemoPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('token') ?? '';
    if (!t) { setTokenMissing(true); return; }
    setToken(t);
  }, []);

  async function handleAccess() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/demo/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Error al acceder al demo.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace('/admin'), 1200);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center px-4 py-12">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.18),rgba(0,0,0,0)_40%),radial-gradient(circle_at_78%_80%,rgba(250,204,21,0.14),rgba(0,0,0,0)_44%),linear-gradient(180deg,rgba(0,0,0,0.3),rgba(0,0,0,0.95))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_9px] opacity-20" />
      <div className="pointer-events-none absolute -left-20 top-16 h-80 w-80 rounded-full bg-sky-400/15 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-80 w-80 rounded-full bg-yellow-300/15 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 select-none">
          <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/40 bg-yellow-400 shadow-[0_10px_34px_rgba(250,204,21,0.45)]">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.45),rgba(255,255,255,0)_56%)]" />
            <span className="relative text-sm font-black uppercase tracking-[0.28em] text-black">SF</span>
          </span>
          <span className="font-playfair text-xl font-black tracking-[0.24em] text-yellow-300">SOLUCIONES FABRICK</span>
          <span className="text-[10px] uppercase tracking-[0.34em] text-white/40">Panel de administración</span>
        </div>

        {/* Card */}
        <div className="w-full rounded-[2rem] border border-white/20 bg-black/55 p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          {tokenMissing ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
                <ShieldOff className="w-6 h-6 text-red-400" />
              </div>
              <h1 className="text-white text-xl font-bold tracking-wide mb-2">Link inválido</h1>
              <p className="text-zinc-500 text-sm">Este link de demo no es válido. Solicita un nuevo link al administrador.</p>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <h1 className="text-white text-xl font-bold tracking-wide mb-2">¡Acceso concedido!</h1>
              <p className="text-zinc-500 text-sm">Redirigiendo al panel…</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-7">
                <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-5">
                  <Eye className="w-6 h-6 text-yellow-400" />
                </div>
                <h1 className="text-white text-xl font-bold tracking-wide mb-1">Acceso Demo</h1>
                <p className="text-zinc-500 text-xs tracking-wider uppercase">Vista previa del panel</p>
              </div>

              {/* Info pills */}
              <div className="mb-7 grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-white text-xs font-bold">24 horas</span>
                  <span className="text-zinc-600 text-[10px] uppercase tracking-wide">Duración</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <Eye className="w-4 h-4 text-sky-400" />
                  <span className="text-white text-xs font-bold">Solo lectura</span>
                  <span className="text-zinc-600 text-[10px] uppercase tracking-wide">Permisos</span>
                </div>
              </div>

              <p className="text-zinc-500 text-xs text-center mb-6">
                Podrás explorar todo el panel de administración. Los cambios que intentes no se guardarán en la base de datos.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleAccess}
                disabled={loading || !token}
                className="w-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3.5 text-sm shadow-[0_10px_24px_rgba(250,204,21,0.35)] hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando…
                  </>
                ) : (
                  'Entrar al Panel Demo →'
                )}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600 tracking-wider">
          © 2025 Soluciones Fabrick · Acceso temporal de demostración
        </p>
      </div>
    </div>
  );
}
