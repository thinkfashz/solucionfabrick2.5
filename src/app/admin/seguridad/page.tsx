'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, KeyRound, Loader2, Plus, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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
    if (typeof window !== 'undefined') setSupported(Boolean(window.PublicKeyCredential && navigator.credentials?.create));
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Acceso · Seguridad"
        title="Passkeys y biometría"
        description="Gestiona acceso con huella, Face ID o bloqueo del dispositivo usando WebAuthn. Fabrick conserva únicamente la llave pública necesaria para verificar el inicio de sesión."
        icon={ShieldCheck}
        actions={
          <button
            type="button"
            onClick={() => void handleAddPasskey()}
            disabled={adding || supported === false}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {supported === false ? 'No compatible' : adding ? 'Esperando…' : 'Agregar passkey'}
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Passkeys" value={loading ? '…' : passkeys.length} icon={Fingerprint} />
        <AdminStat label="Sincronizadas" value={loading ? '…' : synced} icon={Smartphone} accent="emerald" />
        <AdminStat label="Usadas" value={loading ? '…' : used} icon={KeyRound} accent="cyan" />
        <AdminStat label="WebAuthn" value={supported === null ? '…' : supported ? 'OK' : 'No'} icon={ShieldCheck} accent={supported === false ? 'rose' : 'emerald'} />
      </section>

      {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm font-medium text-rose-800">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-600/15 bg-emerald-500/8 px-4 py-3 text-sm font-medium text-emerald-800">{success}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <SecurityNote icon={Fingerprint} title="La biometría no sale del dispositivo" description="Huella, cara o iris permanecen en Android, iPhone, Windows o macOS. El servidor valida una firma criptográfica." />
        <SecurityNote icon={KeyRound} title="Solo llave pública" description="El backend almacena la parte pública de la credencial; la llave privada permanece protegida en el dispositivo." />
        <SecurityNote icon={ShieldCheck} title="Protección anti-phishing" description="Una passkey queda vinculada al dominio correcto y no puede reutilizarse en una copia falsa del sitio." />
      </div>

      <AdminCard className="p-0 sm:p-0">
        <div className="border-b border-black/8 px-4 py-4 sm:px-5">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Dispositivos confiables</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">Passkeys registradas</h2>
          <p className="mt-1 text-xs leading-5 text-[#817a6f]">Renombra o revoca credenciales sin mezclar acciones de seguridad con tarjetas visuales redundantes.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#817a6f]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando passkeys…</div>
        ) : passkeys.length === 0 ? (
          <div className="grid min-h-56 place-items-center px-5 py-10 text-center">
            <div className="max-w-md">
              <Fingerprint className="mx-auto h-7 w-7 text-[#c77a00]" />
              <h3 className="mt-3 text-lg font-black text-[#171612]">No hay passkeys registradas</h3>
              <p className="mt-2 text-sm leading-6 text-[#817a6f]">Agrega una para iniciar sesión sin escribir contraseña en este dispositivo.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-black/8 px-4 sm:px-5">
            {passkeys.map((pk) => (
              <article key={pk.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]">
                  <Smartphone className="h-4 w-4" />
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
                        className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/75 px-3 py-2 text-sm font-semibold text-[#171612] outline-none focus:border-[#c77a00]/40"
                        maxLength={100}
                      />
                      <button onClick={() => void handleRename(pk.id)} className="rounded-xl bg-[#171612] px-3 py-2 text-xs font-black text-white">Guardar</button>
                      <button onClick={() => { setEditingId(null); setEditingName(''); }} className="rounded-xl border border-black/10 bg-white/50 px-3 py-2 text-xs font-bold text-[#716b60]">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-[#171612]">{pk.name ?? 'Passkey'}</h3>
                      {pk.backed_up ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-800">Sincronizada</span> : null}
                    </div>
                  )}
                  <p className="mt-1 text-xs leading-5 text-[#817a6f]">
                    Tipo: {pk.device_type || 'unknown'} · Creada {formatDate(pk.created_at)}{pk.last_used_at ? ` · Último uso ${formatDate(pk.last_used_at)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingId(pk.id); setEditingName(pk.name ?? 'Passkey'); }}
                    className="rounded-xl border border-black/10 bg-white/55 px-3 py-2 text-xs font-bold text-[#625b50] transition hover:bg-white"
                  >
                    Renombrar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(pk.id)}
                    disabled={deletingId === pk.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-600/15 bg-rose-500/8 px-3 py-2 text-xs font-bold text-rose-800 transition hover:bg-rose-500/12 disabled:opacity-50"
                  >
                    {deletingId === pk.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminCard>

      <p className="text-center text-xs text-[#8f887c]">Mantén al menos una passkey activa y una contraseña de respaldo segura.</p>
    </AdminPage>
  );
}

function SecurityNote({ icon: Icon, title, description }: { icon: typeof Fingerprint; title: string; description: string }) {
  return (
    <div className="border-t border-black/10 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Icon className="h-4 w-4" /></span>
      <h3 className="mt-3 text-sm font-black text-[#171612]">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#817a6f]">{description}</p>
    </div>
  );
}
