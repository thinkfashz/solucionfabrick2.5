'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ExternalLink, Globe2, Instagram, Linkedin, Loader2, Mail, Phone, Save, ShieldCheck, Sparkles, User, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const inputClass = 'w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/60 focus:ring-2 focus:ring-yellow-300/10';
const labelClass = 'text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500';

function normalizeUrl(value: string | null) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
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

  const stats = useMemo(() => {
    const social = [profile.instagram, profile.facebook, profile.linkedin, profile.whatsapp, profile.website].filter(Boolean).length;
    const fields = [profile.display_name, profile.phone, profile.bio, profile.avatar_url, profile.instagram, profile.facebook, profile.linkedin, profile.whatsapp, profile.website].filter(Boolean).length;
    return [
      { label: 'Completo', value: `${Math.round((fields / 9) * 100)}%` },
      { label: 'Redes', value: String(social) },
      { label: 'Rol', value: role === 'superadmin' ? 'Owner' : role },
    ];
  }, [profile, role]);

  const socialLinks = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, value: profile.instagram },
    { key: 'facebook', label: 'Facebook', icon: Users, value: profile.facebook },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, value: profile.linkedin },
    { key: 'website', label: 'Web', icon: Globe2, value: profile.website },
  ];

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
    <main className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50">
        <div className="relative h-44 bg-[radial-gradient(circle_at_18%_22%,rgba(250,204,21,0.38),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.22),transparent_32%),linear-gradient(135deg,#050505,#18181b_45%,#020617)] sm:h-56">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:28px_28px] opacity-20" />
          <Badge className="absolute right-4 top-4 border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/10">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Perfil activo
          </Badge>
        </div>

        <div className="relative px-5 pb-6 sm:px-8">
          <div className="-mt-16 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-zinc-950 bg-black shadow-2xl ring-2 ring-yellow-300/50 sm:h-40 sm:w-40">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-300/20 via-zinc-900 to-black">
                    <User className="h-16 w-16 text-yellow-300/60" />
                  </div>
                )}
              </div>
              <div className="pb-1">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-300">Perfil administrativo</p>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.07em] text-white sm:text-5xl">{profile.display_name || 'Administrador Fabrick'}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.16em]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" /> {role}</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300"><Mail className="h-3.5 w-3.5" /> {profile.email || 'sin email'}</span>
                  {profile.phone && <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300"><Phone className="h-3.5 w-3.5" /> {profile.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Cambiar foto
              </Button>
              <Button type="button" variant="outline" onClick={deleteAvatar} disabled={uploading || !profile.avatar_url} className="rounded-full border-red-400/30 text-red-200 hover:border-red-400/60 hover:text-red-200">
                <X className="h-4 w-4" /> Eliminar foto
              </Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ''; }} />
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-zinc-300">{profile.bio || 'Agrega una biografía corta para que el panel se sienta personal, confiable y listo para demos comerciales.'}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <p className="text-2xl font-black text-white sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="bg-zinc-950/80">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Editar perfil</p>
              <CardTitle className="mt-1 text-2xl font-black tracking-[-0.05em]">Datos visibles del administrador</CardTitle>
            </div>
            <Button type="button" onClick={saveProfile} disabled={saving} className="rounded-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2"><span className={labelClass}>Nombre</span><input className={inputClass} value={profile.display_name ?? ''} onChange={(e) => update('display_name', e.target.value)} placeholder="Administrador Fabrick" /></label>
              <label className="space-y-2"><span className={labelClass}>Teléfono</span><input className={inputClass} value={profile.phone ?? ''} onChange={(e) => update('phone', e.target.value)} placeholder="+56 9..." /></label>
              <label className="space-y-2 sm:col-span-2"><span className={labelClass}>Descripción / bio</span><textarea className={inputClass} rows={5} value={profile.bio ?? ''} onChange={(e) => update('bio', e.target.value)} placeholder="Constructor, asesor técnico y gestor comercial de Soluciones Fabrick..." /></label>
              <label className="space-y-2"><span className={labelClass}>Instagram</span><input className={inputClass} value={profile.instagram ?? ''} onChange={(e) => update('instagram', e.target.value)} placeholder="https://instagram.com/..." /></label>
              <label className="space-y-2"><span className={labelClass}>Facebook</span><input className={inputClass} value={profile.facebook ?? ''} onChange={(e) => update('facebook', e.target.value)} /></label>
              <label className="space-y-2"><span className={labelClass}>LinkedIn</span><input className={inputClass} value={profile.linkedin ?? ''} onChange={(e) => update('linkedin', e.target.value)} /></label>
              <label className="space-y-2"><span className={labelClass}>WhatsApp</span><input className={inputClass} value={profile.whatsapp ?? ''} onChange={(e) => update('whatsapp', e.target.value)} /></label>
              <label className="space-y-2 sm:col-span-2"><span className={labelClass}>Sitio web</span><input className={inputClass} value={profile.website ?? ''} onChange={(e) => update('website', e.target.value)} /></label>
            </div>
            {status && <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">{status}</p>}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="bg-zinc-950/80">
            <CardHeader>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Feed / Estado</p>
              <CardTitle className="text-xl font-black">Listo para operar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-400">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100"><Sparkles className="mb-2 h-4 w-4" /> El avatar se muestra en navbar, sidebar y menú móvil. La edición de foto vive solo aquí.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">Perfil responsive para Android, iPhone y escritorio con estética social premium.</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Redes</p>
              <CardTitle className="text-xl font-black">Canales visibles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {socialLinks.map(({ key, label, icon: Icon, value }) => value ? (
                <a key={key} href={normalizeUrl(value)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 transition hover:border-yellow-300/40 hover:text-yellow-200">
                  <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span><ExternalLink className="h-4 w-4" />
                </a>
              ) : null)}
              {!socialLinks.some((item) => item.value) && <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">Agrega tus redes para que aparezcan aquí.</p>}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}
