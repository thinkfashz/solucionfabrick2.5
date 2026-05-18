'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, KeyRound, Loader2, Plus, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

interface Passkey {
  id: string;
  name: string | null;
  device_type: string;
  backed_up: boolean;
  aaguid: string | null;
  created_at: string;
  last_used_at: string | null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SeguridadPage() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [supported, setSupported] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupported(Boolean(window.PublicKeyCredential && navigator.credentials?.create));
    }
  }, []);

  const fetchPasskeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/passkeys', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json() as { passkeys: Passkey[] };
        setPasskeys(json.passkeys ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPasskeys(); }, [fetchPasskeys]);

  async function handleAddPasskey() {
    setError('');
    setSuccess('');
    if (!supported) {
      setError('Tu dispositivo no soporta autenticación biométrica/passkey.');
      return;
    }
    setAdding(true);
    try {
      const optRes = await fetch('/api/admin/passkeys/register/options', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!optRes.ok) {
        const d = await optRes.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? 'No se pudo iniciar el registro.');
        return;
      }
      const optionsJSON = await optRes.json();
      const { startRegistration } = await import('@simplewebauthn/browser');
      let credential;
      try {
        credential = await startRegistration({ optionsJSON });
      } catch (err) {
        const e = err as Error;
        if (e.name === 'NotAllowedError') setError('Operación cancelada o no permitida por el dispositivo.');
        else if (e.name === 'InvalidStateError') setError('Ya existe una passkey registrada para este dispositivo.');
        else setError(`Error biométrico: ${e.message}`);
        return;
      }

      const verRes = await fetch('/api/admin/passkeys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      });
      const verData = await verRes.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!verRes.ok) {
        setError(verData.error ?? 'Error al verificar la passkey.');
        return;
      }
      setSuccess('Passkey registrada. Ya puedes iniciar sesión con huella, Face ID o bloqueo del dispositivo.');
      void fetchPasskeys();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok) { setError(d.error ?? 'No se pudo eliminar.'); return; }
      setSuccess('Passkey eliminada.');
      void fetchPasskeys();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/passkeys/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? 'No se pudo renombrar.');
        return;
      }
      setEditingId(null);
      setEditingName('');
      void fetchPasskeys();
    } catch {
      setError('Error al renombrar.');
    }
  }

  const synced = passkeys.filter((key) => key.backed_up).length;
  const used = passkeys.filter((key) => Boolean(key.last_used_at)).length;

  return (
    <AdminBasePage
      eyebrow="Seguridad real"
      title="Passkeys y biometría"
      description="Gestiona acceso con huella, Face ID o bloqueo del dispositivo usando WebAuthn. La app no guarda tu huella, cara ni llave privada."
      actions={
        <button
          onClick={() => void handleAddPasskey()}
          disabled={adding || supported === false}
          className="inline-flex items-center gap-2 rounded-2xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {supported === false ? 'No compatible' : adding ? 'Esperando…' : 'Agregar passkey'}
        </button>
      }
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Passkeys" value={loading ? '…' : passkeys.length} hint="registradas" />
        <AdminBaseMetric label="Sincronizadas" value={loading ? '…' : synced} hint="multi-device/backed up" />
        <AdminBaseMetric label="Usadas" value={loading ? '…' : used} hint="con último acceso" />
        <AdminBaseMetric label="Soporte" value={supported === null ? '…' : supported ? 'OK' : 'No'} hint="WebAuthn browser" />
      </AdminBaseGrid>

      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">{success}</div> : null}

      <AdminBaseGrid cols="3">
        <AdminBaseCard title="No guarda biometría" description="La huella, cara o iris se quedan en Android, iPhone, Windows o macOS. La app solo verifica una firma segura." icon={Fingerprint} tone="gold" badge="privado" />
        <AdminBaseCard title="Llave pública" description="El servidor guarda solo la llave pública para validar el inicio de sesión." icon={KeyRound} tone="emerald" badge="WebAuthn" />
        <AdminBaseCard title="Anti-phishing" description="La passkey está vinculada al dominio y no se puede reutilizar en sitios falsos." icon={ShieldCheck} tone="blue" badge="seguro" />
      </AdminBaseGrid>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">Dispositivos confiables</p>
            <h2 className="mt-1 text-xl font-black text-white">Passkeys registradas</h2>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando passkeys…</div>
        ) : passkeys.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/30 p-10 text-center">
            <Fingerprint className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-400">No tienes passkeys registradas.</p>
            <p className="mt-1 text-xs text-zinc-600">Agrega una passkey para iniciar sesión sin contraseña.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {passkeys.map((pk) => (
              <article key={pk.id} className="rounded-3xl border border-white/10 bg-black/35 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-yellow-300">
                    <Smartphone className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {editingId === pk.id ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleRename(pk.id);
                            if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                          }}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300/50"
                          maxLength={100}
                        />
                        <button onClick={() => void handleRename(pk.id)} className="rounded-xl bg-yellow-300 px-3 py-2 text-xs font-black text-black">Guardar</button>
                        <button onClick={() => { setEditingId(null); setEditingName(''); }} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-white">{pk.name ?? 'Passkey'}</h3>
                        {pk.backed_up ? <span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-200">sincronizada</span> : null}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      Tipo: {pk.device_type || 'unknown'} · Creada {formatDate(pk.created_at)}{pk.last_used_at ? ` · Último uso ${formatDate(pk.last_used_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => { setEditingId(pk.id); setEditingName(pk.name ?? 'Passkey'); }} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:border-yellow-300/40 hover:text-yellow-200">Renombrar</button>
                    <button onClick={() => void handleDelete(pk.id)} disabled={deletingId === pk.id} className="inline-flex items-center gap-1 rounded-xl border border-red-500/25 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-60">
                      {deletingId === pk.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-zinc-600">Mantén al menos una passkey activa y una contraseña de respaldo segura.</p>
    </AdminBasePage>
  );
}
