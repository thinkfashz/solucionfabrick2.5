'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Eye, Loader2, ShieldOff } from 'lucide-react';

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
    if (!t) {
      setTokenMissing(true);
      return;
    }
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
      try {
        sessionStorage.setItem('sf_demo_active', '1');
        if (json.sessionId) sessionStorage.setItem('_sf_demo_sid', json.sessionId);
        if (json.expiresAt) sessionStorage.setItem('sf_demo_expires_at', json.expiresAt);
      } catch {}
      setSuccess(true);
      setTimeout(() => router.replace('/admin?demo=1'), 900);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.18),rgba(0,0,0,0)_40%),radial-gradient(circle_at_78%_80%,rgba(250,204,21,0.14),rgba(0,0,0,0)_44%),linear-gradient(180deg,rgba(0,0,0,0.3),rgba(0,0,0,0.95))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_9px] opacity-20" />
      <div className="pointer-events-none absolute -left-20 top-16 h-80 w-80 rounded-full bg-sky-400/15 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-80 w-80 rounded-full bg-yellow-300/15 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex select-none flex-col items-center gap-3">
          <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/40 bg-yellow-400 shadow-[0_10px_34px_rgba(250,204,21,0.45)]">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.45),rgba(255,255,255,0)_56%)]" />
            <span className="relative text-sm font-black uppercase tracking-[0.28em] text-black">SF</span>
          </span>
          <span className="font-playfair text-xl font-black tracking-[0.24em] text-yellow-300">SOLUCIONES FABRICK</span>
          <span className="text-[10px] uppercase tracking-[0.34em] text-white/40">Panel de administración</span>
        </div>

        <div className="w-full rounded-[2rem] border border-white/20 bg-black/55 p-8 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          {tokenMissing ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                <ShieldOff className="h-6 w-6 text-red-400" />
              </div>
              <h1 className="mb-2 text-xl font-bold tracking-wide text-white">Link inválido</h1>
              <p className="text-sm text-zinc-500">Solicita un nuevo link de demostración al administrador.</p>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <h1 className="mb-2 text-xl font-bold tracking-wide text-white">Acceso concedido</h1>
              <p className="text-sm text-zinc-500">Abriendo recorrido guiado…</p>
            </div>
          ) : (
            <>
              <div className="mb-7 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10">
                  <Eye className="h-6 w-6 text-yellow-400" />
                </div>
                <h1 className="mb-1 text-xl font-bold tracking-wide text-white">Acceso Demo</h1>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Vista guiada del panel</p>
              </div>

              <div className="mb-7 grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">24 horas</span>
                  <span className="text-[10px] uppercase tracking-wide text-zinc-600">Duración</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <Eye className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-bold text-white">Solo lectura</span>
                  <span className="text-[10px] uppercase tracking-wide text-zinc-600">Seguro</span>
                </div>
              </div>

              <p className="mb-6 text-center text-xs text-zinc-500">
                Podrás navegar por el panel desde Android, iPhone o PC. Las zonas críticas como usuarios, SQL y claves quedan bloqueadas.
              </p>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleAccess}
                disabled={loading || !token}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-black shadow-[0_10px_24px_rgba(250,204,21,0.35)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando…</> : 'Entrar al recorrido →'}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs tracking-wider text-zinc-600">
          © 2026 Soluciones Fabrick · Acceso temporal de demostración
        </p>
      </div>
    </div>
  );
}
