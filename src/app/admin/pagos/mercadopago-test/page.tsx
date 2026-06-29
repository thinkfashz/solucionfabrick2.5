'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, CreditCard, Eye, EyeOff, FlaskConical, Loader2, ShieldCheck, Wallet } from 'lucide-react';

type TestResult = {
  ok: boolean;
  error?: string;
  message?: string;
  mode?: string;
  tokenPrefix?: string;
  tokenMask?: string;
  publicKeyStatus?: string;
  latencyMs?: number;
  account?: {
    id?: string | number | null;
    email?: string | null;
    nickname?: string | null;
    siteId?: string | null;
    isTestUser?: boolean;
  } | null;
  preference?: {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  } | null;
};

const STORAGE_KEY = 'sf_mp_test_credentials_local_v1';

function mask(value: string) {
  if (!value) return 'Pendiente';
  return `${value.slice(0, 10)}…${value.slice(-4)}`;
}

async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); } catch {}
}

export default function MercadoPagoTestPage() {
  const [publicKey, setPublicKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [rememberLocal, setRememberLocal] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { publicKey?: string; accessToken?: string };
      setPublicKey(saved.publicKey || '');
      setAccessToken(saved.accessToken || '');
    } catch {}
  }, []);

  const valid = useMemo(() => accessToken.trim().startsWith('TEST-') && (!publicKey.trim() || publicKey.trim().startsWith('TEST-')), [accessToken, publicKey]);
  const sandboxUrl = result?.preference?.sandbox_init_point || result?.preference?.init_point || '';

  async function runTest(createPreference = false) {
    setLoading(true);
    setResult(null);
    if (rememberLocal) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ publicKey, accessToken })); } catch {}
    }
    try {
      const res = await fetch('/api/admin/payments/mercadopago-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, accessToken, createPreference }),
      });
      const json = await res.json() as TestResult;
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'No se pudo ejecutar la prueba.' });
    } finally {
      setLoading(false);
    }
  }

  function clearLocal() {
    setPublicKey('');
    setAccessToken('');
    setResult(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto max-w-7xl space-y-5">
      <header className="overflow-hidden rounded-[2.5rem] border border-sky-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(56,189,248,.24),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 shadow-2xl shadow-black/40 md:p-8">
        <Link href="/admin/pagos" className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white">← Volver a pagos</Link>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em] text-sky-100"><FlaskConical className="h-3.5 w-3.5" /> Sandbox Mercado Pago</p>
        <h1 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Probar credenciales TEST.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Pantalla aislada para validar credenciales de prueba de Mercado Pago. No guarda en base de datos, no reemplaza variables de Vercel y no toca el gateway productivo.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-300 text-black"><CreditCard className="h-6 w-6" /></div>
            <div>
              <h2 className="text-2xl font-black tracking-[-.04em]">Credenciales de prueba</h2>
              <p className="text-sm text-zinc-400">Solo se aceptan llaves que comiencen con TEST-.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block rounded-2xl border border-white/10 bg-black/35 p-4">
              <span className="text-[10px] font-black uppercase tracking-[.22em] text-sky-200">Public Key TEST</span>
              <input value={publicKey} onChange={(event) => setPublicKey(event.target.value)} placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-2 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-700" />
              <p className="mt-2 text-xs text-zinc-500">Opcional para esta prueba. Sirve para confirmar que estás usando llaves de sandbox.</p>
            </label>

            <label className="block rounded-2xl border border-white/10 bg-black/35 p-4">
              <span className="text-[10px] font-black uppercase tracking-[.22em] text-sky-200">Access Token TEST</span>
              <div className="mt-2 flex items-center gap-2">
                <input type={showToken ? 'text' : 'password'} value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="TEST-xxxxxxxxxxxxxxxxxxxxxxxx" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-700" />
                <button type="button" onClick={() => setShowToken((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-zinc-300">{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-6 text-zinc-300">
              <input type="checkbox" checked={rememberLocal} onChange={(event) => setRememberLocal(event.target.checked)} className="mt-1" />
              <span>Recordar estas credenciales solo en este navegador para pruebas rápidas. No se guardan en DB ni en Vercel.</span>
            </label>
          </div>

          {!valid && <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50"><AlertTriangle className="mr-2 inline h-4 w-4" /> Pega un Access Token que comience con TEST-. Esta pantalla bloqueará cualquier token productivo APP_USR-.</div>}

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => void runTest(false)} disabled={!valid || loading} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sky-300 px-5 text-sm font-black text-black transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-45">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Probar conexión</button>
            <button onClick={() => void runTest(true)} disabled={!valid || loading} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"><Wallet className="h-4 w-4" /> Crear preferencia demo</button>
            <button onClick={clearLocal} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-black text-zinc-300">Limpiar</button>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-2xl font-black tracking-[-.04em]">Estado</h2>
            {!result && <p className="mt-3 text-sm leading-6 text-zinc-400">Ejecuta una prueba para ver el estado de la cuenta TEST, latencia y preferencia de pago demo.</p>}
            {result && <div className="mt-4 space-y-3">
              <div className={`rounded-2xl border p-4 ${result.ok ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-50' : 'border-red-300/25 bg-red-500/10 text-red-50'}`}>
                {result.ok ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
                {result.message || result.error || 'Resultado recibido.'}
              </div>
              <Info label="Modo" value={result.mode || 'unknown'} />
              <Info label="Token" value={result.tokenMask || mask(accessToken)} />
              <Info label="Prefijo" value={result.tokenPrefix || 'TEST'} />
              <Info label="Latencia" value={typeof result.latencyMs === 'number' ? `${result.latencyMs} ms` : 'Pendiente'} />
              <Info label="Cuenta" value={result.account?.email || result.account?.nickname || String(result.account?.id || 'Sin datos')} />
              <Info label="Test user" value={result.account?.isTestUser ? 'Sí' : 'No confirmado'} />
            </div>}
          </article>

          {sandboxUrl && <article className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-5">
            <h2 className="text-2xl font-black tracking-[-.04em]">Preferencia demo creada</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-50/70">La preferencia se creó con tu Access Token TEST. Úsala solo para pruebas sandbox.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={sandboxUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-black">Abrir checkout TEST <ArrowRight className="h-4 w-4" /></a>
              <button onClick={() => void copy(sandboxUrl)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white"><Copy className="h-4 w-4" /> Copiar link</button>
            </div>
          </article>}

          <article className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-50">
            <p className="font-black">Regla de seguridad</p>
            <p className="mt-2">Esta herramienta no modifica Mercado Pago productivo. Para producción sigue usando `/admin/pagos` o las variables oficiales de Vercel.</p>
          </article>
        </aside>
      </section>
    </section>
  </main>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/35 p-3"><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-200">{label}</p><p className="mt-1 break-words text-sm font-bold text-white">{value}</p></div>;
}
