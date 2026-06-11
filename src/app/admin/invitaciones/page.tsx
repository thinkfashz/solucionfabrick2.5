'use client';

import { useEffect, useState } from 'react';
import { Copy, Eye, Link2, Loader2, RefreshCcw, ShieldCheck, Trash2, UserPlus } from 'lucide-react';

type DemoToken = {
  id: string;
  token: string;
  label?: string | null;
  created_by?: string | null;
  expira_at: string;
  accesos?: number | null;
  ultimo_acceso?: string | null;
  locked_ip?: string | null;
  ultimo_dispositivo?: string | null;
  link: string;
};

function dateText(value?: string | null) {
  if (!value) return 'Sin registro';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin registro';
  return d.toLocaleString('es-CL');
}

export default function AdminInvitacionesPage() {
  const [tokens, setTokens] = useState<DemoToken[]>([]);
  const [label, setLabel] = useState('Cliente demo');
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/demo/tokens', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los links');
      setTokens(json.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando links');
    } finally {
      setLoading(false);
    }
  }

  async function createToken() {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/demo/tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label, hours }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo crear el link');
      await navigator.clipboard?.writeText(json.link);
      setCopied(json.link);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando link');
    } finally {
      setCreating(false);
    }
  }

  async function deleteToken(id: string) {
    if (!confirm('¿Eliminar este link demo?')) return;
    try {
      const res = await fetch(`/api/admin/demo/tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo eliminar');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando link');
    }
  }

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 1800);
  }

  useEffect(() => { void load(); }, []);

  return <main className="min-h-screen bg-[#07192c] p-4 text-white sm:p-6 lg:p-8">
    <section className="mx-auto grid max-w-7xl gap-5">
      <header className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-white/[0.075] p-6 shadow-[0_30px_90px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(125,211,252,.24),transparent_32rem),radial-gradient(circle_at_90%_10%,rgba(250,204,21,.14),transparent_26rem)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-sky-200">Equipo · Demo · Invitaciones</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Generar usuario de prueba</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">Crea un link temporal para que un cliente o colaborador vea el admin en modo seguro. El acceso queda bloqueado como viewer y no puede ejecutar acciones críticas.</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-4">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">Nombre del demo</label>
            <input value={label} onChange={(e)=>setLabel(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-sm outline-none focus:border-sky-200/50" />
            <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.24em] text-white/40">Duración</label>
            <select value={hours} onChange={(e)=>setHours(Number(e.target.value))} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#06111f] px-4 text-sm outline-none">
              <option value={6}>6 horas</option>
              <option value={24}>24 horas</option>
              <option value={72}>3 días</option>
              <option value={168}>7 días</option>
            </select>
            <button onClick={() => void createToken()} disabled={creating} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f4bf38] text-sm font-black text-[#07192c] disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserPlus className="h-4 w-4"/>} Crear y copiar link
            </button>
          </div>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
      {copied && <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">Link copiado: {copied}</div>}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <article className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#d9ecff] p-5 text-[#0a2540] shadow-[0_25px_80px_rgba(0,0,0,.22)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#41637f]">Links activos</p><h2 className="mt-1 text-3xl font-black">Accesos demo</h2></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-black"><RefreshCcw className="h-4 w-4"/> Actualizar</button></div>
          <div className="mt-5 grid gap-3">
            {loading ? <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin"/></div> : tokens.length === 0 ? <p className="rounded-2xl bg-white/60 p-4 text-sm text-[#496b86]">No hay links activos. Crea uno arriba para compartir una demo.</p> : tokens.map((token) => <div key={token.id} className="grid gap-3 rounded-[1.6rem] bg-white/70 p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><b className="block truncate">{token.label || 'Demo sin nombre'}</b><p className="mt-1 truncate text-xs text-[#496b86]">{token.link}</p><p className="mt-1 text-xs text-[#6e8aa1]">Expira: {dateText(token.expira_at)} · Accesos: {token.accesos || 0} · {token.ultimo_dispositivo || 'Sin dispositivo'}</p></div><div className="flex flex-wrap gap-2 md:justify-end"><button onClick={()=>void copy(token.link)} className="rounded-full bg-[#0a2540] px-3 py-2 text-xs font-black text-white"><Copy className="mr-1 inline h-3 w-3"/>Copiar</button><a href={token.link} target="_blank" className="rounded-full bg-[#f4bf38] px-3 py-2 text-xs font-black text-[#0a2540]"><Eye className="mr-1 inline h-3 w-3"/>Ver</a><button onClick={()=>void deleteToken(token.id)} className="rounded-full bg-red-100 px-3 py-2 text-xs font-black text-red-700"><Trash2 className="mr-1 inline h-3 w-3"/>Eliminar</button></div></div>)}
          </div>
        </article>

        <aside className="grid h-fit gap-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.075] p-5 backdrop-blur-xl"><ShieldCheck className="mb-4 h-8 w-8 text-emerald-300"/><h3 className="text-2xl font-black">Seguro por defecto</h3><p className="mt-2 text-sm leading-6 text-white/60">El demo inicia con rol viewer. No puede ejecutar SQL, crear usuarios ni tocar seguridad.</p></div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.075] p-5 backdrop-blur-xl"><Link2 className="mb-4 h-8 w-8 text-sky-200"/><h3 className="text-2xl font-black">Link temporal</h3><p className="mt-2 text-sm leading-6 text-white/60">Puedes elegir entre 6 horas y 7 días. El acceso queda auditado por IP, dispositivo y horario.</p></div>
        </aside>
      </section>
    </section>
  </main>;
}
