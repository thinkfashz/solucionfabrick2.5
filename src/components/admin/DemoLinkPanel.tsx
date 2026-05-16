'use client';

import { useEffect, useState } from 'react';
import { Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';

type DemoLink = {
  id: string;
  label?: string | null;
  link: string;
  expira_at: string;
  accesos?: number | null;
  ultimo_acceso?: string | null;
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
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/demo/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || 'Demo 24 horas' }),
      });
      const json = await res.json();
      if (!res.ok) setMsg(json.error ?? 'No se pudo crear el link demo.');
      else {
        setLastLink(json.link ?? '');
        setLabel('Demo 24 horas');
        await load();
      }
    } catch { setMsg('Error de red creando link demo.'); }
    finally { setBusy(false); }
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
    <section className="rounded-3xl border border-sky-400/20 bg-sky-400/[0.04] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Links demo 24 horas</h2>
          <p className="mt-1 text-sm text-zinc-500">Acceso temporal al admin en modo lectura guiada.</p>
        </div>
        <button onClick={load} disabled={busy} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300 disabled:opacity-50">
          <RefreshCw className={`mr-1 inline h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Actualizar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-sky-300/50" />
        <button onClick={create} disabled={busy} className="rounded-2xl bg-sky-300 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">
          <Plus className="mr-1 inline h-4 w-4" />Crear link
        </button>
      </div>

      {msg && <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-300">{msg}</div>}

      {lastLink && (
        <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Nuevo link generado</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-black/40 px-3 py-2 text-xs text-white">{lastLink}</code>
            <button onClick={() => copy(lastLink)} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200"><Copy className="h-4 w-4" /></button>
          </div>
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
  );
}

export default DemoLinkPanel;
