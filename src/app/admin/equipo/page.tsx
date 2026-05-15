'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Check,
  Copy,
  Fingerprint,
  KeyRound,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Role = 'superadmin' | 'admin' | 'viewer';

type Member = {
  email: string;
  nombre?: string | null;
  rol: Role;
  aprobado: boolean;
  created_at?: string;
  updated_at?: string;
  last_ip?: string | null;
  last_outcome?: string | null;
  last_seen_at?: string | null;
  last_user_agent?: string | null;
};

type Invitation = {
  id: string;
  email: string;
  rol: Role;
  codigo: string;
  link: string;
  expira_at: string;
  created_at: string;
};

type AuditRow = {
  email?: string | null;
  ip?: string | null;
  outcome?: string | null;
  ts?: string | null;
  user_agent?: string | null;
};

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
};

const ROLES: { value: Role; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

function tempPassword() {
  const raw = crypto.randomUUID().replace(/-/g, '');
  return `Sf-${raw.slice(0, 6)}-${raw.slice(6, 12)}-${raw.slice(12, 18)}!9`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function roleClass(role: Role) {
  if (role === 'superadmin') return 'border-rose-400/40 bg-rose-400/10 text-rose-200';
  if (role === 'admin') return 'border-yellow-300/40 bg-yellow-300/10 text-yellow-200';
  return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
}

export default function EquipoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState('');
  const [requestIp, setRequestIp] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<Member[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('admin');
  const [newPassword, setNewPassword] = useState(tempPassword);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('admin');
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const stats = useMemo(() => ({
    total: members.length,
    superadmins: members.filter((m) => m.rol === 'superadmin').length,
    admins: members.filter((m) => m.rol === 'admin').length,
    viewers: members.filter((m) => m.rol === 'viewer').length,
    pending: pending.length,
  }), [members, pending]);

  const statCards = useMemo<StatCard[]>(() => [
    { label: 'Total', value: stats.total, icon: Users },
    { label: 'Superadmin', value: stats.superadmins, icon: ShieldCheck },
    { label: 'Admin', value: stats.admins, icon: KeyRound },
    { label: 'Viewer', value: stats.viewers, icon: Fingerprint },
    { label: 'Pendientes', value: stats.pending, icon: Activity },
  ], [stats]);

  useEffect(() => {
    void checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4200);
  }

  async function checkAccess() {
    try {
      const res = await fetch('/api/admin/me', { cache: 'no-store' });
      if (!res.ok) return router.replace('/admin/login');
      const data = await res.json();
      if (data.rol !== 'superadmin') return router.replace('/admin');
      setSessionEmail(data.email ?? '');
      await loadData();
    } catch {
      router.replace('/admin/login');
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [teamRes, invRes] = await Promise.all([
        fetch('/api/admin/team', { cache: 'no-store' }),
        fetch('/api/admin/invitations', { cache: 'no-store' }),
      ]);
      if (teamRes.ok) {
        const json = await teamRes.json();
        setMembers(json.members ?? []);
        setPending(json.pending ?? []);
        setAudit(json.audit ?? []);
        setRequestIp(json.requestIp ?? null);
      }
      if (invRes.ok) {
        const json = await invRes.json();
        setInvitations(json.invitations ?? []);
      }
    } catch {
      showToast('No se pudo cargar el equipo.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function copy(value: string, label = 'Dato') {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado.`);
    } catch {
      showToast('No se pudo copiar automáticamente.', 'error');
    }
  }

  async function createUser() {
    if (!newEmail.trim()) return showToast('Email requerido.', 'error');
    if (newPassword.length < 12) return showToast('La contraseña debe tener al menos 12 caracteres.', 'error');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, nombre: newName, rol: newRole, password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) return showToast(json.error ?? 'No se pudo crear el usuario.', 'error');
      setCreatedPassword(json.temporaryPassword ?? newPassword);
      setNewName('');
      setNewEmail('');
      setNewRole('admin');
      setNewPassword(tempPassword());
      await loadData();
      showToast('Usuario creado y verificado correctamente.');
    } catch {
      showToast('Error de red al crear usuario.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function createInvite() {
    if (!inviteEmail.trim()) return showToast('Email requerido.', 'error');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rol: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) return showToast(json.error ?? 'No se pudo crear invitación.', 'error');
      setCreatedLink(json.link ?? null);
      setInviteEmail('');
      setInviteRole('admin');
      await loadData();
      showToast(json.emailSent ? 'Invitación creada y enviada.' : 'Invitación creada. Copia el link.');
    } catch {
      showToast('Error de red al invitar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(email: string, rol: Role) {
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'set_role', rol }),
    });
    if (!res.ok) return showToast('No se pudo actualizar el rol.', 'error');
    showToast('Rol actualizado.');
    await loadData();
  }

  async function approve(email: string) {
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'approve' }),
    });
    if (!res.ok) return showToast('No se pudo aprobar.', 'error');
    showToast('Usuario aprobado.');
    await loadData();
  }

  async function reject(email: string) {
    if (!confirm(`¿Eliminar a ${email}?`)) return;
    const res = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'reject' }),
    });
    if (!res.ok) return showToast('No se pudo eliminar.', 'error');
    showToast('Usuario eliminado.');
    await loadData();
  }

  async function deleteInvite(id: string) {
    if (!confirm('¿Cancelar esta invitación?')) return;
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' });
    if (!res.ok) return showToast('No se pudo cancelar.', 'error');
    showToast('Invitación cancelada.');
    await loadData();
  }

  if (loading) {
    return (
      <AdminPage>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-300/20 border-t-yellow-300" />
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      {toast && (
        <div className="fixed right-4 top-4 z-50">
          <div className={`rounded-2xl border px-5 py-3 text-sm shadow-2xl ${toast.type === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-red-400/30 bg-red-400/10 text-red-200'}`}>
            {toast.message}
          </div>
        </div>
      )}

      <AdminPageHeader
        title="Equipo y accesos"
        description="Crea usuarios reales, genera invitaciones, controla roles, revisa IPs y últimos accesos del panel."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</span>
              <Icon className="h-5 w-5 text-yellow-300" />
            </div>
            <p className="mt-4 text-3xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Crear usuario directo</h2>
              <p className="mt-1 text-sm text-zinc-500">Genera una cuenta con nombre, rol y contraseña temporal verificable.</p>
            </div>
            <button onClick={() => setCreateOpen((v) => !v)} className="rounded-full bg-yellow-300 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-black">
              <Plus className="mr-1 inline h-4 w-4" /> Usuario
            </button>
          </div>

          {createOpen && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre completo" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/50" />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="correo@dominio.com" type="email" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/50" />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/50">
                {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs text-white outline-none focus:border-yellow-300/50" />
                <button onClick={() => setNewPassword(tempPassword())} className="rounded-2xl border border-white/10 px-3 text-xs font-bold text-zinc-300 hover:text-yellow-200">Generar</button>
              </div>
              <button disabled={saving} onClick={createUser} className="md:col-span-2 rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">
                {saving ? 'Creando…' : 'Crear usuario y contraseña'}
              </button>
              {createdPassword && (
                <div className="md:col-span-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Contraseña temporal generada</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 rounded-xl bg-black/40 px-3 py-2 text-xs text-white">{createdPassword}</code>
                    <button onClick={() => copy(createdPassword, 'Contraseña')} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200"><Copy className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Invitar persona</h2>
              <p className="mt-1 text-sm text-zinc-500">Envía o copia un link para que cree su contraseña.</p>
            </div>
            <button onClick={() => setInviteOpen((v) => !v)} className="rounded-full border border-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-200">
              <UserPlus className="mr-1 inline h-4 w-4" /> Invitar
            </button>
          </div>

          {inviteOpen && (
            <div className="mt-5 space-y-3">
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="correo@dominio.com" type="email" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/50" />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/50">
                {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <button disabled={saving} onClick={createInvite} className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">
                Crear invitación
              </button>
              {createdLink && (
                <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4">
                  <p className="break-all font-mono text-xs text-yellow-100">{createdLink}</p>
                  <button onClick={() => copy(createdLink, 'Link')} className="mt-3 rounded-full bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black">Copiar link</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Miembros activos</h2>
            <p className="mt-1 text-sm text-zinc-500">Tu IP actual: <span className="font-mono text-zinc-300">{requestIp ?? 'no disponible'}</span></p>
          </div>
          <button onClick={() => loadData()} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300">Actualizar</button>
        </div>

        <div className="grid gap-3">
          {members.map((member) => (
            <article key={member.email} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-black text-white">{member.nombre || member.email}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${roleClass(member.rol)}`}>{member.rol}</span>
                    {member.email === sessionEmail && <span className="rounded-full border border-yellow-300/40 bg-yellow-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-200">Tú</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-500">{member.email}</p>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
                    <span className="flex items-center gap-2"><Wifi className="h-3.5 w-3.5 text-yellow-300" /> IP: <span className="font-mono text-zinc-300">{member.last_ip ?? '—'}</span></span>
                    <span>Último acceso: <span className="text-zinc-300">{formatDateTime(member.last_seen_at)}</span></span>
                    <span className="truncate">Resultado: <span className="text-zinc-300">{member.last_outcome ?? '—'}</span></span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select disabled={member.email === sessionEmail} value={member.rol} onChange={(e) => updateRole(member.email, e.target.value as Role)} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white disabled:opacity-40">
                    {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                  <button disabled={member.email === sessionEmail} onClick={() => reject(member.email)} className="rounded-2xl border border-red-400/30 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-300 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {pending.length > 0 && (
        <section className="rounded-3xl border border-orange-400/20 bg-orange-400/[0.04] p-5">
          <h2 className="text-xl font-black text-white">Solicitudes pendientes</h2>
          <div className="mt-4 grid gap-3">
            {pending.map((member) => (
              <div key={member.email} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div>
                  <p className="font-bold text-white">{member.nombre || member.email}</p>
                  <p className="text-sm text-zinc-500">{member.email} · {member.rol}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(member.email)} className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black"><Check className="mr-1 inline h-4 w-4" />Aprobar</button>
                  <button onClick={() => reject(member.email)} className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-300"><X className="mr-1 inline h-4 w-4" />Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {invitations.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-black text-white">Invitaciones pendientes</h2>
          <div className="mt-4 grid gap-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-white">{inv.email}</p>
                  <p className="text-sm text-zinc-500">{inv.rol} · expira {formatDateTime(inv.expira_at)}</p>
                  <p className="mt-1 truncate font-mono text-xs text-zinc-600">{inv.link}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copy(inv.link, 'Link')} className="rounded-full border border-yellow-300/30 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-200"><Copy className="mr-1 inline h-4 w-4" />Copiar</button>
                  <button onClick={() => deleteInvite(inv.id)} className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-300"><Trash2 className="mr-1 inline h-4 w-4" />Cancelar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-yellow-300" />
          <h2 className="text-xl font-black text-white">Últimos accesos auditados</h2>
        </div>
        {audit.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin auditoría disponible. Si la tabla admin_login_audit no existe, el login sigue funcionando pero no habrá historial.</p>
        ) : (
          <div className="grid gap-2">
            {audit.slice(0, 10).map((row, index) => (
              <div key={`${row.ts}-${index}`} className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-zinc-400 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
                <span className="truncate text-zinc-200">{row.email ?? 'sin email'}</span>
                <span className="font-mono">{row.ip ?? '—'}</span>
                <span>{row.outcome ?? '—'}</span>
                <span>{formatDateTime(row.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminPage>
  );
}
