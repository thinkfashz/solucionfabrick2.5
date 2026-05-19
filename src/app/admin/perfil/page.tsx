'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, Loader2, Mail, Phone, Save, Sparkles, User, X } from 'lucide-react';

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
};

const inputClass = 'w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-300/60 focus:ring-2 focus:ring-yellow-300/10';
const labelClass = 'text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/profile', { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (json.profile) setProfile({ ...emptyProfile, ...json.profile });
        if (json.session?.rol) setRole(json.session.rol);
      } catch {
        if (alive) setStatus('No se pudo cargar el perfil.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function update(key: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar.');
      setProfile((prev) => ({ ...prev, ...json.profile }));
      setStatus('Perfil guardado correctamente.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error guardando perfil.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch('/api/admin/profile/photo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo subir la imagen.');
      setProfile((prev) => ({ ...prev, avatar_url: json.photo }));
      setStatus(json.storage === 'cloudinary' ? 'Imagen guardada en Cloudinary.' : 'Imagen guardada en base de datos.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error subiendo imagen.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteAvatar() {
    setUploading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/profile/photo', { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo eliminar la imagen.');
      setProfile((prev) => ({ ...prev, avatar_url: null }));
      setStatus('Imagen eliminada.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error eliminando imagen.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-zinc-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando perfil...
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.16),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.12),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-black/35 p-5 text-center">
            <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-[2rem] border border-yellow-300/40 bg-zinc-900 shadow-2xl shadow-yellow-950/30">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-300/15 to-zinc-950">
                  <User className="h-16 w-16 text-yellow-300/50" />
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black disabled:opacity-60">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Subir foto
              </button>
              {profile.avatar_url && (
                <button type="button" onClick={deleteAvatar} disabled={uploading} className="inline-flex items-center gap-2 rounded-full border border-red-400/40 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-200 disabled:opacity-60">
                  <X className="h-4 w-4" /> Eliminar
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ''; }} />
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">La imagen se guarda en Cloudinary si las credenciales están activas; si no, queda como respaldo en base de datos.</p>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-300">Perfil administrativo</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-white sm:text-6xl">
              {profile.display_name || 'Administrador Fabrick'}
            </h1>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.16em]">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-200"><Sparkles className="h-3.5 w-3.5" /> {role}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300"><Mail className="h-3.5 w-3.5" /> {profile.email}</span>
              {profile.phone && <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300"><Phone className="h-3.5 w-3.5" /> {profile.phone}</span>}
            </div>
            {profile.bio && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300">{profile.bio}</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Información</p>
              <h2 className="text-2xl font-black tracking-[-0.05em] text-white">Datos del administrador</h2>
            </div>
            <button type="button" onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2"><span className={labelClass}>Nombre</span><input className={inputClass} value={profile.display_name ?? ''} onChange={(e) => update('display_name', e.target.value)} /></label>
            <label className="space-y-2"><span className={labelClass}>Teléfono</span><input className={inputClass} value={profile.phone ?? ''} onChange={(e) => update('phone', e.target.value)} /></label>
            <label className="space-y-2 sm:col-span-2"><span className={labelClass}>Bio</span><textarea className={inputClass} rows={5} value={profile.bio ?? ''} onChange={(e) => update('bio', e.target.value)} /></label>
            <label className="space-y-2"><span className={labelClass}>Instagram</span><input className={inputClass} value={profile.instagram ?? ''} onChange={(e) => update('instagram', e.target.value)} /></label>
            <label className="space-y-2"><span className={labelClass}>Facebook</span><input className={inputClass} value={profile.facebook ?? ''} onChange={(e) => update('facebook', e.target.value)} /></label>
            <label className="space-y-2"><span className={labelClass}>LinkedIn</span><input className={inputClass} value={profile.linkedin ?? ''} onChange={(e) => update('linkedin', e.target.value)} /></label>
            <label className="space-y-2"><span className={labelClass}>WhatsApp</span><input className={inputClass} value={profile.whatsapp ?? ''} onChange={(e) => update('whatsapp', e.target.value)} /></label>
            <label className="space-y-2 sm:col-span-2"><span className={labelClass}>Sitio web</span><input className={inputClass} value={profile.website ?? ''} onChange={(e) => update('website', e.target.value)} /></label>
          </div>
          {status && <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">{status}</p>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Estado</p>
            <h3 className="mt-1 text-xl font-black text-white">Cuenta activa</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">Este perfil se muestra en la barra superior y menú móvil del admin. Las próximas integraciones pueden usar estos datos para emails, firmas y demos.</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Redes</p>
            <div className="mt-4 grid gap-2">
              {(['instagram', 'facebook', 'linkedin', 'website'] as const).map((key) => profile[key] ? (
                <a key={key} href={profile[key] || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 hover:border-yellow-300/40 hover:text-yellow-200">
                  <span className="capitalize">{key}</span><ExternalLink className="h-4 w-4" />
                </a>
              ) : null)}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
