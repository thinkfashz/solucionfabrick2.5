'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Check,
  Copy,
  Fingerprint,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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

const ROLES: { value: Role; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

const inputClass = 'w-full rounded-xl border border-black/10 bg-white/75 px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none transition focus:border-[#c77a00]/40 focus:bg-white';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]';

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
  if (role === 'superadmin') return 'bg-rose-500/10 text-rose-800';
  if (role === 'admin') return 'bg-[#ffb000]/12 text-[#77500a]';
  return 'bg-sky-500/10 text-sky-800';
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
    superadmins: members.filter((member) => member.rol === 'superadmin').length,
    admins: members.filter((member) => member.rol === 'admin').length,
    viewers: members.filter((member) => member.rol === 'viewer').length,
    pending: pending.length,
  }), [members, pending]);

  useEffect(() => {
    void checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
  }

  async function checkAccess() {
    try {
      const response = await fetch('/api/admin/me', { cache: 'no-store' });
      if (!response.ok) return router.replace('/admin/login');
      const data = await response.json();
      if (data.rol !== 'superadmin') return router.replace('/admin?forbidden=root');
      setSessionEmail(data.email ?? '');
      await loadData();
    } catch {
      router.replace('/admin/login');
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [teamResponse, invitationsResponse] = await Promise.all([
        fetch('/api/admin/team', { cache: 'no-store' }),
        fetch('/api/admin/invitations', { cache: 'no-store' }),
      ]);
      if (teamResponse.ok) {
        const json = await teamResponse.json();
        setMembers(json.members ?? []);
        setPending(json.pending ?? []);
        setAudit(json.audit ?? []);
        setRequestIp(json.requestIp ?? null);
      } else {
        const json = await teamResponse.json().catch(() => ({}));
        showToast(json.error ?? 'No se pudo cargar el equipo.', 'error');
      }
      if (invitationsResponse.ok) {
        const json = await invitationsResponse.json();
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
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, nombre: newName, rol: newRole, password: newPassword }),
      });
      const json = await response.json();
      if (!response.ok) return showToast(json.error ?? 'No se pudo crear el usuario.', 'error');
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
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rol: inviteRole }),
      });
      const json = await response.json();
      if (!response.ok) return showToast(json.error ?? 'No se pudo crear invitación.', 'error');
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
    const response = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'set_role', rol }),
    });
    if (!response.ok) return showToast('No se pudo actualizar el rol.', 'error');
    showToast('Rol actualizado.');
    await loadData();
  }

  async function approve(email: string) {
    const response = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'approve' }),
    });
    if (!response.ok) return showToast('No se pudo aprobar.', 'error');
    showToast('Usuario aprobado.');
    await loadData();
  }

  async function reject(email: string) {
    if (!confirm(`¿Eliminar a ${email}?`)) return;
    const response = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'reject' }),
    });
    if (!response.ok) return showToast('No se pudo eliminar.', 'error');
    showToast('Usuario eliminado.');
    await loadData();
  }

  async function deleteInvite(id: string) {
    if (!confirm('¿Cancelar esta invitación?')) return;
    const response = await fetch(`/api/admin/invitations?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) return showToast('No se pudo cancelar.', 'error');
    showToast('Invitación cancelada.');
    await loadData();
  }

  if (loading) {
    return (
      <AdminPage>
        <div className="grid min-h-[55vh] place-items-center text-[#817a6f]">
          <div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#c77a00]" /><p className="mt-3 text-sm">Cargando equipo…</p></div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      {toast ? (
        <div className="fixed right-4 top-4 z-[90] max-w-sm">
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur ${toast.type === 'success' ? 'border-emerald-600/15 bg-[#edf8ef]/95 text-emerald-900' : 'border-rose-600/15 bg-[#fff0f0]/95 text-rose-900'}`}>
            {toast.message}
          </div>
        </div>
      ) : null}

      <AdminPageHeader
        eyebrow="Acceso · Root"
        title="Equipo y accesos"
        description="Crea usuarios, genera invitaciones, administra roles y revisa la actividad reciente del equipo desde un único workspace."
        icon={Users}
        actions={
          <button type="button" onClick={() => void loadData()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823]">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStat label="Miembros" value={stats.total} icon={Users} />
        <AdminStat label="Root" value={stats.superadmins} icon={ShieldCheck} accent="emerald" />
        <AdminStat label="Admin" value={stats.admins} icon={KeyRound} />
        <AdminStat label="Viewer" value={stats.viewers} icon={Fingerprint} accent="cyan" />
        <AdminStat label="Pendientes" value={stats.pending} icon={Activity} accent={stats.pending ? 'rose' : undefined} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard className="p-0 sm:p-0">
          <ActionHeader
            eyebrow="Cuenta directa"
            title="Crear usuario"
            description="Genera una cuenta aprobada con contraseña temporal y rol definido."
            action={
              <button type="button" onClick={() => setCreateOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white">
                <Plus className="h-4 w-4" /> Usuario
              </button>
            }
          />
          {createOpen ? (
            <div className="grid gap-4 border-t border-black/8 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Nombre" value={newName} onChange={setNewName} placeholder="Nombre completo" />
              <Field label="Email" value={newEmail} onChange={setNewEmail} placeholder="correo@dominio.com" type="email" />
              <label className="block"><span className={labelClass}>Rol</span><select value={newRole} onChange={(event) => setNewRole(event.target.value as Role)} className={inputClass}>{ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
              <div>
                <span className={labelClass}>Contraseña temporal</span>
                <div className="flex gap-2"><input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={`${inputClass} min-w-0 flex-1 font-mono text-xs`} /><button type="button" onClick={() => setNewPassword(tempPassword())} className="rounded-xl border border-black/10 bg-white/60 px-3 text-xs font-bold text-[#625b50]">Generar</button></div>
              </div>
              <button type="button" disabled={saving} onClick={() => void createUser()} className="sm:col-span-2 min-h-11 rounded-xl bg-[#171612] px-5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Creando…' : 'Crear usuario y contraseña'}</button>
              {createdPassword ? (
                <div className="sm:col-span-2 rounded-xl border border-emerald-600/15 bg-emerald-500/8 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-800">Contraseña temporal</p>
                  <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white/70 px-3 py-2 text-xs text-[#27241f]">{createdPassword}</code><button type="button" onClick={() => void copy(createdPassword, 'Contraseña')} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-black/10 bg-white/70 text-[#625b50]"><Copy className="h-4 w-4" /></button></div>
                </div>
              ) : null}
            </div>
          ) : null}
        </AdminCard>

        <AdminCard className="p-0 sm:p-0">
          <ActionHeader
            eyebrow="Invitación"
            title="Invitar persona"
            description="Crea un enlace para que el usuario configure su acceso."
            action={<button type="button" onClick={() => setInviteOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-black text-[#625b50]"><UserPlus className="h-4 w-4" /> Invitar</button>}
          />
          {inviteOpen ? (
            <div className="grid gap-4 border-t border-black/8 p-4 sm:p-5">
              <Field label="Email" value={inviteEmail} onChange={setInviteEmail} placeholder="correo@dominio.com" type="email" />
              <label className="block"><span className={labelClass}>Rol</span><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)} className={inputClass}>{ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
              <button type="button" disabled={saving} onClick={() => void createInvite()} className="min-h-11 rounded-xl bg-[#171612] px-5 text-xs font-black text-white disabled:opacity-50">Crear invitación</button>
              {createdLink ? (
                <div className="rounded-xl border border-[#c77a00]/15 bg-[#ffb000]/8 p-4">
                  <p className="break-all font-mono text-xs text-[#5f4b24]">{createdLink}</p>
                  <button type="button" onClick={() => void copy(createdLink, 'Link')} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-bold text-[#625b50]"><Copy className="h-3.5 w-3.5" /> Copiar link</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </AdminCard>
      </div>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-black/8 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Acceso operativo</p>
            <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Miembros activos</h2>
            <p className="mt-1 text-xs text-[#817a6f]">IP actual: <span className="font-mono font-bold text-[#514b42]">{requestIp ?? 'no disponible'}</span></p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-800">{members.length} activos</span>
        </div>
        <div className="divide-y divide-black/8 px-4 sm:px-5">
          {members.length === 0 ? <Empty text="No hay miembros activos." /> : members.map((member) => (
            <article key={member.email} className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-black text-[#171612]">{member.nombre || member.email}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${roleClass(member.rol)}`}>{member.rol}</span>
                  {member.email === sessionEmail ? <span className="rounded-full bg-[#171612] px-2.5 py-1 text-[9px] font-black text-white">Tú</span> : null}
                </div>
                <p className="mt-1 truncate text-xs text-[#817a6f]">{member.email}</p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#817a6f]">
                  <span className="inline-flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-[#a56600]" /> <span className="font-mono">{member.last_ip ?? '—'}</span></span>
                  <span>Último acceso {formatDateTime(member.last_seen_at)}</span>
                  <span>Resultado {member.last_outcome ?? '—'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select disabled={member.email === sessionEmail} value={member.rol} onChange={(event) => void updateRole(member.email, event.target.value as Role)} className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-bold text-[#514b42] disabled:opacity-40">{ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
                <button type="button" disabled={member.email === sessionEmail} onClick={() => void reject(member.email)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-600/15 bg-rose-500/8 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      </AdminCard>

      {pending.length ? (
        <AdminCard className="p-0 sm:p-0">
          <ActionHeader eyebrow="Revisión" title="Solicitudes pendientes" description="Aprueba o rechaza cuentas que aún no tienen acceso operativo." />
          <div className="divide-y divide-black/8 border-t border-black/8 px-4 sm:px-5">
            {pending.map((member) => (
              <div key={member.email} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-black text-[#171612]">{member.nombre || member.email}</p><p className="mt-1 text-xs text-[#817a6f]">{member.email} · {member.rol}</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => void approve(member.email)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"><Check className="h-3.5 w-3.5" /> Aprobar</button><button type="button" onClick={() => void reject(member.email)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-600/15 bg-rose-500/8 px-3 py-2 text-xs font-black text-rose-800"><X className="h-3.5 w-3.5" /> Rechazar</button></div>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}

      {invitations.length ? (
        <AdminCard className="p-0 sm:p-0">
          <ActionHeader eyebrow="Invitaciones" title="Pendientes de activación" description="Enlaces emitidos que todavía pueden ser utilizados." />
          <div className="divide-y divide-black/8 border-t border-black/8 px-4 sm:px-5">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1"><p className="text-sm font-black text-[#171612]">{invitation.email}</p><p className="mt-1 text-xs text-[#817a6f]">{invitation.rol} · expira {formatDateTime(invitation.expira_at)}</p><p className="mt-1 truncate font-mono text-[10px] text-[#9a9286]">{invitation.link}</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => void copy(invitation.link, 'Link')} className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/65 px-3 py-2 text-xs font-bold text-[#625b50]"><Copy className="h-3.5 w-3.5" /> Copiar</button><button type="button" onClick={() => void deleteInvite(invitation.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-600/15 bg-rose-500/8 px-3 py-2 text-xs font-bold text-rose-800"><Trash2 className="h-3.5 w-3.5" /> Cancelar</button></div>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}

      <AdminCard className="p-0 sm:p-0">
        <ActionHeader eyebrow="Auditoría" title="Últimos accesos" description="Historial reciente de autenticación asociado a los miembros del tenant." action={<Mail className="h-5 w-5 text-[#a56600]" />} />
        {audit.length === 0 ? (
          <Empty text="Sin auditoría disponible. El acceso sigue funcionando aunque no haya historial." />
        ) : (
          <div className="overflow-x-auto border-t border-black/8">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white/35 text-[10px] font-black uppercase tracking-[.12em] text-[#8f887c]"><tr><th className="px-4 py-3 sm:px-5">Email</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3">Fecha</th></tr></thead>
              <tbody className="divide-y divide-black/8">{audit.slice(0, 10).map((row, index) => <tr key={`${row.ts}-${index}`}><td className="px-4 py-3 sm:px-5 font-bold text-[#27241f]">{row.email ?? 'sin email'}</td><td className="px-4 py-3 font-mono text-[#625b50]">{row.ip ?? '—'}</td><td className="px-4 py-3 text-[#625b50]">{row.outcome ?? '—'}</td><td className="px-4 py-3 text-[#625b50]">{formatDateTime(row.ts)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </AdminPage>
  );
}

function ActionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">{eyebrow}</p><h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#817a6f]">{description}</p></div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: 'text' | 'email' }) {
  return <label className="block"><span className={labelClass}>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-sm text-[#817a6f]">{text}</div>;
}
