'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Mail, UserPlus, ShieldCheck, Trash2, Check, X, Copy, Link2, Eye, Clock, Activity } from 'lucide-react';

interface DemoEvent {
  id: string;
  session_id: string;
  page: string;
  entered_at: string;
  left_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  rol: string;
  codigo: string;
  link: string;
  expira_at: string;
  created_at: string;
}

interface Member {
  email: string;
  nombre?: string;
  rol: string;
  aprobado: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function EquipoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<Member[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRol, setInviteRol] = useState<'admin' | 'viewer' | 'superadmin'>('admin');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [demoTokens, setDemoTokens] = useState<{ id: string; label?: string; link: string; expira_at: string; accesos: number; ultimo_acceso?: string }[]>([]);
  const [demoLabel, setDemoLabel] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [createdDemoLink, setCreatedDemoLink] = useState<string | null>(null);
  const [demoEvents, setDemoEvents] = useState<DemoEvent[]>([]);

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAccess() {
    try {
      const res = await fetch('/api/admin/me', { cache: 'no-store' });
      if (!res.ok) { router.replace('/admin/login'); return; }
      const data = await res.json();
      if (data.rol !== 'superadmin') { router.replace('/admin'); return; }
      setSessionEmail(data.email);
      loadData();
    } catch {
      router.replace('/admin/login');
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [invRes, teamRes, demoRes, eventsRes] = await Promise.all([
        fetch('/api/admin/invitations', { cache: 'no-store' }),
        fetch('/api/admin/team', { cache: 'no-store' }),
        fetch('/api/admin/demo/tokens', { cache: 'no-store' }),
        fetch('/api/admin/demo/events', { cache: 'no-store' }),
      ]);
      if (invRes.ok) {
        const d = await invRes.json();
        setInvitations(d.invitations || []);
      }
      if (teamRes.ok) {
        const d = await teamRes.json();
        setMembers(d.members || []);
        setPending(d.pending || []);
      }
      if (demoRes.ok) {
        const d = await demoRes.json();
        setDemoTokens(d.tokens || []);
      }
      if (eventsRes.ok) {
        const d = await eventsRes.json();
        setDemoEvents(d.events || []);
      }
    } catch {
      showToast('Error al cargar datos.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateDemo() {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/admin/demo/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: demoLabel }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || 'Error al generar link demo.', 'error'); return; }
      setCreatedDemoLink(json.link);
      setDemoLabel('');
      loadData();
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleRevokeDemo(id: string) {
    if (!confirm('¿Revocar este acceso demo?')) return;
    const res = await fetch(`/api/admin/demo/tokens?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Error al revocar.', 'error'); return; }
    showToast('Acceso demo revocado.', 'success');
    loadData();
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function copyToClipboard(text: string, label = 'Link') {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado al portapapeles.`, 'success');
    } catch {
      showToast('No se pudo copiar automáticamente.', 'error');
    }
  }

  async function handleInvite() {
    if (!inviteEmail) { showToast('Email es requerido.', 'error'); return; }
    setInviteLoading(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rol: inviteRol }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || 'Error al crear invitación.', 'error'); return; }

      if (json.emailSent) {
        showToast(`Email enviado a ${inviteEmail}.`, 'success');
      } else {
        showToast('Invitación creada. Copia el link y envíalo manualmente.', 'success');
      }
      setCreatedLink(json.link || null);
      setInviteEmail('');
      setInviteRol('admin');
      loadData();
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleDeleteInvitation(id: string) {
    if (!confirm('¿Eliminar esta invitación?')) return;
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Error al eliminar invitación.', 'error'); return; }
    showToast('Invitación eliminada.', 'success');
    loadData();
  }

  async function handleApprove(email: string) {
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'approve' }),
    });
    if (!res.ok) { showToast('Error al aprobar.', 'error'); return; }
    showToast('Usuario aprobado.', 'success');
    loadData();
  }

  async function handleReject(email: string) {
    if (!confirm(`¿Rechazar y eliminar a ${email}?`)) return;
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'reject' }),
    });
    if (!res.ok) { showToast('Error al rechazar.', 'error'); return; }
    showToast('Usuario rechazado.', 'success');
    loadData();
  }

  async function handleSetRole(email: string, rol: string) {
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'set_role', rol }),
    });
    if (!res.ok) { showToast('Error al cambiar rol.', 'error'); return; }
    showToast('Rol actualizado.', 'success');
    loadData();
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  function formatDate(iso?: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function formatDateTime(iso?: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  const groupedSessions = useMemo(() => {
    type Session = { session_id: string; pages: DemoEvent[]; totalMs: number; lastActivity: string };
    const map: Record<string, Session> = {};
    for (const ev of demoEvents) {
      if (!map[ev.session_id]) {
        map[ev.session_id] = { session_id: ev.session_id, pages: [], totalMs: 0, lastActivity: ev.entered_at };
      }
      map[ev.session_id].pages.push(ev);
      if (ev.duration_ms) map[ev.session_id].totalMs += ev.duration_ms;
      if (ev.entered_at > map[ev.session_id].lastActivity) map[ev.session_id].lastActivity = ev.entered_at;
    }
    return Object.values(map).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }, [demoEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex h-12 w-12 animate-spin items-center justify-center">
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#facc15" strokeWidth="4" />
            <path className="opacity-90" fill="#facc15" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div className={`px-6 py-4 rounded-2xl border ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          } text-sm shadow-2xl`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h1 className="font-playfair text-4xl font-black text-white tracking-wide">Equipo Fabrick</h1>
        <p className="text-zinc-500 text-sm">Invita y administra a las personas con acceso al panel.</p>
      </div>

      {/* Crear Invitación */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-yellow-400" />
          </div>
          <h2 className="text-white font-bold text-lg">Invitar Persona</h2>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          Se genera un link único. Si tienes Resend configurado se envía automáticamente, si no lo copias y lo mandas tú.
        </p>
        <button
          onClick={() => { setCreatedLink(null); setShowInviteModal(true); }}
          className="bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-yellow-300 transition-all"
        >
          Crear Invitación
        </button>
      </div>

      {/* Acceso Demo */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
            <Eye className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Acceso Demo</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Link temporal de 24 h · solo lectura · sin cuenta real</p>
          </div>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          Genera un link único para que cualquier persona explore el panel sin modificar datos. Ideal para mostrar el producto a clientes o inversores.
        </p>

        {/* Generate form */}
        {createdDemoLink ? (
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/30 p-4 mb-4">
            <p className="text-amber-300 text-xs font-bold uppercase tracking-wide mb-2">Link de demo generado — válido 24 horas</p>
            <p className="text-white/80 text-xs font-mono break-all mb-3">{createdDemoLink}</p>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(createdDemoLink, 'Link demo')}
                className="flex items-center gap-1.5 bg-amber-400 text-black font-bold uppercase tracking-widest rounded-full px-4 py-2 text-xs hover:bg-amber-300 transition-all"
              >
                <Copy className="w-3 h-3" />Copiar link
              </button>
              <button
                onClick={() => setCreatedDemoLink(null)}
                className="flex items-center gap-1.5 bg-white/5 text-zinc-300 border border-white/10 font-bold uppercase tracking-widest rounded-full px-4 py-2 text-xs hover:bg-white/10 transition-all"
              >
                Generar otro
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={demoLabel}
              onChange={(e) => setDemoLabel(e.target.value)}
              placeholder="Etiqueta opcional (ej. &quot;Cliente Juan&quot;)"
              disabled={demoLoading}
              className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 disabled:opacity-40"
            />
            <button
              onClick={handleGenerateDemo}
              disabled={demoLoading}
              className="bg-amber-400 text-black font-bold uppercase tracking-widest rounded-full px-5 py-2.5 text-xs hover:bg-amber-300 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {demoLoading ? 'Generando…' : 'Generar Link Demo'}
            </button>
          </div>
        )}

        {/* Active demo tokens list */}
        {demoTokens.length > 0 && (
          <div className="space-y-2">
            <p className="text-zinc-600 text-xs uppercase tracking-wider font-bold mb-3">Links activos</p>
            {demoTokens.map((dt) => {
              const expiresIn = Math.max(0, Math.floor((new Date(dt.expira_at).getTime() - Date.now()) / 1000 / 60));
              const hours = Math.floor(expiresIn / 60);
              const mins = expiresIn % 60;
              return (
                <div key={dt.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {dt.label && <p className="text-white text-xs font-medium truncate">{dt.label}</p>}
                    <p className="text-zinc-500 text-[11px] truncate font-mono">{dt.link}</p>
                    <p className="text-zinc-600 text-[10px] mt-0.5">
                      Expira en {hours}h {mins}m · {dt.accesos} acceso{dt.accesos !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(dt.link, 'Link demo')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                      title="Copiar link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRevokeDemo(dt.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      title="Revocar acceso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actividad Demo */}
      {groupedSessions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Actividad Demo</h2>
                <p className="text-zinc-500 text-xs mt-0.5">Páginas visitadas por accesos demo · invisible para el visitante</p>
              </div>
            </div>
            <span className="text-zinc-600 text-xs font-mono">{groupedSessions.length} sesión{groupedSessions.length !== 1 ? 'es' : ''}</span>
          </div>

          <div className="space-y-3">
            {groupedSessions.map((session) => {
              const maxMs = Math.max(1, ...session.pages.map((e) => e.duration_ms ?? 0));
              return (
                <div key={session.session_id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sky-300 text-xs font-mono">{session.session_id.slice(0, 8)}…</p>
                      <p className="text-zinc-500 text-[10px] mt-0.5">
                        {session.pages.length} página{session.pages.length !== 1 ? 's' : ''} · {formatDuration(session.totalMs)} total
                      </p>
                    </div>
                    <p className="text-zinc-600 text-[10px]">{formatDateTime(session.lastActivity)}</p>
                  </div>
                  <div className="space-y-2">
                    {session.pages.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-300 text-[11px] font-mono truncate">{ev.page}</p>
                          <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-400/60 rounded-full"
                              style={{ width: `${Math.min(100, ((ev.duration_ms ?? 0) / maxMs) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-zinc-600 text-[10px] shrink-0 w-12 text-right">
                          {ev.duration_ms ? formatDuration(ev.duration_ms) : <span className="text-amber-400/70">activo</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invitaciones Pendientes */}
      {invitations.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-white font-bold text-lg">Invitaciones Pendientes</h2>
          </div>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{inv.email}</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Rol: <span className="text-yellow-400 uppercase">{inv.rol}</span> · Expira: {formatDateTime(inv.expira_at)}
                    </p>
                    {inv.link && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-zinc-600 text-xs font-mono truncate max-w-[200px]">{inv.link}</span>
                        <button
                          onClick={() => copyToClipboard(inv.link, 'Link')}
                          className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20 rounded-lg px-2 py-1 text-xs font-bold transition-all shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar link
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteInvitation(inv.id)}
                    className="text-red-400 hover:text-red-300 transition-colors p-2 shrink-0"
                    title="Cancelar invitación"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solicitudes Pendientes de Aprobación */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 border border-orange-400/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-white font-bold text-lg">Solicitudes Pendientes</h2>
          </div>
          <div className="space-y-3">
            {pending.map((member) => (
              <div key={member.email} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <p className="text-white font-medium">{member.nombre || member.email}</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {member.email} · Rol: <span className="text-yellow-400 uppercase">{member.rol}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(member.email)}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all">
                    <Check className="w-4 h-4 inline mr-1" />Aprobar
                  </button>
                  <button onClick={() => handleReject(member.email)}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all">
                    <X className="w-4 h-4 inline mr-1" />Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Miembros Activos */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-yellow-400" />
          </div>
          <h2 className="text-white font-bold text-lg">Miembros Activos</h2>
        </div>
        {members.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay miembros activos.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.email} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{member.nombre || member.email}</p>
                    {member.email === sessionEmail && (
                      <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        Tú
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs mt-1">
                    {member.email} · Actualizado: {formatDate(member.updated_at)}
                  </p>
                </div>
                <select
                  value={member.rol}
                  onChange={(e) => handleSetRole(member.email, e.target.value)}
                  disabled={member.email === sessionEmail}
                  className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-yellow-400/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Invitación */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !inviteLoading && setShowInviteModal(false)}
        >
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            {createdLink ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2 text-center">¡Invitación Creada!</h3>
                <p className="text-zinc-500 text-sm mb-4 text-center">Copia este link y envíaselo a la persona invitada:</p>
                <div className="bg-zinc-900 rounded-xl p-3 mb-4 border border-white/10">
                  <p className="text-zinc-300 text-xs font-mono break-all">{createdLink}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(createdLink, 'Link de invitación')}
                  className="w-full bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-yellow-300 transition-all mb-3 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Link
                </button>
                <button
                  onClick={() => { setCreatedLink(null); setShowInviteModal(false); }}
                  className="w-full bg-white/5 text-white border border-white/10 font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-white/10 transition-all"
                >
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <h3 className="text-white font-bold text-lg mb-4">Nueva Invitación</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-white/50 text-xs tracking-widest uppercase mb-2 block">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      disabled={inviteLoading}
                      className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 w-full disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs tracking-widest uppercase mb-2 block">Rol</label>
                    <select
                      value={inviteRol}
                      onChange={(e) => setInviteRol(e.target.value as 'admin' | 'viewer' | 'superadmin')}
                      disabled={inviteLoading}
                      className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 w-full disabled:opacity-40"
                    >
                      <option value="superadmin">Superadmin — acceso total</option>
                      <option value="admin">Admin — gestión general</option>
                      <option value="viewer">Viewer — solo lectura</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleInvite}
                      disabled={inviteLoading}
                      className="flex-1 bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-yellow-300 transition-all disabled:opacity-40"
                    >
                      {inviteLoading ? 'Creando...' : 'Crear y obtener link'}
                    </button>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      disabled={inviteLoading}
                      className="bg-white/5 text-white border border-white/10 font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-white/10 transition-all disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
