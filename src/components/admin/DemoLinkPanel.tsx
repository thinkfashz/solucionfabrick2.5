'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Eye, Lock, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, Wifi } from 'lucide-react';

type DemoLink = {
  id: string;
  label?: string | null;
  link: string;
  expira_at: string;
  accesos?: number | null;
  ultimo_acceso?: string | null;
  locked_ip?: string | null;
  ultimo_ip?: string | null;
  ultimo_dispositivo?: string | null;
  ultimo_user_agent?: string | null;
};

function fmt(value?: string | null) {
  if (!value) return 'Sin registro';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin registro';
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export function DemoLinkPanel() {
  const [items, setItems] = useState<DemoLink[]>([]);
  const [label, setLabel] = useState('Demo 24 horas');
  const [lastLink, setLastLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/demo/tokens', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) setMsg(json.error ?? 'No se pudieron cargar los links demo.');
      else setItems(json.tokens ?? []);
    } catch { setMsg('Error de red cargando links demo.'); }
    finally { setBusy(false); }
  }

  async function create() {
    setCreating(true);
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/demo/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || 'Demo 24 horas' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? 'No se pudo crear el link demo.');
        return;
      }
      setLastLink(json.link ?? '');
      setLabel('Demo 24 horas');
      await load();
    } catch { setMsg('Error de red creando link demo.'); }
    finally {
      setCreating(false);
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este link demo?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/demo/tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(json.error ?? 'No se pudo eliminar.');
      else await load();
    } catch { setMsg('Error de red eliminando link demo.'); }
    finally { setBusy(false); }
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setMsg('Link copiado.'); }
    catch { setMsg('No se pudo copiar automáticamente.'); }
  }

  return (
    <>
      {creating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 px-5 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-[2rem] border border-sky-300/25 bg-white/[0.04] p-8 text-center shadow-[0_0_90px_rgba(56,189,248,0.20)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-sky-300/40 bg-sky-300/10">
              <Sparkles className="h-9 w-9 animate-pulse text-sky-200" />
            </div>
            <h2 className="text-2xl font-black text-white">Creando acceso demo seguro</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Generando link temporal, modo lectura y registro de auditoría real en base de datos.
            </p>
            <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-sky-300" />
            </div>
            <div className="mt-6 grid gap-2 text-left text-xs text-zinc-400 sm:grid-cols-3">
              <span className="rounded-2xl border border-white/10 bg-black/30 p-3">✓ 24 horas</span>
              <span className="rounded-2xl border border-white/10 bg-black/30 p-3">✓ IP lock</span>
              <span className="rounded-2xl border border-white/10 bg-black/30 p-3">✓ Auditoría</span>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-sky-400/20 bg-sky-400/[0.04] p-5">
        <div className="mb-6 rounded-3xl border border-white/10 bg-black/30 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Presentación para demo</p>
          <h2 className="mt-2 text-2xl font-black text-white">Acceso guiado al panel Soluciones Fabrick</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Este link permite que una persona entre al admin por 24 horas en modo observación. El primer acceso bloquea el link para esa IP, registra dispositivo, user-agent y eventos de navegación.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Eye className="mb-3 h-5 w-5 text-sky-300" />
              <p className="font-bold text-white">Qué verá</p>
              <p className="mt-1 text-xs text-zinc-500">Panel, módulos, navegación y vistas permitidas.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Lock className="mb-3 h-5 w-5 text-yellow-300" />
              <p className="font-bold text-white">Qué no puede hacer</p>
              <p className="mt-1 text-xs text-zinc-500">No crea usuarios, no edita datos, no toca SQL.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="font-bold text-white">Protección real</p>
              <p className="mt-1 text-xs text-zinc-500">Viewer temporal, IP lock y auditoría.</p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Links demo 24 horas</h2>
            <p className="mt-1 text-sm text-zinc-500">Crea, copia, audita y revoca accesos temporales.</p>
          </div>
          <button onClick={load} disabled={busy} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300 disabled:opacity-50">
            <RefreshCw className={`mr-1 inline h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Actualizar
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-sky-300/50" />
          <button onClick={create} disabled={busy} className="rounded-2xl bg-sky-300 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">
            <Plus className="mr-1 inline h-4 w-4" />Generar link
          </button>
        </div>

        {msg && <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-300">{msg}</div>}

        {lastLink && (
          <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-[0.18em]">Nuevo link listo para enviar</p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-xl bg-black/40 px-3 py-2 text-xs text-white">{lastLink}</code>
              <button onClick={() => copy(lastLink)} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">Al abrirlo, el usuario entra al recorrido demo y el primer acceso fija la IP permitida.</p>
          </div>
        )}

        <div className="mt-5 grid gap-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-zinc-500">No hay links demo activos.</div>
          ) : items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{item.label || 'Demo 24 horas'}</p>
                  <p className="mt-1 text-xs text-zinc-500">Expira: <span className="text-zinc-300">{fmt(item.expira_at)}</span> · Accesos: <span className="text-zinc-300">{item.accesos ?? 0}</span> · Último: <span className="text-zinc-300">{fmt(item.ultimo_acceso)}</span></p>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
                    <span className="flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-sky-300" /> IP bloqueada: <span className="font-mono text-zinc-300">{item.locked_ip || item.ultimo_ip || '—'}</span></span>
                    <span>Dispositivo: <span className="text-zinc-300">{item.ultimo_dispositivo || '—'}</span></span>
                  </div>
                  <p className="mt-2 truncate font-mono text-xs text-zinc-600">{item.link}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copy(item.link)} className="rounded-full border border-sky-300/30 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-sky-200"><Copy className="mr-1 inline h-4 w-4" />Copiar</button>
                  <button onClick={() => remove(item.id)} className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-300"><Trash2 className="mr-1 inline h-4 w-4" />Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default DemoLinkPanel;
