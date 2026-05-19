'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ExternalLink, Globe2, Grid2X2, Instagram, Linkedin, Loader2, Mail, MessageCircle, Phone, Save, ShieldCheck, Sparkles, User, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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

const inputClass = 'w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/60 focus:ring-2 focus:ring-yellow-300/10';
const labelClass = 'text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}

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

  const displayName = profile.display_name || 'Administrador Fabrick';
  const profileInitials = useMemo(() => initials(displayName), [displayName]);
  const completion = Math.round(([profile.display_name, profile.phone, profile.bio, profile.avatar_url, profile.instagram, profile.facebook, profile.linkedin, profile.whatsapp, profile.website].filter(Boolean).length / 9) * 100);

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
    return <div className="flex min-h-[60vh] items-center justify-center text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando perfil...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="relative mx-auto w-full max-w-md overflow-hidden border-white/10 bg-white text-zinc-950 shadow-2xl shadow-black/35 dark:bg-zinc-950 dark:text-white">
          <div className="absolute right-[-80px] top-[-130px] z-0 h-72 w-72 rounded-full bg-emerald-600/90" />
          <div className="absolute bottom-[-120px] left-[-120px] z-0 h-72 w-72 rounded-full bg-zinc-100 dark:bg-white/10" />
          <div className="relative z-10 h-56 overflow-hidden rounded-b-[3rem] bg-zinc-900">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="Portada del perfil" className="h-full w-full object-cover brightness-75 grayscale" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.45),transparent_34%),linear-gradient(135deg,#111827,#020617)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white backdrop-blur" aria-label="Cambiar avatar"><Camera className="h-4 w-4" /></button>
          </div>

          <div className="relative z-20 -mt-16 px-6 text-center">
            <div className="mx-auto w-fit rounded-full border-[8px] border-white bg-white shadow-xl dark:border-zinc-950 dark:bg-zinc-950">
              <Avatar className="h-32 w-32 border-4 border-white bg-zinc-900 dark:border-zinc-900">
                {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-zinc-950 text-3xl text-white">{profileInitials}</AvatarFallback>
              </Avatar>
            </div>

            <CardHeader className="px-0 pb-2 pt-4">
              <div className="flex justify-center gap-2"><Badge variant="secondary">{role}</Badge><Badge variant="success">Activo</Badge></div>
              <CardTitle className="mt-3 text-3xl font-black tracking-[-0.06em] text-zinc-950 dark:text-white">{displayName}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1 text-zinc-500"><Mail className="h-3.5 w-3.5" /> {profile.email}</CardDescription>
              <CardDescription className="mx-auto max-w-xs pt-2 text-sm leading-relaxed text-zinc-500">{profile.bio || 'Añade una descripción profesional para que tu perfil se vea completo en demos y presentaciones.'}</CardDescription>
            </CardHeader>

            <CardContent className="px-0 pt-2">
              <div className="grid grid-cols-3 gap-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-center"><p className="text-2xl font-black">{completion}%</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">Perfil</p></div>
                <div className="border-x border-zinc-200 text-center dark:border-white/10"><p className="text-2xl font-black">{[profile.instagram, profile.facebook, profile.linkedin, profile.website].filter(Boolean).length}</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">Redes</p></div>
                <div className="text-center"><p className="text-2xl font-black">5</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">Módulos</p></div>
              </div>
            </CardContent>

            <CardFooter className="grid gap-3 px-0 pb-6 pt-2 sm:grid-cols-2">
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-2xl">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Cambiar foto</Button>
              <Button type="button" variant="outline" onClick={deleteAvatar} disabled={uploading || !profile.avatar_url} className="rounded-2xl"><X className="h-4 w-4" /> Eliminar</Button>
            </CardFooter>
          </div>
        </Card>

        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/40 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_5%_10%,rgba(16,185,129,0.24),transparent_35%),radial-gradient(circle_at_95%_0%,rgba(250,204,21,0.14),transparent_32%)]" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Perfil administrativo</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.07em] text-white sm:text-6xl">Controla tu identidad dentro del admin</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">Este perfil alimenta la barra superior, el menú móvil, tus demos comerciales y las futuras firmas de correo o presentaciones internas.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" /><p className="text-lg font-black text-white">{role}</p><p className="text-xs text-zinc-500">Rol activo</p></div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><Grid2X2 className="mb-3 h-5 w-5 text-yellow-300" /><p className="text-lg font-black text-white">{completion}%</p><p className="text-xs text-zinc-500">Perfil completo</p></div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><Sparkles className="mb-3 h-5 w-5 text-sky-300" /><p className="text-lg font-black text-white">Activo</p><p className="text-xs text-zinc-500">Estado de cuenta</p></div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Instagram', value: profile.instagram, icon: Instagram },
              { label: 'Facebook', value: profile.facebook, icon: MessageCircle },
              { label: 'LinkedIn', value: profile.linkedin, icon: Linkedin },
              { label: 'Sitio web', value: profile.website, icon: Globe2 },
            ].map(({ label, value, icon: Icon }) => (
              <a key={label} href={value || '#'} target={value ? '_blank' : undefined} rel="noreferrer" className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-emerald-300/40 hover:bg-emerald-300/[0.04]">
                <Icon className="mb-4 h-5 w-5 text-emerald-300" /><p className="font-black text-white">{label}</p><p className="mt-1 truncate text-xs text-zinc-500">{value || 'Sin configurar'}</p>
              </a>
            ))}
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-white/10 bg-zinc-950/80">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle className="text-2xl font-black tracking-[-0.05em] text-white">Editar información</CardTitle><CardDescription>Rellena los datos y presiona guardar para actualizar el perfil.</CardDescription></div>
            <Button type="button" onClick={saveProfile} disabled={saving} className="rounded-2xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar</Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2"><span className={labelClass}>Nombre</span><input className={inputClass} value={profile.display_name ?? ''} onChange={(e) => update('display_name', e.target.value)} placeholder="Eduardo Fabrick" /></label>
              <label className="space-y-2"><span className={labelClass}>Teléfono</span><input className={inputClass} value={profile.phone ?? ''} onChange={(e) => update('phone', e.target.value)} placeholder="+56 9..." /></label>
              <label className="space-y-2 sm:col-span-2"><span className={labelClass}>Bio</span><textarea className={inputClass} rows={5} value={profile.bio ?? ''} onChange={(e) => update('bio', e.target.value)} placeholder="Constructor, gestor comercial y administrador de Soluciones Fabrick..." /></label>
              <label className="space-y-2"><span className={labelClass}>Instagram</span><input className={inputClass} value={profile.instagram ?? ''} onChange={(e) => update('instagram', e.target.value)} placeholder="https://instagram.com/..." /></label>
              <label className="space-y-2"><span className={labelClass}>Facebook</span><input className={inputClass} value={profile.facebook ?? ''} onChange={(e) => update('facebook', e.target.value)} placeholder="https://facebook.com/..." /></label>
              <label className="space-y-2"><span className={labelClass}>LinkedIn</span><input className={inputClass} value={profile.linkedin ?? ''} onChange={(e) => update('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." /></label>
              <label className="space-y-2"><span className={labelClass}>WhatsApp</span><input className={inputClass} value={profile.whatsapp ?? ''} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+569..." /></label>
              <label className="space-y-2 sm:col-span-2"><span className={labelClass}>Sitio web</span><input className={inputClass} value={profile.website ?? ''} onChange={(e) => update('website', e.target.value)} placeholder="https://solucionesfabrick.com" /></label>
            </div>
            {status && <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">{status}</p>}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="border-white/10 bg-zinc-950/80"><CardHeader><CardTitle className="text-white">Estado del perfil</CardTitle><CardDescription>Información lista para demos, navegación y presentación interna.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"><span className="text-zinc-400">Foto</span><span className="font-bold text-white">{profile.avatar_url ? 'Configurada' : 'Pendiente'}</span></div><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"><span className="text-zinc-400">Contacto</span><span className="font-bold text-white">{profile.phone ? 'Completo' : 'Pendiente'}</span></div><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"><span className="text-zinc-400">Redes</span><span className="font-bold text-white">{[profile.instagram, profile.facebook, profile.linkedin, profile.website].filter(Boolean).length}/4</span></div></CardContent></Card>
        </aside>
      </section>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ''; }} />
    </main>
  );
}
