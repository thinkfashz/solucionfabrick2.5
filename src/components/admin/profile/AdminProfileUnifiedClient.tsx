'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Facebook,
  Globe2,
  Instagram,
  Linkedin,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type SocialStats = {
  instagram_followers?: number;
  facebook_followers?: number;
  linkedin_followers?: number;
  tiktok_followers?: number;
};

type Profile = {
  email: string;
  display_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  website: string | null;
  metadata?: {
    social_stats?: SocialStats;
    cover_url?: string | null;
    [key: string]: unknown;
  } | null;
};

type Snapshot = {
  platform: string;
  url: string;
  title: string;
  description: string;
  followers?: number | null;
  ok: boolean;
  error?: string;
};

const emptyProfile: Profile = {
  email: '',
  display_name: '',
  phone: '',
  bio: '',
  avatar_url: null,
  instagram: '',
  facebook: '',
  linkedin: '',
  whatsapp: '',
  website: '',
  metadata: { social_stats: {}, cover_url: null },
};

const fallbackCover = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}

function fmt(value?: number | null) {
  return Math.max(0, Number(value || 0)).toLocaleString('es-CL');
}

function statsOf(profile: Profile): SocialStats {
  return profile.metadata?.social_stats || {};
}

function coverOf(profile: Profile) {
  return profile.metadata?.cover_url || fallbackCover;
}

function externalUrl(value?: string | null, network = 'instagram') {
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('@')) return network === 'instagram' ? `https://instagram.com/${value.slice(1)}` : value;
  return value.includes('.') ? `https://${value}` : value;
}

const inputClass = 'w-full rounded-xl border border-black/10 bg-white/75 px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none transition focus:border-[#c77a00]/40 focus:bg-white';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]';

export default function AdminProfileUnifiedClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/profile', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el perfil.');
      if (json.profile) {
        setProfile({
          ...emptyProfile,
          ...json.profile,
          metadata: { ...(emptyProfile.metadata || {}), ...(json.profile.metadata || {}) },
        });
      }
      if (json.session?.rol) setRole(json.session.rol);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar el perfil.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const displayName = profile.display_name || profile.email.split('@')[0] || 'Administrador Fabrick';
  const stats = statsOf(profile);
  const totalFollowers = Number(stats.instagram_followers || 0)
    + Number(stats.facebook_followers || 0)
    + Number(stats.linkedin_followers || 0)
    + Number(stats.tiktok_followers || 0);
  const socialCount = [profile.instagram, profile.facebook, profile.linkedin, profile.website, profile.whatsapp].filter(Boolean).length;
  const completion = Math.round(([
    profile.display_name,
    profile.phone,
    profile.bio,
    profile.avatar_url,
    profile.instagram,
    profile.facebook,
    profile.linkedin,
    profile.whatsapp,
    profile.website,
    profile.metadata?.cover_url,
  ].filter(Boolean).length / 10) * 100);

  const socialRows = useMemo(() => [
    { key: 'instagram' as const, label: 'Instagram', icon: Instagram, value: profile.instagram || '', followers: stats.instagram_followers || 0, followersKey: 'instagram_followers' as const },
    { key: 'facebook' as const, label: 'Facebook', icon: Facebook, value: profile.facebook || '', followers: stats.facebook_followers || 0, followersKey: 'facebook_followers' as const },
    { key: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin, value: profile.linkedin || '', followers: stats.linkedin_followers || 0, followersKey: 'linkedin_followers' as const },
  ], [profile.instagram, profile.facebook, profile.linkedin, stats.instagram_followers, stats.facebook_followers, stats.linkedin_followers]);

  function update(key: keyof Profile, value: string) {
    setProfile((previous) => ({ ...previous, [key]: value }));
  }

  function updateFollower(key: keyof SocialStats, value: string) {
    setProfile((previous) => ({
      ...previous,
      metadata: {
        ...(previous.metadata || {}),
        social_stats: {
          ...(previous.metadata?.social_stats || {}),
          [key]: Math.max(0, Number(value) || 0),
        },
      },
    }));
  }

  async function saveProfile() {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...profile, social_stats: statsOf(profile), metadata: profile.metadata || {} }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar.');
      setProfile((previous) => ({
        ...previous,
        ...json.profile,
        metadata: { ...(previous.metadata || {}), ...(json.profile?.metadata || {}) },
      }));
      setStatus('Perfil y ajustes guardados.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error guardando.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setStatus('');
    try {
      const form = new FormData();
      form.append('photo', file);
      const response = await fetch('/api/admin/profile/photo', { method: 'POST', body: form });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'No se pudo subir la foto.');
      setProfile((previous) => ({ ...previous, avatar_url: json.photo }));
      setStatus('Foto de perfil actualizada.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error subiendo foto.');
    } finally {
      setUploading(false);
    }
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setStatus('');
    try {
      const form = new FormData();
      form.append('cover', file);
      const response = await fetch('/api/admin/profile/cover', { method: 'POST', body: form });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'No se pudo subir la portada.');
      setProfile((previous) => ({
        ...previous,
        metadata: { ...(previous.metadata || {}), cover_url: json.cover },
      }));
      setStatus('Portada actualizada.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error subiendo portada.');
    } finally {
      setUploading(false);
    }
  }

  async function captureSocial() {
    const urls = [profile.instagram, profile.facebook, profile.linkedin, profile.website].filter(Boolean) as string[];
    if (!urls.length) {
      setStatus('Configura al menos una red o sitio web antes de capturar datos públicos.');
      return;
    }
    setCapturing(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/profile/social-snapshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'No se pudo capturar información pública.');
      const shots = Array.isArray(json.snapshots) ? json.snapshots as Snapshot[] : [];
      setSnapshots(shots);
      const nextStats: SocialStats = { ...statsOf(profile) };
      for (const snapshot of shots) {
        if (!snapshot.followers) continue;
        if (snapshot.platform === 'Instagram') nextStats.instagram_followers = snapshot.followers;
        if (snapshot.platform === 'Facebook') nextStats.facebook_followers = snapshot.followers;
        if (snapshot.platform === 'LinkedIn') nextStats.linkedin_followers = snapshot.followers;
        if (snapshot.platform === 'TikTok') nextStats.tiktok_followers = snapshot.followers;
      }
      setProfile((previous) => ({
        ...previous,
        metadata: {
          ...(previous.metadata || {}),
          social_stats: nextStats,
          social_snapshots: shots,
          social_captured_at: new Date().toISOString(),
        },
      }));
      setStatus('Captura pública aplicada. Revisa los valores y guarda los cambios.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo capturar información pública.');
    } finally {
      setCapturing(false);
    }
  }

  if (loading) {
    return (
      <AdminPage>
        <div className="grid min-h-[55vh] place-items-center text-[#817a6f]">
          <div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#c77a00]" /><p className="mt-3 text-sm">Cargando perfil…</p></div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.currentTarget.value = ''; }} />
      <input ref={coverRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); event.currentTarget.value = ''; }} />

      <AdminPageHeader
        eyebrow="Acceso · Perfil"
        title="Perfil administrativo"
        description="Centraliza identidad, contacto y presencia pública del administrador sin mezclar estilos ajenos al sistema Fabrick."
        icon={ShieldCheck}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-bold text-[#625b50] transition hover:bg-white">
              <RefreshCw className="h-4 w-4" /> Actualizar
            </button>
            <button type="button" onClick={() => void saveProfile()} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Completitud" value={`${completion}%`} icon={Sparkles} accent={completion >= 80 ? 'emerald' : undefined} />
        <AdminStat label="Redes" value={socialCount} icon={Globe2} />
        <AdminStat label="Audiencia" value={fmt(totalFollowers)} icon={Users} accent="cyan" />
        <AdminStat label="Rol" value={role} icon={ShieldCheck} accent={role === 'superadmin' ? 'emerald' : undefined} />
      </section>

      {status ? (
        <div className="rounded-xl border border-black/10 bg-white/55 px-4 py-3 text-sm font-medium text-[#625b50]">{status}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminCard className="p-0 sm:p-0">
          <div className="relative h-44 overflow-hidden rounded-t-[inherit] bg-[#171612]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverOf(profile)} alt="Portada administrativa" className="h-full w-full object-cover opacity-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <button type="button" onClick={() => coverRef.current?.click()} disabled={uploading} className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-[11px] font-black text-white backdrop-blur-sm disabled:opacity-50">
              <UploadCloud className="h-3.5 w-3.5" /> Portada
            </button>
          </div>
          <div className="p-5 text-center">
            <button type="button" onClick={() => avatarRef.current?.click()} disabled={uploading} className="group relative mx-auto -mt-16 grid h-28 w-28 place-items-center overflow-hidden rounded-full border-[6px] border-[#f8f3e9] bg-[#171612] text-2xl font-black text-white shadow-lg disabled:opacity-60">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : initials(displayName)}
              <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" /></span>
            </button>
            <h2 className="mt-4 text-xl font-black tracking-[-.03em] text-[#171612]">{displayName}</h2>
            <p className="mt-1 text-xs text-[#817a6f]">{profile.email || 'Sin email'}</p>
            <p className="mt-4 text-sm leading-6 text-[#625b50]">{profile.bio || 'Añade una presentación profesional para propuestas y demos.'}</p>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="border-b border-black/8 pb-4">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Identidad</p>
            <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Datos principales</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre visible" value={profile.display_name || ''} onChange={(value) => update('display_name', value)} />
            <Field label="Teléfono" value={profile.phone || ''} onChange={(value) => update('phone', value)} />
            <Field label="WhatsApp" value={profile.whatsapp || ''} onChange={(value) => update('whatsapp', value)} />
            <Field label="Sitio web" value={profile.website || ''} onChange={(value) => update('website', value)} />
            <div className="sm:col-span-2"><Field label="Bio / presentación" value={profile.bio || ''} onChange={(value) => update('bio', value)} textarea /></div>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-black/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Presencia pública</p>
            <h2 className="mt-1 text-lg font-black tracking-[-.025em] text-[#171612]">Redes y audiencia</h2>
            <p className="mt-1 text-xs leading-5 text-[#817a6f]">Edita enlaces y métricas manualmente o captura información pública disponible.</p>
          </div>
          <button type="button" onClick={() => void captureSocial()} disabled={capturing} className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-black/10 bg-white/65 px-4 text-xs font-black text-[#625b50] transition hover:bg-white disabled:opacity-50">
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#a56600]" />}
            {capturing ? 'Capturando…' : 'Capturar datos públicos'}
          </button>
        </div>

        <div className="divide-y divide-black/8 px-4 sm:px-5">
          {socialRows.map(({ key, label, icon: Icon, value, followers, followersKey }) => (
            <div key={key} className="grid gap-4 py-4 md:grid-cols-[44px_minmax(0,1fr)_180px_auto] md:items-end">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Icon className="h-4 w-4" /></span>
              <Field label={label} value={value} onChange={(next) => update(key, next)} />
              <Field label="Seguidores" value={String(followers)} onChange={(next) => updateFollower(followersKey, next)} type="number" />
              {value ? (
                <a href={externalUrl(value, key)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/10 bg-white/60 px-3 text-xs font-bold text-[#625b50]">Abrir</a>
              ) : <span />}
            </div>
          ))}
        </div>

        {snapshots.length ? (
          <div className="border-t border-black/8 p-4 sm:p-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Última captura</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {snapshots.map((snapshot, index) => (
                <div key={`${snapshot.platform}-${index}`} className="rounded-xl border border-black/8 bg-white/45 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs font-black text-[#27241f]">{snapshot.platform}</strong>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${snapshot.ok ? 'bg-emerald-500/10 text-emerald-800' : 'bg-rose-500/10 text-rose-800'}`}>{snapshot.ok ? 'OK' : 'Error'}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#817a6f]">{snapshot.title || snapshot.description || snapshot.error || 'Sin detalle'}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </AdminCard>
    </AdminPage>
  );
}

function Field({ label, value, onChange, textarea = false, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; type?: 'text' | 'number' }) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={`${inputClass} resize-y leading-6`} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  );
}
