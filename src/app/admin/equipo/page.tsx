'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Mail, UserPlus, ShieldCheck, Trash2, Check, X } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  rol: string;
  codigo: string;
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
  const [inviteRol, setInviteRol] = useState<'admin' | 'viewer'>('admin');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      const res = await fetch('/api/admin/me', { cache: 'no-store' });
      if (!res.ok) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.rol !== 'superadmin') {
        router.replace('/admin');
        return;
      }
      setSessionEmail(data.email);
      loadData();
    } catch {
      router.replace('/admin/login');
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [invRes, teamRes] = await Promise.all([
        fetch('/api/admin/invitations', { cache: 'no-store' }),
        fetch('/api/admin/team', { cache: 'no-store' }),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvitations(invData.invitations || []);
      }

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setMembers(teamData.members || []);
        setPending(teamData.pending || []);
      }
    } catch {
      showToast('Error al cargar datos.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleInvite() {
    if (!inviteEmail) {
      showToast('Email es requerido.', 'error');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rol: inviteRol }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || 'Error al crear invitación.', 'error');
        return;
      }

      if (json.code) {
        showToast(`Invitación creada. Código: ${json.code} (copia y envía manualmente)`, 'success');
      } else if (json.emailSent) {
        showToast('Invitación enviada por email.', 'success');
      } else {
        showToast('Invitación creada.', 'success');
      }

      setShowInviteModal(false);
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

    try {
      const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('Error al eliminar invitación.', 'error');
        return;
      }
      showToast('Invitación eliminada.', 'success');
      loadData();
    } catch {
      showToast('Error de red.', 'error');
    }
  }

  async function handleApprove(email: string) {
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'approve' }),
      });

      if (!res.ok) {
        showToast('Error al aprobar.', 'error');
        return;
      }

      showToast('Usuario aprobado.', 'success');
      loadData();
    } catch {
      showToast('Error de red.', 'error');
    }
  }

  async function handleReject(email: string) {
    if (!confirm(`¿Rechazar y eliminar a ${email}?`)) return;

    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'reject' }),
      });

      if (!res.ok) {
        showToast('Error al rechazar.', 'error');
        return;
      }

      showToast('Usuario rechazado.', 'success');
      loadData();
    } catch {
      showToast('Error de red.', 'error');
    }
  }

  async function handleSetRole(email: string, rol: string) {
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'set_role', rol }),
      });

      if (!res.ok) {
        showToast('Error al cambiar rol.', 'error');
        return;
      }

      showToast('Rol actualizado.', 'success');
      loadData();
    } catch {
      showToast('Error de red.', 'error');
    }
  }

  function formatDate(iso?: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function formatDateTime(iso?: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

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
      {/* Toast */}
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

      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-playfair text-4xl font-black text-white tracking-wide">Equipo Fabrick</h1>
        <p className="text-zinc-500 text-sm">Invita y administra a las personas con acceso al panel.</p>
      </div>

      {/* Invite Section */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-white font-bold text-lg">Invitar Persona</h2>
          </div>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          Crea un código de invitación que será enviado por email (o cópialo manualmente).
        </p>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-yellow-300 transition-all"
        >
          Crear Invitación
        </button>
      </div>

      {/* Pending Invitations */}
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
              <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <p className="text-white font-medium">{inv.email}</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Rol: <span className="text-yellow-400 uppercase">{inv.rol}</span> · 
                    Código: <span className="font-mono">{inv.codigo}</span> · 
                    Expira: {formatDateTime(inv.expira_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteInvitation(inv.id)}
                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                  title="Cancelar invitación"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 border border-orange-400/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-white font-bold text-lg">Solicitudes Pendientes de Aprobación</h2>
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
                  <button
                    onClick={() => handleApprove(member.email)}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all"
                  >
                    <Check className="w-4 h-4 inline mr-1" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(member.email)}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all"
                  >
                    <X className="w-4 h-4 inline mr-1" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Members */}
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
                <div className="flex items-center gap-3">
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
        >
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-white font-bold text-lg mb-4">Nueva Invitación</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-xs tracking-widest uppercase mb-2 block">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 w-full"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs tracking-widest uppercase mb-2 block">Rol</label>
                <select
                  value={inviteRol}
                  onChange={(e) => setInviteRol(e.target.value as 'admin' | 'viewer')}
                  className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 w-full"
                >
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading}
                  className="flex-1 bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full px-6 py-3 text-sm hover:bg-yellow-300 transition-all disabled:opacity-40"
                >
                  {inviteLoading ? 'Creando...' : 'Crear'}
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
          </div>
        </div>
      )}
    </div>
  );
}
