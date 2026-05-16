'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Eye, Loader2, Lock, Route, ShieldCheck, ShieldOff, Sparkles } from 'lucide-react';

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
      setTimeout(() => router.replace('/admin?demo=1'), 3600);
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

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 flex select-none flex-col items-center gap-3">
          <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/40 bg-yellow-400 shadow-[0_10px_34px_rgba(250,204,21,0.45)]">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.45),rgba(255,255,255,0)_56%)]" />
            <span className="relative text-sm font-black uppercase tracking-[0.28em] text-black">SF</span>
          </span>
          <span className="font-playfair text-xl font-black tracking-[0.24em] text-yellow-300">SOLUCIONES FABRICK</span>
          <span className="text-[10px] uppercase tracking-[0.34em] text-white/40">Panel de administración</span>
        </div>

        <div className="w-full rounded-[2rem] border border-white/20 bg-black/55 p-6 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
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
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
                <Sparkles className="h-9 w-9 animate-pulse text-green-300" />
              </div>
              <h1 className="mb-2 text-2xl font-black tracking-wide text-white">Preparando tu recorrido</h1>
              <p className="mx-auto max-w-md text-sm leading-6 text-zinc-500">Validando el acceso, activando modo lectura y bloqueando las zonas críticas antes de abrir el panel.</p>
              <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/4 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-green-300" />
              </div>
              <div className="mt-6 grid gap-2 text-left text-xs text-zinc-400 sm:grid-cols-3">
                <span className="rounded-2xl border border-white/10 bg-black/30 p-3">✓ Sesión demo</span>
                <span className="rounded-2xl border border-white/10 bg-black/30 p-3">✓ Solo lectura</span>
                <span className="rounded-2xl border border-white/10 bg-black/30 p-3">✓ Navegación guiada</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-7 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10">
                  <Eye className="h-6 w-6 text-yellow-400" />
                </div>
                <h1 className="mb-1 text-2xl font-black tracking-wide text-white">Bienvenido al recorrido demo</h1>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Vista guiada del panel Soluciones Fabrick</p>
              </div>

              <p className="mb-6 text-center text-sm leading-6 text-zinc-400">
                Este acceso te permite navegar por el panel para conocer la estructura, módulos y flujo general de la aplicación. Es una sesión temporal y segura: puedes revisar, explorar y entender, pero no modificar información sensible.
              </p>

              <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <Clock className="mx-auto mb-2 h-5 w-5 text-amber-400" />
                  <span className="text-xs font-bold text-white">24 horas</span>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">Duración</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <Route className="mx-auto mb-2 h-5 w-5 text-sky-400" />
                  <span className="text-xs font-bold text-white">Navegación</span>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">Guiada</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <Lock className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
                  <span className="text-xs font-bold text-white">Sin edición</span>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">Protegido</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-green-400" />
                  <span className="text-xs font-bold text-white">Seguro</span>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">Viewer</p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-white/10 bg-black/35 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Permitido</p>
                <p className="mt-2 text-sm text-zinc-400">Ver páginas, recorrer módulos, revisar pantallas y entender el flujo operativo.</p>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-red-300">Bloqueado</p>
                <p className="mt-2 text-sm text-zinc-400">Crear usuarios, editar seguridad, ejecutar SQL, tocar claves, modificar equipo o realizar acciones críticas.</p>
              </div>

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
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando…</> : 'Iniciar recorrido seguro →'}
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
