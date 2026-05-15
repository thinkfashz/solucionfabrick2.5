'use client';

import { useEffect, useState, useCallback } from 'react';

interface Passkey {
  id: string;
  name: string | null;
  device_type: string;
  backed_up: boolean;
  aaguid: string | null;
  created_at: string;
  last_used_at: string | null;
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
        d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
    </svg>
  );
}

function DeviceIcon({ deviceType, backedUp }: { deviceType: string; backedUp: boolean }) {
  if (backedUp || deviceType === 'multiDevice') {
    return (
      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
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
      setSupported(
        !!(window.PublicKeyCredential && navigator.credentials?.create),
      );
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
      setError('Tu dispositivo no soporta autenticación biométrica.');
      return;
    }
    setAdding(true);
    try {
      const optRes = await fetch('/api/admin/passkeys/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
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
        if (e.name === 'NotAllowedError') {
          setError('Operación cancelada o no permitida por el dispositivo.');
        } else if (e.name === 'InvalidStateError') {
          setError('Ya existe una passkey registrada para este dispositivo.');
        } else {
          setError(`Error biométrico: ${e.message}`);
        }
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
      setSuccess('¡Passkey registrada! Ya puedes iniciar sesión con tu huella o Face ID.');
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Seguridad</h1>
            <p className="text-zinc-500 text-sm">Gestiona tu acceso biométrico al panel</p>
          </div>
        </div>

        {/* Explanation card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <div className="flex gap-4">
            <div className="text-yellow-400/60 shrink-0 mt-1">
              <FingerprintIcon />
            </div>
            <div>
              <h2 className="font-semibold text-white mb-1 text-sm">Acceso con huella / Face ID</h2>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Al registrar una passkey, tu dispositivo genera un par de llaves criptográficas.
                Solo la <span className="text-zinc-200">llave pública</span> se guarda en el servidor.
                Tu <span className="text-zinc-200">llave privada</span> nunca sale de tu dispositivo:
                para usarla, el dispositivo exige tu huella digital o Face ID.
                No hay contraseñas que robar.
              </p>
              <ul className="mt-3 space-y-1">
                {[
                  'Más rápido que escribir una contraseña',
                  'Inmune a phishing (vinculado a este dominio)',
                  'La llave privada nunca abandona tu dispositivo',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
            {success}
          </div>
        )}

        {/* Add passkey button */}
        <button
          onClick={() => void handleAddPasskey()}
          disabled={adding || supported === false}
          className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {adding ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Esperando autenticación biométrica...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {supported === false ? 'Dispositivo no compatible' : 'Agregar huella o Face ID'}
            </>
          )}
        </button>

        {/* Passkeys list */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Passkeys registradas ({loading ? '…' : passkeys.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-zinc-600 text-sm">Cargando…</div>
          ) : passkeys.length === 0 ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-8 text-center">
              <p className="text-zinc-500 text-sm">No tienes passkeys registradas.</p>
              <p className="text-zinc-600 text-xs mt-1">
                Agrega tu huella o Face ID para iniciar sesión sin contraseña.
              </p>
            </div>
          ) : (
            passkeys.map((pk) => (
              <div key={pk.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <DeviceIcon deviceType={pk.device_type} backedUp={pk.backed_up} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === pk.id ? (
                    <div className="flex gap-2 items-center mb-1">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleRename(pk.id); if (e.key === 'Escape') { setEditingId(null); setEditingName(''); } }}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-yellow-400"
                        maxLength={100}
                      />
                      <button onClick={() => void handleRename(pk.id)} className="text-yellow-400 hover:text-yellow-300 text-xs font-semibold">Guardar</button>
                      <button onClick={() => { setEditingId(null); setEditingName(''); }} className="text-zinc-500 hover:text-zinc-300 text-xs">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {pk.name ?? 'Passkey'}
                      </span>
                      {pk.backed_up && (
                        <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded-full border border-yellow-400/20 shrink-0">
                          sincronizada
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-zinc-500 mt-0.5 space-x-3">
                    <span>Creada {formatDate(pk.created_at)}</span>
                    {pk.last_used_at && <span>· Último uso {formatDate(pk.last_used_at)}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingId(pk.id); setEditingName(pk.name ?? 'Passkey'); }}
                    title="Renombrar"
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => void handleDelete(pk.id)}
                    disabled={deletingId === pk.id}
                    title="Eliminar"
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingId === pk.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {passkeys.length > 0 && (
          <p className="mt-4 text-xs text-zinc-600 text-center">
            Mantén al menos una passkey activa para poder iniciar sesión de forma biométrica.
          </p>
        )}
      </div>
    </div>
  );
}
